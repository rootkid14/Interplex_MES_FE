import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Layers } from 'lucide-react'; // Icons for tabs
import JobTrackingView from './JobTrackingView';

const TraceabilityView = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('wo_log');

  return (
    <div className="h-full flex flex-col">
      
      {/* 1. TRACEABILITY TABS */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4 sm:mb-6 border-b border-slate-700 pb-4">
          <TabButton 
            active={activeTab === 'wo_log'} 
            onClick={() => setActiveTab('wo_log')}
            icon={<FileText size={18}/>}
            label="Master WO Log" // You can add to translation: t('traceability.masterLog')
          />
          
          {/* Future Option Example */}
          <TabButton 
            active={activeTab === 'material_log'} 
            onClick={() => setActiveTab('material_log')}
            icon={<Layers size={18}/>}
            label="Material Batches" 
            disabled={true} // Placeholder for next feature
          />
      </div>

      {/* 2. CONTENT AREA */}
      <div className="flex-1 min-h-0">
         {activeTab === 'wo_log' && <JobTrackingView />}
         
         {activeTab === 'material_log' && (
             <div className="flex items-center justify-center h-full text-slate-500">
                Coming Soon: Material Traceability
             </div>
         )}
      </div>

    </div>
  );
};

// Reusable Tab Button Component
const TabButton = ({ active, onClick, label, icon, disabled }) => (
    <button 
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-200
        ${active 
            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50' 
            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
    >
        {icon}
        {label}
    </button>
);

export default TraceabilityView;