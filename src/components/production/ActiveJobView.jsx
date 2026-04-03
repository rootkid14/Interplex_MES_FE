import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScanLine, CheckCircle, AlertTriangle, PackagePlus } from 'lucide-react';
import BarcodeScanner from '../common/BarcodeScanner'; 
import FrameAssemblyProc from './FrameAssemblyProc'
import FrameMachiningProc from './FrameMachiningProc'
import FramePackingProc from './FramePackingProc';

const ActiveJobView = () => {
  const { t } = useTranslation();
  
  // State for Input value and Scanner visibility
  const [jobId, setJobId] = useState(''); 
  const [showScanner, setShowScanner] = useState(false);

  // Handle successful scan
  const handleScanResult = (decodedText) => {
    setJobId(decodedText); 
    setShowScanner(false); 
  };

  return (
    <div className="flex flex-col h-full animate-fade-in-up">
      
      {/* --- RENDER SCANNER MODAL IF ACTIVE --- */}
      {showScanner && (
        <BarcodeScanner 
            onScanSuccess={handleScanResult} 
            onClose={() => setShowScanner(false)} 
        />
      )}

      {/* 1. HEADER BAR */}
      <div className="bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-700 shadow-lg flex flex-col xl:flex-row gap-4 mb-4 sm:mb-6">
        
        {/* Job ID Input & Scan */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 w-full">
            <span className="text-slate-400 font-bold whitespace-nowrap hidden sm:block">Headerbar:</span>
            
            <input 
                type="text" 
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                placeholder="Job ID / Status" 
                className="flex-1 bg-slate-900 border border-slate-600 text-white px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full"
            />
            
            {/* BUTTON TRIGGERS SCANNER */}
            <button 
                onClick={() => setShowScanner(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg border border-blue-400 flex justify-center items-center gap-2 transition-all active:scale-95 shadow-lg"
            >
                <ScanLine size={18} />
                <span>{t('production.scan')}</span>
            </button>
        </div>

       
      </div>

     

      <FrameMachiningProc/>
      {/* <FrameAssemblyProc/> */}
      {/* <FramePackingProc/> */}
      
    </div>
  );
};



export default ActiveJobView;