import { supabase } from './supabaseClient';
import { IbadatEntry, Occasion } from '../types';

// Map App Types to DB Snake Case
const mapEntryToDb = (e: IbadatEntry) => ({
  id: e.id,
  occasion_id: e.occasionId,
  contributor_name: e.contributorName,
  category: e.category,
  ibadat_type: e.ibadatType,
  count: e.count,
  unit: e.unit,
  original_text: e.originalText,
  date_added: e.dateAdded
});

const mapEntryFromDb = (e: any): IbadatEntry => ({
  id: e.id,
  occasionId: e.occasion_id,
  contributorName: e.contributor_name,
  category: e.category,
  ibadatType: e.ibadat_type,
  count: e.count,
  unit: e.unit,
  originalText: e.original_text,
  dateAdded: e.date_added
});

const mapOccasionToDb = (o: Occasion) => ({
  id: o.id,
  title: o.title,
  start_date: o.startDate,
  end_date: o.endDate,
  description: o.description,
  status: o.status,
  webhook_url: o.webhookUrl
});

const mapOccasionFromDb = (o: any): Occasion => ({
  id: o.id,
  title: o.title,
  startDate: o.start_date,
  endDate: o.end_date,
  description: o.description,
  status: o.status,
  webhookUrl: o.webhook_url
});

export const db = {
  async getOccasions() {
    const { data, error } = await supabase.from('occasions').select('*');
    if (error) {
        console.error("Error fetching occasions:", error);
        return [];
    }
    return data.map(mapOccasionFromDb);
  },

  async saveOccasion(occasion: Occasion) {
    const { error } = await supabase.from('occasions').upsert(mapOccasionToDb(occasion));
    if (error) throw error;
  },

  async deleteOccasion(id: string) {
    // Note: This might fail if foreign key constraints exist on entries without cascade delete
    // For now, we assume simple delete or handled by DB cascade
    const { error } = await supabase.from('occasions').delete().eq('id', id);
    if (error) throw error;
  },

  async getEntries() {
    const { data, error } = await supabase.from('entries').select('*');
    if (error) {
        console.error("Error fetching entries:", error);
        return [];
    }
    return data.map(mapEntryFromDb);
  },

  async saveEntries(entries: IbadatEntry[]) {
    if (entries.length === 0) return;
    const { error } = await supabase.from('entries').upsert(entries.map(mapEntryToDb));
    if (error) throw error;
  },
  
  async updateEntry(entry: IbadatEntry) {
      const { error } = await supabase.from('entries').upsert(mapEntryToDb(entry));
      if(error) throw error;
  },

  async deleteEntry(id: string) {
    const { error } = await supabase.from('entries').delete().eq('id', id);
    if (error) throw error;
  }
};