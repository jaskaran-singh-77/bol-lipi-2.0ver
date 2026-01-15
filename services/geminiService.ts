import { GoogleGenAI, Type } from "@google/genai";
import { FormData } from "../types";

export interface ExtractionResult {
  value: string;
  isSkipped: boolean;
}

export class GeminiError extends Error {
  constructor(public message: string, public status?: number) {
    super(message);
    this.name = 'GeminiError';
  }
  isQuotaExceeded() {
    return this.status === 429 || this.message.toLowerCase().includes('quota') || this.message.toLowerCase().includes('resource_exhausted');
  }
}

/**
 * Extracts a specific field value from a conversational transcript.
 * Also detects if the user explicitly refuses to answer or wants to skip.
 */
export const extractFieldData = async (
  transcript: string, 
  fieldName: string,
  fieldLabel: string
): Promise<ExtractionResult> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The user was asked for their ${fieldLabel} (${fieldName}).
      Based on their response: "${transcript}", determine if they provided the information or if they want to skip/refuse.
      
      Instructions:
      1. If the user provides the ${fieldLabel} value (even within a sentence like 'Mera naam Rahul hai'), extract just the value (e.g., 'Rahul').
      2. If the user expresses a desire to skip, doesn't know, or refuses to answer (e.g., 'pata nahi', 'skip', 'don't know', 'aage badho', 'skip karo'), set 'isSkipped' to true.
      3. If the transcript is nonsense or completely irrelevant to the question asked, also consider setting 'isSkipped' to true to avoid invalid data.
      4. Handle Hindi, English, and Hinglish.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            value: { type: Type.STRING, description: "The extracted value (empty if skipped)" },
            isSkipped: { type: Type.BOOLEAN, description: "True if user refused, skipped, or gave no relevant info" }
          },
          required: ["isSkipped"]
        }
      }
    });

    const text = response.text;
    if (!text) return { value: '', isSkipped: false };
    
    return JSON.parse(text) as ExtractionResult;
  } catch (error: any) {
    console.error("Gemini Extraction Error:", error);
    // Propagate quota errors specifically
    if (error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new GeminiError(error.message, 429);
    }
    return { value: '', isSkipped: false };
  }
};

/**
 * Generates neural speech from text using Gemini TTS.
 */
export const generateSpeech = async (text: string, lang: 'hi-IN' | 'en-US'): Promise<string | undefined> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = lang === 'hi-IN' 
      ? `कृपया इसे स्वाभाविक और स्पष्ट हिंदी में कहें: ${text}` 
      : `Say this naturally in English: ${text}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: ['AUDIO'], 
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return audioData;
  } catch (error: any) {
    // Check specifically for quota errors to help the UI decide on fallbacks
    if (error?.message?.includes('quota') || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
      console.warn("Gemini TTS Quota Exceeded (429).");
      throw new GeminiError(error.message, 429);
    } else {
      console.error("Gemini TTS Error:", error);
      throw error;
    }
  }
};