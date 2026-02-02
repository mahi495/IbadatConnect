import React from 'react';
import { IbadatEntry, Occasion, IbadatCategory } from '../types';
import { Copy, Share2, ChevronDown } from 'lucide-react';
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
        <div className="inline-block relative">
           <img 
             src="/perlogo.png" 
             alt="Logo" 
             className="w-auto h-20 rounded-xl shadow-md object-contain border-4 border-white"
           />
           <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-6 h-6 rounded-full border-2 border-white"></div>
        </div>
        
        <div>
           {occasions && occasions.length > 1 && onOccasionChange ? (
             <div className="relative inline-block group">
               <select
                 value={activeOccasion.id}
                 onChange={(e) => onOccasionChange(e.target.value)}
                 className="appearance-none bg-transparent text-3xl font-bold text-gray-800 font-arabic text-center py-1 pr-10 pl-2 cursor-pointer focus:outline-none focus:ring-0 hover:text-emerald-800 transition-colors"
               >
                 {occasions.map(o => (
                   <option key={o.id} value={o.id}>{o.title}</option>
                 ))}
               </select>
               <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 w-6 h-6 pointer-events-none group-hover:text-emerald-600 transition-colors" />
             </div>
           ) : (
             <h2 className="text-3xl font-bold text-gray-800 font-arabic">{activeOccasion.title}</h2>
           )}
           <p className="text-gray-500 font-serif italic mt-1 text-lg">Consolidated Deed Summary</p>
        </div>

        <div className="text-sm text-gray-500 max-w-lg mx-auto bg-white px-4 py-1.5 rounded-full border border-gray-100 inline-block shadow-sm">
          Tracking <span className="font-bold text-gray-900">{entries.length}</span> contributions. 
          {activeOccasion.status === 'active' ? (
             <span className="text-emerald-600 font-medium ml-1">● Active</span>
          ) : (
             <span className="text-gray-400 font-medium ml-1">● Closed</span>
          )}
        </div>
      </div>

      <div className="relative rounded-2xl shadow-xl overflow-hidden border border-amber-200/50">
        {/* Parchment Background */}
        <div className="absolute inset-0 bg-[#fffdf5]" style={{ backgroundImage: 'radial-gradient(#f3e5c2 1px, transparent 0)', backgroundSize: '40px 40px', opacity: 0.5 }}></div>
        
        {/* Content */}
        <div className="relative p-10 md:p-14">
            {/* Decorative Corners */}
            <div className="absolute top-0 left-0 w-20 h-20 border-l-4 border-t-4 border-amber-200 rounded-tl-3xl m-4 opacity-50"></div>
            <div className="absolute top-0 right-0 w-20 h-20 border-r-4 border-t-4 border-amber-200 rounded-tr-3xl m-4 opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-20 h-20 border-l-4 border-b-4 border-amber-200 rounded-bl-3xl m-4 opacity-50"></div>
            <div className="absolute bottom-0 right-0 w-20 h-20 border-r-4 border-b-4 border-amber-200 rounded-br-3xl m-4 opacity-50"></div>

          <div className="prose prose-emerald max-w-none font-serif relative z-10">
            <div className="text-center mb-10 pb-4 border-b-2 border-double border-amber-200">
               <h3 className="text-3xl text-emerald-900 font-arabic mb-2">
                 Presented Deeds
               </h3>
               <p className="text-emerald-800/60 italic text-sm">May these efforts be accepted</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
              {Object.values(IbadatCategory).map((cat) => {
                const catEntries = grouped[cat];
                if (!catEntries || catEntries.length === 0) return null;
                
                const aggregated = aggregateByType(catEntries);

                return (
                  <div key={cat} className="break-inside-avoid">
                    <h4 className="text-lg font-bold text-emerald-800 mb-4 flex items-center gap-2 uppercase tracking-widest text-xs border-b border-emerald-100 pb-1">
                      {cat}
                    </h4>
                    <ul className="space-y-3">
                      {aggregated.map((item, idx) => (
                        <li key={idx} className="flex justify-between items-baseline text-gray-800 group">
                          <span className="capitalize font-medium text-lg text-emerald-950 group-hover:text-emerald-700 transition-colors">{item.name}</span>
                          <span className="relative">
                            <span className="font-bold text-lg">{item.count}</span>
                            <span className="text-xs text-gray-500 ml-1 font-sans font-normal uppercase">{item.unit}</span>
                            <span className="absolute -bottom-1 left-0 w-full h-px bg-amber-200/50"></span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {entries.length === 0 && (
              <div className="text-center py-16">
                 <p className="text-gray-400 italic mb-2 text-lg">No deeds recorded for this event yet.</p>
                 <p className="text-sm text-gray-400/70">Share the public link to start collecting.</p>
              </div>
            )}
            
            <div className="mt-12 text-center text-emerald-900/60 text-sm italic font-sans">
               Generated by IbadatConnect
            </div>
          </div>
        </div>

        <div className="bg-[#fcfbf7] px-8 py-5 border-t border-amber-100 flex flex-col sm:flex-row justify-between items-center gap-4 relative z-20">
          <div className="text-sm text-gray-500 font-medium">
            Total Items: {entries.length}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              disabled={entries.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors shadow-md font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
            >
              <Copy className="w-4 h-4" /> Copy Text
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm font-medium hover:text-emerald-700 hover:border-emerald-200">
              <Share2 className="w-4 h-4" /> Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};