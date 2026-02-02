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

export const normalizeIbadatName = (input: string): string => {
  if (!input) return input;
  const lower = input.toLowerCase().trim();

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
  
  // --- Nawafil / Prayers (Fixing Spelling Issues) ---
  // Matches tahajjud, tahhajud, tahajud, tahajad
  if (lower.match(/tah+a*j+ud/)) return 'Tahajjud'; 
  
  // Matches ishraq, ishrak
  if (lower.match(/ishra+q|ishra+k/)) return 'Ishraq'; 
  
  // Matches duha, doha, chasht
  if (lower.match(/chasht|duha|doha/)) return 'Salat al-Duha'; 
  
  // Matches awwabin, awabin
  if (lower.match(/aw+ab+in/)) return 'Awwabin'; 
  
  // Matches witr, witar
  if (lower.match(/wit+r|wit+ar/)) return 'Witr';

  // --- Zikr ---
  if (lower.includes('salawat') || lower.includes('durood') || lower.includes('darood')) return 'Salawat';
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
  
  // First try to find one where today is within range
  const current = occasions.find(o => 
    o.status === 'active' && 
    today >= o.startDate && 
    today <= o.endDate
  );
  
  if (current) return current;

  // Fallback: Find the upcoming one or the most recently created active one
  return occasions.filter(o => o.status === 'active').sort((a, b) => 
    new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
  )[0] || null;
};