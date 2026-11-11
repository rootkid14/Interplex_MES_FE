import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScanLine, Wrench, Factory, ArrowLeft, Newspaper, UserCog } from 'lucide-react';

import BarcodeScanner from '../common/BarcodeScanner';
import useProductionStore from '../../store/productionStore';
import { workstationAPI } from '../../api/workstationApi';
import { reworkAPI, rwApiError } from '../../api/reworkAPI';
import ReworkWorkbench from '../rework/ReworkWorkbench';

// Import các Frame
import FrameMachiningProc from './FrameMachiningProc';
import FrameAssyPackingMaster from './FrameAssyPackingMaster'; // <-- IMPORT COMPONENT MỚI
import WorkOrderCard from '../dashboard/WorkOrderCard';

const ActiveJobView = () => {
    const { t } = useTranslation();
    const [mode, setMode] = useState('menu'); 
    const [scannedWO, setScannedWO] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [rwSession, setRwSession] = useState(null);
    const [rwBusy, setRwBusy] = useState(false);
    const [bulkWO, setBulkWO] = useState(null);
    const [bulkModel, setBulkModel] = useState('');

    const currentWorkstation = useProductionStore(state => state.currentWorkstation);
    const setCurrentWorkstation = useProductionStore(state => state.setCurrentWorkstation);

    const liveWOData = useProductionStore(state => 
        state.activeJobs.find(job => job?.WO === state.currentWorkstation?.WO)
    ) || currentWorkstation;

    const openRW = async (woId, modelNO = '') => {
        if (rwBusy) return;
        const numericWO = Number(woId);
        if (!Number.isSafeInteger(numericWO) || numericWO <= 0) {
            setErrorMsg('JOB ID phải là số nguyên dương hợp lệ.'); return;
        }
        setRwBusy(true); setErrorMsg('');
        try {
            const response = await reworkAPI.open({ WO: numericWO, ...(modelNO ? { ModelNO: modelNO.trim() } : {}) });
            if (response.success) {
                setRwSession(response.data);
                setBulkWO(null); setBulkModel(''); setScannedWO('');
            } else if (response.data?.Code === 'RW_BULK_MODEL_REQUIRED' && !modelNO) {
                // A new WO must never be created implicitly. Confirm its ModelNO first.
                setBulkWO(numericWO);
                setErrorMsg('JOB chưa tồn tại. Nhập ModelNO và xác nhận để tạo BULK RW JOB mới.');
            } else {
                setErrorMsg(response.message || 'Không thể mở Rework JOB.');
            }
        } catch (error) { setErrorMsg(rwApiError(error)); }
        finally { setRwBusy(false); }
    };

    const handleProcessScan = async (woData) => {
        const cleanedWO = String(woData).trim().replace(/^0+(?=\d)/, '');
        if (!cleanedWO) return;
        setErrorMsg('');
        if (mode === 'rework') { await openRW(cleanedWO); return; }

        try {
            const result = await workstationAPI.validateWorkOrder(cleanedWO, false, false);
            
            if (result.success) {
                // ĐỐI VỚI KIẾN TRÚC MỚI: Nếu công nhân lỡ quét Assy WO ở màn hình ngoài,
                // ta cảnh báo họ phải quét Packing WO.
                if (result.data.WC_Type === 'Assembly') {
                    setErrorMsg("Vui lòng quét mã Lệnh Đóng gói (Packing WO Master) để làm việc!");
                    return;
                }

                setCurrentWorkstation(result.data); 
                setScannedWO('');
            } else {
                setErrorMsg(result.message);
            }
        } catch (error) {
            setErrorMsg(error.response?.data?.detail || "Lỗi kết nối máy chủ");
        }
    };

    if (rwSession) {
        return <ReworkWorkbench rw={rwSession} onClose={() => { setRwSession(null); setMode('menu'); }} />;
    }

    if (currentWorkstation) {
        const wcType = currentWorkstation.WC_Type; 
        
        return (
            <div className="h-full bg-slate-950 overflow-hidden flex flex-col relative z-0">
                {liveWOData && liveWOData.WO && (
                    <div className="p-4 shrink-0 bg-slate-950 border-b border-slate-800 z-10 shadow-md">
                        <WorkOrderCard data={liveWOData} aliasWO={liveWOData.AliasWO} />
                    </div>
                )}
                            
                {/* Khu vực Frame làm việc: Gộp chung Assembly & Packing vào Component Mới */}
                <div className="flex-1 overflow-hidden relative">
                    {wcType === 'MACHINING' ? (
                        <FrameMachiningProc />
                    ) : (
                        <FrameAssyPackingMaster /> 
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-slate-950 p-6 flex flex-col items-center justify-center relative z-0">
            {mode !== 'menu' && (
                <button onClick={() => {setMode('menu'); setErrorMsg(''); setScannedWO(''); setBulkWO(null); setBulkModel('');}} className="absolute top-6 left-6 flex items-center gap-2 text-slate-400 hover:text-white font-bold bg-slate-800/50 px-4 py-2 rounded-lg">
                    <ArrowLeft size={20}/> QUAY LẠI
                </button>
            )}

            <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full py-10">
                <div className="bg-slate-800 p-4 rounded-full mb-6 shadow-lg">
                    <UserCog className={mode === 'rework' ? 'text-purple-500' : 'text-blue-500'} size={36} />
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-wide text-center uppercase">MÔI TRƯỜNG SẢN XUẤT</h1>
                <p className="text-slate-400 text-center">Quản lý scan mã trong quá trình sản xuất</p>
                
                {mode === 'menu' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-10">
                         <button onClick={() => setMode('production')} className="group flex flex-col items-center justify-center bg-slate-800/80 hover:bg-blue-600/20 border-2 border-slate-700 hover:border-blue-500 p-10 rounded-[2rem] transition-all">
                            <Newspaper className="text-blue-500 group-hover:scale-110 mb-6" size={72}/>
                            <h2 className="text-2xl font-black text-white mb-3">SẢN XUẤT MỚI (STANDARD)</h2>
                            <p className="text-slate-400 text-center">Sản xuất một lô hàng mới</p>
                        </button>
                        <button onClick={() => { setMode('rework'); setBulkWO(null); setErrorMsg(''); }} className="group flex flex-col items-center justify-center bg-slate-800/80 hover:bg-purple-600/20 border-2 border-slate-700 hover:border-purple-500 p-10 rounded-[2rem] transition-all">
                            <Wrench className="text-purple-500 group-hover:scale-110 mb-6" size={72}/>
                            <h2 className="text-2xl font-black text-white mb-3">LÀM LẠI (REWORK)</h2>
                            <p className="text-slate-400 text-center">Xử lý hoặc sửa lại một lô hàng lỗi</p>
                        </button>
                    </div>
                ) : (
                    <div className="w-full max-w-xl mt-10">
                         <div className={`border p-4 rounded-xl mb-8 text-center font-bold flex items-center justify-center gap-2 ${mode === 'production' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-purple-500/10 border-purple-500/30 text-purple-400'}`}>
                            {mode === 'production' ? <Factory size={20}/> : <Wrench size={20}/>} 
                            CHẾ ĐỘ: {mode === 'production' ? 'SẢN XUẤT TIÊU CHUẨN' : 'REWORK (SỬA HÀNG LỖI)'}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <input 
                                type="text" value={scannedWO} disabled={rwBusy} 
                                onChange={(e) => setScannedWO(e.target.value)} 
                                onKeyDown={(e) => e.key === 'Enter' && handleProcessScan(scannedWO)}
                                placeholder="Quét hoặc nhập mã JOB..." 
                                className="flex-1 bg-slate-950 border border-slate-600 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-xl font-mono text-center sm:text-left transition-all" 
                            />
                            <button onClick={() => handleProcessScan(scannedWO)} disabled={rwBusy || !scannedWO.trim()}
                                className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white px-4 py-4 rounded-2xl font-bold">MỞ JOB</button>
                            <button onClick={() => setShowScanner(true)} disabled={rwBusy} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black flex justify-center items-center gap-2 shadow-lg shadow-blue-900/30 active:scale-95 transition-all">
                            <ScanLine size={24} /> QUÉT MÃ
                            </button>
                        </div>
                    </div>
                )}

                {mode === 'rework' && bulkWO && (
                    <div className="w-full max-w-xl bg-purple-500/10 border border-purple-500/40 rounded-xl p-4 mt-5">
                        <p className="text-purple-200 font-bold mb-2">TẠO BULK RW — JOB {bulkWO}</p>
                        <p className="text-xs text-slate-400 mb-3">JOB mới chưa tồn tại trong MES/SAP. Việc tạo cần ModelNO đã cấu hình scan; hãy kiểm tra JOB ID trước khi xác nhận.</p>
                        <input value={bulkModel} onChange={e => setBulkModel(e.target.value)} placeholder="ModelNO (bắt buộc)"
                            className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg p-3 mb-3" />
                        <div className="flex gap-3">
                            <button disabled={rwBusy || !bulkModel.trim()} onClick={() => {
                                if (window.confirm(`Tạo BULK RW JOB ${bulkWO} với ModelNO ${bulkModel.trim()}?`)) openRW(bulkWO, bulkModel);
                            }} className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 px-4 py-2 rounded-lg text-white font-bold">XÁC NHẬN TẠO BULK RW</button>
                            <button onClick={() => { setBulkWO(null); setBulkModel(''); setErrorMsg(''); }} className="px-4 py-2 rounded-lg text-slate-300 bg-slate-800">HỦY</button>
                        </div>
                    </div>
                )}
                {errorMsg && <p className="mt-6 text-red-400 font-bold bg-red-500/10 p-4 rounded-xl border border-red-500/30">{errorMsg}</p>}
            </div>

            {showScanner && <BarcodeScanner onScan={(data) => { setShowScanner(false); handleProcessScan(data); }} onClose={() => setShowScanner(false)} />}
        </div>
    );
};

export default ActiveJobView;