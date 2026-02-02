import React, { useState } from 'react';
import { IbadatEntry, Occasion, ToastType } from '../types';
import { ManualEntryForm } from './ManualEntryForm';
import { MessageImporter } from './MessageImporter';
import { HandHeart, CalendarCheck, Loader2, Sparkles, ChevronDown, Check } from 'lucide-react';
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
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4">
        <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md text-center border border-gray-100">
          <img src="/logo.png" alt="Logo" className="w-auto h-24 mx-auto mb-6 rounded-xl shadow-md object-contain" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2 font-arabic">IbadatConnect</h1>
          <p className="text-emerald-600 text-xs font-bold uppercase tracking-widest mb-6">
            Automating the collection, elevating the connection
          </p>
          <p className="text-gray-500">No active events found currently.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-12 font-sans text-gray-900">
      {/* Hero Header */}
      <div className="bg-emerald-900 text-white pb-20 pt-10 px-4 shadow-lg relative overflow-hidden">
        {/* Abstract Pattern */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-800/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-800/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="max-w-2xl mx-auto flex flex-col items-center text-center relative z-10">
          <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl mb-4 border border-white/20 shadow-xl">
             <img src="/logo.png" alt="Logo" className="w-auto h-16 rounded-lg object-contain" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-arabic mb-2 tracking-wide">IbadatConnect</h1>
          <p className="text-emerald-200/80 text-sm font-medium max-w-sm mx-auto leading-relaxed">
            Community Worship Collection Platform
          </p>
          <div className="mt-4 px-4 py-1.5 bg-emerald-950/30 rounded-full border border-emerald-500/20">
             <p className="text-emerald-300 text-[10px] md:text-xs uppercase tracking-[0.2em] font-bold">
              Automating the collection, elevating the connection
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-12 space-y-8 relative z-20">
        {/* Event Selection Card - Only show if we have options, otherwise show title */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex-1">
              <span className="inline-block px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider mb-3">Current Campaign</span>
              
              <h2 className="text-2xl font-bold text-gray-900 font-arabic">{activeOccasion.title}</h2>
              
              <p className="text-gray-500 text-sm mt-3 leading-relaxed">{activeOccasion.description}</p>
            </div>
            
            <div className="shrink-0 bg-gray-50 p-4 rounded-xl text-center border border-gray-200 min-w-[90px] flex flex-col items-center justify-center">
              <CalendarCheck className="w-5 h-5 text-gray-400 mb-1" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Ends On</span>
              <span className="text-sm font-bold text-gray-800">{new Date(activeOccasion.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1.5 bg-gray-200/50 rounded-xl backdrop-blur-sm">
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
              mode === 'manual' ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            Enter Manually
          </button>
          <button
            onClick={() => setMode('import')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
              mode === 'import' ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            Paste Message
          </button>
        </div>

        {/* Success & AI Dua Section */}
        {lastEntry && !isSubmitting && (
           <div className="bg-white border-l-4 border-emerald-500 rounded-r-xl shadow-lg p-6 animate-fade-in-up">
             <div className="flex items-start gap-4">
                <div className="bg-emerald-100 p-2.5 rounded-full text-emerald-600 mt-1 shrink-0">
                   <Check className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg">JazakAllah Khair!</h3>
                    <p className="text-gray-600 text-sm mt-1">Your contribution has been recorded successfully.</p>
                    
                    {!generatedDua ? (
                       <button 
                         onClick={handleGenerateDua}
                         disabled={isGeneratingDua}
                         className="mt-5 flex items-center gap-2 text-xs font-bold bg-indigo-50 text-indigo-600 px-4 py-2.5 rounded-lg hover:bg-indigo-100 transition-colors uppercase tracking-wide"
                       >
                         {isGeneratingDua ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                         Generate Personal Dua
                       </button>
                    ) : (
                      <div className="mt-5 bg-gradient-to-br from-indigo-50 to-white p-5 rounded-xl border border-indigo-100 shadow-inner">
                         <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
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
                  className="text-gray-300 hover:text-gray-500 text-sm font-medium"
                >
                  Dismiss
                </button>
             </div>
           </div>
        )}

        {/* Content Forms */}
        {isSubmitting ? (
           <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Syncing with our records...</p>
           </div>
        ) : (
          <div className="transition-all duration-300">
            {mode === 'manual' ? (
              <ManualEntryForm 
                activeOccasion={activeOccasion}
                occasions={activeOccasionsList} // Pass occasions to show dropdown
                onOccasionChange={setActiveOccasionId} // Pass handler
                existingEntries={existingEntries} 
                onAdd={handleManualAdd} 
              />
            ) : (
              <MessageImporter 
                activeOccasion={activeOccasion}
                occasions={activeOccasionsList}
                onOccasionChange={setActiveOccasionId}
                onImport={handleImport} 
              />
            )}
          </div>
        )}
        
        <div className="text-center text-xs text-gray-400 py-6">
          © {new Date().getFullYear()} IbadatConnect. May Allah accept from all of us.
        </div>
      </div>
    </div>
  );
};