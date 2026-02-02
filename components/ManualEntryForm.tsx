import React, { useState, useMemo, useRef, useEffect } from 'react';
import { IbadatEntry, IbadatCategory, Occasion } from '../types';
import { Send, Plus, Minus, ScrollText, Calendar, Info, Sparkles, Loader2, History, X, CheckCircle, AlertTriangle, ChevronRight, BookOpen } from 'lucide-react';
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

  // Quran Selection State
  const [selectedJuz, setSelectedJuz] = useState<number[]>([]);
  const [isWholeQuran, setIsWholeQuran] = useState(false);

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
    // Reset Quran selection
    setSelectedJuz([]);
    setIsWholeQuran(false);
  };

  const toggleJuz = (num: number) => {
    if (isWholeQuran) setIsWholeQuran(false);
    setSelectedJuz(prev => 
        prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]
    );
  };

  const toggleWholeQuran = () => {
    const newState = !isWholeQuran;
    setIsWholeQuran(newState);
    if (newState) setSelectedJuz([]);
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

    // --- Quran Specific Logic ---
    if (currentInput.category === IbadatCategory.QURAN) {
        if (!isWholeQuran && selectedJuz.length === 0) return;

        const entriesToAdd: Omit<IbadatEntry, 'id' | 'occasionId' | 'dateAdded' | 'contributorName'>[] = [];
        const multiplier = Math.max(1, currentInput.count);

        if (isWholeQuran) {
            entriesToAdd.push({
                category: IbadatCategory.QURAN,
                ibadatType: 'Whole Quran',
                count: multiplier,
                unit: 'khatam'
            });
        } else {
            const sorted = [...selectedJuz].sort((a,b) => a - b);
            sorted.forEach(juzNum => {
                entriesToAdd.push({
                    category: IbadatCategory.QURAN,
                    ibadatType: `Juz ${juzNum}`,
                    count: multiplier,
                    unit: 'juz'
                });
            });
        }
        
        setPendingEntries(prev => [...prev, ...entriesToAdd]);
        
        // Reset selections
        setSelectedJuz([]);
        setIsWholeQuran(false);
        setCurrentInput(prev => ({ ...prev, count: 1 }));
        return;
    }

    // --- Standard Logic ---
    if (!currentInput.ibadatType.trim()) {
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
    // Only applies to non-Quran text inputs or if the quran selection hasn't been added to pending yet (optional, but safer to force explicit add for multi-select)
    // For Quran, we force explicit "Add" because it's complex. For others, allow implicit submit.
    if (currentInput.category !== IbadatCategory.QURAN && currentInput.ibadatType.trim()) {
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
    } else if (currentInput.category === IbadatCategory.QURAN && (selectedJuz.length > 0 || isWholeQuran)) {
       // Also support smart submit for Quran selection
       const multiplier = Math.max(1, currentInput.count);
       if (isWholeQuran) {
          finalEntries.push({
            id: crypto.randomUUID(),
            occasionId: activeOccasion.id,
            contributorName: nameToUse,
            category: IbadatCategory.QURAN,
            ibadatType: 'Whole Quran',
            count: multiplier,
            unit: 'khatam',
            dateAdded: date
          });
       } else {
          selectedJuz.sort((a,b)=>a-b).forEach(juzNum => {
             finalEntries.push({
                id: crypto.randomUUID(),
                occasionId: activeOccasion.id,
                contributorName: nameToUse,
                category: IbadatCategory.QURAN,
                ibadatType: `Juz ${juzNum}`,
                count: multiplier,
                unit: 'juz',
                dateAdded: date
             });
          });
       }
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
    setSelectedJuz([]);
    setIsWholeQuran(false);
    setSimilarityWarning(null);
  };

  const datalistId = `ibadat-suggestions-${currentInput.category.replace(/\s+/g, '-')}`;

  // Helper to determine if Add Button is disabled
  const isAddDisabled = () => {
    if (currentInput.category === IbadatCategory.QURAN) {
        return !isWholeQuran && selectedJuz.length === 0;
    }
    return !currentInput.ibadatType.trim();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex justify-between items-start mb-8">
          <div>
             <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
               <ScrollText className="w-6 h-6 text-emerald-600" />
               Manual Entry
             </h2>
             <p className="text-gray-500 text-sm mt-1">Log deeds directly for a community member.</p>
          </div>
          {pendingEntries.length > 0 && (
             <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm animate-pulse">
               {pendingEntries.length} in staging
             </span>
          )}
        </div>
        
        {/* Event Selection */}
        {occasions && occasions.length > 1 && onOccasionChange && (
          <div className="mb-6 p-4 bg-gray-50/50 rounded-xl border border-gray-200 hover:border-emerald-200 transition-colors">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Calendar size={14} /> Contributing To
            </label>
            <div className="relative">
              <select
                className="w-full text-sm font-medium text-gray-900 border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-white shadow-sm py-2.5 px-3"
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
          </div>
        )}

        {/* Global Contributor Name */}
        <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Contributor Name
            </label>
            <input
              type="text"
              placeholder="e.g. Sister Fatima (Leave empty for Community Member)"
              className="w-full rounded-xl border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 py-2.5 bg-white text-gray-900 transition-all shadow-sm"
              value={contributorName}
              onChange={e => setContributorName(e.target.value)}
            />
            {recentName && contributorName !== recentName && (
              <button 
                type="button" 
                onClick={() => setContributorName(recentName)}
                className="text-xs text-emerald-600 hover:text-emerald-700 mt-2 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-md w-fit"
              >
                <History size={12} /> Use previous: <span className="font-semibold">{recentName}</span>
              </button>
            )}
        </div>

        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="px-3 bg-white text-xs font-medium text-gray-400 uppercase tracking-widest">Entry Details</span>
          </div>
        </div>

        {/* Input Area (Staging) */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-5">
            <div className="flex justify-between items-center">
               <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                 Add Deed
               </h3>
               {currentInput.category !== IbadatCategory.QURAN && (
                  <button 
                      type="button"
                      onClick={handleAIMagicFix}
                      disabled={isNormalizing || !currentInput.ibadatType}
                      className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 disabled:opacity-30 px-2 py-1 hover:bg-indigo-50 rounded-md transition-colors"
                  >
                      {isNormalizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Smart Fix
                  </button>
               )}
            </div>

            {/* Category */}
            <div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {Object.values(IbadatCategory).map((cat) => (
                    <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryChange(cat)}
                    className={`px-2 py-2 text-xs font-medium rounded-lg border transition-all ${
                        currentInput.category === cat
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md transform scale-105'
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-white hover:text-emerald-600 hover:border-emerald-200'
                    }`}
                    >
                    {cat}
                    </button>
                ))}
                </div>
            </div>

            {/* Inputs Row */}
            <form onSubmit={addCurrentToList} className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                {currentInput.category === IbadatCategory.QURAN ? (
                    // --- QURAN SELECTOR UI ---
                    <div className="flex-1 w-full space-y-3">
                         <label className="block text-xs font-medium text-gray-500 ml-1">Select Parts Completed</label>
                         
                         {/* Whole Quran Toggle */}
                         <button
                            type="button"
                            onClick={toggleWholeQuran}
                            className={`w-full py-3 px-4 rounded-xl border flex items-center justify-between transition-all ${
                                isWholeQuran 
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-200' 
                                : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300'
                            }`}
                         >
                            <span className="font-bold flex items-center gap-2 text-sm">
                                <BookOpen size={18} /> Whole Quran (Khatam)
                            </span>
                            {isWholeQuran && <CheckCircle size={18} />}
                         </button>

                         <div className="flex items-center gap-2 my-1">
                            <div className="h-px bg-gray-200 flex-1"></div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase">Or Select Juz</span>
                            <div className="h-px bg-gray-200 flex-1"></div>
                         </div>

                         {/* Juz Grid */}
                         <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                            {Array.from({ length: 30 }, (_, i) => i + 1).map(num => (
                                <button
                                    key={num}
                                    type="button"
                                    onClick={() => toggleJuz(num)}
                                    disabled={isWholeQuran}
                                    className={`h-9 text-sm font-medium rounded-lg border transition-all ${
                                        selectedJuz.includes(num)
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-500 font-bold shadow-sm'
                                        : isWholeQuran 
                                            ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-600'
                                    }`}
                                >
                                    {num}
                                </button>
                            ))}
                         </div>
                         
                         <div className="min-h-[16px] text-xs text-gray-500">
                             {selectedJuz.length > 0 && !isWholeQuran && (
                                 <span>Selected: <span className="font-medium text-emerald-700">{selectedJuz.sort((a,b)=>a-b).map(j => `Juz ${j}`).join(', ')}</span></span>
                             )}
                         </div>
                    </div>
                ) : (
                    // --- STANDARD TEXT INPUT ---
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-medium text-gray-500 mb-1.5 ml-1">Deed Name</label>
                        <div className="relative group">
                            <input
                            ref={typeInputRef}
                            type="text"
                            list={datalistId}
                            placeholder={suggestions.length > 0 ? "Select or type..." : categoryDefaults[currentInput.category].placeholder}
                            className={`w-full rounded-xl border bg-white text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 pr-8 py-2.5 shadow-sm transition-all ${
                                similarityWarning ? 'border-amber-400 bg-amber-50 text-amber-900 placeholder-amber-400' : 'border-gray-300 group-hover:border-gray-400'
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
                )}

                <div className="flex gap-3 w-full md:w-auto">
                    <div className="w-24">
                        <label className="block text-xs font-medium text-gray-500 mb-1.5 ml-1">Count</label>
                        <input
                            type="number"
                            min="1"
                            className="w-full rounded-xl bg-white text-gray-900 border-gray-300 focus:ring-emerald-500 focus:border-emerald-500 py-2.5 shadow-sm"
                            value={currentInput.count}
                            onChange={e => setCurrentInput({ ...currentInput, count: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                    {currentInput.category !== IbadatCategory.QURAN && (
                        <div className="w-28">
                            <label className="block text-xs font-medium text-gray-500 mb-1.5 ml-1">Unit</label>
                            <input
                                type="text"
                                className="w-full rounded-xl bg-white text-gray-900 border-gray-300 focus:ring-emerald-500 focus:border-emerald-500 py-2.5 shadow-sm"
                                value={currentInput.unit}
                                onChange={e => setCurrentInput({ ...currentInput, unit: e.target.value })}
                            />
                        </div>
                    )}
                </div>

                <button
                    type="submit" // Trigger form submit for this section
                    disabled={isAddDisabled()}
                    className="w-full md:w-auto px-5 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 h-[46px] shadow-sm hover:shadow-md transition-all active:scale-95"
                >
                    <Plus size={18} /> <span className="md:hidden">Add to List</span>
                </button>
            </form>

            {/* Similarity Warning Block */}
            {similarityWarning && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 animate-fade-in-up">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
                    <div className="flex-1">
                        <span className="font-medium">Potential Duplicate:</span> {similarityWarning.text}
                    </div>
                    <button 
                        type="button"
                        onClick={applySuggestion}
                        className="px-3 py-1 bg-white border border-amber-200 hover:bg-amber-50 text-amber-900 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shadow-sm"
                    >
                        Use "{similarityWarning.suggestion}"
                    </button>
                </div>
            )}
        </div>

        {/* Pending List Table */}
        {pendingEntries.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden animate-fade-in-up shadow-sm mt-6">
                <table className="w-full text-sm text-left">
                    <thead className="bg-emerald-50/70 text-emerald-800 text-xs uppercase tracking-wide border-b border-emerald-100">
                        <tr>
                            <th className="px-5 py-3 font-semibold">Deed</th>
                            <th className="px-5 py-3 font-semibold">Quantity</th>
                            <th className="px-5 py-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {pendingEntries.map((entry, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-5 py-3 font-medium text-gray-800">
                                    {entry.ibadatType}
                                    <span className="block text-[10px] text-gray-400 font-bold uppercase mt-0.5">{entry.category}</span>
                                </td>
                                <td className="px-5 py-3 text-gray-600 font-medium">
                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700">{entry.count}</span> <span className="text-gray-400 text-xs">{entry.unit}</span>
                                </td>
                                <td className="px-5 py-3 text-right">
                                    <button 
                                        onClick={() => removePendingEntry(idx)}
                                        className="text-gray-300 hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 transition-colors"
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
        <div className="mt-8 pt-4 border-t border-gray-100">
            <button
                onClick={handleSubmitAll}
                disabled={pendingEntries.length === 0 && (currentInput.category === IbadatCategory.QURAN ? selectedJuz.length === 0 && !isWholeQuran : !currentInput.ibadatType.trim())}
                className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transform hover:-translate-y-0.5"
            >
                {pendingEntries.length > 0 
                    ? `Submit ${pendingEntries.length + ((currentInput.category === IbadatCategory.QURAN ? (selectedJuz.length > 0 || isWholeQuran) : currentInput.ibadatType.trim()) ? 1 : 0)} Entries` 
                    : "Submit Entry"}
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>

      </div>
    </div>
  );
};