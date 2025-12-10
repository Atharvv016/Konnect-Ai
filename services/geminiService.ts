import { GoogleGenAI, Type, Schema, Part, Modality } from "@google/genai";
import { AgentResponse, SystemType } from "../types";

const apiKey = process.env.API_KEY;

// Define the schema for the structured output we want from Gemini
const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    governance: {
      type: Type.OBJECT,
      description: "Self-Critique & Policy Check results",
      properties: {
        policyStatus: { type: Type.STRING, enum: ['passed', 'failed', 'modified'] },
        critique: { type: Type.STRING, description: "Analysis of the plan against safety/security policies." },
        xaiTrace: { type: Type.STRING, description: "Explanation of why specific masking or actions were taken." }
      },
      required: ['policyStatus', 'critique', 'xaiTrace']
    },
    orchestrationPlan: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          stepNumber: { type: Type.INTEGER },
          system: { type: Type.STRING, enum: [SystemType.JIRA, SystemType.GITHUB, SystemType.DOCS, SystemType.SLACK, SystemType.GMAIL, SystemType.ANALYSIS, SystemType.DEVICE_MESH] },
          action: { type: Type.STRING },
          dataFlow: { type: Type.STRING },
          status: { type: Type.STRING, enum: ['pending', 'processing', 'complete'] }
        },
        required: ['stepNumber', 'system', 'action', 'dataFlow', 'status']
      }
    },
    executionResults: {
      type: Type.OBJECT,
      properties: {
        detectedComponent: { type: Type.STRING },
        bugPriority: { type: Type.STRING },
        bugSummary: { type: Type.STRING },
        commitHash: { type: Type.STRING },
        developerName: { type: Type.STRING },
        docEntryId: { type: Type.STRING },
        docContent: { type: Type.STRING },
        slackChannel: { type: Type.STRING },
        slackMessage: { type: Type.STRING },
        gmailRecipient: { type: Type.STRING, description: "Email address of the recipient (e.g., manager or team)." },
        gmailSubject: { type: Type.STRING, description: "Subject line for the summary email." },
        gmailBody: { type: Type.STRING, description: "A summarized description of the issue and actions taken, formatted for email." },
        deviceAction: {
          type: Type.OBJECT,
          description: "Action to perform on connected devices (Cross-Device Handoff)",
          properties: {
            shouldExecute: { type: Type.BOOLEAN },
            targetDevice: { type: Type.STRING, enum: ['desktop', 'mobile', 'all'] },
            actionType: { type: Type.STRING, enum: ['open_url', 'copy_to_clipboard'] },
            payload: { type: Type.STRING }
          }
        }
      },
      required: ['detectedComponent', 'bugPriority', 'bugSummary', 'commitHash', 'developerName', 'docEntryId', 'docContent', 'slackChannel', 'slackMessage', 'deviceAction']
    }
  },
  required: ['orchestrationPlan', 'executionResults', 'governance']
};

/**
 * Helper to strip markdown code blocks from the response text
 * This prevents JSON.parse from failing if the model returns ```json ... ```
 */
const cleanJsonOutput = (text: string): string => {
  let cleaned = text.trim();
  // Remove markdown code blocks if present
  cleaned = cleaned.replace(/```json/gi, '').replace(/```/g, '');
  
  // Extract JSON object if there's extra text around it
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  
  return cleaned;
};

export const analyzeAndOrchestrate = async (
  imageBase64: string | null,
  instruction?: string,
  audioBase64?: string,
  audioMimeType: string = 'audio/webm'
): Promise<AgentResponse> => {
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please check your .env file or environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const basePrompt = `
    You are the Konnect-AI Orchestrator.
    
    CORE FUNCTIONALITY:
    Interpret multimodal data (Diagrams, Jira Boards, Voice, Text) to orchestrate software workflows.
    
    STRICT POLICY:
    **"All P0 Bug Summaries containing sensitive data (e.g., API keys, system architecture details, user emails) must be tokenized or masked before inclusion in any final communication platform (Slack/Teams/Email)."**
    
    TASK:
    1. **Analyze**: Identify the critical component/bug from the input.
    2. **Plan**: Generate an orchestration plan.
    3. **SELF-CRITIQUE (Governance Check)**: 
       - Review your own plan against the STRICT POLICY.
       - If the bug summary contains sensitive info, MASK IT in the 'executionResults' (Slack/Docs/Email).
       - Log this decision in the 'governance' output field.
    4. **Execute**: Generate the final content (Jira Ticket, Doc Entry, Slack Message, Email).
       - Slack Message: Professional, use emojis, include [XAI Trace] if policy action was taken.
       - Google Doc: Technical, detailed.
       - Gmail: Draft a concise summary email to the engineering lead (e.g., lead@company.com) summarizing the incident and the automated actions taken.

    INPUT INTERPRETATION:
    - **Image/Diagram**: Analyze visual content for bugs, workflows, architecture.
    - **Voice Input**: Transcribe and interpret voice commands and descriptions.
    - **Task Flow**: Identify systems involved.
    - **Device Handoff**: Populate 'deviceAction' if user asks to open/send to device.
    
    OUTPUT FORMAT:
    Return valid JSON matching the schema.
    - 'governance.policyStatus': 'modified' if you masked data, 'passed' otherwise.
    - 'governance.xaiTrace': Explain precisely WHAT was masked and WHY.
  `;

  const parts: Part[] = [];

  // Add Image if present
  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: 'image/png',
        data: imageBase64
      }
    });
  }

  // Add Audio if present (Voice Mode)
  if (audioBase64) {
    // Validate audio data
    if (audioBase64.length < 100) {
      throw new Error("Audio recording too short. Please record at least a few seconds of audio.");
    }
    
    parts.push({
      inlineData: {
        mimeType: audioMimeType,
        data: audioBase64
      }
    });
  }

  // Add Text Prompt
  let finalPrompt = basePrompt;
  if (instruction) {
    finalPrompt += `\n\nUSER INSTRUCTION: ${instruction}`;
  } else if (audioBase64) {
    finalPrompt += `\n\nThe user provided voice input. Please transcribe and analyze it.`;
  }
  
  // If no inputs provided at all, we force a simulation
  if (!imageBase64 && !audioBase64 && !instruction) {
    finalPrompt += "\n\n(No input provided. Simulate a standard critical bug workflow with sensitive data to demonstrate policy check.)";
  }

  parts.push({ text: finalPrompt });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: parts
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.4
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response received from Gemini.");
    
    try {
      // Clean up potential markdown formatting before parsing
      const cleanedText = cleanJsonOutput(text);
      const parsedResponse = JSON.parse(cleanedText) as AgentResponse;
      
      // Validate response structure
      if (!parsedResponse.orchestrationPlan || !Array.isArray(parsedResponse.orchestrationPlan)) {
        throw new Error("Invalid response structure: missing orchestrationPlan");
      }
      if (!parsedResponse.executionResults) {
        throw new Error("Invalid response structure: missing executionResults");
      }
      
      return parsedResponse;
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.log("Raw Text Received:", text);
      throw new Error("The AI response could not be parsed as JSON. Please try again with a clearer instruction.");
    }

  } catch (error) {
    console.error("Gemini Interaction Error:", error);
    if (error instanceof Error) {
        // Return the actual error message so the user knows if it's API Key, Network, or Parse related
        throw new Error(`AI Service Error: ${error.message}`);
    }
    throw new Error("Failed to process the orchestration request due to an unknown error.");
  }
};

/**
 * Generates speech from text using Gemini 2.5 Flash TTS
 */
export const generateSpeech = async (text: string): Promise<string> => {
  if (!apiKey) return '';

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: {
        parts: [{ text }]
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Kore' // Options: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
            }
          }
        }
      }
    });

    // The audio data is in inlineData.data
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) throw new Error("No audio data generated");
    
    return audioData;

  } catch (error) {
    console.error("TTS Generation Error:", error);
    return ''; // Return empty string on failure to avoid breaking the app flow
  }
};