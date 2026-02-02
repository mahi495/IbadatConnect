import React, { useState } from 'react';
import { Occasion } from '../types';
import { Calendar, Plus, Trash2, CalendarRange, Edit2, Link as LinkIcon, Check, X, Globe } from 'lucide-react';

interface EventManagerProps {
  occasions: Occasion[];
  setOccasions: React.Dispatch<React.SetStateAction<Occasion[]>>;
  activeOccasionId: string;
  setActiveOccasionId: (id: string) => void;
}

export const EventManager: React.FC<EventManagerProps> = ({ 
  occasions, 
  setOccasions, 
  activeOccasionId,
  setActiveOccasionId 
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      // Update existing
      setOccasions(prev => prev.map(o => o.id === editingId ? { ...formData, id: editingId } : o));
    } else {
      // Create new
      const id = crypto.randomUUID();
      const occasion: Occasion = { ...formData, id };
      setOccasions(prev => [...prev, occasion]);
      setActiveOccasionId(id);
    }
    
    resetForm();
  };

  const deleteOccasion = (id: string) => {
    if (confirm('Are you sure you want to delete this event? All associated data will still exist but may be orphaned.')) {
      setOccasions(prev => prev.filter(o => o.id !== id));
      if (activeOccasionId === id) {
        setActiveOccasionId(occasions.find(o => o.id !== id)?.id || '');
      }
    }
  };

  const copyEventLink = (id: string) => {
    const url = `${window.location.protocol}//${window.location.host}${window.location.pathname}?mode=public&eventId=${id}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('Direct link for this event copied to clipboard!');
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 font-arabic">Events Management</h2>
          <p className="text-gray-500">Create and manage your collection campaigns.</p>
        </div>
        {!isFormOpen && (
          <button
            onClick={startCreate}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-2"
          >
            <Plus size={20} /> New Event
          </button>
        )}
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
                className="w-full rounded-lg border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
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
                  className="w-full rounded-lg border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
                  value={formData.startDate}
                  onChange={e => setFormData({...formData, startDate: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date (Dua Day)</label>
                <input
                  type="date"
                  required
                  className="w-full rounded-lg border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
                  value={formData.endDate}
                  onChange={e => setFormData({...formData, endDate: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full rounded-lg border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
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
                className="w-full rounded-lg border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
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
                 className="w-full rounded-lg border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
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
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
              >
                <Check size={18} />
                {editingId ? 'Update Event' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      )}

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
                onClick={() => deleteOccasion(occasion.id)}
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
    </div>
  );
};
