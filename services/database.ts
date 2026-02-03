import { supabase } from './supabaseClient';
import { IbadatEntry, Occasion, IbadatCategory } from '../types';
import { normalizeIbadatName, generateId } from '../utils';

// Track schema support to avoid repeated errors
let supportsPerformedDate = true;
let supportsNotes = true;

// Map App Types to DB Snake Case
const mapEntryToDb = (e: IbadatEntry, checkSchema: boolean = true) => {
  const base: any = {
    id: e.id,
    occasion_id: e.occasionId,
    contributor_name: e.contributorName,
    category: e.category,
    ibadat_type: e.ibadatType,
    count: e.count,
    unit: e.unit,
    original_text: e.originalText || null,
    date_added: e.dateAdded,
  };

  if (checkSchema) {
    if (supportsPerformedDate) base.performed_date = e.performedDate;
    if (supportsNotes) base.notes = e.notes || null;
  }

  return base;
};

const mapEntryFromDb = (e: any): IbadatEntry => ({
  id: e.id,
  occasionId: e.occasion_id,
  contributorName: e.contributor_name,
  category: e.category,
  ibadatType: e.ibadat_type,
  count: e.count,
  unit: e.unit,
  notes: e.notes || undefined,
  originalText: e.original_text,
  dateAdded: e.date_added,
  performedDate: e.performed_date || e.date_added?.split('T')[0] || new Date().toISOString().split('T')[0]
});

const mapOccasionToDb = (o: Occasion) => ({
  id: o.id,
  title: o.title,
  start_date: o.startDate,
  end_date: o.endDate,
  description: o.description,
  status: o.status,
  webhook_url: o.webhookUrl || null
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
    const { error } = await supabase.from('occasions').delete().eq('id', id);
    if (error) throw error;
  },

  async getEntries() {
    const { data, error } = await supabase.from('entries').select('*');
    
    if (error) {
        // If columns don't exist, retry with minimal safe selection
        if (error.code === '42703') {
            const { data: fallbackData, error: fallbackError } = await supabase
                .from('entries')
                .select('id, occasion_id, contributor_name, category, ibadat_type, count, unit, original_text, date_added');
            
            if (fallbackError) throw fallbackError;
            return (fallbackData || []).map(mapEntryFromDb);
        }
        console.error("Error fetching entries:", error);
        return [];
    }
    return (data || []).map(mapEntryFromDb);
  },

  async saveEntries(entries: IbadatEntry[]) {
    if (entries.length === 0) return;
    
    const { error } = await supabase.from('entries').upsert(entries.map(e => mapEntryToDb(e, true)));
    
    if (error) {
        // Handle "Undefined Column" by retrying without new columns
        if (error.code === '42703') {
            if (error.message.includes('performed_date')) supportsPerformedDate = false;
            if (error.message.includes('notes')) supportsNotes = false;
            
            const { error: retryError } = await supabase.from('entries').upsert(entries.map(e => mapEntryToDb(e, true)));
            if (retryError) throw retryError;
        } else {
            throw error;
        }
    }
  },
  
  async updateEntry(entry: IbadatEntry) {
      const { error } = await supabase.from('entries').upsert(mapEntryToDb(entry, true));
      if (error && error.code === '42703') {
          if (error.message.includes('performed_date')) supportsPerformedDate = false;
          if (error.message.includes('notes')) supportsNotes = false;
          const { error: retryError } = await supabase.from('entries').upsert(mapEntryToDb(entry, true));
          if (retryError) throw retryError;
      } else if (error) throw error;
  },

  async deleteEntry(id: string) {
    const { error } = await supabase.from('entries').delete().eq('id', id);
    if (error) throw error;
  },

  async deleteEntries(ids: string[]) {
    if (ids.length === 0) return;
    const { error } = await supabase.from('entries').delete().in('id', ids);
    if (error) throw error;
  },

  async deleteAllEntries() {
    const { error } = await supabase.from('entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
  },

  async archiveOccasion(occasionId: string): Promise<IbadatEntry[]> {
    const entries = await this.getEntries();
    const occasionEntries = entries.filter(e => e.occasionId === occasionId);

    if (occasionEntries.length === 0) {
      await supabase.from('occasions').update({ status: 'archived' }).eq('id', occasionId);
      return [];
    }

    const aggregated = occasionEntries.reduce((acc, curr) => {
      const normalizedName = normalizeIbadatName(curr.ibadatType);
      const key = `${normalizedName}-${curr.unit.toLowerCase()}-${curr.category}`;
      
      if (!acc[key]) {
        acc[key] = {
          id: generateId(),
          occasionId: occasionId,
          contributorName: 'Consolidated Archive',
          category: curr.category,
          ibadatType: normalizedName,
          count: 0,
          unit: curr.unit,
          notes: 'Consolidated from individual records',
          dateAdded: new Date().toISOString(),
          performedDate: new Date().toISOString().split('T')[0]
        };
      }
      acc[key].count += curr.count;
      return acc;
    }, {} as Record<string, IbadatEntry>);

    const summaryEntries = Object.values(aggregated) as IbadatEntry[];
    const { error: deleteError } = await supabase.from('entries').delete().eq('occasion_id', occasionId);
    if (deleteError) throw deleteError;
    await this.saveEntries(summaryEntries);
    await supabase.from('occasions').update({ status: 'archived' }).eq('id', occasionId);
    return summaryEntries;
  }
};