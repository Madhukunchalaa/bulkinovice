import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Login } from './pages/Login.tsx';
import { Clients } from './pages/Clients.tsx';
import { Categories } from './pages/Categories.tsx';
import { Generate } from './pages/Generate.tsx';
import { History } from './pages/History.tsx';
import {
  FileText,
  Users,
  Layers,
  History as HistoryIcon,
  LogOut,
  Loader2,
  Menu,
  X
} from 'lucide-react';

const DashboardLayout: React.FC = () => {
  const { admin, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'generate' | 'clients' | 'categories' | 'history'>('generate');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Generate Invoices', value: 'generate', icon: FileText },
    { name: 'Clients List', value: 'clients', icon: Users },
    { name: 'Pricing Categories', value: 'categories', icon: Layers },
    { name: 'Invoice History', value: 'history', icon: HistoryIcon },
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'generate':
        return <Generate />;
      case 'clients':
        return <Clients />;
      case 'categories':
        return <Categories />;
      case 'history':
        return <History />;
      default:
        return <Generate />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-slate-900 border-r border-slate-800">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          {/* Logo Brand */}
          <div className="flex items-center px-6 pb-6 border-b border-slate-800">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <FileText className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <span className="text-sm font-extrabold text-white tracking-wide block leading-tight">SHAIK & REDDY</span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest block">ASSOCIATES</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 flex-1 px-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.value;
              return (
                <button
                  key={item.name}
                  onClick={() => setActiveTab(item.value as any)}
                  className={`group flex items-center w-full px-3 py-2.5 text-sm font-semibold rounded-lg transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Admin Session */}
        <div className="flex-shrink-0 flex border-t border-slate-800 p-4 bg-slate-950/40">
          <div className="flex items-center w-full justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-400 truncate">Logged in as:</p>
              <p className="text-sm font-bold text-slate-200 truncate" title={admin?.email}>
                {admin?.email}
              </p>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-red-500 transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex flex-col flex-1 md:pl-64 overflow-hidden">
        {/* Mobile Header */}
        <header className="flex md:hidden items-center justify-between bg-slate-900 px-4 py-3 shadow-md z-10 shrink-0">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <FileText className="h-4 w-4" />
            </div>
            <span className="ml-2.5 text-sm font-extrabold text-white tracking-wide">SHAIK & REDDY ASSOCIATES</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-md text-slate-400 hover:text-white focus:outline-none"
          >
            <Menu className="h-6 w-6" />
          </button>
        </header>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            {/* Overlay */}
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>

            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 pt-5 pb-4 border-r border-slate-800 animate-in slide-in-from-left duration-200">
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>

              <div className="flex-shrink-0 flex items-center px-6 pb-6 border-b border-slate-800">
                <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <FileText className="h-4.5 w-4.5" />
                </div>
                <span className="ml-2.5 text-md font-bold text-white tracking-wide">SHAIK & REDDY ASSOCIATES</span>
              </div>

              <nav className="mt-6 flex-shrink-0 px-4 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.value;
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        setActiveTab(item.value as any);
                        setMobileMenuOpen(false);
                      }}
                      className={`group flex items-center w-full px-3 py-2.5 text-sm font-semibold rounded-lg transition ${
                        isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </button>
                  );
                })}
              </nav>

              <div className="mt-auto border-t border-slate-800 p-4 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Logged in:</p>
                  <p className="text-sm font-semibold text-slate-300 truncate">{admin?.email}</p>
                </div>
                <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500">
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto px-4 py-8 md:px-8 bg-slate-50">
          <div className="max-w-6xl mx-auto">
            {renderActiveTab()}
          </div>
        </main>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4 text-white">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
          <p className="text-sm font-semibold text-slate-400">Loading Session...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <DashboardLayout /> : <Login />;
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
