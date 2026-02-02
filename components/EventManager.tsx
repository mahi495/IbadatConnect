import React, { useState } from 'react';
import { Occasion } from '../types';
import { Calendar, Plus, Trash2, CalendarRange, Edit2, Link as LinkIcon, Check, X, Globe, Loader2, LayoutGrid, List, ChevronLeft, ChevronRight } from 'lucide-react';

interface EventManagerProps {
  occasions: Occasion[];
  onSave: (occasion: Occasion) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  activeOccasionId: string;
  setActiveOccasionId: (id: string) => void;
}

export const EventManager: React.FC<EventManagerProps> = ({ 
  occasions, 
  onSave,
  onDelete,
  activeOccasionId,
  setActiveOccasionId 
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // View State
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarDate, setCalendarDate] = useState(new Date());

  const [formData, setFormData] = useState<Omit<Occasion, 'id'>>({
    title: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'active',
    webhookUrl: ''
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
      
      if (!editingId) {
        setActiveOccasionId(id);
      }
      resetForm();
    } catch (error) {
      console.error(error);
      setIsSaving(false);
      alert('Failed to save event. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this event? All associated data will still exist but may be orphaned.')) {
      try {
        await onDelete(id);
        if (activeOccasionId === id) {
          setActiveOccasionId(occasions.find(o => o.id !== id)?.id || '');
        }
      } catch (error) {
        console.error(error);
        alert('Failed to delete event.');
      }
    }
  };

  const copyEventLink = (id: string) => {
    const url = `${window.location.protocol}//${window.location.host}${window.location.pathname}?mode=public&eventId=${id}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('Direct link for this event copied to clipboard!');
    });
  };

  // --- Calendar Logic ---

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handlePrevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(calendarDate);
    const firstDay = getFirstDayOfMonth(calendarDate);
    const days = [];

    // Empty cells for days before the 1st
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-32 bg-gray-50/30 border border-gray-100/50"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // Find events active on this day
      const daysEvents = occasions.filter(o => 
        dateStr >= o.startDate && dateStr <= o.endDate
      );

      const isToday = new Date().toISOString().split('T')[0] === dateStr;

      days.push(
        <div key={day} className={`h-32 border border-gray-100 p-2 relative group hover:bg-gray-50 transition-colors ${isToday ? 'bg-emerald-50/50' : 'bg-white'}`}>
          <div className="flex justify-between items-start">
             <span className={`text-sm font-semibold ${isToday ? 'bg-emerald-600 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-sm' : 'text-gray-700'}`}>
               {day}
             </span>
             {daysEvents.length > 0 && (
               <span className="text-[10px] text-gray-400 font-medium">{daysEvents.length} active</span>
             )}
          </div>
          
          <div className="mt-2 space-y-1 overflow-y-auto max-h-[85px] scrollbar-thin scrollbar-thumb-gray-200">
            {daysEvents.map(event => (
              <button
                key={event.id}
                onClick={(e) => {
                  e.stopPropagation();
                  startEdit(event);
                }}
                className={`w-full text-left text-[10px] px-1.5 py-1 rounded truncate transition-all ${
                   event.status === 'active' 
                   ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-200' 
                   : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                }`}
                title={`${event.title} (${event.status})`}
              >
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
          <p className="text-gray-500">Create and manage your collection campaigns.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {!isFormOpen && (
            <>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
                  title="List View"
                >
                  <List size={20} />
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
                  title="Calendar View"
                >
                  <LayoutGrid size={20} />
                </button>
              </div>

              <button
                onClick={startCreate}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-2 shadow-sm"
              >
                <Plus size={20} /> New Event
              </button>
            </>
          )}
        </div>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl border border-emerald-200 shadow-sm animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-emerald-800">
              {editingId ? 'Edit Event' : 'Create New Event'}
            </h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
              <input
                required
                className="w-full rounded-lg bg-white text-gray-900 border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="e.g. Ramadan 2025 Khatam"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  className="w-full rounded-lg bg-white text-gray-900 border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
                  value={formData.startDate}
                  onChange={e => setFormData({...formData, startDate: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date (Dua Day)</label>
                <input
                  type="date"
                  required
                  className="w-full rounded-lg bg-white text-gray-900 border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
                  value={formData.endDate}
                  onChange={e => setFormData({...formData, endDate: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full rounded-lg bg-white text-gray-900 border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
                rows={2}
                placeholder="Briefly describe what you are collecting..."
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Globe size={14} className="text-blue-500"/> 
                External Webhook URL (Optional)
              </label>
              <input
                type="url"
                className="w-full rounded-lg bg-white text-gray-900 border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="https://hooks.zapier.com/..."
                value={formData.webhookUrl}
                onChange={e => setFormData({...formData, webhookUrl: e.target.value})}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter a webhook from Zapier, Make, or Airtable to instantly send submissions to your online spreadsheet.
              </p>
            </div>

            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
               <select 
                 className="w-full rounded-lg bg-white text-gray-900 border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
                 value={formData.status}
                 onChange={e => setFormData({...formData, status: e.target.value as 'active' | 'completed'})}
               >
                 <option value="active">Active</option>
                 <option value="completed">Completed (Archived)</option>
               </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button 
                type="button"
                onClick={resetForm}
                disabled={isSaving}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                {editingId ? 'Update Event' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW CONTENT */}
      {viewMode === 'list' ? (
        /* LIST VIEW */
        <div className="grid gap-4">
          {occasions.map(occasion => (
            <div 
              key={occasion.id}
              className={`p-5 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${
                activeOccasionId === occasion.id 
                  ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' 
                  : 'bg-white border-gray-200 hover:border-emerald-300'
              }`}
            >
              <div 
                className="flex-1 cursor-pointer"
                onClick={() => setActiveOccasionId(occasion.id)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-800">{occasion.title}</h3>
                  {activeOccasionId === occasion.id && (
                    <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full">Active View</span>
                  )}
                  {occasion.status === 'completed' && (
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Archived</span>
                  )}
                  {occasion.webhookUrl && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Globe size={10} /> Online
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">{occasion.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <CalendarRange size={14} />
                    {new Date(occasion.startDate).toLocaleDateString()} - {new Date(occasion.endDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-1 self-end md:self-center">
                <button
                  onClick={() => copyEventLink(occasion.id)}
                  className="text-emerald-600 hover:bg-emerald-100 p-2 rounded-lg flex items-center gap-1 text-sm font-medium"
                  title="Copy Invite Link"
                >
                  <LinkIcon size={18} />
                  <span className="md:hidden">Copy Link</span>
                </button>
                
                <button 
                  onClick={() => startEdit(occasion)}
                  className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg"
                  title="Edit Event"
                >
                  <Edit2 size={18} />
                </button>

                <button 
                  onClick={() => handleDelete(occasion.id)}
                  className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg"
                  title="Delete Event"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}

          {occasions.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No events found. Create one to get started.</p>
            </div>
          )}
        </div>
      ) : (
        /* CALENDAR VIEW */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
           {/* Calendar Nav */}
           <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-4">
                 <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                   <ChevronLeft size={20} className="text-gray-600" />
                 </button>
                 <h3 className="font-bold text-gray-800 text-lg w-40 text-center">
                   {monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}
                 </h3>
                 <button onClick={handleNextMonth} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                   <ChevronRight size={20} className="text-gray-600" />
                 </button>
              </div>
              <button 
                onClick={() => setCalendarDate(new Date())}
                className="text-xs font-medium text-emerald-600 hover:underline"
              >
                Jump to Today
              </button>
           </div>
           
           {/* Weekday Header */}
           <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-center">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="py-2 text-xs font-bold text-gray-500 uppercase tracking-wide">
                  {day}
                </div>
              ))}
           </div>
           
           {/* Days Grid */}
           <div className="grid grid-cols-7 bg-white">
              {renderCalendar()}
           </div>
        </div>
      )}
    </div>
  );
};