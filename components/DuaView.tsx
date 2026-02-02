import React from 'react';
import { IbadatEntry, Occasion, IbadatCategory } from '../types';
import { Copy, Share2, Sparkles, ChevronDown } from 'lucide-react';
import { normalizeIbadatName } from '../utils';

interface DuaViewProps {
  entries: IbadatEntry[];
  activeOccasion: Occasion;
  occasions?: Occasion[];
  onOccasionChange?: (id: string) => void;
}

export const DuaView: React.FC<DuaViewProps> = ({ 
  entries, 
  activeOccasion,
  occasions,
  onOccasionChange
}) => {
  // Group entries by Category
  const grouped = entries.reduce((acc, entry) => {
    const cat = entry.category || IbadatCategory.OTHER;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(entry);
    return acc;
  }, {} as Record<IbadatCategory, IbadatEntry[]>);

  // Helper to aggregate sub-types within a category using Normalization
  const aggregateByType = (catEntries: IbadatEntry[]) => {
    const agg = catEntries.reduce((acc, curr) => {
      // Normalize the name (e.g., "yasin" -> "Surah Yasin")
      const normalizedName = normalizeIbadatName(curr.ibadatType);
      
      // Use the normalized name as the key
      const key = normalizedName;
      
      if (!acc[key]) {
        acc[key] = { name: normalizedName, count: 0, unit: curr.unit };
      }
      
      acc[key].count += curr.count;
      return acc;
    }, {} as Record<string, { name: string, count: number, unit: string }>);
    
    // Sort alphabetically for better readability
    return Object.values(agg).sort((a, b) => a.name.localeCompare(b.name));
  };

  const generateDuaText = () => {
    let text = `*Dua for ${activeOccasion.title}*\n\n`;
    text += `Ya Allah, please accept these humble efforts from our community:\n\n`;

    Object.values(IbadatCategory).forEach(cat => {
      if (grouped[cat] && grouped[cat].length > 0) {
        const items = aggregateByType(grouped[cat]);
        if (items.length > 0) {
            text += `*${cat}*\n`;
            items.forEach(item => {
            text += `- ${item.name}: ${item.count} ${item.unit}\n`;
            });
            text += `\n`;
        }
      }
    });

    text += `Total Contributions: ${entries.length}\n`;
    text += `May Allah accept our deeds and grant us success. Ameen.`;
    return text;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateDuaText());
    alert('Dua summary copied to clipboard!');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      <div className="text-center space-y-4">
        <div className="inline-flex p-3 bg-amber-100 rounded-full text-amber-600 shadow-sm">
           <Sparkles className="w-8 h-8" />
        </div>
        
        <div>
           {occasions && occasions.length > 1 && onOccasionChange ? (
             <div className="relative inline-block">
               <select
                 value={activeOccasion.id}
                 onChange={(e) => onOccasionChange(e.target.value)}
                 className="appearance-none bg-transparent text-3xl font-bold text-gray-800 font-arabic text-center py-1 pr-8 pl-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-lg hover:bg-gray-50 transition-colors"
               >
                 {occasions.map(o => (
                   <option key={o.id} value={o.id}>{o.title}</option>
                 ))}
               </select>
               <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 w-6 h-6 pointer-events-none" />
             </div>
           ) : (
             <h2 className="text-3xl font-bold text-gray-800 font-arabic">{activeOccasion.title}</h2>
           )}
           <p className="text-gray-600">Consolidated Dua List</p>
        </div>

        <div className="text-sm text-gray-500 max-w-lg mx-auto">
          Reviewing {entries.length} contributions for {activeOccasion.title}. 
          {activeOccasion.status === 'active' ? (
             <span className="text-emerald-600 font-medium ml-1">Event is Active.</span>
          ) : (
             <span className="text-gray-400 font-medium ml-1">Event is Closed.</span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-amber-100 overflow-hidden">
        <div className="p-8 bg-amber-50/50">
          <div className="prose prose-emerald max-w-none font-serif">
            <h3 className="text-2xl text-emerald-800 font-arabic mb-6 border-b border-emerald-100 pb-2">
              Presented Deeds
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {Object.values(IbadatCategory).map((cat) => {
                const catEntries = grouped[cat];
                if (!catEntries || catEntries.length === 0) return null;
                
                const aggregated = aggregateByType(catEntries);

                return (
                  <div key={cat} className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm">
                    <h4 className="text-lg font-bold text-emerald-700 mb-3 flex items-center gap-2">
                      {cat}
                    </h4>
                    <ul className="space-y-2">
                      {aggregated.map((item, idx) => (
                        <li key={idx} className="flex justify-between items-center text-gray-700">
                          <span className="capitalize">{item.name}</span>
                          <span className="font-bold bg-emerald-50 px-2 py-0.5 rounded text-emerald-800 text-sm">
                            {item.count} {item.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {entries.length === 0 && (
              <div className="text-center py-12">
                 <p className="text-gray-500 italic mb-2">No deeds recorded for this event yet.</p>
                 <p className="text-xs text-gray-400">Share the public link to start collecting.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 px-8 py-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-500">
            Total: {entries.length} items
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              disabled={entries.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Copy className="w-4 h-4" /> Copy Text
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm font-medium">
              <Share2 className="w-4 h-4" /> Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
