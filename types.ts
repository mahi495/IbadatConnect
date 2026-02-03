export enum IbadatCategory {
  QURAN = 'Quran',
  SURAH = 'Surah',
  VERSES = 'Verses',
  SALAWAT = 'Salawat/Darood', // Separated from Zikr for better reporting
  ZIKR = 'Zikr/Words',
  NAWAFIL = 'Nawafil',
  OTHER = 'Other'
}

export interface IbadatEntry {
  id: string;
  occasionId: string;
  contributorName: string;
  category: IbadatCategory;
  ibadatType: string; // e.g., "Darood Khizri", "Surah Yasin"
  count: number;
  unit: string; // "times", "juz", "pages", "khatam"
  notes?: string; // For spiritual intentions like "For late father"
  isKhatamPart?: boolean; // Flag to indicate if it's a full completion
  milestone?: string; // e.g., "Gyarwin Sharif", "Urs", "Rabi-ul-Awwal"
  originalText?: string;
  dateAdded: string;
  performedDate: string;
}

export interface Occasion {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  description: string;
  status: 'active' | 'completed' | 'archived';
  webhookUrl?: string;
}

export interface ParseResult {
  contributorName: string;
  category: IbadatCategory;
  ibadatType: string;
  count: number;
  unit: string;
  performedDate: string;
  notes?: string;
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