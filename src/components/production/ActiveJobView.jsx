import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScanLine, Wrench, Factory, ArrowLeft, Newspaper, UserCog, Link as LinkIcon, X} from 'lucide-react';

import BarcodeScanner from '../common/BarcodeScanner';
import useProductionStore from '../../store/productionStore';
import { workstationAPI } from '../../api/workstationApi';

// Import các Frame
import FrameMachiningProc from './FrameMachiningProc';
import FrameAssemblyProc from './FrameAssemblyProc';
import FramePackingProc from './FramePackingProc';

import WorkOrderCard from '../dashboard/WorkOrderCard';

const ActiveJobView = () => {
    const { t } = useTranslation();
    const [mode, setMode] = useState('menu'); 
    const [scannedWO, setScannedWO] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // State cho việc Linkage Assy-Packing
    const [linkModal, setLinkModal] = useState({ isOpen: false, assyWo: null, packingWoInput: '' });
    const [showLinkScanner, setShowLinkScanner] = useState(false);

    const currentWorkstation = useProductionStore(state => state.currentWorkstation);
    const setCurrentWorkstation = useProductionStore(state => state.setCurrentWorkstation);

    const liveWOData = useProductionStore(state => 
        state.activeJobs.find(job => job?.WO === state.currentWorkstation?.WO)
    ) || currentWorkstation;

    const handleProcessScan = async (woData) => {
        const cleanedWO = String(woData).trim().replace(/^0+(?=\d)/, '');
        if (!cleanedWO) return;
        setErrorMsg('');

        try {
            const isRework = mode === 'rework';
            const result = await workstationAPI.validateWorkOrder(cleanedWO, false, isRework);
            
            // KIỂM TRA LINKAGE: Nếu Backend báo cần Link với Packing
            if (result.success && result.message === "NEEDS_PACKING_LINK") {
                setLinkModal({
                    isOpen: true,
                    assyWo: result.data.AssyWO,
                    packingWoInput: ''
                });
                return;
            }

            if (result.success) {
                setCurrentWorkstation(result.data); 
                setScannedWO('');
            } else {
                setErrorMsg(result.message);
            }
        } catch (error) {
            setErrorMsg(error.response?.data?.detail || "Lỗi kết nối máy chủ");
        }
    };

    const handleLinkAssyPacking = async () => {
        const packingWo = linkModal.packingWoInput.trim().replace(/^0+(?=\d)/, '');
        if (!packingWo) return;

        try {
            const result = await workstationAPI.linkAssyPacking(linkModal.assyWo, packingWo);
            if (result.success) {
                setLinkModal({ isOpen: false, assyWo: null, packingWoInput: '' });
                // Sau khi link xong, quét lại WO Assembly để vào trạm
                handleProcessScan(linkModal.assyWo);
            } else {
                alert(result.message);
            }
        } catch (error) {
            alert("Lỗi khi thực hiện liên kết!");
        }
    };

    if (currentWorkstation) {
        const wcType = currentWorkstation.WC_Type; 
        return (
            <div className="h-full bg-slate-900 overflow-hidden flex flex-col relative z-0">
                
                {liveWOData && liveWOData.WO && (
                    <div className="p-4 shrink-0 bg-slate-900 border-b border-slate-800 z-10 shadow-md">
                        <WorkOrderCard data={liveWOData} aliasWO={liveWOData.AliasWO} />
                    </div>
                )}
                            
                {/* Khu vực Frame làm việc (cho phép cuộn độc lập nếu cần) */}
                <div className="flex-1 overflow-hidden relative">
                    {wcType === 'Machining' && <FrameMachiningProc />}
                    {wcType === 'Assembly' && <FrameAssemblyProc />}
                    {wcType === 'Packing' && <FramePackingProc />}
                </div>

            </div>
        );
    }

    return (
        <div className="h-full bg-slate-900 p-6 flex flex-col items-center justify-center relative z-0">
            {mode !== 'menu' && (
                <button onClick={() => {setMode('menu'); setErrorMsg(''); setScannedWO('');}} className="absolute top-6 left-6 flex items-center gap-2 text-slate-400 hover:text-white font-bold bg-slate-800/50 px-4 py-2 rounded-lg">
                    <ArrowLeft size={20}/> QUAY LẠI
                </button>
            )}

            <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full py-10">
                {/* ... (Phần UI Menu Sản xuất/Rework giữ nguyên như bản trước) ... */}
                <div className="bg-slate-800 p-4 rounded-full mb-6 shadow-lg">
                    <UserCog className={mode === 'rework' ? 'text-purple-500' : 'text-blue-500'} size={36} />
                </div>
                <h1 className="text-2xl sm:text-2xl font-black text-white mb-2 tracking-wide text-center uppercase">MÔI TRƯỜNG SẢN XUẤT</h1>
                <p className="text-slate-400 text-center">Quản lý chít mã trong quá trình sản xuất</p>
                
                {mode === 'menu' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-10">
                         <button onClick={() => setMode('production')} className="group flex flex-col items-center justify-center bg-slate-800/80 hover:bg-blue-600/20 border-2 border-slate-700 hover:border-blue-500 p-10 rounded-[2rem] transition-all">
                            <Newspaper className="text-blue-500 group-hover:scale-110 mb-6" size={72}/>
                            <h2 className="text-2xl font-black text-white mb-3">SẢN XUẤT MỚI (STANDARD)</h2>
                            <p className="text-slate-400 text-center">Sản xuất một lô hàng mới</p>
                        </button>
                        <button onClick={() => setMode('rework')} className="group flex flex-col items-center justify-center bg-slate-800/80 hover:bg-purple-600/20 border-2 border-slate-700 hover:border-purple-500 p-10 rounded-[2rem] transition-all">
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
                                type="text" value={scannedWO} 
                                onChange={(e) => setScannedWO(e.target.value)} 
                                onKeyDown={(e) => e.key === 'Enter' && handleProcessScan(scannedWO)}
                                placeholder="Quét hoặc nhập mã WO..." 
                                className="flex-1 bg-slate-900 border border-slate-600 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-xl font-mono text-center sm:text-left transition-all" 
                            />
                            <button onClick={() => setShowScanner(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black flex justify-center items-center gap-2 shadow-lg shadow-blue-900/30 active:scale-95 transition-all">
                            <ScanLine size={24} /> QUÉT MÃ
                            </button>
                        </div>
                        
                    </div>
                )}

                {errorMsg && <p className="mt-6 text-red-400 font-bold bg-red-500/10 p-4 rounded-xl border border-red-500/30">{errorMsg}</p>}
            </div>

            {/* MODAL LINKAGE ASSY-PACKING (PHỤC HỒI) */}
            {linkModal.isOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-slate-800 border-2 border-blue-500 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in-up">
                        <div className="bg-blue-600 p-6 flex justify-between items-center text-white">
                            <h3 className="text-xl font-black flex items-center gap-3 uppercase tracking-tighter">
                                <LinkIcon size={24} /> Yêu cầu liên kết WO Packing
                            </h3>
                            <button onClick={() => setLinkModal({ isOpen: false, assyWo: null, packingWoInput: '' })} className="hover:rotate-90 transition-transform"><X /></button>
                        </div>
                        <div className="p-8">
                            <p className="text-slate-300 mb-6">WO Assembly <b className="text-blue-400 font-mono text-lg">{linkModal.assyWo}</b> chưa có thông tin đóng gói. Vui lòng quét mã WO Packing tương ứng.</p>
                            <div className="flex gap-3 mb-6">
                                <input 
                                    type="text" value={linkModal.packingWoInput}
                                    onChange={(e) => setLinkModal({ ...linkModal, packingWoInput: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Enter' && handleLinkAssyPacking()}
                                    placeholder="Quét WO Packing..."
                                    className="flex-1 bg-slate-900 border border-slate-600 text-white px-4 py-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-xl"
                                />
                                <button onClick={() => setShowLinkScanner(true)} className="bg-slate-700 text-white px-4 rounded-xl hover:bg-slate-600"><ScanLine /></button>
                            </div>
                            <button onClick={handleLinkAssyPacking} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl text-lg shadow-lg shadow-blue-900/50">XÁC NHẬN LIÊN KẾT</button>
                        </div>
                    </div>
                </div>
            )}

            {showScanner && <BarcodeScanner onScan={(data) => { setShowScanner(false); handleProcessScan(data); }} onClose={() => setShowScanner(false)} />}
            {showLinkScanner && <BarcodeScanner onScan={(data) => { setShowLinkScanner(false); setLinkModal({ ...linkModal, packingWoInput: data }); }} onClose={() => setShowLinkScanner(false)} />}
        </div>
    );
};

export default ActiveJobView;