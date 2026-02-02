import { GoogleGenAI, Type } from "@google/genai";
import { ParseResult, IbadatCategory, IbadatEntry } from "../types";

const parseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      contributorName: {
        type: Type.STRING,
        description: "The name of the person performing the deed. Use 'Community Member' if not found.",
      },
      category: {
        type: Type.STRING,
        enum: [
          IbadatCategory.QURAN,
          IbadatCategory.SURAH,
          IbadatCategory.VERSES,
          IbadatCategory.ZIKR,
          IbadatCategory.NAWAFIL,
          IbadatCategory.OTHER
        ],
        description: "The category of the worship.",
      },
      ibadatType: {
        type: Type.STRING,
        description: "The specific name of worship (e.g., 'Juz 30', 'Salawat', 'Surah Yasin'). Normalize common spellings (e.g., Yaseen -> Surah Yasin).",
      },
      count: {
        type: Type.NUMBER,
        description: "The numeric amount performed.",
      },
      unit: {
        type: Type.STRING,
        description: "The unit of measurement (e.g., 'times', 'juz', 'rakat', 'cycles').",
      },
    },
    required: ["contributorName", "category", "ibadatType", "count", "unit"],
  },
};

export const parseWhatsAppMessages = async (text: string): Promise<ParseResult[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    You are an assistant for an Islamic school. Your task is to extract "Ibadat" (acts of worship) data from unstructured WhatsApp chat logs or text messages.
    
    The text may contain reports about:
    - Quran (Juz, Para, Khatam)
    - Surahs (Yasin, Mulk, Kahf, etc.)
    - Verses (Ayatul Kursi, specific Ayaats)
    - Words/Zikr (Salawat, Istighfar, Kalma, Tasbeeh)
    - Specific Daroods (Darood Taj, Darood Khizri, Darood Shifa, etc.)
    - Nawafil (Prayers, Rakat)
    
    Please extract a structured list of these deeds.
    
    Rules:
    1. Ignore system messages.
    2. Normalize Ibadat names strongly (e.g., "Para 1" -> "Juz 1", "Yaseen" -> "Surah Yasin").
    3. IMPORTANT: For Darood/Salawat: If a specific name is given (e.g. "Darood Taj", "Darood Khizri"), keep the specific name. If just "Darood" or "Salawat" is used, use "Salawat".
    4. Determine the correct Category for each deed.
    5. If a range is given (e.g., "Juz 1-5"), calculate the count (which is 5).
    6. If no name is provided, use "Community Member".
    
    Input Text:
    "${text}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: parseSchema,
        systemInstruction: "You are a precise data extractor for Islamic spiritual activities.",
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as ParseResult[];
    }
    return [];
  } catch (error) {
    console.error("Error parsing with Gemini:", error);
    throw error;
  }
};

export const generatePersonalDua = async (entry: IbadatEntry): Promise<string> => {
    if (!process.env.API_KEY) {
      throw new Error("API Key is missing.");
    }
  
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
    const prompt = `
      Create a short, heartwarming, and spiritual Dua (prayer) for ${entry.contributorName} who has just completed: ${entry.count} ${entry.unit} of ${entry.ibadatType}.
      The dua should ask Allah to accept their deed, grant them Barakah, and fulfill their lawful wishes. Keep it under 50 words.
    `;
  
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
  
      return response.text || "May Allah accept your efforts.";
    } catch (error) {
      console.error("Error generating dua:", error);
      return "May Allah accept your efforts and grant you the best in this world and the hereafter.";
    }
};

export const normalizeDeedWithAI = async (text: string, category: string): Promise<string> => {
  if (!process.env.API_KEY) return text;
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Standardize this Islamic deed name into a clean, canonical format (e.g. "surah yasin" -> "Surah Yasin"). Input: "${text}". Category: "${category}". Return ONLY the cleaned string.`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text?.trim() || text;
  } catch (e) {
    return text;
  }
};

export const getTrendsAnalysis = async (entries: IbadatEntry[]): Promise<string> => {
  if (!process.env.API_KEY || entries.length === 0) return "No data to analyze.";

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Summarize data to save tokens
  const summary = entries.map(e => `${e.category}: ${e.ibadatType} (${e.count})`).join('\n').substring(0, 5000);

  const prompt = `
    Analyze these acts of worship contributed by a community:
    ${summary}
    
    Provide a 2-sentence encouraging insight about the community's spiritual focus. Mention the most popular deed type.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "MashAllah, the community is doing great.";
  } catch (e) {
    return "Analysis unavailable.";
  }
};