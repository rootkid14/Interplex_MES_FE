import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScanLine, AlertTriangle, MapPin, Link as LinkIcon } from 'lucide-react';
import BarcodeScanner from '../common/BarcodeScanner';
import useProductionStore from '../../store/productionStore';
import WorkOrderCard from '../dashboard/WorkOrderCard';

import FrameMachiningProc from './FrameMachiningProc';
import FrameAssemblyProc from './FrameAssemblyProc';
import FramePackingProc from './FramePackingProc';
import FrameBatchAllocator from './FrameBatchAllocator';
import { workstationAPI } from '../../api/workstationApi';

const ActiveJobView = () => {
    const { t } = useTranslation();
    const [jobId, setJobId] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    
    // STATE CHO WCTR
    const [wctrInput, setWctrInput] = useState('');
    const [showWctrScanner, setShowWctrScanner] = useState(false);
    const [isWctrConfirmed, setIsWctrConfirmed] = useState(false);
    
    const [linkModal, setLinkModal] = useState({ isOpen: false, assyWo: null, packingWoInput: '' });

    const currentWorkstation = useProductionStore(state => state.currentWorkstation);
    const setCurrentWorkstation = useProductionStore(state => state.setCurrentWorkstation);
    const liveWOData = useProductionStore(state => state.getLiveActiveJob());

    const sanitizeWO = (rawWo) => {
        if (!rawWo) return '';
        return String(rawWo).trim().replace(/^0+(?=\d)/, '');
    };

    const processWorkOrder = async (scannedWO) => {
        const cleanedWO = sanitizeWO(scannedWO);
        if (!cleanedWO) return;
        setErrorMsg('');
        try {
            const result = await workstationAPI.validateWorkOrder(cleanedWO);
            if (result.message === "NEEDS_PACKING_LINK") {
                setLinkModal({ isOpen: true, assyWo: result.data.AssyWO, packingWoInput: '' });
                return;
            }
            if (!result.success) {
                setErrorMsg(result.message);
                return;
            }
            setIsWctrConfirmed(false);
            setWctrInput('');
            setCurrentWorkstation(result.data);
            setJobId('');
        } catch (error) {
            const backendMessage = error.response?.data?.detail || error.response?.data?.message;
            setErrorMsg(backendMessage || "Lỗi kết nối đến máy chủ. Vui lòng kiểm tra lại mạng!");
        }
    };

    const handleLinkPacking = async () => {
        const cleanedPackingWo = sanitizeWO(linkModal.packingWoInput);
        if (!cleanedPackingWo) return alert("Vui lòng nhập mã Packing WO!");
        try {
            const res = await workstationAPI.linkAssyPacking(linkModal.assyWo, cleanedPackingWo);
            if (res.success) {
                alert("Đã liên kết thành công! Đang tải dữ liệu trạm...");
                setLinkModal({ isOpen: false, assyWo: null, packingWoInput: '' });
                processWorkOrder(linkModal.assyWo);
            } else {
                alert(res.message || "Lỗi khi liên kết WO!");
            }
        } catch (error) {
            alert("Lỗi kết nối máy chủ khi liên kết!");
        }
    };

    const handleScanResult = (decodedText) => {
        setShowScanner(false);
        processWorkOrder(decodedText);
    };

    const submitWctr = async (wctrValue) => {
        const finalWctr = wctrValue.trim();
        if (!finalWctr) return;
        try {
            const result = await workstationAPI.setWctr(currentWorkstation.WO, finalWctr);
            if (!result.success) {
                alert(result.message);
                return;
            }
            setCurrentWorkstation({ ...currentWorkstation, WCtr: finalWctr });
            setIsWctrConfirmed(true);
        } catch (error) {
            alert("Lỗi khi cập nhật Work Center!");
        }
    };

    if (currentWorkstation) {
        const { type, Type, QTY_Processed, Status, AliasWO } = currentWorkstation;
        const rawType = type || Type || '';
        const finalType = rawType ? rawType.trim().charAt(0).toUpperCase() + rawType.trim().slice(1).toLowerCase() : 'Unknown';

        if (Status === 0) {
            return (
                <div className="flex flex-col gap-6 animate-fade-in-up relative">
                    {liveWOData && (
                        <div className="max-w-6xl mx-auto w-full">
                            <WorkOrderCard data={liveWOData} aliasWO={AliasWO} />
                        </div>
                    )}
                    <FrameBatchAllocator />
                </div>
            );
        }

        const needsWctr = QTY_Processed === 0 && !isWctrConfirmed;

        return (
            <div className="flex flex-col gap-6 animate-fade-in-up relative">
                {liveWOData && (
                    <div className="max-w-6xl mx-auto w-full">
                        <WorkOrderCard data={liveWOData} aliasWO={AliasWO} />
                    </div>
                )}
                
                {finalType === 'Machining' && <FrameMachiningProc />}
                {finalType === 'Assembly' && <FrameAssemblyProc />}
                {finalType === 'Packing' && <FramePackingProc />}
                
                {!['Machining', 'Assembly', 'Packing'].includes(finalType) && (
                    <div className="p-8 text-red-400 font-bold text-center border border-red-500/30 rounded-xl bg-red-500/10">
                        Lỗi: Trạm "{finalType}" hiện chưa được hỗ trợ giao diện thao tác!
                    </div>
                )}

                {needsWctr && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                        {/* WCTR CAMERA OVERLAY */}
                        {showWctrScanner && (
                            <BarcodeScanner 
                                onScanSuccess={(text) => { setWctrInput(text); setShowWctrScanner(false); }} 
                                onClose={() => setShowWctrScanner(false)} 
                            />
                        )}
                        <div className="bg-slate-800 p-6 sm:p-8 rounded-2xl border border-slate-600 shadow-2xl w-full max-w-md flex flex-col animate-fade-in-up">
                            <div className="flex items-center gap-3 mb-2">
                                <MapPin className="text-blue-400" size={28}/>
                                <h2 className="text-2xl font-bold text-white">Đăng ký Máy / Chuyền</h2>
                            </div>
                            <p className="text-slate-400 mb-6 text-sm">Vui lòng quét hoặc nhập mã Work Center (WCtr) để tiếp tục.</p>
                            
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="text" 
                                        autoFocus 
                                        value={wctrInput} 
                                        onChange={(e) => setWctrInput(e.target.value)} 
                                        onKeyDown={(e) => e.key === 'Enter' && submitWctr(wctrInput)}
                                        placeholder="Ví dụ: LINE-01" 
                                        className="flex-1 bg-slate-900 border border-blue-500/50 text-white px-4 py-3 rounded-lg focus:ring-2 outline-none font-mono text-center text-lg w-full" 
                                    />
                                    <button 
                                        onClick={() => setShowWctrScanner(true)} 
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-lg font-bold shadow-lg"
                                        title="Mở Camera"
                                    >
                                        <ScanLine size={24}/>
                                    </button>
                                </div>
                                <button onClick={() => submitWctr(wctrInput)} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold shadow-lg mt-2">
                                    XÁC NHẬN
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full items-center justify-center animate-fade-in-up p-4 sm:p-8">
            {showScanner && <BarcodeScanner onScanSuccess={handleScanResult} onClose={() => setShowScanner(false)} />}
            
            {linkModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                    <div className="bg-slate-800 p-6 sm:p-8 rounded-2xl border border-emerald-500/50 shadow-2xl w-full max-w-md flex flex-col animate-fade-in-up">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <LinkIcon className="text-emerald-400" size={32}/>
                            <h2 className="text-2xl font-bold text-white">Yêu cầu Liên Kết</h2>
                        </div>
                        <p className="text-slate-400 mb-6 text-sm text-center">Lệnh Assembly <b>{linkModal.assyWo}</b> cần được liên kết với một Lệnh Packing. Vui lòng quét mã WO của Packing để tiếp tục.</p>
                        <input type="text" autoFocus value={linkModal.packingWoInput} onChange={(e) => setLinkModal({...linkModal, packingWoInput: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && handleLinkPacking()} placeholder="Quét mã WO Packing..." className="bg-slate-900 border border-emerald-500/50 text-white px-4 py-4 rounded-xl focus:ring-2 outline-none font-mono text-center text-lg mb-4" />
                        <div className="flex gap-3">
                            <button onClick={() => setLinkModal({isOpen: false, assyWo: null, packingWoInput: ''})} className="flex-1 bg-slate-700 text-white py-3 rounded-lg font-bold">HỦY</button>
                            <button onClick={handleLinkPacking} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-bold shadow-lg">LIÊN KẾT</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-slate-800 p-6 sm:p-10 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-2xl flex flex-col items-center">
                <h1 className="text-3xl font-black text-white mb-2 tracking-wide text-center">{t('workstationFrame.workstationlogin')}</h1>
                <p className="text-slate-400 mb-8 text-center">{t('workstationFrame.workstationloginprompt')}</p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
                    <input type="text" value={jobId} onChange={(e) => setJobId(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && processWorkOrder(jobId)} autoFocus placeholder={t('workstationFrame.woinputexample')} className="flex-1 bg-slate-900 border border-slate-600 text-white px-4 py-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-full text-lg shadow-inner font-mono" />
                    <button onClick={() => setShowScanner(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-xl font-bold text-lg flex justify-center items-center gap-2"><ScanLine size={24} /> QUÉT MÃ</button>
                </div>
                {errorMsg && (
                    <div className="mt-6 w-full bg-red-500/10 border border-red-500/30 p-4 rounded-lg text-red-400 animate-pulse"><p className="font-semibold text-sm text-center">{errorMsg}</p></div>
                )}
            </div>
        </div>
    );
};
export default ActiveJobView;