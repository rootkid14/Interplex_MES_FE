import React, { useState, useRef, useEffect } from "react";
import { ActionButton } from "../common/ActionButton";
import { ScanLine, XCircle, CheckCircle, Package, Box, AlertTriangle, Camera } from "lucide-react";
import useProductionStore from '../../store/productionStore';
import { workstationAPI } from '../../api/workstationApi';
import BarcodeScanner from '../common/BarcodeScanner'; 

const FrameBatchAllocator = () => {
    const inputRef = useRef(null); 
    
    // ==========================================
    // 1. STATE & STORE
    // ==========================================
    const currentWorkstation = useProductionStore(state => state.currentWorkstation);
    const clearCurrentWorkstation = useProductionStore(state => state.clearCurrentWorkstation);

    const liveWOData = useProductionStore(state => 
        state.activeJobs.find(job => job.WO === state.currentWorkstation?.WO)
    );

    const [pnInput, setPnInput] = useState('');
    const [maxQtyPerBatch, setMaxQtyPerBatch] = useState('');
    
    const [batchInput, setBatchInput] = useState('');
    const [scannedCodes, setScannedCodes] = useState([]);
    const [showScanner, setShowScanner] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!currentWorkstation) return null;
    const woData = currentWorkstation; 
    
    const totalToAllocate = liveWOData?.QTY_OK || liveWOData?.QTY_Processed || 0;

    // ==========================================
    // 2. LOGIC TÍNH TOÁN CHIA LÔ (AUTO-CALCULATE)
    // ==========================================
    let currentRemaining = totalToAllocate;
    const maxQtyNum = parseFloat(maxQtyPerBatch) || 0;

    const allocatedBatches = scannedCodes.map(code => {
        const assignedQty = Math.min(maxQtyNum, currentRemaining);
        currentRemaining -= assignedQty;
        return { code, qty: assignedQty };
    });

    const isFinished = currentRemaining <= 0 && scannedCodes.length > 0;
    const isConfigLocked = scannedCodes.length > 0; // Đã quét thì không cho sửa cấu hình

    // ==========================================
    // 3. LOGIC QUÉT MÃ LÔ (OUTPUT BATCH)
    // ==========================================
    const handleScanBatch = (code) => {
        const scannedCode = code.trim();
        if (!scannedCode) return;
        setErrorMsg('');

        // ĐÃ THÊM: Kiểm tra bắt buộc phải nhập PN
        if (!pnInput.trim()) {
            setErrorMsg("Vui lòng nhập Mã thành phẩm (PN) trước khi quét lô!");
            setBatchInput('');
            return;
        }

        if (maxQtyNum <= 0) {
            setErrorMsg("Vui lòng nhập Quy cách đóng gói (Max QTY) trước khi quét!");
            setBatchInput('');
            return;
        }

        if (currentRemaining <= 0) {
            setErrorMsg("Đã phân bổ đủ số lượng! Không cần quét thêm.");
            setBatchInput('');
            return;
        }

        if (scannedCodes.includes(scannedCode)) {
            setErrorMsg("Mã lô này đã được quét rồi!");
            setBatchInput('');
            return;
        }

        setScannedCodes([scannedCode, ...scannedCodes]);
        setBatchInput('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleScanBatch(batchInput);
    };

    const handleCameraScan = (decodedText) => {
        setShowScanner(false);
        handleScanBatch(decodedText);
    };

    const removeBatch = (codeToRemove) => {
        setScannedCodes(scannedCodes.filter(c => c !== codeToRemove));
    };

    // ==========================================
    // 4. LOGIC GỬI LÊN SERVER (CHỐT NHẬP KHO)
    // ==========================================
    const handleSubmitAllocation = async () => {
        if (!isFinished) return;
        setIsSubmitting(true);

        try {
            const payload = {
                WO: woData.WO,
                PN: pnInput.trim(),
                Batches: allocatedBatches 
            };

            const result = await workstationAPI.allocateBatches(payload);
            
            if (result.success) {
                alert("Đã phân bổ và tạo Lô thành phẩm thành công!");
                clearCurrentWorkstation(); 
            } else {
                alert(result.message || "Lỗi khi lưu dữ liệu phân bổ!");
            }
        } catch (error) {
            const backendMessage = error.response?.data?.detail || error.response?.data?.message;
            alert(backendMessage || "Lỗi kết nối máy chủ!");
        } finally {
            setIsSubmitting(false);
        }
    };

    return(
        <div className="w-full mx-auto bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden min-h-[700px] relative animate-fade-in">
            {showScanner && (
                <BarcodeScanner onScanSuccess={handleCameraScan} onClose={() => setShowScanner(false)} />
            )}

            {/* HEADER KHO */}
            <div className="w-full px-6 py-4 flex justify-between items-center bg-emerald-900/40 border-b border-emerald-700/50">
                <div className="flex items-center gap-4">
                    <Package className="text-emerald-400 shrink-0" size={32} />
                    <div>
                        <h1 className="text-emerald-300 font-bold text-xl tracking-wide uppercase">Warehouse Allocation</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-0.5 rounded border border-emerald-500/30">WO: {woData.WO}</span>
                            <span className="text-slate-400 text-sm font-mono">Model: {woData.ModelNO}</span>
                        </div>
                    </div>
                </div>
                <ActionButton 
                    onClick={clearCurrentWorkstation} 
                    label="Đóng" color="red" icon={<XCircle size={22}/>} 
                />
            </div> 

            {/* THANH TRẠNG THÁI TIẾN ĐỘ & CẤU HÌNH LÔ */}
            <div className="bg-slate-900 p-6 border-b border-slate-700 flex flex-col md:flex-row gap-6 justify-between items-center shadow-inner">
                <div className="flex flex-col items-center md:items-start w-full">
                    <p className="text-slate-400 text-sm font-bold mb-1">Tổng Thành Phẩm Cần Chia</p>
                    <p className="text-4xl font-black text-white">{totalToAllocate} <span className="text-lg text-slate-500 font-medium">pcs</span></p>
                </div>
                
                {/* ĐÃ SỬA: Gộp PN và Max QTY vào chung một khối cài đặt (Config Box) */}
                <div className="w-full md:max-w-md bg-slate-800 p-4 rounded-xl border border-slate-600 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-emerald-400 font-bold text-sm mb-2">Mã thành phẩm (PN):</label>
                        <input 
                            type="text" 
                            disabled={isConfigLocked}
                            value={pnInput}
                            onChange={(e) => setPnInput(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-lg outline-none font-mono text-center disabled:opacity-50 uppercase"
                            placeholder="Nhập PN..."
                        />
                    </div>
                    <div className="flex-[0.8]">
                        <label className="block text-emerald-400 font-bold text-sm mb-2">Max QTY / Lô:</label>
                        <input 
                            type="number" 
                            disabled={isConfigLocked}
                            value={maxQtyPerBatch}
                            onChange={(e) => setMaxQtyPerBatch(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-lg outline-none font-mono text-xl text-center disabled:opacity-50"
                            placeholder="VD: 100"
                        />
                    </div>
                </div>
            </div>
            {/* Chú thích nhắc nhở bị khóa */}
            {isConfigLocked && (
                <div className="bg-slate-900 px-6 pb-2 text-right">
                    <p className="text-xs text-amber-400 italic">* Đang chia lô, không thể thay đổi PN và Quy cách.</p>
                </div>
            )}

            {/* KHU VỰC QUÉT MÃ BATCH */}
            <div className="p-6 bg-slate-800/50 border-b border-slate-700">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                    <input 
                        ref={inputRef} type="text" 
                        value={batchInput} onChange={(e) => setBatchInput(e.target.value)} onKeyDown={handleKeyDown}
                        disabled={isFinished || maxQtyNum <= 0 || !pnInput.trim()}
                        placeholder={isFinished ? "Đã phân bổ xong!" : "Quét mã tem Output Batch..."}
                        className="flex-1 bg-slate-900 border border-slate-600 text-white px-4 py-4 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-lg disabled:opacity-50"
                    />
                    <ActionButton 
                        onClick={() => setShowScanner(true)}
                        disabled={isFinished || maxQtyNum <= 0 || !pnInput.trim()}
                        label="Nhập Lô" color="emerald" icon={<ScanLine size={20}/>} className="py-4 px-8 disabled:opacity-50" 
                    />
                </div>
                {errorMsg && <p className="text-red-400 text-sm mt-3 font-semibold flex items-center gap-1 animate-pulse"><AlertTriangle size={16}/> {errorMsg}</p>}
            </div>

            {/* KHU VỰC HIỂN THỊ CÁC LÔ ĐÃ TẠO */}
            <div className="p-6 flex-1 overflow-y-auto bg-slate-900/30">
                <h3 className="text-slate-300 font-bold mb-4 flex items-center gap-2">
                    <Box size={20} className="text-emerald-400"/> Các lô đã phân bổ ({scannedCodes.length})
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {allocatedBatches.map((batch, index) => (
                        <div key={batch.code} className="bg-slate-800 border border-slate-600 rounded-xl p-4 flex flex-col relative animate-fade-in shadow-lg">
                            <button 
                                onClick={() => removeBatch(batch.code)}
                                className="absolute top-2 right-2 text-slate-500 hover:text-red-400 transition-colors"
                            ><XCircle size={20}/></button>
                            
                            <p className="text-slate-400 text-xs font-bold mb-1">BATCH #{allocatedBatches.length - index}</p>
                            <p className="text-emerald-300 font-mono text-sm break-all mb-3 border-b border-slate-700 pb-2">{batch.code}</p>
                            
                            <div className="flex justify-between items-end mt-auto">
                                <span className="text-slate-400 text-sm">Số lượng:</span>
                                <span className="text-2xl font-black text-white">{batch.qty}</span>
                            </div>
                        </div>
                    ))}
                </div>
                
                {scannedCodes.length === 0 && (
                    <div className="h-40 flex items-center justify-center text-slate-500 italic border-2 border-dashed border-slate-700 rounded-xl">
                        Chưa có lô nào được quét.
                    </div>
                )}
            </div>

            {/* NÚT CHỐT HOÀN THÀNH - CHỈ HIỆN KHI ĐÃ CHIA XONG */}
            {isFinished && (
                <div className="p-6 bg-emerald-900/20 border-t border-emerald-500/30 animate-fade-in-up">
                    <button 
                        onClick={handleSubmitAllocation}
                        disabled={isSubmitting}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 text-white text-xl font-black py-5 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] flex justify-center items-center gap-3 transition-all"
                    >
                        <CheckCircle size={28} /> {isSubmitting ? "ĐANG XỬ LÝ..." : "HOÀN THÀNH & LƯU KHO"}
                    </button>
                </div>
            )}
        </div>
    );
};

export default FrameBatchAllocator;