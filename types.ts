
export enum IbadatCategory {
  QURAN = 'Quran',
  SURAH = 'Surah',
  VERSES = 'Verses',
  ZIKR = 'Zikr/Words',
  NAWAFIL = 'Nawafil',
  OTHER = 'Other'
}

export interface IbadatEntry {
  id: string;
  occasionId: string;
  contributorName: string;
  category: IbadatCategory;
  ibadatType: string; // e.g., "Quran Juz", "Surah Yasin"
  count: number;
  unit: string; // "times", "juz", "pages"
  originalText?: string;
  dateAdded: string;
}

export interface Occasion {
  id: string;
  title: string;
  startDate: string; // ISO Date string YYYY-MM-DD
  endDate: string;   // ISO Date string YYYY-MM-DD
  description: string;
  status: 'active' | 'completed';
  webhookUrl?: string; // URL to POST data to (e.g. Zapier, Make, Airtable)
}

export interface ParseResult {
  contributorName: string;
  category: IbadatCategory;
  ibadatType: string;
  count: number;
  unit: string;
}

export enum ViewMode {
  DASHBOARD = 'DASHBOARD',
  IMPORT = 'IMPORT',
  MANUAL_ENTRY = 'MANUAL_ENTRY',
  OCCASIONS = 'OCCASIONS',
  DUA_MODE = 'DUA_MODE',
  PUBLIC_FORM = 'PUBLIC_FORM',
  EVENT_MANAGER = 'EVENT_MANAGER',
  ENTRIES_LIST = 'ENTRIES_LIST'
}

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}
