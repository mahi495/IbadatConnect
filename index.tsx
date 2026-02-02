import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Layout, Menu, Home, Upload, CalendarDays, PlusCircle, HandHeart, Eye, X, List, LogOut } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { MessageImporter } from './components/MessageImporter';
import { ManualEntryForm } from './components/ManualEntryForm';
import { DuaView } from './components/DuaView';
import { EventManager } from './components/EventManager';
import { PublicSubmission } from './components/PublicSubmission';
import { EntriesList } from './components/EntriesList';
import { EditEntryModal } from './components/EditEntryModal';
import { Login } from './components/Login';
import { ToastContainer } from './components/Toast';
import { IbadatEntry, Occasion, ViewMode, ToastMessage, ToastType } from './types';
import { findActiveOccasion } from './utils';

// Mock data initialization
const INITIAL_OCCASIONS: Occasion[] = [
  {
    id: '1',
    title: 'Ramadan 2025 Khatam',
    startDate: '2025-03-01',
    endDate: '2025-03-30',
    description: 'Collecting Quran recitations for the last 10 days.',
    status: 'active'
  }
];

const App = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.DASHBOARD);
  const [occasions, setOccasions] = useState<Occasion[]>(INITIAL_OCCASIONS);
  const [activeOccasionId, setActiveOccasionId] = useState<string>('1');
  const [entries, setEntries] = useState<IbadatEntry[]>([]);
  const [isPublicMode, setIsPublicMode] = useState(false);
  const [publicEventId, setPublicEventId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<IbadatEntry | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Load from local storage and handle Auth
  useEffect(() => {
    // Check URL for public mode and specific event
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'public') {
      setIsPublicMode(true);
      setView(ViewMode.PUBLIC_FORM);
      const evtId = params.get('eventId');
      if (evtId) setPublicEventId(evtId);
    }

    try {
      const savedEntries = localStorage.getItem('ibadat_entries');
      if (savedEntries) setEntries(JSON.parse(savedEntries));
    } catch (e) {
      console.error("Failed to parse entries from local storage", e);
    }

    try {
      const savedOccasions = localStorage.getItem('ibadat_occasions');
      if (savedOccasions) setOccasions(JSON.parse(savedOccasions));
    } catch (e) {
      console.error("Failed to parse occasions from local storage", e);
    }

    const authStatus = localStorage.getItem('ibadat_auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
    setIsAuthChecking(false);
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('ibadat_entries', JSON.stringify(entries));
    localStorage.setItem('ibadat_occasions', JSON.stringify(occasions));
  }, [entries, occasions]);

  // Toast Management
  const addToast = (message: string, type: ToastType = 'info') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Determine active occasion dynamically if current ID is invalid or outdated
  // For the dashboard, we stick to what the user clicked.
  // For public mode, we calculate it.
  const activeOccasion = occasions.find(o => o.id === activeOccasionId) || occasions[0];

  const handleImport = (newEntries: IbadatEntry[]) => {
    setEntries(prev => [...prev, ...newEntries]);
    if (!isPublicMode) {
        setView(ViewMode.DASHBOARD);
        addToast(`${newEntries.length} entries added successfully`, 'success');
    }
  };

  const handleManualAdd = (newEntries: IbadatEntry[]) => {
    setEntries(prev => [...prev, ...newEntries]);
    if (!isPublicMode) {
        addToast(`${newEntries.length} entries added successfully`, 'success');
    }
  };

  const handleUpdateEntry = (updatedEntry: IbadatEntry) => {
    setEntries(prev => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e));
    setEditingEntry(null);
    addToast('Entry updated', 'success');
  };

  const handleDeleteEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    setEditingEntry(null);
    addToast('Entry deleted', 'error');
  };

  const openTestPublicView = () => {
      // Simulate public view without reload
      setIsPublicMode(true);
      setView(ViewMode.PUBLIC_FORM);
      setPublicEventId(activeOccasionId);
  };

  const handleNavClick = (newView: ViewMode) => {
    setView(newView);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('ibadat_auth');
    setIsAuthenticated(false);
    addToast('Logged out successfully', 'info');
  };

  const handleGoToEvents = () => {
      setView(ViewMode.EVENT_MANAGER);
  };

  // --- RENDERING ---

  if (isPublicMode) {
    return (
      <div className="relative">
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <PublicSubmission 
            occasions={occasions} 
            existingEntries={entries}
            onSubmit={handleImport} 
            preselectedEventId={publicEventId}
            showToast={addToast}
        />
        {/* Floating button to exit test mode */}
        <button 
            onClick={() => setIsPublicMode(false)}
            className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg z-50 text-sm flex items-center gap-2 hover:bg-gray-900"
        >
            Exit Public Preview
        </button>
      </div>
    );
  }

  // Auth Check Loading State
  if (isAuthChecking) {
    return <div className="min-h-screen bg-[#f0fdf4]" />;
  }

  // Unauthenticated View
  if (!isAuthenticated) {
    return (
      <>
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <Login onLogin={() => {
          setIsAuthenticated(true);
          addToast('Welcome back!', 'success');
        }} />
      </>
    );
  }

  // Authenticated Main App
  const renderContent = () => {
    const NoEventState = () => (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <CalendarDays className="w-12 h-12 mb-2 text-gray-300" />
            <p className="mb-4">No active event selected.</p>
            <button 
                onClick={handleGoToEvents}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 transition-colors"
            >
                Create or Select Event
            </button>
        </div>
    );

    switch (view) {
      case ViewMode.DASHBOARD:
        return <Dashboard entries={entries} activeOccasion={activeOccasion} onEdit={setEditingEntry} showToast={addToast} />;
      case ViewMode.EVENT_MANAGER:
        return (
          <EventManager 
            occasions={occasions} 
            setOccasions={setOccasions} 
            activeOccasionId={activeOccasionId}
            setActiveOccasionId={setActiveOccasionId}
          />
        );
      case ViewMode.IMPORT:
        return activeOccasion ? (
          <MessageImporter 
            activeOccasion={activeOccasion} 
            occasions={occasions}
            onOccasionChange={setActiveOccasionId}
            onImport={handleImport} 
          />
        ) : <NoEventState />;
      case ViewMode.MANUAL_ENTRY:
        return activeOccasion ? (
          <ManualEntryForm 
            activeOccasion={activeOccasion} 
            occasions={occasions}
            existingEntries={entries}
            onOccasionChange={setActiveOccasionId}
            onAdd={handleManualAdd} 
          />
        ) : <NoEventState />;
      case ViewMode.ENTRIES_LIST:
        return (
          <EntriesList 
            entries={entries} 
            occasions={occasions} 
            onEdit={setEditingEntry} 
            onDelete={handleDeleteEntry}
          />
        );
      case ViewMode.DUA_MODE:
        return activeOccasion ? (
          <DuaView 
            entries={entries.filter(e => e.occasionId === activeOccasion.id)} 
            activeOccasion={activeOccasion}
            occasions={occasions}
            onOccasionChange={setActiveOccasionId}
          />
        ) : <NoEventState />;
      default:
        return <Dashboard entries={entries} activeOccasion={activeOccasion} onEdit={setEditingEntry} showToast={addToast} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f0fdf4]">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Edit Modal Overlay */}
      {editingEntry && (
        <EditEntryModal 
            entry={editingEntry} 
            occasions={occasions} 
            onSave={handleUpdateEntry} 
            onCancel={() => setEditingEntry(null)}
            onDelete={handleDeleteEntry}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`w-64 bg-white border-r border-emerald-100 flex flex-col fixed inset-y-0 left-0 z-30 transition-transform duration-300 transform ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:static`}
      >
        <div className="p-6 border-b border-emerald-100 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-emerald-800 font-arabic flex items-center gap-2">
            <HandHeart className="w-8 h-8 text-emerald-600" />
            IbadatConnect
          </h1>
          <button 
            className="md:hidden text-gray-500"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => handleNavClick(ViewMode.DASHBOARD)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              view === ViewMode.DASHBOARD ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Home size={20} /> Dashboard
          </button>
          
          <button
            onClick={() => handleNavClick(ViewMode.EVENT_MANAGER)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              view === ViewMode.EVENT_MANAGER ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <CalendarDays size={20} /> Events
          </button>

          <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Collection
          </div>

          <button
            onClick={() => handleNavClick(ViewMode.MANUAL_ENTRY)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              view === ViewMode.MANUAL_ENTRY ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <PlusCircle size={20} /> Manual Entry
          </button>

          <button
            onClick={() => handleNavClick(ViewMode.IMPORT)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              view === ViewMode.IMPORT ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Upload size={20} /> WhatsApp Import
          </button>
          
          <button
            onClick={() => handleNavClick(ViewMode.ENTRIES_LIST)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              view === ViewMode.ENTRIES_LIST ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <List size={20} /> All Entries
          </button>

          <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
             Ceremony
          </div>

          <button
            onClick={() => handleNavClick(ViewMode.DUA_MODE)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              view === ViewMode.DUA_MODE ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <HandHeart size={20} /> Dua Mode
          </button>
        </nav>

        <div className="p-4 border-t border-emerald-100 space-y-2">
           <button 
             onClick={() => {
               openTestPublicView();
               setIsMobileMenuOpen(false);
             }}
             className="w-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 p-2 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors"
           >
             <Eye size={16} /> Test Public View
           </button>
           
           <button 
             onClick={handleLogout}
             className="w-full flex items-center justify-center gap-2 text-red-600 p-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
           >
             <LogOut size={16} /> Logout
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full md:w-auto p-4 md:p-8 overflow-y-auto">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between mb-6 bg-white p-4 rounded-xl shadow-sm border border-emerald-100">
           <h1 className="font-bold text-emerald-800 flex items-center gap-2">
             <HandHeart className="w-6 h-6" /> IbadatConnect
           </h1>
           <button onClick={() => setIsMobileMenuOpen(true)}>
             <Menu className="text-gray-600" />
           </button>
        </div>

        {renderContent()}
      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);