import React, { useState } from 'react';
import { IbadatEntry, IbadatCategory, Occasion } from '../types';
import { X, Save, Trash2, Calendar } from 'lucide-react';
import { normalizeIbadatName } from '../utils';

interface EditEntryModalProps {
  entry: IbadatEntry;
  occasions: Occasion[];
  onSave: (updatedEntry: IbadatEntry) => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
}

export const EditEntryModal: React.FC<EditEntryModalProps> = ({ 
  entry, 
  occasions, 
  onSave, 
  onCancel,
  onDelete
}) => {
  const [formData, setFormData] = useState({
    occasionId: entry.occasionId,
    contributorName: entry.contributorName,
    category: entry.category,
    ibadatType: entry.ibadatType,
    count: entry.count,
    unit: entry.unit
  });

  const categoryDefaults: Record<IbadatCategory, { unit: string, placeholder: string }> = {
    [IbadatCategory.QURAN]: { unit: 'juz', placeholder: 'e.g., Juz 1, Khatam' },
    [IbadatCategory.SURAH]: { unit: 'times', placeholder: 'e.g., Surah Yasin' },
    [IbadatCategory.VERSES]: { unit: 'times', placeholder: 'e.g., Ayatul Kursi' },
    [IbadatCategory.ZIKR]: { unit: 'times', placeholder: 'e.g., Salawat, Istighfar' },
    [IbadatCategory.NAWAFIL]: { unit: 'rakat', placeholder: 'e.g., Tahajjud, Ishraq' },
    [IbadatCategory.OTHER]: { unit: 'times', placeholder: 'Any other good deed' },
  };

  const handleCategoryChange = (cat: IbadatCategory) => {
    // Only reset unit/type if category actually changes
    if (cat !== formData.category) {
        setFormData(prev => ({
        ...prev,
        category: cat,
        unit: categoryDefaults[cat].unit,
        // Optional: clear type or keep it? Usually better to clear to avoid mismatch
        // But for editing, user might just be fixing the category. Let's keep type unless blank.
        }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: IbadatEntry = {
      ...entry,
      occasionId: formData.occasionId,
      contributorName: formData.contributorName.trim() || 'Community Member',
      category: formData.category,
      ibadatType: normalizeIbadatName(formData.ibadatType || formData.category),
      count: Number(formData.count),
      unit: formData.unit,
    };
    onSave(updated);
  };

  const handleDelete = () => {
      if (confirm("Are you sure you want to delete this entry?")) {
          onDelete(entry.id);
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-emerald-50">
          <h3 className="text-lg font-bold text-emerald-800">Edit Contribution</h3>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 p-1">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
            {/* Occasion Switch */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event</label>
              <select
                className="w-full text-sm bg-white text-gray-900 border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                value={formData.occasionId}
                onChange={(e) => setFormData({...formData, occasionId: e.target.value})}
              >
                {occasions.map(o => (
                  <option key={o.id} value={o.id}>{o.title}</option>
                ))}
              </select>
            </div>

            {/* Contributor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contributor Name</label>
              <input
                type="text"
                className="w-full rounded-lg bg-white text-gray-900 border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
                value={formData.contributorName}
                onChange={e => setFormData({ ...formData, contributorName: e.target.value })}
                placeholder="Community Member"
              />
            </div>

             {/* Category */}
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <div className="flex flex-wrap gap-2">
                {Object.values(IbadatCategory).map((cat) => (
                    <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryChange(cat)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                        formData.category === cat
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-emerald-50'
                    }`}
                    >
                    {cat}
                    </button>
                ))}
                </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-1 gap-4">
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specific Deed</label>
                <input
                    type="text"
                    required
                    placeholder={categoryDefaults[formData.category].placeholder}
                    className="w-full rounded-lg bg-white text-gray-900 border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.ibadatType}
                    onChange={e => setFormData({ ...formData, ibadatType: e.target.value })}
                />
                </div>

                <div className="flex gap-4">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Count</label>
                    <input
                        type="number"
                        min="1"
                        required
                        className="w-full rounded-lg bg-white text-gray-900 border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
                        value={formData.count}
                        onChange={e => setFormData({ ...formData, count: parseInt(e.target.value) || 0 })}
                    />
                </div>

                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                    <input
                    type="text"
                    className="w-full rounded-lg bg-white text-gray-900 border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    />
                </div>
                </div>
            </div>
            
            {entry.originalText && (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500 font-semibold mb-1">Original Import Text:</p>
                    <p className="text-xs text-gray-600 italic">"{entry.originalText}"</p>
                </div>
            )}
        </form>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
            <button 
                type="button"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
            >
                <Trash2 size={16} /> Delete
            </button>
            <div className="flex gap-2">
                <button 
                    onClick={onCancel}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSubmit}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium flex items-center gap-2 shadow-sm transition-colors"
                >
                    <Save size={16} /> Save Changes
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};