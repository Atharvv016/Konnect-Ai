import { GoogleGenAI, Type, Schema, Part, Modality } from "@google/genai";
import { AgentResponse, SystemType } from "../types";

const apiKey = process.env.API_KEY;

// Define the schema for the structured output we want from Gemini
const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    transcription: { 
      type: Type.STRING, 
      description: "Verbatim transcription of the user's audio input. If no audio is present, return an empty string." 
    },
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
          system: { type: Type.STRING, enum: [
            SystemType.JIRA, SystemType.GITHUB, SystemType.DOCS, SystemType.SLACK, 
            SystemType.GMAIL, SystemType.ANALYSIS, SystemType.DEVICE_MESH,
            SystemType.CALENDAR, SystemType.FIGMA, SystemType.SENTRY, 
            SystemType.CONFLUENCE, SystemType.DATABASE, SystemType.YOUTUBE
          ] },
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
        },
        calendarEvent: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            startTime: { type: Type.STRING },
            attendees: { type: Type.ARRAY, items: { type: Type.STRING } },
            meetLink: { type: Type.STRING }
          }
        },
        sentryAnalysis: {
          type: Type.OBJECT,
          properties: {
            errorType: { type: Type.STRING },
            fileLocation: { type: Type.STRING },
            stackTraceSnippet: { type: Type.STRING },
            rootCause: { type: Type.STRING }
          }
        },
        figmaComparison: {
          type: Type.OBJECT,
          properties: {
            driftScore: { type: Type.NUMBER, description: "0-100 score indicating visual difference" },
            designUrl: { type: Type.STRING },
            critique: { type: Type.STRING }
          }
        },
        ragContext: {
          type: Type.ARRAY,
          items: {
             type: Type.OBJECT,
             properties: {
               sourceTitle: { type: Type.STRING },
               snippet: { type: Type.STRING },
               url: { type: Type.STRING }
             }
          }
        },
        sqlQuery: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING },
            explanation: { type: Type.STRING },
            isSafe: { type: Type.BOOLEAN }
          }
        },
        confluencePage: {
          type: Type.OBJECT,
          properties: {
            spaceKey: { type: Type.STRING },
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            url: { type: Type.STRING }
          }
        },
        youtubeResults: {
          type: Type.OBJECT,
          description: "Search query for YouTube videos if a visual solution or tutorial is needed.",
          properties: {
             query: { type: Type.STRING, description: "The search terms for YouTube." },
             videos: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {}}} // Placeholder, tool populates this
          }
        }
      },
      required: ['detectedComponent', 'bugPriority', 'bugSummary', 'commitHash', 'developerName', 'docEntryId', 'docContent', 'slackChannel', 'slackMessage', 'deviceAction']
    }
  },
  required: ['orchestrationPlan', 'executionResults', 'governance', 'transcription']
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
  audioMimeType: string = 'audio/webm',
  videoBase64?: string | null,
  videoMimeType: string = 'video/mp4'
): Promise<AgentResponse> => {
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please check your .env file or environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const basePrompt = `
    You are the Konnect-AI Orchestrator.
    
    CORE FUNCTIONALITY:
    Interpret multimodal data (Diagrams, Jira Boards, Video Recordings, Voice, Text) to orchestrate complex software workflows using advanced tools.
    
    STRICT POLICY:
    **"All P0 Bug Summaries containing sensitive data must be tokenized or masked. SQL Queries must be Read-Only (SELECT only). No DELETE/DROP allowed."**
    
    TASK:
    1. **Transcribe**: If audio is provided, transcribe verbatim.
    2. **Analyze**: Identify the critical component/bug from input.
    3. **Plan**: Generate an orchestration plan using the available systems (Jira, GitHub, Slack, Calendar, Sentry, Figma, Confluence, YouTube, etc.).
    4. **Governance Check**: Mask sensitive data. Verify SQL safety.
    5. **Execute**: Generate content for all active tools.

    SPECIALIZED FEATURES:
    - **War Room (Calendar)**: If the bug is P0 or user asks to "schedule meeting", create a 'calendarEvent' with immediate availability.
    - **Visual QA (Figma)**: If image input looks like UI, compare it to "expected design" principles. Generate a 'figmaComparison' with a drift score.
    - **Live Logs (Sentry)**: If user says "debug" or "trace", generate a 'sentryAnalysis' with a simulated stack trace relevant to the detected component.
    - **Corporate Memory (RAG)**: If user asks "How to...", "What is...", populate 'ragContext' with simulated Confluence pages.
    - **Wiki Updates (Confluence)**: If user asks to "update the wiki", "create a page", or "document this", generate a 'confluencePage' with technical documentation using standard HTML/Markdown structure.
    - **Safe SQL**: If user asks for data ("How many users...", "Show me logs..."), generate a 'sqlQuery'. MUST be SELECT only. Set 'isSafe' to true if no modification commands.
    - **Video Solutions (YouTube)**: If the user asks for a tutorial, how-to, or visual solution, provide a 'youtubeResults.query' to find relevant videos.

    INPUT INTERPRETATION:
    - **Jira Board (Image)**: Find the P0/Blocker.
    - **Screen Recording (Video)**: Watch actions to reproduce bug.
    - **Voice**: Listen for commands like "Schedule a war room" or "Find a video on how to fix this".
    
    OUTPUT FORMAT:
    Return valid JSON matching the schema.
    - 'transcription': Exact spoken text.
    - 'governance.xaiTrace': Explain masking or SQL safety checks.
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

  // Add Video if present
  if (videoBase64) {
    parts.push({
      inlineData: {
        mimeType: videoMimeType,
        data: videoBase64
      }
    });
  }

  // Add Audio if present (Voice Mode)
  if (audioBase64) {
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
  }
  
  // If no inputs provided at all, we force a simulation
  if (!imageBase64 && !audioBase64 && !videoBase64 && !instruction) {
    finalPrompt += "\n\n(No input provided. Simulate a standard critical bug workflow with sensitive data to demonstrate policy check.)";
  }

  parts.push({ text: finalPrompt });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: parts
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1, // Tuned for high accuracy transcription and logic
        thinkingConfig: {
          thinkingBudget: 32768 // Max thinking budget for deep reasoning
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response received from Gemini.");
    
    try {
      // Clean up potential markdown formatting before parsing
      const cleanedText = cleanJsonOutput(text);
      return JSON.parse(cleanedText) as AgentResponse;
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