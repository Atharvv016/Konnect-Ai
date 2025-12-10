
/**
 * Decodes a Base64 string into a Uint8Array.
 */
const decodeBase64 = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

let audioContext: AudioContext | null = null;

/**
 * Plays raw PCM audio data (16-bit, 24kHz) returned by Gemini.
 */
export const playPCM = async (base64PCM: string) => {
  if (!base64PCM) return;
  
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }

  // Resume context if suspended (often required by browser autoplay policies)
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  const pcmBytes = decodeBase64(base64PCM);
  
  // Convert 16-bit PCM to Float32 for the Web Audio API
  // Gemini returns raw PCM 16-bit integers
  const dataInt16 = new Int16Array(pcmBytes.buffer);
  const float32Data = new Float32Array(dataInt16.length);
  for (let i = 0; i < dataInt16.length; i++) {
    float32Data[i] = dataInt16[i] / 32768.0;
  }

  // Create an AudioBuffer (Mono, 24kHz)
  const buffer = audioContext.createBuffer(1, float32Data.length, 24000);
  buffer.getChannelData(0).set(float32Data);

  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start();
};
