import React, { useState } from 'react';
import { IbadatEntry, Occasion, ToastType } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Sparkles, BookOpen, Users, Heart, Share2, Edit2, Loader2 } from 'lucide-react';
import { normalizeIbadatName } from '../utils';
import { getTrendsAnalysis } from '../services/geminiService';

interface DashboardProps {
  entries: IbadatEntry[];
  activeOccasion: Occasion | null;
  onEdit: (entry: IbadatEntry) => void;
  showToast?: (message: string, type: ToastType) => void;
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

export const Dashboard: React.FC<DashboardProps> = ({ entries, activeOccasion, onEdit, showToast }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  if (!activeOccasion) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white rounded-xl shadow-sm border border-emerald-100">
        <Sparkles className="w-16 h-16 text-emerald-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800">No Active Occasion</h2>
        <p className="text-gray-500 mt-2">Please select or create an occasion to start tracking ibadat.</p>
      </div>
    );
  }

  const handleShare = () => {
    const url = window.location.href.split('?')[0] + '?mode=public';
    
    if (window.location.protocol === 'blob:') {
      alert("⚠️ You are viewing this app in a temporary preview (blob URL). This specific link cannot be shared with others on different devices. Please deploy the application to a provider like Vercel or Netlify to get a shareable public link.");
      return;
    }

    navigator.clipboard.writeText(url).then(() => {
      if(showToast) {
        showToast('Public submission link copied!', 'success');
      } else {
        alert('Public submission link copied to clipboard!');
      }
    });
  };

  const currentEntries = entries.filter(e => e.occasionId === activeOccasion.id);
  
  // Aggregate data for charts with normalization
  const aggregatedData = currentEntries.reduce((acc, curr) => {
    const normalizedName = normalizeIbadatName(curr.ibadatType);
    const existing = acc.find(item => item.name === normalizedName);
    if (existing) {
      existing.value += curr.count;
    } else {
      acc.push({ name: normalizedName, value: curr.count });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  // Sort by value descending
  aggregatedData.sort((a, b) => b.value - a.value);

  const totalContributors = new Set(currentEntries.map(e => e.contributorName)).size;
  const totalCount = currentEntries.reduce((sum, e) => sum + e.count, 0);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await getTrendsAnalysis(currentEntries);
    setAnalysis(result);
    setIsAnalyzing(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-emerald-100 font-medium mb-1">Current Event</h2>
            <h1 className="text-3xl font-bold font-arabic tracking-wide">{activeOccasion.title}</h1>
            <p className="text-emerald-100 mt-2 text-sm opacity-90">{activeOccasion.description}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
             <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm text-center min-w-[100px]">
                <span className="text-xs uppercase opacity-75 block">Target Date</span>
                <span className="text-sm font-semibold">{new Date(activeOccasion.endDate).toLocaleDateString()}</span>
             </div>
             <button 
                onClick={handleShare}
                className="flex items-center gap-2 bg-white text-emerald-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-50 transition-colors shadow-sm"
             >
                <Share2 size={16} /> Share Form
             </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Contributors Count</p>
            <p className="text-2xl font-bold text-gray-800">{totalContributors}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 rounded-full text-blue-600">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Different Acts</p>
            <p className="text-2xl font-bold text-gray-800">{aggregatedData.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-50 rounded-full text-amber-600">
            <Heart size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Count</p>
            <p className="text-2xl font-bold text-gray-800">{totalCount.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* AI Insights Block */}
      {currentEntries.length > 0 && (
         <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
            <div className="flex justify-between items-start">
               <div className="flex items-center gap-2 text-indigo-800 font-bold mb-2">
                 <Sparkles size={18} />
                 <h3>AI Community Insight</h3>
               </div>
               {!analysis && (
                 <button 
                   onClick={runAnalysis} 
                   disabled={isAnalyzing}
                   className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full hover:bg-indigo-200 transition-colors flex items-center gap-1"
                 >
                   {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : 'Analyze Trends'}
                 </button>
               )}
            </div>
            {analysis ? (
              <p className="text-indigo-900 text-sm leading-relaxed animate-fade-in">
                {analysis}
              </p>
            ) : (
              <p className="text-indigo-400 text-sm italic">
                Generate an AI summary of what your community is achieving together.
              </p>
            )}
         </div>
      )}

      {/* Charts & Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-emerald-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Distribution of Ibadat</h3>
          {aggregatedData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aggregatedData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {aggregatedData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
             <div className="h-64 flex items-center justify-center text-gray-400 italic">No data yet</div>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl border border-emerald-100 shadow-sm overflow-hidden flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Contributions</h3>
          <div className="overflow-y-auto flex-1 pr-2">
            {currentEntries.length === 0 ? (
               <div className="h-full flex items-center justify-center text-gray-400 italic">No entries yet</div>
            ) : (
              <ul className="space-y-3">
                {[...currentEntries].reverse().slice(0, 8).map((entry) => (
                  <li key={entry.id} className="group flex justify-between items-center p-3 bg-emerald-50/50 rounded-lg text-sm border border-emerald-50 hover:border-emerald-200 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-800">{entry.contributorName}</span>
                      <span className="text-xs text-gray-500">{new Date(entry.dateAdded).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="text-right">
                          <span className="block font-bold text-emerald-700">{entry.count} {entry.unit}</span>
                          <span className="text-xs text-emerald-600">{normalizeIbadatName(entry.ibadatType)}</span>
                       </div>
                       <button 
                         onClick={() => onEdit(entry)}
                         className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-100 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                         title="Edit Contribution"
                       >
                         <Edit2 size={14} />
                       </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};