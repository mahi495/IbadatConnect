import React, { useState } from 'react';
import { IbadatEntry, Occasion, ToastType } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Sparkles, BookOpen, Users, Heart, Share2, Edit2, Loader2, ArrowRight } from 'lucide-react';
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
        <img src="/perlogo.png" alt="Logo" className="w-auto h-20 mb-4 rounded-xl shadow-sm object-contain" />
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

  // Helper for avatar initials
  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // Helper for random light color for avatar bg
  const getAvatarColor = (name: string) => {
    const colors = ['bg-red-100 text-red-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-yellow-100 text-yellow-700', 'bg-purple-100 text-purple-700', 'bg-pink-100 text-pink-700'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group">
        {/* Subtle geometric pattern overlay */}
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none" 
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.8) 1px, transparent 0)', backgroundSize: '24px 24px' }}
        ></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-emerald-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border border-emerald-400/20 backdrop-blur-sm">Active Event</span>
            </div>
            <h1 className="text-4xl font-bold font-arabic tracking-wide mb-2 leading-tight">{activeOccasion.title}</h1>
            <p className="text-emerald-100 text-base max-w-xl opacity-90">{activeOccasion.description}</p>
          </div>
          <div className="flex flex-col items-end gap-3 w-full md:w-auto">
             <div className="text-right">
                <p className="text-emerald-200 text-xs font-bold uppercase tracking-widest mb-1">Completion Date</p>
                <p className="text-xl font-semibold bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm inline-block">
                  {new Date(activeOccasion.endDate).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
             </div>
             <button 
                onClick={handleShare}
                className="w-full md:w-auto flex items-center justify-center gap-2 bg-white text-emerald-800 px-6 py-3 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
             >
                <Share2 size={18} /> Public Form Link
             </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex items-start space-x-4 group">
          <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:bg-emerald-100 transition-colors">
            <Users size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-400 mb-1 uppercase tracking-wide">Contributors</p>
            <p className="text-3xl font-bold text-gray-800">{totalContributors}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex items-start space-x-4 group">
          <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-100 transition-colors">
            <BookOpen size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-400 mb-1 uppercase tracking-wide">Unique Deeds</p>
            <p className="text-3xl font-bold text-gray-800">{aggregatedData.length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex items-start space-x-4 group">
          <div className="p-4 bg-amber-50 rounded-2xl text-amber-600 group-hover:bg-amber-100 transition-colors">
            <Heart size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-400 mb-1 uppercase tracking-wide">Total Count</p>
            <p className="text-3xl font-bold text-gray-800">{totalCount.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* AI Insights Block */}
      {currentEntries.length > 0 && (
         <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles size={100} className="text-indigo-500" />
            </div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2 text-indigo-800 font-bold">
                  <div className="bg-indigo-100 p-1.5 rounded-lg">
                    <Sparkles size={18} className="text-indigo-600" />
                  </div>
                  <h3>Community Spiritual Insight</h3>
                </div>
                {!analysis && (
                  <button 
                    onClick={runAnalysis} 
                    disabled={isAnalyzing}
                    className="text-xs bg-indigo-600 text-white px-4 py-2 rounded-full hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : 'Generate Analysis'}
                    {!isAnalyzing && <ArrowRight size={14} />}
                  </button>
                )}
              </div>
              
              {analysis ? (
                <p className="text-indigo-900 text-sm leading-relaxed font-medium animate-fade-in bg-white/50 p-4 rounded-xl border border-indigo-50 backdrop-blur-sm">
                  {analysis}
                </p>
              ) : (
                <p className="text-indigo-400 text-sm italic pl-9">
                  Tap generate to use AI to summarize what your community has achieved together in this campaign.
                </p>
              )}
            </div>
         </div>
      )}

      {/* Charts & Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
            Distribution of Ibadat
          </h3>
          {aggregatedData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aggregatedData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={110} 
                    tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f0fdf4' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px' }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                    {aggregatedData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
             <div className="h-80 flex items-center justify-center text-gray-400 italic bg-gray-50 rounded-xl border border-dashed border-gray-200">
               No data to display
             </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[420px]">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
             <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
             Recent Contributions
          </h3>
          <div className="overflow-y-auto flex-1 pr-2 -mr-2">
            {currentEntries.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-gray-400 italic bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Heart className="w-10 h-10 mb-2 opacity-20" />
                  <p>No entries yet</p>
               </div>
            ) : (
              <ul className="space-y-3">
                {[...currentEntries].reverse().slice(0, 8).map((entry) => (
                  <li key={entry.id} className="group flex justify-between items-center p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${getAvatarColor(entry.contributorName)} shadow-sm`}>
                        {getInitials(entry.contributorName)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-800 text-sm">{entry.contributorName}</span>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wide">{new Date(entry.dateAdded).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="text-right">
                          <span className="block font-bold text-emerald-700">{entry.count} {entry.unit}</span>
                          <span className="text-xs text-gray-500 font-medium">{normalizeIbadatName(entry.ibadatType)}</span>
                       </div>
                       <button 
                         onClick={() => onEdit(entry)}
                         className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
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