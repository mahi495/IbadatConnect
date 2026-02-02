import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Layout, Menu, Home, Upload, CalendarDays, PlusCircle, HandHeart, Eye, X, List, LogOut, ChevronRight, Loader2 } from 'lucide-react';
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
import { db } from './services/database';

// Initial placeholder until data loads
const INITIAL_OCCASIONS: Occasion[] = [];

const App = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.DASHBOARD);
  const [occasions, setOccasions] = useState<Occasion[]>(INITIAL_OCCASIONS);
  const [activeOccasionId, setActiveOccasionId] = useState<string>('');
  const [entries, setEntries] = useState<IbadatEntry[]>([]);
  const [isPublicMode, setIsPublicMode] = useState(false);
  const [publicEventId, setPublicEventId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<IbadatEntry | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Initial Load (Supabase + Auth)
  useEffect(() => {
    // Check URL for public mode and specific event
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'public') {
      setIsPublicMode(true);
      setView(ViewMode.PUBLIC_FORM);
      const evtId = params.get('eventId');
      if (evtId) setPublicEventId(evtId);
    }

    const checkAuthAndLoad = async () => {
        const authStatus = localStorage.getItem('ibadat_auth');
        if (authStatus === 'true') {
          setIsAuthenticated(true);
        }
        setIsAuthChecking(false);

        try {
            const [fetchedOccasions, fetchedEntries] = await Promise.all([
                db.getOccasions(),
                db.getEntries()
            ]);
            
            setOccasions(fetchedOccasions);
            setEntries(fetchedEntries);
            
            // Set active occasion
            if (fetchedOccasions.length > 0) {
                 const paramEvent = params.get('eventId');
                 const found = fetchedOccasions.find(o => o.id === paramEvent);
                 if (found) {
                     setActiveOccasionId(found.id);
                 } else {
                     // Default to first active
                     const active = fetchedOccasions.find(o => o.status === 'active') || fetchedOccasions[0];
                     setActiveOccasionId(active.id);
                 }
            }
        } catch (e) {
            console.error("Failed to load data", e);
            addToast("Failed to connect to database", "error");
        } finally {
            setIsLoadingData(false);
        }
    };

    checkAuthAndLoad();
  }, []);

  // Toast Management
  const addToast = (message: string, type: ToastType = 'info') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const activeOccasion = occasions.find(o => o.id === activeOccasionId) || occasions[0];

  // --- CRUD Handlers ---

  const handleImport = async (newEntries: IbadatEntry[]) => {
    try {
        await db.saveEntries(newEntries);
        setEntries(prev => [...prev, ...newEntries]);
        if (!isPublicMode) {
            setView(ViewMode.DASHBOARD);
            addToast(`${newEntries.length} entries added successfully`, 'success');
        }
    } catch (e) {
        addToast("Error saving entries", "error");
    }
  };

  const handleManualAdd = async (newEntries: IbadatEntry[]) => {
    try {
        await db.saveEntries(newEntries);
        setEntries(prev => [...prev, ...newEntries]);
        if (!isPublicMode) {
            addToast(`${newEntries.length} entries added successfully`, 'success');
        }
    } catch (e) {
        addToast("Error saving entries", "error");
    }
  };

  const handleUpdateEntry = async (updatedEntry: IbadatEntry) => {
    try {
        await db.updateEntry(updatedEntry);
        setEntries(prev => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e));
        setEditingEntry(null);
        addToast('Entry updated', 'success');
    } catch (e) {
        addToast("Error updating entry", "error");
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
        await db.deleteEntry(id);
        setEntries(prev => prev.filter(e => e.id !== id));
        setEditingEntry(null);
        addToast('Entry deleted', 'error');
    } catch (e) {
        addToast("Error deleting entry", "error");
    }
  };

  // Occasion Handlers
  const handleSaveOccasion = async (occasion: Occasion) => {
      await db.saveOccasion(occasion);
      setOccasions(prev => {
          const exists = prev.find(o => o.id === occasion.id);
          if (exists) {
              return prev.map(o => o.id === occasion.id ? occasion : o);
          }
          return [...prev, occasion];
      });
      addToast("Event saved successfully", "success");
  };

  const handleDeleteOccasion = async (id: string) => {
      await db.deleteOccasion(id);
      setOccasions(prev => prev.filter(o => o.id !== id));
      addToast("Event deleted", "info");
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
    if (isLoadingData) {
        return <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]"><Loader2 className="animate-spin text-emerald-600" /></div>;
    }
    return (
      <div className="relative font-sans antialiased text-gray-900 bg-[#f8fafc]">
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
            className="fixed bottom-4 right-4 bg-gray-900 text-white px-5 py-2.5 rounded-full shadow-xl z-50 text-sm flex items-center gap-2 hover:bg-black transition-transform hover:-translate-y-1"
        >
            <LogOut size={14} /> Exit Public Preview
        </button>
      </div>
    );
  }

  // Auth Check Loading State
  if (isAuthChecking || isLoadingData) {
    return <div className="min-h-screen bg-[#f0fdf4] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600"/></div>;
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
        <div className="flex flex-col items-center justify-center h-96 text-gray-500 bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="p-4 bg-gray-50 rounded-full mb-4">
              <CalendarDays className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No Active Event</h3>
            <p className="mb-6 text-sm text-gray-400">Select an event to start collecting.</p>
            <button 
                onClick={handleGoToEvents}
                className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
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
            onSave={handleSaveOccasion}
            onDelete={handleDeleteOccasion}
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

  const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
        active 
          ? 'bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-100' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} className={active ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600'} />
        {label}
      </div>
      {active && <ChevronRight size={14} className="text-emerald-400" />}
    </button>
  );

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-20 md:hidden animate-fade-in"
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
        className={`w-72 bg-white border-r border-gray-100 flex flex-col fixed inset-y-0 left-0 z-30 transition-transform duration-300 ease-in-out transform ${
          isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        } md:translate-x-0 md:static md:shadow-none`}
      >
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3 text-emerald-800 mb-8">
            <img src="/perlogo.png" alt="IbadatConnect" className="w-auto h-10 rounded-lg shadow-sm object-contain" />
            <div>
              <h1 className="text-xl font-bold font-arabic leading-none">IbadatConnect</h1>
              <p className="text-[10px] text-emerald-600/70 font-bold tracking-widest uppercase mt-1">Admin Portal</p>
            </div>
          </div>
          
          <button 
            className="md:hidden absolute top-6 right-4 text-gray-400 hover:text-gray-600"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          <SidebarItem 
            icon={Home} 
            label="Dashboard" 
            active={view === ViewMode.DASHBOARD} 
            onClick={() => handleNavClick(ViewMode.DASHBOARD)} 
          />
          <SidebarItem 
            icon={CalendarDays} 
            label="Events" 
            active={view === ViewMode.EVENT_MANAGER} 
            onClick={() => handleNavClick(ViewMode.EVENT_MANAGER)} 
          />

          <div className="pt-6 pb-2 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Collection
          </div>

          <SidebarItem 
            icon={PlusCircle} 
            label="Manual Entry" 
            active={view === ViewMode.MANUAL_ENTRY} 
            onClick={() => handleNavClick(ViewMode.MANUAL_ENTRY)} 
          />
          <SidebarItem 
            icon={Upload} 
            label="WhatsApp Import" 
            active={view === ViewMode.IMPORT} 
            onClick={() => handleNavClick(ViewMode.IMPORT)} 
          />
          <SidebarItem 
            icon={List} 
            label="All Entries" 
            active={view === ViewMode.ENTRIES_LIST} 
            onClick={() => handleNavClick(ViewMode.ENTRIES_LIST)} 
          />

          <div className="pt-6 pb-2 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
             Ceremony
          </div>

          <SidebarItem 
            icon={HandHeart} 
            label="Dua Mode" 
            active={view === ViewMode.DUA_MODE} 
            onClick={() => handleNavClick(ViewMode.DUA_MODE)} 
          />
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-2 bg-gray-50/50">
           <button 
             onClick={() => {
               openTestPublicView();
               setIsMobileMenuOpen(false);
             }}
             className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-white hover:shadow-sm rounded-xl text-sm font-medium transition-all"
           >
             <Eye size={16} /> View Public Form
           </button>
           
           <button 
             onClick={handleLogout}
             className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium transition-all"
           >
             <LogOut size={16} /> Sign Out
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full md:w-auto overflow-y-auto bg-[#f8fafc]">
        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 z-10 flex items-center justify-between bg-white/80 backdrop-blur-md px-4 py-3 border-b border-gray-100 shadow-sm">
           <div className="flex items-center gap-2 font-bold text-emerald-800">
             <img src="/perlogo.png" alt="Logo" className="w-auto h-8 rounded-md object-contain" />
             IbadatConnect
           </div>
           <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
             <Menu className="w-6 h-6" />
           </button>
        </div>

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);