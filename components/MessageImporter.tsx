import React, { useState } from 'react';
import { ParseResult, IbadatEntry, Occasion } from '../types';
import { parseWhatsAppMessages } from '../services/geminiService';
import { Wand2, Check, X, Loader2, ArrowRight, Plus, Calendar, MessageSquareQuote } from 'lucide-react';
import { normalizeIbadatName, generateId } from '../utils';

interface MessageImporterProps {
  activeOccasion: Occasion;
  occasions?: Occasion[];
  onOccasionChange?: (id: string) => void;
  onImport: (entries: IbadatEntry[]) => void;
}

export const MessageImporter: React.FC<MessageImporterProps> = ({ 
  activeOccasion, 
  occasions, 
  onOccasionChange, 
  onImport 
}) => {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedResults, setParsedResults] = useState<ParseResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleParse = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    setError(null);
    try {
      const results = await parseWhatsAppMessages(inputText);
      setParsedResults(results);
    } catch (err) {
      setError("Failed to process text. AI model returned an error.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (!parsedResults) return;
    
    const newEntries: IbadatEntry[] = parsedResults.map(r => ({
      id: generateId(),
      occasionId: activeOccasion.id,
      contributorName: r.contributorName || 'Community Member',
      category: r.category,
      ibadatType: normalizeIbadatName(r.ibadatType),
      count: r.count,
      unit: r.unit,
      notes: r.notes,
      dateAdded: new Date().toISOString(),
      performedDate: r.performedDate || new Date().toISOString().split('T')[0],
      originalText: inputText.length > 100 ? inputText.substring(0, 100) + '...' : inputText
    }));

    onImport(newEntries);
    setParsedResults(null);
    setInputText('');
  };

  const handleDeleteResult = (index: number) => {
    if (parsedResults) {
      const updated = [...parsedResults];
      updated.splice(index, 1);
      setParsedResults(updated);
    }
  };

  const handleEditResult = (index: number, field: keyof ParseResult, value: string | number) => {
    if (parsedResults) {
      const updated = [...parsedResults];
      updated[index] = { ...updated[index], [field]: value };
      setParsedResults(updated);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 bg-emerald-50 border-b border-emerald-100">
          <h2 className="text-xl font-bold text-emerald-800 flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            Import from WhatsApp
          </h2>
          <p className="text-emerald-600 text-sm mt-1">
            Paste chat messages. AI will extract names, ranges (1-5 Para), and intentions automatically.
          </p>
        </div>

        <div className="p-6">
          {occasions && occasions.length > 1 && onOccasionChange && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Calendar size={14} /> Contributing To
              </label>
              <select
                className="w-full text-sm bg-white text-gray-900 border-gray-300 rounded-lg"
                value={activeOccasion.id}
                onChange={(e) => onOccasionChange(e.target.value)}
              >
                {occasions.map(o => (
                  <option key={o.id} value={o.id}>{o.title}</option>
                ))}
              </select>
            </div>
          )}

          {!parsedResults ? (
            <div className="space-y-4">
              <textarea
                className="w-full h-48 p-4 rounded-lg bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-emerald-500 resize-none text-sm"
                placeholder="Paste chat here. AI handles ranges like 'Juz 1 to 5' and intentions like 'for my sick mother'."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2"><X className="w-4 h-4" /> {error}</div>}
              <div className="flex justify-end">
                <button
                  onClick={handleParse}
                  disabled={isProcessing || !inputText.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin" /> Deep Extracting...</> : <>Extract Data <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-700">Detailed Review ({parsedResults.length} items)</h3>
                <button onClick={() => setParsedResults(null)} className="text-sm text-gray-500 hover:text-gray-700">Start Over</button>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Contributor</th>
                      <th className="px-4 py-3">Deed</th>
                      <th className="px-4 py-3">Note / Intention</th>
                      <th className="px-4 py-3">Qty</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {parsedResults.map((result, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 group">
                        <td className="px-4 py-2"><input type="date" value={result.performedDate} onChange={(e) => handleEditResult(idx, 'performedDate', e.target.value)} className="bg-transparent text-gray-900 border-none w-full focus:ring-0 p-0 text-xs" /></td>
                        <td className="px-4 py-2"><input value={result.contributorName} onChange={(e) => handleEditResult(idx, 'contributorName', e.target.value)} className="bg-transparent text-gray-900 border-none w-full focus:ring-0 p-0 font-medium" /></td>
                        <td className="px-4 py-2"><input value={result.ibadatType} onChange={(e) => handleEditResult(idx, 'ibadatType', e.target.value)} className="bg-transparent text-gray-600 border-none w-full focus:ring-0 p-0" /></td>
                        <td className="px-4 py-2"><input value={result.notes || ''} onChange={(e) => handleEditResult(idx, 'notes', e.target.value)} className="bg-transparent text-indigo-500 italic text-xs border-none w-full focus:ring-0 p-0" placeholder="No intention" /></td>
                        <td className="px-4 py-2"><input type="number" value={result.count} onChange={(e) => handleEditResult(idx, 'count', parseFloat(e.target.value))} className="bg-transparent text-gray-800 border-none w-12 focus:ring-0 p-0" /></td>
                        <td className="px-4 py-2"><button onClick={() => handleDeleteResult(idx)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={() => setParsedResults(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button onClick={handleConfirm} className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"><Check className="w-4 h-4" /> Confirm & Add All</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};