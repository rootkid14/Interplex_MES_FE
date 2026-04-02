import React, { useState } from "react";
import BarcodeScanner from '../common/BarcodeScanner'; 
import { ScanLine, XCircle, AlertTriangle, PackagePlus, MonitorDot} from "lucide-react";
import { useTranslation } from 'react-i18next';
import { ActionButton } from "../common/ActionButton";
import { BoxContentExpandable } from "../common/BoxContentExpandable";

const FramePackingProc = () => {
    const { t } = useTranslation();
    const [MaterialID, setMaterialID] = useState(''); 

    return(
        <div className="min-h-screen bg-slate-900 sm:p-8 font-sans flex items-center justify-center">
           <div className="w-full max-w-6xl bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden min-h-[80vh] xl:min-h-[700px]">
            <div className="w-full px-6 py-4 flex justify-between items-center bg-slate-800/40 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <MonitorDot className="text-blue-400" size={24} />
                        <div>
                            <h1 className="text-slate-200 font-bold text-lg tracking-wide">Packing Process</h1>
                            <p className="text-slate-500 text-sm">Station: WCTR-AND3544</p>
                        </div>
                    </div>

                    <ActionButton 
                        label={''} 
                        color="red" 
                        icon={<XCircle size={22}/>} 
                        className="hover:scale-105 transition-transform !px-3 shadow-lg" 
                        title="Close Workstation"
                    />
                </div> 

                {/* ======================================= */}
                {/* 1. TOOLBAR / SCAN SECTION               */}
                {/* ======================================= */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl p-4 sm:p-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-5 xl:gap-6">
                    
                    {/* Left Side: Input & Scan Section */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:flex-1 xl:max-w-xl">
                        <span className="text-slate-400 font-semibold whitespace-nowrap hidden sm:block">
                            Material:
                        </span>
                        
                        <input 
                            type="text" 
                            value={MaterialID}
                            onChange={(e) => setMaterialID(e.target.value)}
                            placeholder={t('workstationFrame.materialID')}
                            className="flex-1 bg-slate-900 border border-slate-600 text-white px-4 py-3 sm:py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all w-full placeholder-slate-500 shadow-inner"
                        />
                        
                        <ActionButton 
                            label={t('workstationFrame.addmaterial')} 
                            color="blue" 
                            icon={<ScanLine size={18}/>} 
                            className="w-full sm:w-auto py-3 sm:py-2.5 flex justify-center" 
                        />
                    </div>

                    <div className="w-full h-px bg-slate-700 xl:hidden"></div>

                    {/* Right Side: Quick Action Buttons */}
                    <div className="w-full flex flex-row items-stretch gap-2 sm:gap-3">
                        <ActionButton 
                            label={t('production.ngReport')} 
                            color="red" 
                            icon={<AlertTriangle size={18}/>} 
                            className="flex-1 flex justify-center py-3 sm:py-2.5 px-1 sm:px-3 text-center"
                        />
                        <ActionButton 
                            label={t('production.skipBox')} 
                            color="default" 
                            icon={<PackagePlus size={18}/>} 
                            className="flex-1 flex justify-center py-3 sm:py-2.5 px-1 sm:px-3 text-center"
                        />
                    </div>
                </div>


                {/* ======================================= */}
                {/* 2. EXPANDABLE SECTIONS AREA             */}
                {/* ======================================= */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl p-4 sm:p-6">
                    
                    {/* Section 1: Main Input Material */}
                    <BoxContentExpandable 
                        title="Box#35:" 
                        variant="orange"
                        BoxTotal = {30}
                        BoxQty = {2}
                        defaultOpen={true}
                    >
                        <div className="space-y-4 font-mono text-sm sm:text-base">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-600/50 pb-3 gap-1 sm:gap-4">
                                <span className="text-blue-300 break-all">
                                    PIFAS-000000SPRING$231231255435435
                                </span>
                                <span className="text-slate-400 text-xs sm:text-sm whitespace-nowrap">
                                    3:37 PM 01/04/2026
                                </span>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-600/50 pb-3 gap-1 sm:gap-4">
                                <span className="text-blue-300 break-all">
                                    PIFAS-000000SPRING$231231255435435
                                </span>
                                <span className="text-slate-400 text-xs sm:text-sm whitespace-nowrap">
                                    3:37 PM 01/04/2026
                                </span>
                            </div>
                        </div>
                    </BoxContentExpandable>
                    
                </div>
            </div>
        </div>
    );
};

export default FramePackingProc;