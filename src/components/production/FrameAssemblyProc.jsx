import React, { useState, useRef, useEffect } from "react";
import { ExpandableSection } from "../common/ExpandableSection";
import { ActionButton } from "../common/ActionButton";
import { ScanLine, XCircle, AlertTriangle, PackagePlus, MonitorDot, CheckCircle, X, Camera, LinkIcon } from "lucide-react";
import { useTranslation } from 'react-i18next';
import useProductionStore from '../../store/productionStore';
import { workstationAPI } from '../../api/workstationApi';
import BarcodeScanner from '../common/BarcodeScanner';
import { MESSAGE_TYPE, WO_STATUS } from '../common/Constants';
import { SearchableDefectSelector } from '../common/SearchableDefectSelector';
import { defectCodeAPI } from '../../api/defectCodeApi';
import DefectReportModal from "../common/DefectReportModals";

const FrameAssemblyProc = () => {
    const { t } = useTranslation();
    const inputRef = useRef(null); 
    
    // ==========================================
    // 1. RÚT DATA VÀ ACTIONS TỪ ZUSTAND STORE
    // ==========================================
    const currentWorkstation = useProductionStore(state => state.currentWorkstation);
    const clearCurrentWorkstation = useProductionStore(state => state.clearCurrentWorkstation);


    if (!currentWorkstation) return null;

    const woData = currentWorkstation; 
    // ĐÃ SỬA: Hỗ trợ cả mảng mainInputs (mới) và inputMain đơn lẻ (cũ)
    const mainInputRules = woData.rules.mainInputs || (woData.rules.inputMain ? [woData.rules.inputMain] : []);
    const rawRules = woData.rules.rawMaterials;

    const availablePNs = [];
    // Lấy PN từ tất cả các Main Inputs
    mainInputRules.forEach(rule => { if (rule.partNumber) availablePNs.push(rule.partNumber); });
    
    if (rawRules) {
        rawRules.forEach(rule => { if (rule.partNumber) availablePNs.push(rule.partNumber); });
    }

    // ==========================================
    // 2. STATE QUẢN LÝ QUÉT MÃ VẬT TƯ
    // ==========================================
    const [materialInput, setMaterialInput] = useState(''); 
    const [scanError, setScanError] = useState('');
    const [mainInputs, setMainInputs] = useState([]);
    const [rawMaterials, setRawMaterials] = useState([]);
    const [qtyModal, setQtyModal] = useState({ isOpen: false, scannedCode: '', matchedRule: null });
    const [inputQty, setInputQty] = useState('');

    // STATE CÔNG TẮC BẬT CAMERA
    const [showMatScanner, setShowMatScanner] = useState(false);
    const [showDoneScanner, setShowDoneScanner] = useState(false);

    // ==========================================
    // 3. STATE QUẢN LÝ MODALS (NG, MAT_REQ, MARK_DONE)
    // ==========================================
    const [isNgModalOpen, setIsNgModalOpen] = useState(false);
    const [matReqModal, setMatReqModal] = useState({ isOpen: false, pn: availablePNs[0] || '', qty: '' });
    const [doneModal, setDoneModal] = useState({ isOpen: false, scannedWo: '', error: '' });

    const [allDefectCodes, setAllDefectCodes] = useState([]);

    // Fetch mã lỗi khi Load Trạm
    useEffect(() => {
        const fetchDefects = async () => {
            try {
                const res = await defectCodeAPI.getAllCodes();
                if (res.success || res.data) setAllDefectCodes(res.data || res); // Tùy format API trả về
            } catch (e) { console.error("Lỗi load Defect Codes", e); }
        };
        fetchDefects();
    }, []);

    // Khôi phục UI
    useEffect(() => {
        const fetchHistory = async () => {
            if (!woData?.WO) return;
            try {
                const result = await workstationAPI.getLoggedMaterials(woData.WO);
                if (result.success) {
                    setMainInputs(result.data.mainInputs || []);
                    setRawMaterials(result.data.rawMaterials || []);
                }
            } catch (error) {
                console.error("Lỗi khi tải lịch sử vật tư:", error);
            }
        };
        fetchHistory();
    }, [woData.WO]);

    // Auto Focus
    useEffect(() => {
        if (!qtyModal.isOpen && !isNgModalOpen && !matReqModal.isOpen && !doneModal.isOpen && !showMatScanner && !showDoneScanner && inputRef.current) {
            inputRef.current.focus();
        }
    }, [qtyModal.isOpen, isNgModalOpen, matReqModal.isOpen, doneModal.isOpen, showMatScanner, showDoneScanner, mainInputs, rawMaterials]);

    // ==========================================
    // LOGIC CỐT LÕI: QUÉT MÃ VẬT TƯ
    // ==========================================
    const handleScanMaterial = async (code) => {
            if (!code.trim()) return;
            const scannedCode = code.trim();
            setScanError('');
    
            // 1. TRƯỜNG HỢP: MAIN INPUT (BATCH) - Quét qua toàn bộ mảng mainInputRules
            const matchedMainRule = mainInputRules.find(rule => 
                rule.fixedString && scannedCode.toUpperCase().includes(rule.fixedString.toUpperCase())
            );
            if (matchedMainRule) {
                try {
                    // Gọi API như cũ (Backend không cần biết đây là chân trái hay phải, nó chỉ ghi nhận Batch)
                    const result = await workstationAPI.logInputMain(woData.WO, scannedCode);
                    console.log("result:",result);
                    if (result.success) {
                        setMainInputs([{ 
                            code: scannedCode, 
                            pn: matchedMainRule.partNumber, // Ghi nhận thêm PN để hiển thị cho rõ
                            time: new Date().toLocaleTimeString(), 
                            qty:  result.data?.Added_QTY || 1
                        }, ...mainInputs]);
                        setMaterialInput('');
                    } else {
                        setScanError(result.message || "Lỗi ghi nhận Input Batch!");
                    }
                } catch (error) {
                    const backendMessage = error.response?.data?.detail || error.response?.data?.message;
                    setScanError(backendMessage || "Lỗi kết nối Server khi ghi nhận Input Batch!");
                }
                return;
            }
    
            // 2. TRƯỜNG HỢP: RAW MATERIAL (Giữ nguyên)
            const matchedRawRule = rawRules?.find(rule => 
                rule.fixedString && scannedCode.toUpperCase().includes(rule.fixedString.toUpperCase())
            );
            if (matchedRawRule) {
                setQtyModal({ isOpen: true, scannedCode: scannedCode, matchedRule: matchedRawRule });
                setMaterialInput('');
                return;
            }
    
            setScanError(`Mã không hợp lệ: Không khớp với bất kỳ chuỗi nhận diện Vật tư nào của Model ${woData.ModelNO}`);
            setMaterialInput('');
        };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleScanMaterial(materialInput);
    };

    const handleMatCameraScan = (decodedText) => {
        setShowMatScanner(false);
        setMaterialInput(decodedText);
        handleScanMaterial(decodedText); 
    };

    const handleSubmitRawQty = async () => {
        const qty = parseFloat(inputQty);
        if (isNaN(qty) || qty <= 0) return alert("Vui lòng nhập số lượng hợp lệ!");
        
        try {
            const result = await workstationAPI.logRawMaterial(
                woData.WO, qtyModal.scannedCode, qty, qtyModal.matchedRule.partNumber
            );

            if (result.success) {
                setRawMaterials([{ 
                    code: qtyModal.scannedCode, pn: qtyModal.matchedRule.partNumber, 
                    qty: qty, time: new Date().toLocaleTimeString() 
                }, ...rawMaterials]);
                setQtyModal({ isOpen: false, scannedCode: '', matchedRule: null });
                setInputQty('');
            } else {
                alert(result.message || "Lỗi khi ghi nhận phụ liệu!");
            }
        } catch (error) {
            const backendMessage = error.response?.data?.detail || error.response?.data?.message;
            alert(backendMessage || "Lỗi kết nối Server khi ghi nhận phụ liệu!");
        }
    };

    // ==========================================
    // LOGIC CÁC TÍNH NĂNG THAO TÁC NHANH
    // ==========================================

    const handleSubmitMatReq = async () => {
        const reqQty = parseFloat(matReqModal.qty);
        if (isNaN(reqQty) || reqQty <= 0) return alert("Số lượng yêu cầu không hợp lệ!");
        try {
            const payload = { WO: woData.WO, PartNO: matReqModal.pn, QTY: reqQty, Type: MESSAGE_TYPE.MATERIAL_REQUEST };
            const result = await workstationAPI.requestMaterial(payload);
            if (result.success) {
                alert("Đã gửi yêu cầu vật tư thành công!");
                setMatReqModal({ isOpen: false, pn: availablePNs[0] || '', qty: '' });
            } else {
                alert(result.message || "Lỗi khi gửi yêu cầu!");
            }
        } catch (error) {
            alert("Lỗi kết nối máy chủ!");
        }
    };

    
    return(
        <div className="w-full mx-auto bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden min-h-[700px] relative animate-fade-in">
                {/* 0. CÁC SCANNER CAMERA OVERLAYS */}
                {showMatScanner && (
                    <BarcodeScanner onScanSuccess={handleMatCameraScan} onClose={() => setShowMatScanner(false)} />
                )}
                {showDoneScanner && (
                    <BarcodeScanner onScanSuccess={handleDoneCameraScan} onClose={() => setShowDoneScanner(false)} />
                )}

                {/* 1. TRẠM HEADER */}
                <div className="w-full px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 bg-slate-800/40 border-b border-slate-700">
                    
                    {/* KHỐI BÊN TRÁI: THÔNG TIN TRẠM */}
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto min-w-0">
                        <MonitorDot className="text-blue-400 shrink-0 mt-1 sm:mt-0" size={32} />
                        
                        {/* Thêm min-w-0 để text bên trong có thể truncate (cắt chữ bằng dấu ...) nếu quá dài */}
                        <div className="min-w-0 flex-1">
                            <h1 className="text-slate-200 font-bold text-lg sm:text-xl tracking-wide uppercase truncate">
                                Assembly Process
                            </h1>
                            
                            {/* Dùng flex-wrap để các tag WO, Ref, Model tự động rớt xuống dòng nếu hết chỗ */}
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-md font-mono font-bold tracking-wider text-xs sm:text-sm">
                                    WO: {woData.WO}
                                </span>
                                
                                {woData.AliasWO && (
                                    <div className="flex items-center gap-1">
                                        <LinkIcon size={14} className="text-slate-500 shrink-0" />
                                        <span className="bg-slate-700 text-slate-400 border border-slate-600 px-2.5 py-1 rounded-md font-mono font-bold tracking-wider text-xs">
                                            Ref: {woData.AliasWO}
                                        </span>
                                    </div>
                                )}
                                
                                <span className="text-slate-500 text-xs sm:text-sm font-mono truncate max-w-full">
                                    Model: {woData.ModelNO}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* KHỐI BÊN PHẢI: NÚT ĐÓNG TRẠM */}
                    {/* Trên mobile nút sẽ kéo dài full width để dễ bấm, trên web sẽ tự thu lại */}
                    <div className="w-full sm:w-auto shrink-0">
                        <ActionButton 
                            onClick={clearCurrentWorkstation} 
                            label="Đóng Trạm" 
                            color="red" 
                            icon={<XCircle size={20}/>} 
                            className="w-full sm:w-auto justify-center hover:scale-105 transition-transform shadow-lg" 
                            title="Đóng Trạm & Quay lại"
                        />
                    </div>

                </div>

                {/* 2. KHU VỰC QUÉT MÃ (TOOL SECTION) */}
                <div className="bg-slate-800 rounded-xl border-b border-slate-700 shadow-lg p-4 sm:p-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-5 xl:gap-6">
                    
                    <div className="flex flex-col w-full xl:flex-1 xl:max-w-xl">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
                            <span className="text-slate-400 font-bold whitespace-nowrap hidden sm:block">Quét Vật tư:</span>
                            <input 
                                ref={inputRef}
                                type="text" 
                                value={materialInput}
                                onChange={(e) => setMaterialInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Chít mã linh kiện vào đây..."
                                className={`flex-1 bg-slate-900 border ${scanError ? 'border-red-500' : 'border-slate-600 focus:ring-blue-500'} text-white px-4 py-3 rounded-lg focus:ring-2 outline-none transition-all w-full shadow-inner font-mono`}
                            />
                            
                            <ActionButton 
                                onClick={() => setShowMatScanner(true)}
                                label="Nhập" 
                                color="blue" 
                                icon={<ScanLine size={18}/>} 
                                className="py-3 px-6" 
                            />
                        </div>
                        {scanError && <span className="text-red-400 text-sm mt-2 font-semibold ml-0 sm:ml-28 animate-pulse">{scanError}</span>}
                    </div>

                    <div className="w-full h-px bg-slate-700 xl:hidden"></div>

                    {/* Nút thao tác nhanh */}
                    <div className="w-full flex flex-row items-stretch gap-2 sm:gap-3 xl:w-auto">
                        <ActionButton 
                            onClick={() => setIsNgModalOpen(true)} 
                            label={t('production.ngReport')} 
                            color="red" 
                            icon={<AlertTriangle size={18}/>} 
                            className="flex-1 py-3"
                        />
                        <ActionButton 
                            onClick={() => setMatReqModal({ ...matReqModal, isOpen: true })}
                            label={t('production.matRequest')} color="emerald" icon={<PackagePlus size={18}/>} className="flex-1 py-3" 
                        />
                        
                    </div>
                </div>

                {/* 3. KHU VỰC HIỂN THỊ DỮ LIỆU ĐÃ QUÉT */}
                <div className="p-4 sm:p-6 pb-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 bg-slate-900/30">
                    <ExpandableSection title={`Main Input Material (${mainInputs.length})`} variant="blue" defaultOpen={true}>
                        <div className="space-y-3 font-mono text-sm sm:text-base max-h-60 overflow-y-auto pr-2">
                            {mainInputs.length === 0 ? (
                                <div className="min-h-[60px] flex items-center justify-center text-slate-500 italic text-sm">Chưa có dữ liệu. Vui lòng quét mã Main Input.</div>
                            ) : (
                                mainInputs.map((item, idx) => (
                                    <div key={idx} className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-600/50 pb-3 gap-1 sm:gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-blue-300 break-all">{item.code}</span>
                                            {/* Hiển thị thêm PN nếu có */}
                                            {item.pn && <span className="text-slate-500 text-xs mt-0.5">PN: {item.pn}</span>}
                                        </div>
                                        <div className="flex gap-4 items-center">
                                            <span className="text-slate-400 text-xs sm:text-sm whitespace-nowrap bg-slate-800 px-2 py-1 rounded">Số lượng: {item.qty} PCS</span>
                                            <span className="text-slate-400 text-xs sm:text-sm whitespace-nowrap">{item.time}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ExpandableSection>

                    <ExpandableSection title={`Raw Material (${rawMaterials.length})`} variant="green" defaultOpen={false}>
                        <div className="space-y-3 font-mono text-sm sm:text-base max-h-60 overflow-y-auto pr-2">
                            {rawMaterials.length === 0 ? (
                                <div className="min-h-[60px] flex items-center justify-center text-slate-500 italic text-sm">Chưa có dữ liệu phụ liệu.</div>
                            ) : (
                                rawMaterials.map((item, idx) => (
                                    <div key={idx} className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-600/50 pb-3 gap-1 sm:gap-4">
                                        <span className="text-emerald-300 break-all">{item.code}</span>
                                        <div className="flex gap-4 items-center">
                                            <span className="text-slate-500 text-xs sm:text-sm whitespace-nowrap">PN: {item.pn}</span>
                                            <span className="text-emerald-400 font-bold text-xs sm:text-sm whitespace-nowrap bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">{item.qty} pcs</span>
                                            <span className="text-slate-400 text-xs sm:text-sm whitespace-nowrap">{item.time}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ExpandableSection>
                </div>

                {/* ========================================== */}
                {/* 4. CÁC MODAL HIỂN THỊ */}
                {/* ========================================== */}

                <DefectReportModal 
                    isOpen={isNgModalOpen} 
                    onClose={() => setIsNgModalOpen(false)} 
                    wo={woData.WO}
                    modelNo={woData.ModelNO}
                />

                {qtyModal.isOpen && (
                    <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-slate-800 w-full max-w-md rounded-2xl border border-slate-600 shadow-2xl p-6 animate-fade-in-up">
                            <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
                                <h2 className="text-xl font-bold text-emerald-400">Nhập số lượng sử dụng</h2>
                                <button onClick={() => setQtyModal({...qtyModal, isOpen: false})} className="text-slate-400 hover:text-white"><X size={24}/></button>
                            </div>
                            <div className="mb-6 bg-slate-900 p-3 rounded border border-slate-700">
                                <p className="text-slate-400 text-xs mb-1">Mã vừa quét (PN: {qtyModal.matchedRule?.partNumber}):</p>
                                <p className="text-emerald-300 font-mono text-sm break-all">{qtyModal.scannedCode}</p>
                            </div>
                            <div className="mb-6">
                                <label className="block text-slate-300 font-bold mb-2">Số lượng (QTY):</label>
                                <input 
                                    type="number" value={inputQty}
                                    onChange={(e) => setInputQty(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSubmitRawQty()}
                                    className="w-full bg-slate-900 border border-emerald-500/50 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-xl font-mono text-center"
                                />
                            </div>
                            <button onClick={handleSubmitRawQty} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-lg">
                                XÁC NHẬN SỐ LƯỢNG
                            </button>
                        </div>
                    </div>
                )}


                {matReqModal.isOpen && (
                    <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-slate-800 w-full max-w-md rounded-2xl border border-emerald-500/50 shadow-2xl p-6 animate-fade-in-up">
                            <h2 className="text-xl font-bold text-emerald-400 mb-4 border-b border-slate-700 pb-3 flex items-center gap-2"><PackagePlus/> Yêu Cầu Vật Tư</h2>
                            <div className="mb-4">
                                <label className="block text-slate-300 font-bold mb-2">Chọn Part Number:</label>
                                <select 
                                    value={matReqModal.pn} onChange={(e) => setMatReqModal({...matReqModal, pn: e.target.value})}
                                    className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                                >
                                    {availablePNs.map((pn, i) => <option key={i} value={pn}>{pn}</option>)}
                                </select>
                            </div>
                            <div className="mb-6">
                                <label className="block text-slate-300 font-bold mb-2">Số lượng cần cấp (QTY):</label>
                                <input 
                                    type="number" value={matReqModal.qty} onChange={(e) => setMatReqModal({...matReqModal, qty: e.target.value})}
                                    className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-xl text-center"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setMatReqModal({...matReqModal, isOpen: false})} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-bold">HỦY</button>
                                <button onClick={handleSubmitMatReq} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-lg">GỬI YÊU CẦU</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL 4: MARK DONE (CÓ TÍCH HỢP QUÉT MÃ TRỰC TIẾP) */}
                {doneModal.isOpen && (
                    <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-slate-800 w-full max-w-md rounded-2xl border border-blue-500/50 shadow-2xl p-6 animate-fade-in-up text-center">
                            <CheckCircle className="text-blue-400 mx-auto mb-3" size={48} />
                            <h2 className="text-2xl font-bold text-white mb-2">Xác nhận Chốt WO</h2>
                            <p className="text-slate-400 mb-6 text-sm">Vui lòng quét lại mã Lệnh Sản Xuất để xác nhận kết thúc công việc tại trạm này.</p>
                            
                            <input 
                                type="text" value={doneModal.scannedWo} 
                                onChange={(e) => setDoneModal({...doneModal, scannedWo: e.target.value})}
                                onKeyDown={(e) => e.key === 'Enter' && verifyAndMarkDone(doneModal.scannedWo)}
                                placeholder="Quét mã WO..."
                                className={`w-full bg-slate-900 border ${doneModal.error ? 'border-red-500' : 'border-slate-600'} text-white px-4 py-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-xl text-center tracking-widest mb-4`}
                            />

                            <button 
                                onClick={() => setShowDoneScanner(true)} 
                                className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-500 text-white font-bold py-3 rounded-lg mb-2 flex items-center justify-center gap-2 transition-all"
                            >
                                <Camera size={20} /> MỞ CAMERA QUÉT MÃ WO
                            </button>

                            {doneModal.error && <p className="text-red-400 text-sm mb-2 animate-pulse">{doneModal.error}</p>}

                            <div className="flex gap-3 mt-4">
                                <button onClick={() => setDoneModal({...doneModal, isOpen: false})} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-bold">QUAY LẠI</button>
                                <button onClick={() => verifyAndMarkDone(doneModal.scannedWo)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg shadow-lg">XÁC NHẬN CHỐT</button>
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );
};

export default FrameAssemblyProc;