import React from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, ScanLine, Search, Boxes } from 'lucide-react';

const WorkStationNavbar = ({ activeTab, setActiveTab }) => {
  const { t } = useTranslation();

  return (
    <header className="h-16 bg-slate-800/60 backdrop-blur-md border-b border-slate-700 flex items-center justify-center relative px-6 z-10">
      
      <div className="absolute left-6 hidden md:block">
        <span className="text-xs text-slate-500 font-mono">{t('app.version')}</span>
      </div>

      <div className="flex bg-slate-900/80 p-1.5 rounded-xl border border-slate-700 shadow-inner z-20">
        <NavTab 
          active={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')} 
          icon={<LayoutDashboard size={18} />}
          label={t('navbar.overview')}
        />
        <NavTab 
          active={activeTab === 'production'} 
          onClick={() => setActiveTab('production')} 
          icon={<ScanLine size={18} />}
          label={t('navbar.production')}
        />
        <NavTab 
          active={activeTab === 'allocation'} 
          onClick={() => setActiveTab('allocation')} 
          icon={<Boxes size={18} />} 
          label="Allocation" />
        <NavTab 
          active={activeTab === 'traceability'} 
          onClick={() => setActiveTab('traceability')} 
          icon={<Search size={18} />}
          label={t('navbar.traceability')}
        />
      </div>

      <div className="absolute right-6 text-right">
        <div className="text-white text-sm font-bold font-mono">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="text-slate-500 text-[10px] uppercase font-bold">
          {new Date().toLocaleDateString()}
        </div>
      </div>
    </header>
  );
};

const NavTab = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-2 px-5 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-out
      ${active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 translate-y-[-1px]' 
        : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

export default WorkStationNavbar;