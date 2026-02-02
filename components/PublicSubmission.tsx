import React, { useState } from 'react';
import { IbadatEntry, Occasion, ToastType } from '../types';
import { ManualEntryForm } from './ManualEntryForm';
import { MessageImporter } from './MessageImporter';
import { HandHeart, CalendarCheck, Loader2, Sparkles, ChevronDown } from 'lucide-react';
import { generatePersonalDua } from '../services/geminiService';

interface PublicSubmissionProps {
  occasions: Occasion[];
  existingEntries?: IbadatEntry[];
  onSubmit: (entries: IbadatEntry[]) => void;
  preselectedEventId?: string | null;
  showToast?: (message: string, type: ToastType) => void;
}

export const PublicSubmission: React.FC<PublicSubmissionProps> = ({ 
  occasions, 
  existingEntries = [],
  onSubmit, 
  preselectedEventId, 
  showToast 
}) => {
  // Filter only active occasions for public submission
  const activeOccasionsList = occasions.filter(o => o.status === 'active');

  // Find the event that covers today's date
  const today = new Date().toISOString().split('T')[0];
  
  const preselected = occasions.find(o => o.id === preselectedEventId);
  const dateMatched = activeOccasionsList.find(o => 
    today >= o.startDate && 
    today <= o.endDate
  );
  
  const defaultEvent = preselected || dateMatched || activeOccasionsList[0] || occasions[0];

  const [activeOccasionId, setActiveOccasionId] = useState<string>(defaultEvent?.id || '');
  const [mode, setMode] = useState<'manual' | 'import'>('manual');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastEntry, setLastEntry] = useState<IbadatEntry | null>(null);
  const [generatedDua, setGeneratedDua] = useState<string | null>(null);
  const [isGeneratingDua, setIsGeneratingDua] = useState(false);

  const activeOccasion = occasions.find(o => o.id === activeOccasionId);

  const handleOnlineSync = async (entries: IbadatEntry[]) => {
    if (activeOccasion?.webhookUrl) {
      try {
        setIsSubmitting(true);
        const response = await fetch(activeOccasion.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: activeOccasion.title,
            entries: entries
          })
        });
        
        if (!response.ok) throw new Error('Failed to sync with online form');
        if(showToast) showToast('Synced with online database successfully', 'info');
      } catch (err) {
        console.error(err);
        if(showToast) showToast('Saved locally, but failed to sync online', 'error');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleManualAdd = async (entries: IbadatEntry[]) => {
    await handleOnlineSync(entries);
    onSubmit(entries);
    // Set the last one for the thank you message/dua generation.
    // Ideally we could summarize, but using the last entered item works well for context.
    setLastEntry(entries[entries.length - 1]);
    setGeneratedDua(null);
    if(showToast) showToast(entries.length > 1 ? `${entries.length} contributions recorded!` : 'Contribution recorded!', 'success');
  };

  const handleImport = async (entries: IbadatEntry[]) => {
    await handleOnlineSync(entries);
    onSubmit(entries);
    setLastEntry(entries[0]); // Just take the first for the dua
    setGeneratedDua(null);
    if(showToast) showToast(`${entries.length} contributions recorded!`, 'success');
  };

  const handleGenerateDua = async () => {
    if (!lastEntry) return;
    setIsGeneratingDua(true);
    try {
      const dua = await generatePersonalDua(lastEntry);
      setGeneratedDua(dua);
    } catch (err) {
       if(showToast) showToast("Could not generate Dua at this time.", "error");
    } finally {
      setIsGeneratingDua(false);
    }
  };

  if (!activeOccasion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0fdf4] p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center">
          <HandHeart className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">IbadatConnect</h1>
          <p className="text-emerald-600 text-xs font-medium uppercase tracking-wide mb-4">
            Automating the collection, elevating the connection
          </p>
          <p className="text-gray-600">No active events found currently.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0fdf4] pb-12">
      <div className="bg-emerald-800 text-white py-6 px-4 shadow-md">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <HandHeart className="w-8 h-8 text-emerald-300" />
          <div>
            <h1 className="text-2xl font-bold font-arabic">IbadatConnect</h1>
            <p className="text-emerald-200 text-sm">Community Worship Collection</p>
            <p className="text-emerald-300 text-xs uppercase tracking-wide mt-1 font-medium">
              Automating the collection, elevating the connection
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-8 space-y-6">
        {/* Event Selection Card */}
        <div className="bg-white rounded-xl shadow-sm border border-emerald-100 p-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1 z-10">
              <span className="text-xs font-semibold tracking-wide text-emerald-600 uppercase mb-1 block">Current Event</span>
              
              {activeOccasionsList.length > 1 ? (
                <div className="relative inline-block w-full max-w-sm">
                   <select 
                     value={activeOccasionId}
                     onChange={(e) => setActiveOccasionId(e.target.value)}
                     className="w-full appearance-none bg-emerald-50 border border-emerald-200 text-emerald-900 text-lg font-bold py-2 pl-3 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                   >
                     {activeOccasionsList.map(o => (
                       <option key={o.id} value={o.id}>{o.title}</option>
                     ))}
                   </select>
                   <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 w-5 h-5 pointer-events-none" />
                </div>
              ) : (
                 <h2 className="text-xl font-bold text-gray-800">{activeOccasion.title}</h2>
              )}
              
              <p className="text-gray-600 text-sm mt-2">{activeOccasion.description}</p>
            </div>
            
            <div className="shrink-0 bg-emerald-50 p-3 rounded-lg text-emerald-700 text-center border border-emerald-100 min-w-[80px]">
              <CalendarCheck className="w-5 h-5 mx-auto mb-1" />
              <span className="text-xs font-bold block">Ends</span>
              <span className="text-xs">{new Date(activeOccasion.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-emerald-100/50 rounded-lg">
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              mode === 'manual' ? 'bg-white text-emerald-800 shadow-sm' : 'text-emerald-600 hover:bg-emerald-100'
            }`}
          >
            Enter Manually
          </button>
          <button
            onClick={() => setMode('import')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              mode === 'import' ? 'bg-white text-emerald-800 shadow-sm' : 'text-emerald-600 hover:bg-emerald-100'
            }`}
          >
            Paste Message
          </button>
        </div>

        {/* Success & AI Dua Section */}
        {lastEntry && !isSubmitting && (
           <div className="bg-white border border-emerald-200 rounded-xl p-6 shadow-sm animate-fade-in relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
             <div className="flex items-start gap-3">
                <div className="bg-emerald-100 p-2 rounded-full text-emerald-600 mt-1">
                   <CalendarCheck size={20} />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-gray-800">JazakAllah Khair!</h3>
                    <p className="text-gray-600 text-sm mt-1">Your contribution has been recorded.</p>
                    
                    {!generatedDua ? (
                       <button 
                         onClick={handleGenerateDua}
                         disabled={isGeneratingDua}
                         className="mt-4 flex items-center gap-2 text-sm bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors"
                       >
                         {isGeneratingDua ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                         Generate Personal Dua with AI
                       </button>
                    ) : (
                      <div className="mt-4 bg-indigo-50/50 p-4 rounded-lg border border-indigo-100">
                         <h4 className="text-xs font-bold text-indigo-400 uppercase mb-1 flex items-center gap-1">
                           <Sparkles size={12} /> AI Generated Dua
                         </h4>
                         <p className="text-indigo-900 italic font-serif text-lg leading-relaxed">
                            "{generatedDua}"
                         </p>
                      </div>
                    )}
                </div>
                <button 
                  onClick={() => setLastEntry(null)} 
                  className="text-gray-400 hover:text-gray-600 text-xs underline"
                >
                  Dismiss
                </button>
             </div>
           </div>
        )}

        {/* Content Forms */}
        {isSubmitting ? (
           <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
              <p>Syncing with online database...</p>
           </div>
        ) : (
          <div className="transition-all duration-300">
            {mode === 'manual' ? (
              <ManualEntryForm 
                activeOccasion={activeOccasion}
                existingEntries={existingEntries} 
                // We do NOT pass occasions here anymore because we handle selection at the top level in this view
                onAdd={handleManualAdd} 
              />
            ) : (
              <MessageImporter 
                activeOccasion={activeOccasion}
                // We do NOT pass occasions here anymore because we handle selection at the top level in this view
                onImport={handleImport} 
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};