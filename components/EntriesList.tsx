import React, { useState, useMemo } from 'react';
import { IbadatEntry, Occasion } from '../types';
import { Search, Edit2, Trash2, Filter, List, Calendar, Calculator, Clock, ShieldCheck, MessageSquareQuote } from 'lucide-react';
import { normalizeIbadatName } from '../utils';

interface EntriesListProps {
  entries: IbadatEntry[];
  occasions: Occasion[];
  onEdit: (entry: IbadatEntry) => void;
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => Promise<void>;
}

export const EntriesList: React.FC<EntriesListProps> = ({ 
  entries, 
  occasions, 
  onEdit, 
  onDelete,
  onBulkDelete
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEventId, setFilterEventId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'summary'>('list');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const entryDate = (entry.performedDate || entry.dateAdded.split('T')[0]);
      const matchesSearch = entry.contributorName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          entry.ibadatType.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          entry.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (entry.notes && entry.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesEvent = filterEventId === 'all' || entry.occasionId === filterEventId;
      const matchesDate = (!startDate || entryDate >= startDate) && (!endDate || entryDate <= endDate);
      return matchesSearch && matchesEvent && matchesDate;
    }).sort((a, b) => new Date(b.performedDate || b.dateAdded).getTime() - new Date(a.performedDate || a.dateAdded).getTime());
  }, [entries, searchTerm, filterEventId, startDate, endDate]);

  const summaryData = useMemo(() => {
    const map = new Map<string, { name: string; category: string; totalCount: number; unit: string; entriesCount: number; }>();
    filteredEntries.forEach(entry => {
      const normalizedName = normalizeIbadatName(entry.ibadatType);
      const key = `${normalizedName}-${entry.unit.toLowerCase()}`;
      if (!map.has(key)) map.set(key, { name: normalizedName, category: entry.category, totalCount: 0, unit: entry.unit, entriesCount: 0 });
      const item = map.get(key)!;
      item.totalCount += entry.count;
      item.entriesCount += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.totalCount - a.totalCount);
  }, [filteredEntries]);

  const getOccasion = (id: string) => occasions.find(o => o.id === id);
  
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };
  
  const handleSelectAll = () => {
    if (selectedIds.size === filteredEntries.length && filteredEntries.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEntries.map(e => e.id)));
    }
  };

  const handleBulkDelete = async () => {
      if (selectedIds.size === 0) return;
      if (window.confirm(`Are you sure you want to delete ${selectedIds.size} entries?`)) {
          await onBulkDelete(Array.from(selectedIds));
          setSelectedIds(new Set());
      }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (window.confirm('Delete this entry?')) {
          onDelete(id);
      }
  };

  const handleEditClick = (e: React.MouseEvent, entry: IbadatEntry) => {
      e.stopPropagation();
      onEdit(entry);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h2 className="text-2xl font-bold text-gray-800 font-arabic flex items-center gap-2"><List className="text-emerald-600" /> All Contributions</h2><p className="text-gray-500 text-sm">Review individual entries or bulk delete records.</p></div>
        <div className="bg-gray-100 p-1 rounded-lg flex text-sm font-medium">
          <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all ${viewMode === 'list' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}><List size={16} /> List View</button>
          <button onClick={() => setViewMode('summary')} className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all ${viewMode === 'summary' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}><Calculator size={16} /> Aggregated Totals</button>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-emerald-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col xl:flex-row gap-4 bg-gray-50/50">
          <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" /><input type="text" placeholder="Search by name, deed, notes..." className="w-full pl-10 pr-4 py-2 text-sm bg-white text-gray-900 border-gray-300 rounded-lg focus:ring-emerald-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <div className="flex flex-wrap items-center gap-2">
             {viewMode === 'list' && selectedIds.size > 0 && <button onClick={handleBulkDelete} className="bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-red-600 hover:text-white flex items-center gap-2 shadow-sm"><Trash2 size={16} /> Delete ({selectedIds.size})</button>}
             <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg px-2 py-1"><Filter className="text-gray-400 w-4 h-4" /><select className="text-sm border-none focus:ring-0 py-1 pr-8 pl-1 bg-transparent text-gray-900 max-w-[150px]" value={filterEventId} onChange={(e) => setFilterEventId(e.target.value)}><option value="all">All Events</option>{occasions.map(o => <option key={o.id} value={o.id}>{o.title}{o.status === 'archived' ? ' (Archived)' : ''}</option>)}</select></div>
             <div className="flex items-center gap-2">
               <div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><Calendar size={14} /></span><input type="date" className="pl-8 pr-2 py-2 text-sm bg-white text-gray-900 border-gray-300 rounded-lg w-36" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
               <span className="text-gray-400">-</span>
               <div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><Calendar size={14} /></span><input type="date" className="pl-8 pr-2 py-2 text-sm bg-white text-gray-900 border-gray-300 rounded-lg w-36" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
             </div>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {viewMode === 'list' ? (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-4 py-3 w-10 text-center"><input type="checkbox" checked={filteredEntries.length > 0 && selectedIds.size === filteredEntries.length} onChange={handleSelectAll} className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4" /></th>
                  <th className="px-6 py-3">Reported</th>
                  <th className="px-6 py-3">Contributor</th>
                  <th className="px-6 py-3">Deed & Intention</th>
                  <th className="px-6 py-3">Count</th>
                  <th className="px-6 py-3">Event</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEntries.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">No matching entries found.</td></tr>
                ) : (
                  filteredEntries.map((entry) => {
                    const isConsolidated = entry.contributorName === 'Consolidated Archive';
                    const occasion = getOccasion(entry.occasionId);
                    return (
                        <tr key={entry.id} className={`transition-colors group ${selectedIds.has(entry.id) ? 'bg-emerald-50/50' : 'hover:bg-emerald-50/30'} ${isConsolidated ? 'bg-slate-50/30' : ''}`} onClick={() => handleToggleSelect(entry.id)}>
                          <td className="px-4 py-4 text-center">
                            <input 
                                type="checkbox" 
                                checked={selectedIds.has(entry.id)} 
                                onChange={(e) => { e.stopPropagation(); handleToggleSelect(entry.id); }} 
                                onClick={(e) => e.stopPropagation()} 
                                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4" 
                            />
                          </td>
                          <td className="px-6 py-4 text-gray-500 whitespace-nowrap"><div className="flex items-center gap-2 text-xs"><Clock size={12} className="opacity-50" />{new Date(entry.performedDate || entry.dateAdded).toLocaleDateString()}</div></td>
                          <td className="px-6 py-4">{isConsolidated ? <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold uppercase rounded shadow-sm border border-slate-200"><ShieldCheck size={10} /> Consolidated</span> : <span className="font-medium text-gray-900">{entry.contributorName}</span>}</td>
                          <td className="px-6 py-4">
                              <div className="flex flex-col">
                                  <span className="text-gray-800 font-medium">{entry.ibadatType}</span>
                                  <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">{entry.category}</span>
                                      {entry.notes && <span className="flex items-center gap-1 text-[10px] text-indigo-500 italic"><MessageSquareQuote size={10} /> {entry.notes}</span>}
                                  </div>
                              </div>
                          </td>
                          <td className="px-6 py-4 text-gray-800"><span className="font-bold">{entry.count.toLocaleString()}</span> <span className="text-gray-500 text-xs">{entry.unit}</span></td>
                          <td className="px-6 py-4 text-gray-500 text-xs"><div className="flex flex-col"><span className="truncate max-w-[120px]">{occasion?.title || 'Unknown'}</span>{occasion?.status === 'archived' && <span className="text-[8px] font-bold text-slate-400 uppercase">Archive</span>}</div></td>
                          <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                  <button onClick={(e) => handleEditClick(e, entry)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                                  <button onClick={(e) => handleDeleteClick(e, entry.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                              </div>
                          </td>
                        </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-emerald-50/50 text-emerald-800 uppercase text-xs font-semibold"><tr><th className="px-6 py-3">Ibadat Type</th><th className="px-6 py-3">Category</th><th className="px-6 py-3">Records</th><th className="px-6 py-3 text-right">Final Count</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {summaryData.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">No data available for aggregation.</td></tr>
                ) : (
                  summaryData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-800">{item.name}</td>
                      <td className="px-6 py-4"><span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">{item.category}</span></td>
                      <td className="px-6 py-4 text-gray-600">{item.entriesCount} entries</td>
                      <td className="px-6 py-4 text-right"><span className="text-lg font-bold text-emerald-700">{item.totalCount.toLocaleString()}</span><span className="text-sm text-gray-500 ml-1">{item.unit}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};