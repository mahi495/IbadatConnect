import React, { useState, useMemo } from 'react';
import { IbadatEntry, Occasion } from '../types';
import { Search, Edit2, Trash2, Filter, List, Calendar, Layers, Hash, Calculator } from 'lucide-react';
import { normalizeIbadatName } from '../utils';

interface EntriesListProps {
  entries: IbadatEntry[];
  occasions: Occasion[];
  onEdit: (entry: IbadatEntry) => void;
  onDelete: (id: string) => void;
}

export const EntriesList: React.FC<EntriesListProps> = ({ 
  entries, 
  occasions, 
  onEdit, 
  onDelete 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEventId, setFilterEventId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'summary'>('list');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const entryDate = entry.dateAdded.split('T')[0];

      const matchesSearch = 
        entry.contributorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.ibadatType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesEvent = filterEventId === 'all' || entry.occasionId === filterEventId;

      const matchesDate = 
        (!startDate || entryDate >= startDate) && 
        (!endDate || entryDate <= endDate);

      return matchesSearch && matchesEvent && matchesDate;
    }).sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
  }, [entries, searchTerm, filterEventId, startDate, endDate]);

  const summaryData = useMemo(() => {
    const map = new Map<string, { 
      name: string; 
      category: string; 
      totalCount: number; 
      unit: string; 
      entriesCount: number;
    }>();

    filteredEntries.forEach(entry => {
      const normalizedName = normalizeIbadatName(entry.ibadatType);
      // Create a unique key based on name and unit to avoid merging incompatible units (e.g. pages vs juz)
      const key = `${normalizedName}-${entry.unit.toLowerCase()}`;

      if (!map.has(key)) {
        map.set(key, {
          name: normalizedName,
          category: entry.category,
          totalCount: 0,
          unit: entry.unit,
          entriesCount: 0
        });
      }

      const item = map.get(key)!;
      item.totalCount += entry.count;
      item.entriesCount += 1;
    });

    return Array.from(map.values()).sort((a, b) => b.totalCount - a.totalCount);
  }, [filteredEntries]);

  const getOccasionName = (id: string) => occasions.find(o => o.id === id)?.title || 'Unknown Event';

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 font-arabic flex items-center gap-2">
            <List className="text-emerald-600" /> Collection Data
          </h2>
          <p className="text-gray-500 text-sm">Review individual entries or view aggregated totals.</p>
        </div>

        {/* View Toggles */}
        <div className="bg-gray-100 p-1 rounded-lg flex text-sm font-medium">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all ${
              viewMode === 'list' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <List size={16} /> Detailed List
          </button>
          <button
            onClick={() => setViewMode('summary')}
            className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all ${
              viewMode === 'summary' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Calculator size={16} /> Summary Totals
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-emerald-100 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col xl:flex-row gap-4 bg-gray-50/50">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full pl-10 pr-4 py-2 text-sm bg-white text-gray-900 border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
             {/* Event Filter */}
             <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg px-2 py-1">
               <Filter className="text-gray-400 w-4 h-4" />
               <select 
                  className="text-sm border-none focus:ring-0 py-1 pr-8 pl-1 bg-transparent text-gray-900 max-w-[150px]"
                  value={filterEventId}
                  onChange={(e) => setFilterEventId(e.target.value)}
               >
                 <option value="all">All Events</option>
                 {occasions.map(o => (
                   <option key={o.id} value={o.id}>{o.title}</option>
                 ))}
               </select>
             </div>

             {/* Date Range */}
             <div className="flex items-center gap-2">
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <Calendar size={14} />
                  </span>
                  <input 
                    type="date"
                    className="pl-8 pr-2 py-2 text-sm bg-white text-gray-900 border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 w-36"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="Start Date"
                  />
                </div>
                <span className="text-gray-400">-</span>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <Calendar size={14} />
                  </span>
                  <input 
                    type="date"
                    className="pl-8 pr-2 py-2 text-sm bg-white text-gray-900 border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 w-36"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="End Date"
                  />
                </div>
             </div>
             
             {(startDate || endDate) && (
               <button 
                 onClick={() => { setStartDate(''); setEndDate(''); }}
                 className="text-xs text-red-500 hover:underline px-2"
               >
                 Clear Dates
               </button>
             )}
          </div>
        </div>

        {/* CONTENT VIEW */}
        <div className="overflow-x-auto min-h-[300px]">
          {viewMode === 'list' ? (
            /* DETAILED LIST VIEW */
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Contributor</th>
                  <th className="px-6 py-3">Deed</th>
                  <th className="px-6 py-3">Count</th>
                  <th className="px-6 py-3">Event</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                      No entries found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-emerald-50/30 transition-colors group">
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                        {new Date(entry.dateAdded).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {entry.contributorName}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-gray-800">{entry.ibadatType}</span>
                          <span className="text-xs text-emerald-600 bg-emerald-50 w-fit px-1.5 rounded">{entry.category}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-800">
                        <span className="font-semibold">{entry.count}</span> <span className="text-gray-500 text-xs">{entry.unit}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">
                         <span className="flex items-center gap-1">
                           <Calendar className="w-3 h-3 opacity-50" />
                           {getOccasionName(entry.occasionId)}
                         </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => onEdit(entry)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              if(confirm('Are you sure you want to delete this entry?')) onDelete(entry.id);
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            /* SUMMARY VIEW */
            <table className="w-full text-sm text-left">
              <thead className="bg-emerald-50/50 text-emerald-800 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-3">Ibadat Type</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Contributors</th>
                  <th className="px-6 py-3 text-right">Total Sum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summaryData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">
                      No data to summarize for this range.
                    </td>
                  </tr>
                ) : (
                  summaryData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-800 text-base">
                        {item.name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                         <div className="flex items-center gap-2">
                           <Hash size={14} className="text-gray-400" />
                           {item.entriesCount} entries
                         </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-lg font-bold text-emerald-700">{item.totalCount.toLocaleString()}</span>
                        <span className="text-sm text-gray-500 ml-1">{item.unit}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {summaryData.length > 0 && (
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={2} className="px-6 py-3 text-xs font-semibold text-gray-500">
                      Total Unique Deeds: {summaryData.length}
                    </td>
                    <td colSpan={2} className="px-6 py-3 text-right text-xs font-semibold text-gray-500">
                      * Sum calculated based on normalized names
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex justify-between items-center">
           <span>
             {viewMode === 'list' 
                ? `Showing ${filteredEntries.length} individual entries`
                : `Showing summary of ${summaryData.length} deed types`
             }
           </span>
           {startDate && endDate && (
              <span className="font-medium text-emerald-600">
                 Filtering from {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
              </span>
           )}
        </div>
      </div>
    </div>
  );
};