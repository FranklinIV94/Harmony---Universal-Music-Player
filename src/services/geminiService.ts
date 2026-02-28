import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface SmartSearchResult {
  title: string;
  artist: string;
  platform: 'spotify' | 'apple_music' | 'youtube' | 'local';
  reason: string;
}

export async function smartSearch(query: string): Promise<SmartSearchResult[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `The user wants to find music: "${query}". 
    Suggest 5 tracks that match this vibe across different platforms (Spotify, Apple Music, YouTube). 
    Return a JSON array of objects with title, artist, platform, and a short reason why it matches.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            artist: { type: Type.STRING },
            platform: { type: Type.STRING, enum: ['spotify', 'apple_music', 'youtube', 'local'] },
            reason: { type: Type.STRING }
          },
          required: ["title", "artist", "platform", "reason"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return [];
  }
}
