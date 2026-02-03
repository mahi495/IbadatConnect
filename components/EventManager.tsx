import React, { useState } from 'react';
import { Occasion } from '../types';
import { Calendar, Plus, Trash2, CalendarRange, Edit2, Link as LinkIcon, Check, X, Loader2, LayoutGrid, List, AlertOctagon, Archive, ShieldAlert } from 'lucide-react';
import { db } from '../services/database';

interface EventManagerProps {
  occasions: Occasion[];
  onSave: (occasion: Occasion) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  activeOccasionId: string;
  setActiveOccasionId: (id: string) => void;
}

export const EventManager: React.FC<EventManagerProps> = ({ 
  occasions, 
  onSave,
  onDelete,
  onArchive,
  activeOccasionId,
  setActiveOccasionId 
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isArchiving, setIsArchiving] = useState<string | null>(null);
  
  // View State
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarDate, setCalendarDate] = useState(new Date());

  const [formData, setFormData] = useState<Omit<Occasion, 'id'>>({
    title: '',
    description: '',
    startDate: new Date().toISOString().split('T', 1)[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T', 1)[0],
    status: 'active',
    webhookUrl: ''
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      startDate: new Date().toISOString().split('T', 1)[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T', 1)[0],
      status: 'active',
      webhookUrl: ''
    });
    setEditingId(null);
    setIsFormOpen(false);
    setIsSaving(false);
  };

  const startCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const startEdit = (occasion: Occasion) => {
    setFormData({
      title: occasion.title,
      description: occasion.description,
      startDate: occasion.startDate,
      endDate: occasion.endDate,
      status: occasion.status,
      webhookUrl: occasion.webhookUrl || ''
    });
    setEditingId(occasion.id);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const id = editingId || crypto.randomUUID();
      const occasion: Occasion = { ...formData, id };
      await onSave(occasion);
      if (!editingId) setActiveOccasionId(id);
      resetForm();
    } catch (error) {
      console.error(error);
      setIsSaving(false);
      alert('Failed to save event.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this event? All data for this event will be lost permanently.')) {
      try {
        await onDelete(id);
        if (activeOccasionId === id) setActiveOccasionId(occasions.find(o => o.id !== id)?.id || '');
      } catch (error) { alert('Failed to delete event.'); }
    }
  };

  const handleArchive = async (id: string) => {
    const occasion = occasions.find(o => o.id === id);
    if (!occasion) return;

    if (confirm(`Archive and Consolidate "${occasion.title}"?\n\nThis will:\n1. Sum all identical deeds (e.g., all Juz 1 become a total count).\n2. Delete all individual contributor records to save space.\n3. Mark this event as archived.\n\nTHIS CANNOT BE UNDONE.`)) {
      setIsArchiving(id);
      try {
        await onArchive(id);
      } catch (error) {
        alert('Failed to archive event.');
        console.error(error);
      } finally {
        setIsArchiving(null);
      }
    }
  };

  const handleClearAllEntries = async () => {
      if (confirm('⚠️ Permanently delete ALL entries from ALL events? This will reset the app data.')) {
          setIsClearing(true);
          try {
              await db.deleteAllEntries();
              alert('Successfully cleared all entries.');
              window.location.reload();
          } catch (error) { alert('Failed to clear entries.'); }
          finally { setIsClearing(false); }
      }
  };

  const copyEventLink = (id: string) => {
    const url = `${window.location.protocol}//${window.location.host}${window.location.pathname}?mode=public&eventId=${id}`;
    navigator.clipboard.writeText(url).then(() => alert('Link copied!'));
  };

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(calendarDate);
    const firstDay = getFirstDayOfMonth(calendarDate);
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="h-32 bg-gray-50/30 border border-gray-100/50"></div>);
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const daysEvents = occasions.filter(o => dateStr >= o.startDate && dateStr <= o.endDate);
      const isToday = new Date().toISOString().split('T')[0] === dateStr;
      days.push(
        <div key={day} className={`h-32 border border-gray-100 p-2 relative group hover:bg-gray-50 transition-colors ${isToday ? 'bg-emerald-50/50' : 'bg-white'}`}>
          <div className="flex justify-between items-start"><span className={`text-sm font-semibold ${isToday ? 'bg-emerald-600 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-sm' : 'text-gray-700'}`}>{day}</span></div>
          <div className="mt-2 space-y-1 overflow-y-auto max-h-[85px] scrollbar-thin scrollbar-thumb-gray-200">
            {daysEvents.map(event => (
              <button key={event.id} onClick={(e) => { e.stopPropagation(); startEdit(event); }} className={`w-full text-left text-[10px] px-1.5 py-1 rounded truncate transition-all ${event.status === 'active' ? 'bg-emerald-100 text-emerald-800' : event.status === 'archived' ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-800'}`}>
                {event.title}
              </button>
            ))}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 font-arabic">Events Management</h2>
          <p className="text-gray-500">Create, finalize, and archive campaigns.</p>
        </div>
        <div className="flex items-center gap-3">
          {!isFormOpen && (
            <>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}><List size={20} /></button>
                <button onClick={() => setViewMode('calendar')} className={`p-2 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}><LayoutGrid size={20} /></button>
              </div>
              <button onClick={startCreate} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-2 shadow-sm"><Plus size={20} /> New Event</button>
            </>
          )}
        </div>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl border border-emerald-200 shadow-sm animate-fade-in">
          <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg text-emerald-800">{editingId ? 'Edit Event' : 'Create New Event'}</h3><button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X size={20} /></button></div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label><input required className="w-full rounded-lg bg-white text-gray-900 border-gray-300 focus:ring-emerald-500" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label><input type="date" required className="w-full rounded-lg border-gray-300" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">End Date</label><input type="date" required className="w-full rounded-lg border-gray-300" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} /></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select className="w-full rounded-lg border-gray-300" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                <option value="active">Active (Collecting)</option>
                <option value="completed">Completed (View Only)</option>
                <option value="archived" disabled={true}>Archived (Finalized Summary)</option>
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea className="w-full rounded-lg border-gray-300" rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
            <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={resetForm} className="px-4 py-2 text-gray-600">Cancel</button><button type="submit" disabled={isSaving} className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2">{isSaving && <Loader2 size={18} className="animate-spin" />} Save</button></div>
          </form>
        </div>
      )}

      {viewMode === 'list' ? (
        <div className="grid gap-4">
          {occasions.map(occasion => (
            <div key={occasion.id} className={`p-5 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${activeOccasionId === occasion.id ? 'bg-emerald-50 border-emerald-500 ring-1' : 'bg-white border-gray-200 hover:border-emerald-300'}`}>
              <div className="flex-1 cursor-pointer" onClick={() => setActiveOccasionId(occasion.id)}>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-800">{occasion.title}</h3>
                  {occasion.status === 'archived' && <span className="text-[10px] bg-slate-500 text-white px-2 py-0.5 rounded-full uppercase font-bold flex items-center gap-1"><ShieldAlert size={10} /> Archived & Consolidated</span>}
                  {occasion.status === 'completed' && <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded uppercase font-bold">Completed</span>}
                  {activeOccasionId === occasion.id && occasion.status !== 'archived' && <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded uppercase font-bold">Active View</span>}
                </div>
                <p className="text-sm text-gray-600 mb-2 line-clamp-1">{occasion.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500"><span className="flex items-center gap-1"><CalendarRange size={14} />{new Date(occasion.startDate).toLocaleDateString()} - {new Date(occasion.endDate).toLocaleDateString()}</span></div>
              </div>
              <div className="flex items-center gap-1">
                {occasion.status !== 'archived' ? (
                  <button onClick={() => handleArchive(occasion.id)} disabled={isArchiving === occasion.id} className="text-amber-600 hover:bg-amber-50 px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-bold border border-transparent hover:border-amber-200 transition-all" title="Archive & Consolidate">
                    {isArchiving === occasion.id ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />}
                    Archive
                  </button>
                ) : (
                  <div className="text-slate-400 p-2 text-xs font-medium flex items-center gap-1.5 grayscale opacity-50">
                    <Archive size={16} /> Finalized
                  </div>
                )}
                <button onClick={() => copyEventLink(occasion.id)} className="text-emerald-600 hover:bg-emerald-100 p-2 rounded-lg" title="Copy Link"><LinkIcon size={18} /></button>
                <button onClick={() => startEdit(occasion)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg" title="Edit"><Edit2 size={18} /></button>
                <button onClick={() => handleDelete(occasion.id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg" title="Delete"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-xl overflow-hidden">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="bg-gray-50 p-2 text-center text-xs font-bold text-gray-500 uppercase">{d}</div>)}
          {renderCalendar()}
        </div>
      )}

      <div className="mt-12 p-6 rounded-2xl border border-red-100 bg-red-50/30">
          <div className="flex items-center gap-2 text-red-800 font-bold mb-2"><AlertOctagon size={20} /><h3>Danger Zone</h3></div>
          <p className="text-sm text-red-600 mb-4">Wipe all entries across all campaigns. This cannot be undone.</p>
          <button onClick={handleClearAllEntries} disabled={isClearing} className="flex items-center gap-2 bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-600 hover:text-white transition-all text-sm font-bold shadow-sm">{isClearing ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />} Clear All Data</button>
      </div>
    </div>
  );
};