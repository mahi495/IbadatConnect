import { Occasion } from "./types";

export const ALL_SURAHS = [
  "Al-Fatihah", "Al-Baqarah", "Al-Imran", "An-Nisa", "Al-Ma'idah", "Al-An'am", "Al-A'raf", "Al-Anfal", "At-Tawbah", "Yunus",
  "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr", "An-Nahl", "Al-Isra", "Al-Kahf", "Maryam", "Ta-Ha",
  "Al-Anbiya", "Al-Hajj", "Al-Mu'minun", "An-Nur", "Al-Furqan", "Ash-Shu'ara", "An-Naml", "Al-Qasas", "Al-Ankabut", "Ar-Rum",
  "Luqman", "As-Sajdah", "Al-Ahzab", "Saba", "Fatir", "Ya-Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir",
  "Fussilat", "Ash-Shura", "Az-Zukhruf", "Ad-Dukhan", "Al-Jathiyah", "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf",
  "Adh-Dhariyat", "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman", "Al-Waqi'ah", "Al-Hadid", "Al-Mujadila", "Al-Hashr", "Al-Mumtahanah",
  "As-Saff", "Al-Jumu'ah", "Al-Munafiqun", "At-Taghabun", "At-Talaq", "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij",
  "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddaththir", "Al-Qiyamah", "Al-Insan", "Al-Mursalat", "An-Naba", "An-Nazi'at", "Abasa",
  "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Inshiqaq", "Al-Buruj", "At-Tariq", "Al-A'la", "Al-Ghashiyah", "Al-Fajr", "Al-Balad",
  "Ash-Shams", "Al-Layl", "Ad-Duhaa", "Ash-Sharh", "At-Tin", "Al-Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-Adiyat",
  "Al-Qari'ah", "At-Takathur", "Al-Asr", "Al-Humazah", "Al-Fil", "Quraysh", "Al-Ma'un", "Al-Kawthar", "Al-Kafirun", "An-Nasr",
  "Al-Masad", "Al-Ikhlas", "Al-Falaq", "An-Nas"
];

/**
 * Generates a unique ID (UUID v4) with fallback for non-secure contexts
 */
export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const normalizeIbadatName = (input: string): string => {
  if (!input) return input;
  let lower = input.toLowerCase().trim();

  // --- Urdu/Arabic to English Normalization ---
  const translations: Record<string, string> = {
    'درود خضری': 'Darood Khizri',
    'درود خظری': 'Darood Khizri',
    'درودِ خضری': 'Darood Khizri',
    'درود پاک': 'Salawat',
    'درود شریف': 'Salawat',
    'سبحان اللہ': 'Subhan Allah',
    'الحمدللہ': 'Alhamdulillah',
    'اللہ اکبر': 'Allahu Akbar',
    'استغفراللہ': 'Istighfar',
    'لا الہ الا اللہ': 'Kalma Tayyaba',
    'پہلا کلمہ': '1st Kalma',
    'دوسرا کلمہ': '2nd Kalma',
    'تیسرا کلمہ': '3rd Kalma',
    'سورہ یاسین': 'Surah Ya-Sin',
    'سورہ یٰسین': 'Surah Ya-Sin',
    'سورہ ملک': 'Surah Al-Mulk',
    'سورہ رحمن': 'Surah Ar-Rahman',
    'سورہ واقعہ': 'Surah Al-Waqi\'ah',
    'سورہ کہف': 'Surah Al-Kahf',
    'سورہ مزمل': 'Surah Al-Muzzammil',
    'سپارہ': 'Juz',
    'پارہ': 'Juz'
  };

  for (const [key, val] of Object.entries(translations)) {
    if (lower.includes(key)) return val;
  }

  // --- Surah Normalization ---
  if (lower.match(/^(surah\s+)?yase+n|ya-sin$/)) return 'Surah Ya-Sin';
  if (lower.match(/^(surah\s+)?(al-)?mulk$/)) return 'Surah Al-Mulk';
  if (lower.match(/^(surah\s+)?(ar-)?rahman$/)) return 'Surah Ar-Rahman';
  if (lower.match(/^(surah\s+)?(al-)?waqiah?$/)) return 'Surah Al-Waqi\'ah';
  if (lower.match(/^(surah\s+)?(al-)?kahf$/)) return 'Surah Al-Kahf';
  if (lower.match(/^(surah\s+)?(al-)?fatiha$/)) return 'Surah Al-Fatihah';
  if (lower.match(/^(surah\s+)?ikhlas$/)) return 'Surah Al-Ikhlas';
  if (lower.match(/^(surah\s+)?falaq$/)) return 'Surah Al-Falaq';
  if (lower.match(/^(surah\s+)?naas|nas$/)) return 'Surah An-Nas';
  if (lower.match(/^(surah\s+)?baqarah?$/)) return 'Surah Al-Baqarah';
  if (lower.match(/^(surah\s+)?jumu['`]?ah?$/)) return 'Surah Al-Jumu\'ah';
  
  // --- Verses ---
  if (lower.includes('kursi')) return 'Ayatul Kursi';
  if (lower.includes('amanar') && lower.includes('rasul')) return 'Amanar Rasul';
  if (lower.includes('kareema') || lower.includes('karima')) return 'Ayat Kareema';
  
  // --- Nawafil / Prayers ---
  if (lower.match(/tah+a*j+ud/)) return 'Tahajjud'; 
  if (lower.match(/ishra+q|ishra+k/)) return 'Ishraq'; 
  if (lower.match(/chasht|duha|doha/)) return 'Salat al-Duha'; 
  if (lower.match(/aw+ab+in/)) return 'Awwabin'; 
  if (lower.match(/wit+r|wit+ar/)) return 'Witr';

  // --- Zikr / Darood Specifics ---
  if (lower.includes('khizri')) return 'Darood Khizri';
  if (lower.includes('taaj') || lower.includes('taj')) return 'Darood Taj';
  if (lower.includes('shifa')) return 'Darood Shifa';
  if (lower.includes('tunjina') || lower.includes('tanjeena') || lower.includes('tunajjina')) return 'Darood Tanjeena';
  if (lower.includes('ibrahimi')) return 'Darood Ibrahimi';
  if (lower.includes('nariya')) return 'Darood Nariya';
  if (lower.includes('ghousia')) return 'Darood Ghousia';
  if (lower.includes('mahi')) return 'Darood Mahi';
  if (lower.includes('lakhi')) return 'Darood Lakhi';
  if (lower.includes('muqaddas')) return 'Darood Muqaddas';
  if (lower.includes('akbar')) return 'Darood Akbar';
  if (lower.includes('hazara')) return 'Darood Hazara';

  if (lower.includes('salawat') || lower.includes('durood') || lower.includes('darood')) {
      // Only normalize to generic "Salawat" if the user input was generic. 
      // Otherwise, preserve the specific name they typed (e.g., "Darood e Mustan").
      const generics = [
          'darood', 'darood sharif', 'darood shareef', 'darood pak', 'reading darood', 'sent darood',
          'durood', 'durood sharif', 'durood shareef', 'durood pak',
          'salawat', 'salavat', 'sending salawat'
      ];
      
      // Strict match for generic terms (allowing for basic punctuation/spaces)
      const cleanLower = lower.replace(/[^\w\s]/g, '');
      if (generics.some(g => cleanLower === g)) return 'Salawat';
      
      // If it contains "darood" but is not generic, return the Title Cased original input
      return input.replace(/\b\w/g, c => c.toUpperCase());
  }

  if (lower.includes('istighfar') || lower.includes('astaghfar')) return 'Istighfar';
  if (lower.includes('kalma') || lower.includes('kalima')) return 'Kalma';
  if (lower.includes('tasbeeh') || lower.includes('tasbih')) return 'Tasbeeh';
  if (lower.includes('tahlil') || lower.includes('la ilaha')) return 'Tahlil';
  
  // --- Juz normalization ---
  if (lower.includes('juz') || lower.includes('para') || lower.includes('sipara')) {
      const num = lower.match(/\d+/);
      if (num) return `Juz ${num[0]}`;
      return 'Quran Juz';
  }

  // Capitalize first letter of words for other cases
  return input.replace(/\b\w/g, c => c.toUpperCase());
};

export const findActiveOccasion = (occasions: Occasion[]): Occasion | null => {
  const today = new Date().toISOString().split('T')[0];
  const current = occasions.find(o => o.status === 'active' && today >= o.startDate && today <= o.endDate);
  if (current) return current;
  return occasions.filter(o => o.status === 'active').sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0] || null;
};