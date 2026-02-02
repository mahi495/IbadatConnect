import React, { useState, useMemo, useRef, useEffect } from 'react';
import { IbadatEntry, IbadatCategory, Occasion } from '../types';
import { Send, Plus, Minus, ScrollText, Calendar, Info, Sparkles, Loader2, History, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { normalizeIbadatName } from '../utils';
import { normalizeDeedWithAI } from '../services/geminiService';

interface ManualEntryFormProps {
  activeOccasion: Occasion;
  occasions?: Occasion[];
  existingEntries?: IbadatEntry[];
  onOccasionChange?: (id: string) => void;
  onAdd: (entries: IbadatEntry[]) => void;
}

// Levenshtein distance for fuzzy matching
const getLevenshteinDistance = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

export const ManualEntryForm: React.FC<ManualEntryFormProps> = ({ 
  activeOccasion, 
  occasions, 
  existingEntries = [],
  onOccasionChange, 
  onAdd 
}) => {
  // Global form state
  const [contributorName, setContributorName] = useState('');
  const [recentName, setRecentName] = useState('');

  // Current Input State
  const [currentInput, setCurrentInput] = useState({
    category: IbadatCategory.QURAN,
    ibadatType: '',
    count: 1,
    unit: 'juz'
  });

  // Staging List
  const [pendingEntries, setPendingEntries] = useState<Omit<IbadatEntry, 'id' | 'occasionId' | 'dateAdded' | 'contributorName'>[]>([]);
  const [similarityWarning, setSimilarityWarning] = useState<{ text: string, suggestion: string } | null>(null);

  const [isNormalizing, setIsNormalizing] = useState(false);
  const typeInputRef = useRef<HTMLInputElement>(null);

  const categoryDefaults: Record<IbadatCategory, { unit: string, placeholder: string }> = {
    [IbadatCategory.QURAN]: { unit: 'juz', placeholder: 'e.g., Juz 1, Khatam' },
    [IbadatCategory.SURAH]: { unit: 'times', placeholder: 'e.g., Surah Yasin' },
    [IbadatCategory.VERSES]: { unit: 'times', placeholder: 'e.g., Ayatul Kursi' },
    [IbadatCategory.ZIKR]: { unit: 'times', placeholder: 'e.g., Salawat, Istighfar' },
    [IbadatCategory.NAWAFIL]: { unit: 'rakat', placeholder: 'e.g., Tahajjud, Ishraq' },
    [IbadatCategory.OTHER]: { unit: 'times', placeholder: 'Any other good deed' },
  };

  // Generate clean suggestions based on existing entries
  const suggestions = useMemo(() => {
    if (!Array.isArray(existingEntries)) return [];
    
    // 1. Filter by category
    const relevantEntries = existingEntries.filter(e => e.category === currentInput.category && e.ibadatType);
    
    // 2. Normalize every entry to merge spelling variations
    const normalizedSet = new Set(
      relevantEntries.map(e => normalizeIbadatName(e.ibadatType))
    );
    
    // 3. Convert to sorted array
    return Array.from(normalizedSet).sort();
  }, [existingEntries, currentInput.category]);

  // Check for similar entries when input changes
  useEffect(() => {
    const input = currentInput.ibadatType.trim();
    if (!input || input.length < 3) {
      setSimilarityWarning(null);
      return;
    }

    const normalized = normalizeIbadatName(input);
    const normalizedLower = normalized.toLowerCase();

    // Combined list of existing types + currently pending types
    const allTargets = new Set([
      ...suggestions,
      ...pendingEntries.map(p => p.ibadatType)
    ]);

    // If exact match exists, we are consistent, so no warning needed.
    // (We actually prefer exact matches to existing data)
    if (allTargets.has(normalized)) {
      setSimilarityWarning(null);
      return;
    }

    // Find fuzzy matches
    let bestMatch = null;
    let minDistance = 3; // Allow edit distance of 1 or 2 chars

    for (const target of allTargets) {
      // Don't compare with self or empty
      if (!target) continue;
      
      const dist = getLevenshteinDistance(normalizedLower, target.toLowerCase());
      
      // Calculate length difference penalty
      const lengthDiff = Math.abs(normalized.length - target.length);
      
      if (dist > 0 && dist < minDistance && lengthDiff <= 2) {
        minDistance = dist;
        bestMatch = target;
      }
    }

    if (bestMatch) {
      setSimilarityWarning({
        text: `Similar to existing "${bestMatch}"`,
        suggestion: bestMatch
      });
    } else {
      setSimilarityWarning(null);
    }

  }, [currentInput.ibadatType, suggestions, pendingEntries]);

  const handleCategoryChange = (cat: IbadatCategory) => {
    setCurrentInput(prev => ({
      ...prev,
      category: cat,
      unit: categoryDefaults[cat].unit,
      ibadatType: ''
    }));
  };

  const handleAIMagicFix = async () => {
    if (!currentInput.ibadatType.trim()) return;
    setIsNormalizing(true);
    try {
      const fixed = await normalizeDeedWithAI(currentInput.ibadatType, currentInput.category);
      setCurrentInput(prev => ({ ...prev, ibadatType: fixed }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsNormalizing(false);
    }
  };

  const applySuggestion = () => {
    if (similarityWarning?.suggestion) {
      setCurrentInput(prev => ({ ...prev, ibadatType: similarityWarning.suggestion }));
      setSimilarityWarning(null);
      typeInputRef.current?.focus();
    }
  };

  const addCurrentToList = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!currentInput.ibadatType.trim()) {
      // Focus input if trying to add empty
      typeInputRef.current?.focus();
      return;
    }

    const newPending = {
      category: currentInput.category,
      ibadatType: normalizeIbadatName(currentInput.ibadatType),
      count: Number(currentInput.count),
      unit: currentInput.unit,
    };

    setPendingEntries(prev => [...prev, newPending]);

    // Reset input but keep category for rapid entry
    setCurrentInput(prev => ({
      ...prev,
      ibadatType: '',
      count: 1,
      unit: categoryDefaults[prev.category].unit
    }));
    
    setSimilarityWarning(null);
    
    // Keep focus for rapid entry
    setTimeout(() => typeInputRef.current?.focus(), 100);
  };

  const removePendingEntry = (index: number) => {
    setPendingEntries(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitAll = () => {
    const finalEntries: IbadatEntry[] = [];
    const nameToUse = contributorName.trim() || 'Community Member';
    const date = new Date().toISOString();

    // 1. Add pending list
    pendingEntries.forEach(p => {
      finalEntries.push({
        id: crypto.randomUUID(),
        occasionId: activeOccasion.id,
        contributorName: nameToUse,
        category: p.category,
        ibadatType: p.ibadatType,
        count: p.count,
        unit: p.unit,
        dateAdded: date
      });
    });

    // 2. If user typed something in input but didn't click "Add to List", include it too (Smart Submit)
    if (currentInput.ibadatType.trim()) {
      finalEntries.push({
        id: crypto.randomUUID(),
        occasionId: activeOccasion.id,
        contributorName: nameToUse,
        category: currentInput.category,
        ibadatType: normalizeIbadatName(currentInput.ibadatType),
        count: Number(currentInput.count),
        unit: currentInput.unit,
        dateAdded: date
      });
    }

    if (finalEntries.length === 0) return;

    onAdd(finalEntries);
    
    // Save name for next time
    if (contributorName) setRecentName(contributorName);
    
    // Reset Form
    setPendingEntries([]);
    setCurrentInput(prev => ({
        ...prev,
        ibadatType: '',
        count: 1
    }));
    setSimilarityWarning(null);
  };

  const datalistId = `ibadat-suggestions-${currentInput.category.replace(/\s+/g, '-')}`;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white rounded-xl shadow-sm border border-emerald-100 p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-2 text-emerald-800">
            <ScrollText className="w-6 h-6" />
            <h2 className="text-xl font-bold">Log Ibadat</h2>
          </div>
          {pendingEntries.length > 0 && (
             <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded-full">
               {pendingEntries.length} items ready
             </span>
          )}
        </div>
        
        {/* Event Selection */}
        {occasions && occasions.length > 1 && onOccasionChange && (
          <div className="mb-6 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
            <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Calendar size={14} /> Contributing To
            </label>
            <select
              className="w-full text-sm border-emerald-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              value={activeOccasion.id}
              onChange={(e) => onOccasionChange(e.target.value)}
            >
              {occasions.map(o => (
                <option key={o.id} value={o.id}>
                  {o.title} (Ends: {new Date(o.endDate).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Global Contributor Name */}
        <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contributor Name <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="Leave empty for Community Member"
              className="w-full rounded-lg border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
              value={contributorName}
              onChange={e => setContributorName(e.target.value)}
            />
            {recentName && contributorName !== recentName && (
              <button 
                type="button" 
                onClick={() => setContributorName(recentName)}
                className="text-xs text-emerald-600 hover:text-emerald-700 mt-1 flex items-center gap-1"
              >
                <History size={12} /> Use previous: {recentName}
              </button>
            )}
        </div>

        <div className="border-t border-gray-200 my-6"></div>

        {/* Input Area (Staging) */}
        <div className="bg-gray-50/80 p-5 rounded-xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center">
               <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Add Deeds</h3>
               <button 
                  type="button"
                  onClick={handleAIMagicFix}
                  disabled={isNormalizing || !currentInput.ibadatType}
                  className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1 disabled:opacity-30"
               >
                  {isNormalizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  AI Fix Name
               </button>
            </div>

            {/* Category */}
            <div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.values(IbadatCategory).map((cat) => (
                    <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryChange(cat)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                        currentInput.category === cat
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-emerald-50'
                    }`}
                    >
                    {cat}
                    </button>
                ))}
                </div>
            </div>

            {/* Inputs Row */}
            <form onSubmit={addCurrentToList} className="flex flex-col md:flex-row gap-3 items-start md:items-end">
                <div className="flex-1 w-full">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Deed Name</label>
                    <div className="relative">
                        <input
                        ref={typeInputRef}
                        type="text"
                        list={datalistId}
                        placeholder={suggestions.length > 0 ? "Select or type..." : categoryDefaults[currentInput.category].placeholder}
                        className={`w-full rounded-lg border focus:ring-emerald-500 focus:border-emerald-500 pr-8 ${
                            similarityWarning ? 'border-amber-400 bg-amber-50' : 'border-gray-300'
                        }`}
                        value={currentInput.ibadatType}
                        onChange={e => setCurrentInput({ ...currentInput, ibadatType: e.target.value })}
                        autoComplete="off"
                        onKeyDown={(e) => {
                             // Allow submitting the line item with Enter key
                             if(e.key === 'Enter') addCurrentToList();
                        }}
                        />
                         {/* Autocomplete Datalist */}
                        <datalist id={datalistId}>
                        {suggestions.map((item, idx) => (
                            <option key={idx} value={item} />
                        ))}
                        </datalist>
                    </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <div className="w-24">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Count</label>
                        <input
                            type="number"
                            min="1"
                            className="w-full rounded-lg border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
                            value={currentInput.count}
                            onChange={e => setCurrentInput({ ...currentInput, count: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                    <div className="w-24">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Unit</label>
                        <input
                            type="text"
                            className="w-full rounded-lg border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
                            value={currentInput.unit}
                            onChange={e => setCurrentInput({ ...currentInput, unit: e.target.value })}
                        />
                    </div>
                </div>

                <button
                    type="submit" // Trigger form submit for this section
                    disabled={!currentInput.ibadatType.trim()}
                    className="w-full md:w-auto px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 h-[42px]"
                >
                    <Plus size={18} /> <span className="md:hidden">Add to List</span>
                </button>
            </form>

            {/* Similarity Warning Block */}
            {similarityWarning && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 animate-fade-in-up">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
                    <div className="flex-1">
                        <span className="font-medium">Potential Duplicate:</span> {similarityWarning.text}
                    </div>
                    <button 
                        type="button"
                        onClick={applySuggestion}
                        className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-md text-xs font-bold transition-colors whitespace-nowrap"
                    >
                        Use "{similarityWarning.suggestion}"
                    </button>
                </div>
            )}
        </div>

        {/* Pending List Table */}
        {pendingEntries.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden animate-fade-in-up">
                <table className="w-full text-sm text-left">
                    <thead className="bg-emerald-50 text-emerald-800 text-xs uppercase">
                        <tr>
                            <th className="px-4 py-2">Deed</th>
                            <th className="px-4 py-2">Quantity</th>
                            <th className="px-4 py-2 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {pendingEntries.map((entry, idx) => (
                            <tr key={idx} className="bg-white">
                                <td className="px-4 py-2 font-medium text-gray-800">
                                    {entry.ibadatType}
                                    <span className="block text-xs text-gray-400 font-normal">{entry.category}</span>
                                </td>
                                <td className="px-4 py-2 text-gray-600">
                                    {entry.count} {entry.unit}
                                </td>
                                <td className="px-4 py-2 text-right">
                                    <button 
                                        onClick={() => removePendingEntry(idx)}
                                        className="text-red-400 hover:text-red-600 p-1"
                                    >
                                        <X size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {/* Submit Button */}
        <button
            onClick={handleSubmitAll}
            disabled={pendingEntries.length === 0 && !currentInput.ibadatType.trim()}
            className="w-full bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <Send className="w-5 h-5" />
            {pendingEntries.length > 0 
                ? `Submit ${pendingEntries.length + (currentInput.ibadatType.trim() ? 1 : 0)} Entries` 
                : "Submit Entry"}
        </button>

      </div>
    </div>
  );
};