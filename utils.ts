import { Occasion } from "./types";

export const normalizeIbadatName = (input: string): string => {
  if (!input) return input;
  const lower = input.toLowerCase().trim();

  // --- Surah Normalization ---
  if (lower.match(/^(surah\s+)?yase+n|ya-sin$/)) return 'Surah Yasin';
  if (lower.match(/^(surah\s+)?(al-)?mulk$/)) return 'Surah Mulk';
  if (lower.match(/^(surah\s+)?(ar-)?rahman$/)) return 'Surah Rahman';
  if (lower.match(/^(surah\s+)?(al-)?waqiah?$/)) return 'Surah Waqiah';
  if (lower.match(/^(surah\s+)?(al-)?kahf$/)) return 'Surah Kahf';
  if (lower.match(/^(surah\s+)?(al-)?fatiha$/)) return 'Surah Fatiha';
  if (lower.match(/^(surah\s+)?ikhlas$/)) return 'Surah Ikhlas';
  if (lower.match(/^(surah\s+)?falaq$/)) return 'Surah Falaq';
  if (lower.match(/^(surah\s+)?naas|nas$/)) return 'Surah Nas';
  if (lower.match(/^(surah\s+)?baqarah?$/)) return 'Surah Baqarah';
  if (lower.match(/^(surah\s+)?jumu['`]?ah?$/)) return 'Surah Jumuah';
  
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
