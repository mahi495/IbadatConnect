import React, { useState, useMemo, useRef, useEffect } from 'react';
import { IbadatEntry, IbadatCategory, Occasion } from '../types';
import { Plus, ScrollText, Calendar, Sparkles, Loader2, History, X, CheckCircle, AlertTriangle, ChevronRight, BookOpen, Search, ChevronDown, Check, Archive, MessageSquareQuote } from 'lucide-react';
import { normalizeIbadatName, ALL_SURAHS, generateId } from '../utils';

interface ManualEntryFormProps {
  activeOccasion: Occasion;
  occasions?: Occasion[];
  existingEntries?: IbadatEntry[];
  onOccasionChange?: (id: string) => void;
  onAdd: (entries: IbadatEntry[]) => void;
}

const getLevenshteinDistance = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
      else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
    }
  }
  return matrix[b.length][a.length];
};

export const ManualEntryForm: React.FC<ManualEntryFormProps> = ({ 
  activeOccasion, 
  occasions = [], 
  existingEntries = [],
  onOccasionChange, 
  onAdd 
}) => {
  const [contributorName, setContributorName] = useState('');
  const [recentName, setRecentName] = useState('');
  const [notes, setNotes] = useState('');
  const [currentInput, setCurrentInput] = useState({
    category: IbadatCategory.SALAWAT,
    ibadatType: '',
    count: 1,
    unit: 'times'
  });

  const [isDeedDropdownOpen, setIsDeedDropdownOpen] = useState(false);
  const [deedSearch, setDeedSearch] = useState('');
  const [selectedJuz, setSelectedJuz] = useState<number[]>([]);
  const [isWholeQuran, setIsWholeQuran] = useState(false);
  const [isJuzDropdownOpen, setIsJuzDropdownOpen] = useState(false);
  const [selectedSurahs, setSelectedSurahs] = useState<string[]>([]);
  const [surahSearch, setSurahSearch] = useState('');
  const [isSurahDropdownOpen, setIsSurahDropdownOpen] = useState(false);
  const [pendingEntries, setPendingEntries] = useState<Omit<IbadatEntry, 'id' | 'occasionId' | 'dateAdded' | 'contributorName' | 'performedDate'>[]>([]);
  const [similarityWarning, setSimilarityWarning] = useState<{ text: string, suggestion: string } | null>(null);

  const typeInputRef = useRef<HTMLInputElement>(null);
  const juzDropdownRef = useRef<HTMLDivElement>(null);
  const surahDropdownRef = useRef<HTMLDivElement>(null);
  const deedDropdownRef = useRef<HTMLDivElement>(null);

  const activeEvents = occasions.filter(o => o.status === 'active');

  const categoryDefaults: Record<IbadatCategory, { unit: string, placeholder: string }> = {
    [IbadatCategory.QURAN]: { unit: 'times', placeholder: 'e.g., Juz 1' },
    [IbadatCategory.SURAH]: { unit: 'times', placeholder: 'e.g., Surah Yasin' },
    [IbadatCategory.VERSES]: { unit: 'times', placeholder: 'e.g., Ayatul Kursi' },
    [IbadatCategory.SALAWAT]: { unit: 'times', placeholder: 'e.g., Darood Khizri' },
    [IbadatCategory.ZIKR]: { unit: 'times', placeholder: 'e.g., Third Kalma' },
    [IbadatCategory.NAWAFIL]: { unit: 'rakat', placeholder: 'e.g., Tahajjud' },
    [IbadatCategory.OTHER]: { unit: 'times', placeholder: 'Any other good deed' },
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (juzDropdownRef.current && !juzDropdownRef.current.contains(event.target as Node)) setIsJuzDropdownOpen(false);
      if (surahDropdownRef.current && !surahDropdownRef.current.contains(event.target as Node)) setIsSurahDropdownOpen(false);
      if (deedDropdownRef.current && !deedDropdownRef.current.contains(event.target as Node)) setIsDeedDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const suggestions = useMemo(() => {
    if (!Array.isArray(existingEntries)) return [];
    const relevantEntries = existingEntries.filter(e => e.category === currentInput.category && e.ibadatType);
    const normalizedSet = new Set(relevantEntries.map(e => normalizeIbadatName(e.ibadatType)));
    return Array.from(normalizedSet).sort();
  }, [existingEntries, currentInput.category]);

  const filteredSuggestions = useMemo(() => {
    if (!deedSearch) return suggestions;
    return suggestions.filter(s => s.toLowerCase().includes(deedSearch.toLowerCase()));
  }, [suggestions, deedSearch]);

  useEffect(() => {
    const input = currentInput.ibadatType.trim();
    if (!input || input.length < 3) {
      setSimilarityWarning(null);
      return;
    }
    const normalized = normalizeIbadatName(input);
    const normalizedLower = normalized.toLowerCase();
    const allTargets = new Set([...suggestions, ...pendingEntries.map(p => p.ibadatType)]);
    if (allTargets.has(normalized)) {
      setSimilarityWarning(null);
      return;
    }
    let bestMatch = null;
    let minDistance = 3;
    for (const target of allTargets) {
      if (!target) continue;
      const dist = getLevenshteinDistance(normalizedLower, target.toLowerCase());
      const lengthDiff = Math.abs(normalized.length - target.length);
      if (dist > 0 && dist < minDistance && lengthDiff <= 2) {
        minDistance = dist;
        bestMatch = target;
      }
    }
    if (bestMatch) setSimilarityWarning({ text: `Similar to existing "${bestMatch}"`, suggestion: bestMatch });
    else setSimilarityWarning(null);
  }, [currentInput.ibadatType, suggestions, pendingEntries]);

  const handleCategoryChange = (cat: IbadatCategory) => {
    setCurrentInput(prev => ({
      ...prev,
      category: cat,
      unit: categoryDefaults[cat].unit,
      ibadatType: ''
    }));
    setSelectedJuz([]);
    setIsWholeQuran(false);
    setSelectedSurahs([]);
    setSurahSearch('');
    setDeedSearch('');
    setIsJuzDropdownOpen(false);
    setIsSurahDropdownOpen(false);
    setIsDeedDropdownOpen(false);
  };

  const toggleJuz = (num: number) => {
    if (isWholeQuran) {
        setIsWholeQuran(false);
        setCurrentInput(prev => ({ ...prev, unit: 'times' }));
    }
    setSelectedJuz(prev => prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]);
  };

  const toggleWholeQuran = () => {
    const newState = !isWholeQuran;
    setIsWholeQuran(newState);
    if (newState) {
        setSelectedJuz([]);
        setCurrentInput(prev => ({ ...prev, unit: 'khatam' }));
        setIsJuzDropdownOpen(false);
    } else {
        setCurrentInput(prev => ({ ...prev, unit: 'times' }));
    }
  };

  const toggleSurah = (surah: string) => {
    setSelectedSurahs(prev => prev.includes(surah) ? prev.filter(s => s !== surah) : [...prev, surah]);
  };

  const addCurrentToList = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (currentInput.category === IbadatCategory.QURAN) {
        if (!isWholeQuran && selectedJuz.length === 0) return;
        const entriesToAdd: any[] = [];
        const multiplier = Math.max(1, currentInput.count);
        if (isWholeQuran) entriesToAdd.push({ category: IbadatCategory.QURAN, ibadatType: 'Whole Quran', count: multiplier, unit: currentInput.unit, notes: notes });
        else {
            [...selectedJuz].sort((a,b) => a - b).forEach(juzNum => {
                entriesToAdd.push({ category: IbadatCategory.QURAN, ibadatType: `Juz ${juzNum}`, count: multiplier, unit: currentInput.unit, notes: notes });
            });
        }
        setPendingEntries(prev => [...prev, ...entriesToAdd]);
        setSelectedJuz([]);
        setIsWholeQuran(false);
        setIsJuzDropdownOpen(false);
        setCurrentInput(prev => ({ ...prev, count: 1, unit: 'times' }));
        return;
    }
    if (currentInput.category === IbadatCategory.SURAH) {
        if (selectedSurahs.length === 0) return;
        const multiplier = Math.max(1, currentInput.count);
        const entriesToAdd = selectedSurahs.map(surah => ({ category: IbadatCategory.SURAH, ibadatType: `Surah ${surah}`, count: multiplier, unit: currentInput.unit, notes: notes }));
        setPendingEntries(prev => [...prev, ...entriesToAdd]);
        setSelectedSurahs([]);
        setSurahSearch('');
        setIsSurahDropdownOpen(false);
        setCurrentInput(prev => ({ ...prev, count: 1 }));
        return;
    }
    if (!currentInput.ibadatType.trim()) {
      typeInputRef.current?.focus();
      return;
    }
    const newPending = {
      category: currentInput.category,
      ibadatType: normalizeIbadatName(currentInput.ibadatType),
      count: Number(currentInput.count),
      unit: currentInput.unit,
      notes: notes
    };
    setPendingEntries(prev => [...prev, newPending]);
    setCurrentInput(prev => ({ ...prev, ibadatType: '', count: 1, unit: categoryDefaults[prev.category].unit }));
    setSimilarityWarning(null);
    setDeedSearch('');
    setTimeout(() => typeInputRef.current?.focus(), 100);
  };

  const removePendingEntry = (index: number) => setPendingEntries(prev => prev.filter((_, i) => i !== index));

  const applySuggestion = () => {
    if (similarityWarning) {
      setCurrentInput(prev => ({ ...prev, ibadatType: similarityWarning.suggestion }));
      setSimilarityWarning(null);
    }
  };

  const hasSmartSubmitContent = () => {
    if (pendingEntries.length > 0) return true;
    if (currentInput.category === IbadatCategory.QURAN) {
      return isWholeQuran || selectedJuz.length > 0;
    }
    if (currentInput.category === IbadatCategory.SURAH) {
      return selectedSurahs.length > 0;
    }
    return currentInput.ibadatType.trim().length > 0;
  };

  const updatePendingCount = (index: number, val: string) => {
    const count = parseInt(val) || 0;
    setPendingEntries(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], count: count };
        return updated;
    });
  };

  const handleSubmitAll = () => {
    const finalEntries: IbadatEntry[] = [];
    const nameToUse = contributorName.trim() || 'Community Member';
    const date = new Date().toISOString();
    const perfDate = date.split('T')[0];
    pendingEntries.forEach(p => {
      finalEntries.push({ id: generateId(), occasionId: activeOccasion.id, contributorName: nameToUse, category: p.category, ibadatType: p.ibadatType, count: p.count, unit: p.unit, notes: p.notes, dateAdded: date, performedDate: perfDate });
    });
    const multiplier = Math.max(1, currentInput.count);
    if (currentInput.category === IbadatCategory.QURAN && (selectedJuz.length > 0 || isWholeQuran)) {
       if (isWholeQuran) finalEntries.push({ id: generateId(), occasionId: activeOccasion.id, contributorName: nameToUse, category: IbadatCategory.QURAN, ibadatType: 'Whole Quran', count: multiplier, unit: currentInput.unit, notes: notes, dateAdded: date, performedDate: perfDate });
       else {
          selectedJuz.sort((a,b)=>a-b).forEach(juzNum => {
             finalEntries.push({ id: generateId(), occasionId: activeOccasion.id, contributorName: nameToUse, category: IbadatCategory.QURAN, ibadatType: `Juz ${juzNum}`, count: multiplier, unit: currentInput.unit, notes: notes, dateAdded: date, performedDate: perfDate });
          });
       }
    } else if (currentInput.category === IbadatCategory.SURAH && selectedSurahs.length > 0) {
       selectedSurahs.forEach(surah => {
           finalEntries.push({ id: generateId(), occasionId: activeOccasion.id, contributorName: nameToUse, category: IbadatCategory.SURAH, ibadatType: `Surah ${surah}`, count: multiplier, unit: currentInput.unit, notes: notes, dateAdded: date, performedDate: perfDate });
       });
    } else if (currentInput.category !== IbadatCategory.QURAN && currentInput.category !== IbadatCategory.SURAH && currentInput.ibadatType.trim()) {
      finalEntries.push({ id: generateId(), occasionId: activeOccasion.id, contributorName: nameToUse, category: currentInput.category, ibadatType: normalizeIbadatName(currentInput.ibadatType), count: Number(currentInput.count), unit: currentInput.unit, notes: notes, dateAdded: date, performedDate: perfDate });
    }
    if (finalEntries.length === 0) return;
    onAdd(finalEntries);
    if (contributorName) setRecentName(contributorName);
    setPendingEntries([]);
    setCurrentInput(prev => ({ ...prev, ibadatType: '', count: 1 }));
    setSelectedJuz([]);
    setIsWholeQuran(false);
    setSelectedSurahs([]);
    setSurahSearch('');
    setDeedSearch('');
    setIsJuzDropdownOpen(false);
    setIsSurahDropdownOpen(false);
    setIsDeedDropdownOpen(false);
    setSimilarityWarning(null);
    setNotes('');
  };

  const isAddDisabled = () => {
    if (activeOccasion.status !== 'active') return true;
    if (currentInput.category === IbadatCategory.QURAN) return !isWholeQuran && selectedJuz.length === 0;
    if (currentInput.category === IbadatCategory.SURAH) return selectedSurahs.length === 0;
    return !currentInput.ibadatType.trim();
  };

  const filteredSurahs = useMemo(() => ALL_SURAHS.filter(s => s.toLowerCase().includes(surahSearch.toLowerCase())), [surahSearch]);

  if (activeOccasion.status === 'archived') {
    return (
        <div className="max-w-3xl mx-auto p-8 bg-slate-50 border border-slate-200 rounded-2xl text-center">
            <Archive className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800 mb-2">Event Archived</h3>
            <p className="text-slate-500 mb-6">This campaign has been finalized and its contributions have been consolidated into a permanent summary record.</p>
            <button onClick={() => window.location.reload()} className="text-emerald-600 font-bold hover:underline">Select another event</button>
        </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex justify-between items-start mb-8">
          <div>
             <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><ScrollText className="w-6 h-6 text-emerald-600" />Direct Entry</h2>
             <p className="text-gray-500 text-sm mt-1">Log contributions for your school event.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contributor Name</label>
                <input type="text" placeholder="Who is reporting? (e.g. Sister Fatima)" className="w-full rounded-xl border-gray-300 focus:ring-2 focus:ring-emerald-500 py-2.5 bg-white shadow-sm" value={contributorName} onChange={e => setContributorName(e.target.value)} />
                {recentName && contributorName !== recentName && (
                  <button type="button" onClick={() => setContributorName(recentName)} className="text-xs text-emerald-600 mt-2 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-md"><History size={12} /> Use: <strong>{recentName}</strong></button>
                )}
            </div>
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Spiritual Intention (Optional)</label>
                <div className="relative">
                    <MessageSquareQuote className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                    <input type="text" placeholder="e.g. Eisaal-e-Sawab for late Father" className="w-full pl-10 rounded-xl border-gray-300 focus:ring-2 focus:ring-emerald-500 py-2.5 bg-white shadow-sm" value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
            </div>
        </div>

        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-5">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Deed Details</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
                {Object.values(IbadatCategory).map((cat) => (
                    <button key={cat} type="button" onClick={() => handleCategoryChange(cat)} className={`px-2 py-2 text-[10px] font-medium rounded-lg border transition-all ${currentInput.category === cat ? 'bg-emerald-600 text-white border-emerald-600 shadow-md transform scale-105' : 'bg-white text-gray-500 border-gray-200 hover:text-emerald-600'}`}>{cat}</button>
                ))}
            </div>

            <form onSubmit={addCurrentToList} className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                {currentInput.category === IbadatCategory.QURAN ? (
                    <div className="flex-1 w-full space-y-3">
                         <button type="button" onClick={toggleWholeQuran} className={`w-full py-3 px-4 rounded-xl border flex items-center justify-between transition-all ${isWholeQuran ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-200'}`}><span className="font-bold flex items-center gap-2 text-sm"><BookOpen size={18} /> Whole Quran (Khatam)</span>{isWholeQuran && <CheckCircle size={18} />}</button>
                         <div className="relative" ref={juzDropdownRef}>
                           <button type="button" onClick={() => !isWholeQuran && setIsJuzDropdownOpen(!isJuzDropdownOpen)} disabled={isWholeQuran} className="w-full flex items-center justify-between px-4 py-3 rounded-xl border bg-white text-sm"><span>{selectedJuz.length > 0 ? `Selected ${selectedJuz.length} Juz` : 'Select Juz...'}</span><ChevronDown size={18} className="text-gray-400" /></button>
                           {isJuzDropdownOpen && (
                              <div className="absolute z-10 mt-2 w-full bg-white rounded-xl shadow-xl border p-3 max-h-64 overflow-y-auto">
                                 <div className="grid grid-cols-4 gap-2">{Array.from({ length: 30 }, (_, i) => i + 1).map(num => (<button key={num} type="button" onClick={(e) => { e.stopPropagation(); toggleJuz(num); }} className={`h-10 text-sm font-medium rounded-lg border transition-all ${selectedJuz.includes(num) ? 'bg-emerald-100 border-emerald-500 font-bold' : 'bg-white text-gray-600'}`}>{num}</button>))}</div>
                              </div>
                           )}
                         </div>
                    </div>
                ) : currentInput.category === IbadatCategory.SURAH ? (
                    <div className="flex-1 w-full space-y-3">
                         <div className="relative" ref={surahDropdownRef}>
                           <button type="button" onClick={() => setIsSurahDropdownOpen(!isSurahDropdownOpen)} className="w-full flex items-center justify-between px-4 py-3 rounded-xl border bg-white text-sm"><span>{selectedSurahs.length > 0 ? `${selectedSurahs.length} Surahs Selected` : 'Select Surahs...'}</span><ChevronDown size={18} className="text-gray-400" /></button>
                           {isSurahDropdownOpen && (
                             <div className="absolute z-10 mt-2 w-full bg-white rounded-xl shadow-xl border overflow-hidden"><div className="p-3 bg-gray-50 border-b"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" /><input type="text" placeholder="Search Surah..." value={surahSearch} onChange={(e) => setSurahSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border focus:ring-emerald-500" autoFocus /></div></div>
                                <div className="max-h-60 overflow-y-auto p-1">{filteredSurahs.map((surah) => (<label key={surah} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer rounded-lg transition-colors"><div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedSurahs.includes(surah) ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'}`}>{selectedSurahs.includes(surah) && <Check size={12} className="text-white" />}</div><input type="checkbox" className="hidden" checked={selectedSurahs.includes(surah)} onChange={() => toggleSurah(surah)} /><span className="text-sm">{surah}</span></label>))}</div>
                             </div>
                           )}
                         </div>
                    </div>
                ) : (
                    <div className="flex-1 w-full relative" ref={deedDropdownRef}>
                        <div className="relative group">
                            <input ref={typeInputRef} type="text" placeholder={categoryDefaults[currentInput.category].placeholder} className={`w-full rounded-xl border bg-white text-gray-900 focus:ring-2 focus:ring-emerald-500 pr-10 py-2.5 transition-all ${similarityWarning ? 'border-amber-400 bg-amber-50' : 'border-gray-300'}`} value={currentInput.ibadatType} onChange={e => { setCurrentInput({ ...currentInput, ibadatType: e.target.value }); setDeedSearch(e.target.value); setIsDeedDropdownOpen(true); }} onFocus={() => setIsDeedDropdownOpen(true)} autoComplete="off" onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addCurrentToList(); setIsDeedDropdownOpen(false); } }} />
                            <button type="button" onClick={() => setIsDeedDropdownOpen(!isDeedDropdownOpen)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><ChevronDown size={18} /></button>
                        </div>
                        {isDeedDropdownOpen && (suggestions.length > 0 || deedSearch) && (
                           <div className="absolute z-40 mt-2 w-full bg-white rounded-xl shadow-2xl border overflow-hidden">
                              <div className="max-h-60 overflow-y-auto p-1">
                                 {filteredSuggestions.map((item, idx) => (
                                    <button key={idx} type="button" onClick={() => { setCurrentInput({ ...currentInput, ibadatType: item }); setIsDeedDropdownOpen(false); setDeedSearch(''); }} className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 rounded-lg text-sm transition-colors flex items-center justify-between group"><span>{item}</span><span className="text-[10px] text-gray-300 font-bold uppercase">Legacy</span></button>
                                 ))}
                                 {deedSearch && !suggestions.includes(deedSearch) && <button type="button" onClick={() => setIsDeedDropdownOpen(false)} className="w-full text-left px-4 py-2.5 bg-emerald-50/30 rounded-lg text-sm text-emerald-700 italic">Add new: "{deedSearch}"</button>}
                              </div>
                           </div>
                        )}
                    </div>
                )}
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="w-24"><input type="number" min="1" className="w-full rounded-xl bg-white border-gray-300 focus:ring-emerald-500 py-2.5" value={currentInput.count} onChange={e => setCurrentInput({ ...currentInput, count: parseInt(e.target.value) || 0 })} /></div>
                    <div className="w-28"><input type="text" className="w-full rounded-xl bg-white border-gray-300 focus:ring-emerald-500 py-2.5" value={currentInput.unit} onChange={e => setCurrentInput({ ...currentInput, unit: e.target.value })} /></div>
                </div>
                <button type="submit" disabled={isAddDisabled()} className="w-full md:w-auto px-5 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 disabled:opacity-50 flex items-center justify-center gap-2 h-[46px]"><Plus size={18} /></button>
            </form>
            {similarityWarning && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
                    <div className="flex-1">Similar to: <strong>{similarityWarning.suggestion}</strong></div>
                    <button type="button" onClick={applySuggestion} className="px-3 py-1 bg-white border border-amber-200 rounded-lg text-xs font-bold">Use existing</button>
                </div>
            )}
        </div>

        {pendingEntries.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm mt-6">
                <table className="w-full text-sm text-left">
                    <thead className="bg-emerald-50/70 text-emerald-800 text-xs uppercase border-b"><tr><th className="px-5 py-3">Deed</th><th className="px-5 py-3">Quantity</th><th className="px-5 py-3">Note</th><th className="px-5 py-3"></th></tr></thead>
                    <tbody className="divide-y divide-gray-100 bg-white">{pendingEntries.map((entry, idx) => (<tr key={idx} className="hover:bg-gray-50/50"><td className="px-5 py-3 font-medium">{entry.ibadatType}</td><td className="px-5 py-3 flex items-center gap-2"><input type="number" min="1" value={entry.count} onChange={(e) => updatePendingCount(idx, e.target.value)} className="w-16 px-2 py-1 text-center border rounded-md text-sm font-semibold" /><span>{entry.unit}</span></td><td className="px-5 py-3 text-xs text-gray-500 italic truncate max-w-[120px]">{entry.notes || '-'}</td><td className="px-5 py-3 text-right"><button onClick={() => removePendingEntry(idx)} className="text-gray-300 hover:text-red-500 p-1.5 transition-colors"><X size={16} /></button></td></tr>))}</tbody>
                </table>
            </div>
        )}
        <div className="mt-8 pt-4 border-t border-gray-100"><button onClick={handleSubmitAll} disabled={!hasSmartSubmitContent() || activeOccasion.status !== 'active'} className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transform hover:-translate-y-0.5">Submit List <ChevronRight className="w-5 h-5" /></button></div>
      </div>
    </div>
  );
};