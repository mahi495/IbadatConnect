import { GoogleGenAI, Type } from "@google/genai";
import { ParseResult, IbadatCategory, IbadatEntry } from "../types";

const parseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      contributorName: {
        type: Type.STRING,
        description: "Standardized English name. Remove honorifics like 'Sister', 'Hafiz'. Convert Urdu names.",
      },
      category: {
        type: Type.STRING,
        enum: [
          IbadatCategory.QURAN,
          IbadatCategory.SURAH,
          IbadatCategory.VERSES,
          IbadatCategory.SALAWAT,
          IbadatCategory.ZIKR,
          IbadatCategory.NAWAFIL,
          IbadatCategory.OTHER
        ],
        description: "The category of the worship.",
      },
      ibadatType: {
        type: Type.STRING,
        description: "Standard English name. If a range is provided (e.g. Juz 1-5), this should represent one of the items in the expanded list.",
      },
      count: {
        type: Type.NUMBER,
        description: "Quantity. Use 1 for a single Juz read.",
      },
      unit: {
        type: Type.STRING,
        description: "Unit (times, rakat, juz, khatam).",
      },
      notes: {
        type: Type.STRING,
        description: "Spiritual intention or context (e.g. 'Eisaal-e-Sawab for grandmother', 'For sick child').",
      },
      performedDate: {
        type: Type.STRING,
        description: "ISO date (YYYY-MM-DD) extracted from log timestamp.",
      }
    },
    required: ["contributorName", "category", "ibadatType", "count", "unit", "performedDate"],
  },
};

export const parseWhatsAppMessages = async (text: string): Promise<ParseResult[]> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    TASK: Extract high-detail Islamic worship data from WhatsApp logs.
    
    CRITICAL RULES:
    1. RANGE EXPANSION: If a person says 'Juz 1 to 5' or 'Para 1-5', generate FIVE separate objects (one for Juz 1, one for Juz 2, etc.).
    2. MULTIPLE DEEDS: If a message says '100 Salawat and 1000 Astaghfar', generate TWO separate objects.
    3. INTENTION EXTRACTION: If they mention who they are praying for (e.g. 'for my mother', 'Eisaal-e-Sawab'), extract this into 'notes'.
    4. BILINGUAL SUPPORT: Handle Urdu (e.g., 'سپارہ', 'ختم', 'درود').
    5. SPECIFICITY: Preserve specific names. Do NOT generalize 'Darood Taj' to just 'Salawat'. Do NOT generalize 'Ayat Kareema' to just 'Verses'. Keep the full name of the deed found in text.
    6. STANDARDIZATION: Convert 'Surah Mulk' to 'Surah Al-Mulk', 'Yasin' to 'Surah Ya-Sin'.
    
    DATE FORMAT: Logs are M/D/YY. Convert to YYYY-MM-DD.
    
    INPUT LOGS:
    "${text}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: parseSchema,
        systemInstruction: "You are a professional Data Clerk for an Islamic School. You transform messy bilingual WhatsApp logs into structured, detailed accounting records of community prayers.",
      },
    });
    return response.text ? JSON.parse(response.text) : [];
  } catch (error) {
    console.error("Gemini parsing failed:", error);
    throw error;
  }
};

export const generatePersonalDua = async (entry: IbadatEntry): Promise<string> => {
    if (!process.env.API_KEY) throw new Error("API Key missing.");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Write a 30-word warm spiritual Dua for ${entry.contributorName} for ${entry.count} ${entry.ibadatType}${entry.notes ? ` (Intention: ${entry.notes})` : ''}.`;
    try {
      const response = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: prompt });
      return response.text || "May Allah accept your efforts.";
    } catch (e) { return "May Allah accept your efforts."; }
};

export const getTrendsAnalysis = async (entries: IbadatEntry[]): Promise<string> => {
  if (!process.env.API_KEY || entries.length === 0) return "Spiritual momentum is building up!";
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const summary = entries.slice(0, 100).map(e => `${e.ibadatType}: ${e.count}${e.notes ? ` (${e.notes})` : ''}`).join(', ');
  const prompt = `In 2 sentences, encourage the community based on these prayer counts and intentions: ${summary}`;
  try {
    const response = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: prompt });
    return response.text || "MashAllah, beautiful efforts by the community.";
  } catch (e) { return "Spiritual progress is excellent."; }
};