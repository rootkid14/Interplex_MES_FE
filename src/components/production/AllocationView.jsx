import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScanLine, Boxes, AlertTriangle, Truck, Factory, ArrowLeft, House } from 'lucide-react';
import BarcodeScanner from '../common/BarcodeScanner';
import useProductionStore from '../../store/productionStore';
import { workstationAPI } from '../../api/workstationApi';

// Import 2 màn hình làm việc
import FrameBatchAllocator from './FrameBatchAllocator';
import FrameOutSourceAllocator from './FrameOutSourceAllocator';

import WorkOrderCard from '../dashboard/WorkOrderCard';

const AllocationView = () => {
    const { t } = useTranslation();
    const [mode, setMode] = useState('menu'); 
    const [jobId, setJobId] = useState('');
    const [osQty, setOsQty] = useState(''); 
    const [showScanner, setShowScanner] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    
    const currentAllocation = useProductionStore(state => state.currentAllocation);
    const setCurrentAllocation = useProductionStore(state => state.setCurrentAllocation);
    const clearCurrentAllocation = useProductionStore(state => state.clearCurrentAllocation);

    const liveWOData = useProductionStore(state => 
        state.activeJobs.find(job => job?.WO === state.currentAllocation?.WO)
    ) || currentAllocation;

    const handleProcessInhouse = async (scannedWO) => {
        const cleanedWO = String(scannedWO).trim().replace(/^0+(?=\d)/, '');
        if (!cleanedWO) return;
        setErrorMsg('');
        try {
            const result = await workstationAPI.validateWorkOrder(cleanedWO, true, false);
            if (result.success) {
                setCurrentAllocation(result.data); 
                setJobId('');
            } else {
                setErrorMsg(result.message);
            }
        } catch (error) {
            setErrorMsg(error.response?.data?.detail || error.response?.data?.message || "Lỗi kết nối máy chủ");
        }
    };

    const handleProcessOutsource = async () => {
        const cleanedWO = String(jobId).trim().replace(/^0+(?=\d)/, '');
        
        // LOGIC MỚI: Nếu để trống thì mặc định là 0. Bắt lỗi nếu nhập số âm.
        const receivedQtyNum = osQty === '' ? 0 : parseInt(osQty);

        if (!cleanedWO || isNaN(receivedQtyNum) || receivedQtyNum < 0) {
            return setErrorMsg("Vui lòng nhập Mã Lệnh gốc. Số lượng nhận thêm không được nhỏ hơn 0!");
        }
        
        setErrorMsg('');

        try {
            const payload = {
                OriginalWO: parseInt(cleanedWO),
                ReceivedQTY: receivedQtyNum,
                PN: "" 
            };

            const result = await workstationAPI.initOutsourceAllocation(payload);
            
            if (result.success) {
                setCurrentAllocation(result.data); 
                setJobId(''); 
                setOsQty('');
            } else {
                setErrorMsg(result.message);
            }
        } catch (error) {
            setErrorMsg(error.response?.data?.detail || error.response?.data?.message || "Lỗi khởi tạo Outsource!");
        }
    };

    if (currentAllocation) {
        return (
            
            <div className="h-full bg-slate-950 overflow-hidden flex flex-col relative z-0">
                {liveWOData && liveWOData.WO && (
                    <div className="p-4 shrink-0 bg-slate-950 border-b border-slate-800 z-10 shadow-md">
                        <WorkOrderCard data={liveWOData} aliasWO={liveWOData.AliasWO} />
                    </div>
                )}
                {currentAllocation.WO < 0 ? <FrameOutSourceAllocator /> : <FrameBatchAllocator />}
            </div>
        );
    }

    return (
        <div className="h-full bg-slate-950 p-6 flex flex-col animate-fade-in relative z-0 overflow-y-auto">
            {mode !== 'menu' && (
                <button onClick={() => {setMode('menu'); setErrorMsg(''); setJobId(''); setOsQty('');}} className="absolute top-6 left-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-bold bg-slate-800/50 px-4 py-2 rounded-lg">
                    <ArrowLeft size={20}/> QUAY LẠI
                </button>
            )}

            <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full py-10">
                <div className="bg-slate-800 p-4 rounded-full mb-6 shadow-lg shadow-blue-900/20">
                    <Boxes className="text-emerald-600" size={36} />
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-wide text-center uppercase">BATCH ALLOCATION</h1>
                <p className="text-slate-400 text-base sm:text-lg mb-10 text-center">Hệ thống phân bổ mã vạch định danh lô thành phẩm</p>

                {mode === 'menu' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full animate-fade-in-up">
                        <button onClick={() => setMode('inhouse')} className="group flex flex-col items-center justify-center bg-slate-800/80 hover:bg-blue-600/20 border-2 border-slate-700 hover:border-blue-500 p-10 sm:p-12 rounded-[2rem] transition-all duration-300 shadow-xl">
                            <House className="text-emeral-600 group-hover:scale-110 group-active:scale-95 transition-transform mb-6" size={72}/>
                            <h2 className="text-2xl sm:text-3xl font-black text-white mb-3 tracking-wider">IN-HOUSE</h2>
                            <p className="text-slate-400 text-center">Phân bổ tem định danh cho hàng sản xuất trực tiếp tại nhà máy</p>
                        </button>
                        <button onClick={() => setMode('outsource')} className="group flex flex-col items-center justify-center bg-slate-800/80 hover:bg-yellow-600/20 border-2 border-slate-700 hover:border-yellow-500 p-10 sm:p-12 rounded-[2rem] transition-all duration-300 shadow-xl">
                            <Truck className="text-yellow-500 group-hover:scale-110 group-active:scale-95 transition-transform mb-6" size={72}/>
                            <h2 className="text-2xl sm:text-3xl font-black text-white mb-3 tracking-wider">OUT-SOURCE</h2>
                            <p className="text-slate-400 text-center">Khởi tạo và phân bổ lại tem cho hàng gia công ngoài (Vendor) trả về</p>
                        </button>
                    </div>
                )}

                {mode === 'inhouse' && (
                    <div className="w-full max-w-xl animate-fade-in-up">
                        <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl mb-8 text-center text-blue-400 font-bold flex items-center justify-center gap-2">
                            <House size={20}/> CHẾ ĐỘ: SẢN XUẤT NỘI BỘ
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <input type="text" value={jobId} onChange={(e) => setJobId(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleProcessInhouse(jobId)} placeholder="Quét hoặc nhập mã WO..." className="flex-1 bg-slate-950 border border-slate-600 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-xl font-mono text-center sm:text-left transition-all" />
                            <button onClick={() => setShowScanner(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black flex justify-center items-center gap-2 shadow-lg shadow-blue-900/30 active:scale-95 transition-all">
                                <ScanLine size={24} /> QUÉT MÃ
                            </button>
                        </div>
                    </div>
                )}

                {mode === 'outsource' && (
                    <div className="w-full max-w-xl animate-fade-in-up">
                        <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl mb-6 text-center text-yellow-500 font-bold flex items-center justify-center gap-2">
                            <Truck size={20}/> CHẾ ĐỘ: HÀNG GIA CÔNG NGOÀI (VENDOR)
                        </div>
                        <div className="space-y-5">
                            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                                <label className="text-slate-400 font-bold text-sm mb-2 block uppercase tracking-wider">Mã Lệnh Sản Xuất Gốc (Original WO)</label>
                                <div className="flex gap-3">
                                    <input type="text" value={jobId} onChange={(e) => setJobId(e.target.value)} placeholder="Nhập mã WO đã xuất đi..." className="flex-1 bg-slate-950 border border-slate-600 text-white px-4 py-3.5 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none text-lg font-mono transition-all" />
                                    <button onClick={() => setShowScanner(true)} className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 rounded-xl flex items-center justify-center transition-colors"><ScanLine size={24} /></button>
                                </div>
                            </div>
                            <div className="bg-slate-800 p-5 rounded-2xl border border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                                <label className="text-yellow-400 font-bold text-sm mb-2 block uppercase tracking-wider">Số lượng VỪA NHẬN THÊM từ OutSource (+)</label>
                                <input type="number" value={osQty} onChange={(e) => setOsQty(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleProcessOutsource()} placeholder="VD: 500" className="w-full bg-slate-950 border border-yellow-500/50 text-white px-4 py-3.5 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none text-2xl font-black text-center font-mono transition-all" />
                            </div>
                            <button onClick={handleProcessOutsource} className="w-full bg-yellow-600 hover:bg-yellow-500 text-white px-6 py-4 rounded-2xl font-black text-lg flex justify-center items-center gap-2 shadow-lg shadow-yellow-900/30 active:scale-95 transition-all mt-4">
                                OUTSOURCE ALLOCATION
                            </button>
                        </div>
                    </div>
                )}

                {errorMsg && (
                    <div className="mt-6 w-full max-w-xl bg-red-500/10 border border-red-500/30 p-4 rounded-2xl text-red-400 animate-pulse flex items-center gap-3">
                        <AlertTriangle size={24} className="shrink-0"/>
                        <p className="font-bold text-sm sm:text-base break-words">{errorMsg}</p>
                    </div>
                )}
            </div>
            {showScanner && (
                <BarcodeScanner onScan={(data) => { setShowScanner(false); if (mode === 'inhouse') handleProcessInhouse(data); else setJobId(data); }} onClose={() => setShowScanner(false)} />
            )}
        </div>
    );
};
export default AllocationView;