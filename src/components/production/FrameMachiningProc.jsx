import React, { useState, useRef, useEffect } from "react";
import { ExpandableSection } from "../common/ExpandableSection";
import { ActionButton } from "../common/ActionButton";
import { ScanLine, XCircle, AlertTriangle, PackagePlus, MonitorDot, CheckCircle, X, Camera, RefreshCcw } from "lucide-react";
import { useTranslation } from 'react-i18next';
import useProductionStore from '../../store/productionStore';
import { workstationAPI } from '../../api/workstationApi';
import BarcodeScanner from '../common/BarcodeScanner';
import { MESSAGE_TYPE, WO_STATUS } from '../common/Constants';
import { SearchableDefectSelector } from '../common/SearchableDefectSelector';
import { defectCodeAPI } from '../../api/defectCodeApi';

const FrameMachiningProc = () => {
    const { t } = useTranslation();
    const inputRef = useRef(null);

    const currentWorkstation = useProductionStore(state => state.currentWorkstation);
    const activeJobs = useProductionStore(state => state.activeJobs);
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

    const [materialInput, setMaterialInput] = useState('');
    const [scanError, setScanError] = useState('');
    const [mainInputs, setMainInputs] = useState([]);
    const [rawMaterials, setRawMaterials] = useState([]);
    const [qtyModal, setQtyModal] = useState({ isOpen: false, scannedCode: '', matchedRule: null });
    const [inputQty, setInputQty] = useState('');

    const [showMatScanner, setShowMatScanner] = useState(false);
    const [showDoneScanner, setShowDoneScanner] = useState(false);

    const [ngModal, setNgModal] = useState({ isOpen: false, pn: availablePNs[0] || '', defectCode: '', desc: '', qty: '' });
    const [matReqModal, setMatReqModal] = useState({ isOpen: false, pn: availablePNs[0] || '', qty: '' });
    const [doneModal, setDoneModal] = useState({ isOpen: false, scannedWo: '', error: '' });

    const [updateModal, setUpdateModal] = useState({ isOpen: false, qty: '' });

    // Dưới dòng khai báo các modal
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

    useEffect(() => {
        if (!qtyModal.isOpen && !ngModal.isOpen && !matReqModal.isOpen && !doneModal.isOpen && !showMatScanner && !showDoneScanner && inputRef.current) {
            inputRef.current.focus();
        }
    }, [qtyModal.isOpen, ngModal.isOpen, matReqModal.isOpen, doneModal.isOpen, showMatScanner, showDoneScanner, mainInputs, rawMaterials]);

    const handleScanMaterial = async (code) => {
        if (!code.trim()) return;
        const scannedCode = code.trim();
        setScanError('');

        // 1. TRƯỜNG HỢP: MAIN INPUT (BATCH) - Quét qua toàn bộ mảng mainInputRules
        const matchedMainRule = mainInputRules.find(rule => scannedCode.includes(rule.fixedString));
        
        if (matchedMainRule) {
            try {
                // Gọi API như cũ (Backend không cần biết đây là chân trái hay phải, nó chỉ ghi nhận Batch)
                const result = await workstationAPI.logInputMain(woData.WO, scannedCode);
                if (result.success) {
                    setMainInputs([{ 
                        code: scannedCode, 
                        pn: matchedMainRule.partNumber, // Ghi nhận thêm PN để hiển thị cho rõ
                        time: new Date().toLocaleTimeString(), 
                        qty: 1 
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
        const matchedRawRule = rawRules?.find(rule => scannedCode.includes(rule.fixedString));
        if (matchedRawRule) {
            setQtyModal({ isOpen: true, scannedCode: scannedCode, matchedRule: matchedRawRule });
            setMaterialInput('');
            return;
        }

        setScanError(`Mã không hợp lệ: Không khớp với bất kỳ chuỗi nhận diện Vật tư nào của Model ${woData.ModelNO}`);
        setMaterialInput('');
    };

    const handleKeyDown = (e) => { if (e.key === 'Enter') handleScanMaterial(materialInput); };
    const handleMatCameraScan = (decodedText) => { setShowMatScanner(false); setMaterialInput(decodedText); handleScanMaterial(decodedText); };

    const handleSubmitRawQty = async () => {
        const qty = parseFloat(inputQty);
        if (isNaN(qty) || qty <= 0) return alert("Vui lòng nhập số lượng hợp lệ!");
        try {
            const result = await workstationAPI.logRawMaterial(woData.WO, qtyModal.scannedCode, qty, qtyModal.matchedRule.partNumber);
            if (result.success) {
                setRawMaterials([{ code: qtyModal.scannedCode, pn: qtyModal.matchedRule.partNumber, qty: qty, time: new Date().toLocaleTimeString() }, ...rawMaterials]);
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

    const handleSubmitNg = async () => {
        // 1. KIỂM TRA VALIDATE SỐ LƯỢNG
        const ngQty = parseFloat(ngModal.qty);
        if (isNaN(ngQty) || ngQty <= 0) {
            return alert("Vui lòng nhập số lượng hàng lỗi (QTY) hợp lệ và lớn hơn 0!");
        }

        // 2. KIỂM TRA VALIDATE MÃ LỖI ĐÃ ĐƯỢC CHỌN CHƯA
        if (!ngModal.defectObject || !ngModal.defectObject.Code) {
            return alert("Vui lòng chọn Loại lỗi (Defect Code) từ danh sách!");
        }
        
        try {
            // 3. ĐÓNG GÓI PAYLOAD THEO ĐÚNG CONCEPT MỚI
            const payload = { 
                WO: woData.WO, 
                PartNO: ngModal.pn, 
                QTY: ngQty, 
                DefectCode: ngModal.defectObject.Code,         // Mã lỗi lấy từ Object
                Station: ngModal.defectObject.Station,         // TRẠM LÝ THUYẾT (Chịu trách nhiệm)
                Description: ngModal.desc || "",               // Ghi chú (Optional)
                Type: MESSAGE_TYPE.DEFECT                      // Loại log là báo NG
            };
            
            // 4. GỌI API GỬI XUỐNG SERVER
            const result = await workstationAPI.logDefect(payload);
            
            // 5. XỬ LÝ KẾT QUẢ TỪ SERVER
            if (result.success) {
                alert("Đã gửi báo cáo lỗi (NG) thành công!");
                
                // Đóng Modal và Reset toàn bộ dữ liệu Form về trạng thái ban đầu
                setNgModal({ 
                    isOpen: false, 
                    pn: availablePNs[0] || '', // Trả về PN mặc định đầu tiên của Lệnh
                    defectCode: '',            // Xóa text hiển thị
                    defectObject: null,        // Xóa sạch Object data chứa Station
                    desc: '',                  // Xóa ghi chú
                    qty: ''                    // Xóa số lượng
                });
            } else {
                alert(result.message || "Hệ thống từ chối báo cáo NG. Vui lòng kiểm tra lại!");
            }
        } catch (error) {
            // Bắt lỗi mất kết nối mạng hoặc Server sập
            const backendMessage = error.response?.data?.detail || error.response?.data?.message;
            alert(backendMessage || "Lỗi kết nối máy chủ khi gửi báo cáo NG!");
        }
    };

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

    // HÀM CHỐT LỆNH TỐI GIẢN (DÙNG CHUNG CẢ MACHINING & PACKING)
    const verifyAndMarkDone = async (scannedWo) => {
        try {
            // 1. Ép kiểu an toàn tuyệt đối để chống lỗi ngầm (Silent Crash)
            const safeScanned = String(scannedWo || "").trim();
            const safeTarget = String(woData?.WO || "").trim();

            if (!safeScanned) {
                setDoneModal(prev => ({...prev, error: "Vui lòng quét hoặc nhập mã Lệnh!"}));
                return;
            }

            if (safeScanned !== safeTarget) {
                setDoneModal(prev => ({...prev, error: `Mã lệnh không khớp! Cần quét: ${safeTarget}`}));
                return;
            }

            // Xóa lỗi cũ trên UI nếu có
            setDoneModal(prev => ({...prev, error: ""}));

            // 2. Ép kiểu Number (INT) chuẩn xác để chống lỗi 422 từ Server
            const payload = { 
                WO: parseInt(safeTarget), 
                Status: 2 // 2 tương đương WO_STATUS.CLOSED
            };
            
            const result = await workstationAPI.markDone(payload);
            
            if (result && result.success) {
                alert("Đã chốt Lệnh thành công!");
                setDoneModal({ isOpen: false, scannedWo: '', error: '' });
                clearCurrentWorkstation();
            } else {
                setDoneModal(prev => ({...prev, error: result?.message || "Lỗi từ máy chủ khi chốt lệnh!"}));
            }
        } catch (error) {
            console.error("Lỗi API MarkDone:", error);
            // 3. Xử lý an toàn để chống lỗi màn hình trắng (#31) của React
            let errorMsg = "Lỗi kết nối máy chủ!";
            if (error?.response?.data?.detail) {
                const detail = error.response.data.detail;
                errorMsg = typeof detail === 'string' ? detail : JSON.stringify(detail);
            } else if (error?.response?.data?.message) {
                errorMsg = error.response.data.message;
            } else if (error?.message) {
                errorMsg = error.message;
            }
            setDoneModal(prev => ({...prev, error: errorMsg}));
        }
    };

    const handleDoneCameraScan = (decodedText) => { setShowDoneScanner(true); verifyAndMarkDone(decodedText); };


    const handleUpdateProgress = async () => {
        const newQty = parseInt(updateModal.qty);
        
        if (isNaN(newQty) || newQty < 0) {
            return alert("Vui lòng nhập số lượng hợp lệ (lớn hơn hoặc bằng 0)!");
        }

        try {
            const payload = {
                WO: woData.WO,
                QTY: newQty
            };
            
            const result = await workstationAPI.updateWOProgress(payload);
            
            if (result.success) {
                alert("Đã cập nhật tiến độ thành công!");
                setUpdateModal({ isOpen: false, qty: '' });
                // Tùy chọn: Có thể gọi lại API lấy chi tiết WO ở đây để cập nhật giao diện
            } else {
                alert(result.message || "Lỗi khi cập nhật tiến độ!");
            }
        } catch (error) {
            const backendMessage = error.response?.data?.detail || error.response?.data?.message;
            alert(backendMessage || "Lỗi kết nối máy chủ khi cập nhật tiến độ!");
        }
    };

    return(
        <div className="w-full mx-auto bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden min-h-[700px] relative animate-fade-in">
            {showMatScanner && <BarcodeScanner onScanSuccess={handleMatCameraScan} onClose={() => setShowMatScanner(false)} />}
            {showDoneScanner && <BarcodeScanner onScanSuccess={handleDoneCameraScan} onClose={() => setShowDoneScanner(false)} />}

            <div className="w-full px-6 py-4 flex justify-between items-center bg-slate-800/40 border-b border-slate-700">
                <div className="flex items-center gap-4">
                    <MonitorDot className="text-blue-400 shrink-0" size={32} />
                    <div>
                        <h1 className="text-slate-200 font-bold text-xl tracking-wide uppercase">Machining Process</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded border border-blue-500/30">WO: {woData.WO}</span>
                            <span className="text-slate-500 text-sm font-mono">Model: {woData.ModelNO}</span>
                        </div>
                    </div>
                </div>
                <ActionButton onClick={clearCurrentWorkstation} label="Đóng Trạm" color="red" icon={<XCircle size={22}/>} className="hover:scale-105 transition-transform shadow-lg" title="Đóng Trạm & Quay lại" />
            </div>

            <div className="bg-slate-800 rounded-xl border-b border-slate-700 shadow-lg p-4 sm:p-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-5 xl:gap-6">
                <div className="flex flex-col w-full xl:flex-1 xl:max-w-xl">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
                        <span className="text-slate-400 font-bold whitespace-nowrap hidden sm:block">Quét Vật tư:</span>
                        <input ref={inputRef} type="text" value={materialInput} onChange={(e) => setMaterialInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Tít mã linh kiện vào đây..." className={`flex-1 bg-slate-900 border ${scanError ? 'border-red-500' : 'border-slate-600 focus:ring-blue-500'} text-white px-4 py-3 rounded-lg focus:ring-2 outline-none transition-all w-full shadow-inner font-mono`} />
                        <ActionButton onClick={() => setShowMatScanner(true)} label="Nhập" color="blue" icon={<ScanLine size={18}/>} className="py-3 px-6" />
                    </div>
                    {scanError && <span className="text-red-400 text-sm mt-2 font-semibold ml-0 sm:ml-28 animate-pulse">{scanError}</span>}
                </div>

                <div className="w-full h-px bg-slate-700 xl:hidden"></div>

                {/* SỬA LỖI RESPONSIVE: Dùng flex-wrap và flex-1 cho các thiết bị nhỏ tự co giãn nút bấm */}
                <div className="w-full flex flex-wrap sm:flex-nowrap items-stretch gap-2 sm:gap-3 xl:w-auto">
                    <ActionButton onClick={() => setNgModal({ ...ngModal, isOpen: true })} label={t('production.ngReport')} color="red" icon={<AlertTriangle size={18}/>} className="flex-1 min-w-[140px] py-3" />
                    <ActionButton onClick={() => setMatReqModal({ ...matReqModal, isOpen: true })} label={t('production.matRequest')} color="emerald" icon={<PackagePlus size={18}/>} className="flex-1 min-w-[140px] py-3" />
                    <ActionButton onClick={() => setDoneModal({ ...doneModal, isOpen: true, error: '', scannedWo: '' })} label={t('production.markDone')} color="blue" icon={<CheckCircle size={18}/>} className="flex-1 min-w-[140px] py-3" />
                    <ActionButton onClick={() => setUpdateModal({ isOpen: true, qty: '' })} label="UPDATE" color="orange" icon={<RefreshCcw size={18}/>} 
    className="flex-1 min-w-[140px] py-3" 
/>
                </div>
            </div>

            {/* Các nội dung hiển thị Material & Modals giữ nguyên như cũ ... */}
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
                                            <span className="text-slate-400 text-xs sm:text-sm whitespace-nowrap bg-slate-800 px-2 py-1 rounded">1 pcs</span>
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
                            <input type="number" autoFocus value={inputQty} onChange={(e) => setInputQty(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSubmitRawQty()} className="w-full bg-slate-900 border border-emerald-500/50 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-xl font-mono text-center" />
                        </div>
                        <button onClick={handleSubmitRawQty} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-lg">XÁC NHẬN SỐ LƯỢNG</button>
                    </div>
                </div>
            )}

            {ngModal.isOpen && (
                    <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-slate-800 w-full max-w-md rounded-2xl border border-red-500/50 shadow-2xl p-6 animate-fade-in-up flex flex-col max-h-[90vh]">
                            <h2 className="text-xl font-bold text-red-400 mb-4 border-b border-slate-700 pb-3 flex items-center gap-2 shrink-0"><AlertTriangle/> Báo Lỗi (NG)</h2>
                            
                            <div className="overflow-y-auto custom-scrollbar pr-2 pb-4 space-y-4">
                                {/* 1. Chọn Part Number */}
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">1. Part Number bị lỗi *</label>
                                    <select 
                                        value={ngModal.pn} onChange={(e) => setNgModal({...ngModal, pn: e.target.value})}
                                        className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-red-500 outline-none font-mono"
                                    >
                                        {availablePNs.map((pn, i) => <option key={i} value={pn}>{pn}</option>)}
                                    </select>
                                </div>
                                
                                {/* 2. Chọn Mã Lỗi (Component mới) */}
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">2. Loại lỗi (Defect Code) *</label>
                                    <SearchableDefectSelector 
                                        codes={allDefectCodes}
                                        currentStation="Machining" /* Đã sửa đúng tên trạm */
                                        selectedCode={ngModal.defectCode}
                                        onSelect={(defectObj) => setNgModal({
                                            ...ngModal, 
                                            defectCode: defectObj.Code,      // Chỉ lưu chuỗi Code để component hiển thị UI
                                            defectObject: defectObj          // LƯU CẢ OBJECT để hàm handleSubmitNg lấy được Station
                                        })}
                                    />
                                </div>

                                {/* 3. Nhập số lượng */}
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">3. Số lượng NG (QTY) *</label>
                                    <input 
                                        type="number" 
                                        value={ngModal.qty} 
                                        onChange={(e) => setNgModal({...ngModal, qty: e.target.value})}
                                        className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-red-500 outline-none font-mono text-xl text-center"
                                        placeholder="0"
                                    />
                                </div>

                                {/* 4. Mô tả phụ (Không bắt buộc) */}
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">4. Ghi chú thêm (Tùy chọn)</label>
                                    <textarea 
                                        value={ngModal.desc} onChange={(e) => setNgModal({...ngModal, desc: e.target.value})}
                                        className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-red-500 outline-none h-20"
                                        placeholder="Nhập chi tiết nếu cần..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-700 shrink-0">
                                <button onClick={() => setNgModal({...ngModal, isOpen: false})} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-bold">HỦY BỎ</button>
                                <button onClick={handleSubmitNg} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg shadow-lg">XÁC NHẬN BÁO LỖI</button>
                            </div>
                        </div>
                    </div>
                )}

            {matReqModal.isOpen && (
                <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-800 w-full max-w-md rounded-2xl border border-emerald-500/50 shadow-2xl p-6 animate-fade-in-up">
                        <h2 className="text-xl font-bold text-emerald-400 mb-4 border-b border-slate-700 pb-3 flex items-center gap-2"><PackagePlus/> Yêu Cầu Vật Tư</h2>
                        <div className="mb-4">
                            <label className="block text-slate-300 font-bold mb-2">Chọn Part Number:</label>
                            <select value={matReqModal.pn} onChange={(e) => setMatReqModal({...matReqModal, pn: e.target.value})} className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-mono">
                                {availablePNs.map((pn, i) => <option key={i} value={pn}>{pn}</option>)}
                            </select>
                        </div>
                        <div className="mb-6">
                            <label className="block text-slate-300 font-bold mb-2">Số lượng cần cấp (QTY):</label>
                            <input type="number" autoFocus value={matReqModal.qty} onChange={(e) => setMatReqModal({...matReqModal, qty: e.target.value})} className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-xl text-center" />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setMatReqModal({...matReqModal, isOpen: false})} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-bold">HỦY</button>
                            <button onClick={handleSubmitMatReq} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-lg">GỬI YÊU CẦU</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. MODAL CHỐT LỆNH (MARK DONE) - TỐI GIẢN */}
            {doneModal.isOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-800 rounded-2xl w-full max-w-md border border-slate-600 shadow-2xl overflow-hidden">
                        <div className="bg-rose-500/20 p-4 border-b border-rose-500/50 flex justify-between items-center">
                            <h3 className="text-rose-400 font-bold flex items-center gap-2"><AlertTriangle /> XÁC NHẬN CHỐT LỆNH</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-300 text-sm mb-4">
                                Vui lòng quét hoặc nhập mã Lệnh <b className="text-white bg-slate-700 px-2 py-0.5 rounded">{woData?.WO}</b> để xác nhận hoàn thành (Đóng WO).
                            </p>
                            
                            <input 
                                type="text" 
                                autoFocus
                                value={doneModal.scannedWo || ''} 
                                onChange={(e) => setDoneModal(prev => ({...prev, scannedWo: e.target.value}))} 
                                onKeyDown={(e) => e.key === 'Enter' && verifyAndMarkDone(doneModal.scannedWo)}
                                className={`w-full bg-slate-900 border ${doneModal.error ? 'border-red-500' : 'border-slate-600'} text-white px-4 py-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-xl text-center tracking-widest mb-4`}
                                placeholder="Quét mã Lệnh..."
                            />

                            <button 
                                onClick={() => setShowDoneScanner(true)} 
                                className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-500 text-white font-bold py-3 rounded-lg mb-2 flex items-center justify-center gap-2 transition-all"
                            >
                                <Camera size={20} /> MỞ CAMERA QUÉT MÃ WO
                            </button>

                            {doneModal.error && (
                                <p className="text-red-400 text-sm mb-2 animate-pulse font-bold break-words">
                                    {doneModal.error}
                                </p>
                            )}

                            <div className="flex gap-3 mt-4">
                                <button onClick={() => setDoneModal({isOpen: false, scannedWo: '', error: ''})} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-bold">
                                    QUAY LẠI
                                </button>
                                <button onClick={() => verifyAndMarkDone(doneModal.scannedWo)} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-lg shadow-lg">
                                    XÁC NHẬN CHỐT
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {updateModal.isOpen && (
                <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-800 w-full max-w-md rounded-2xl border border-orange-500/50 shadow-2xl p-6 animate-fade-in-up">
                        <h2 className="text-xl font-bold text-orange-400 mb-4 border-b border-slate-700 pb-3 flex items-center gap-2">
                            <RefreshCcw/> Cập nhật tiến độ
                        </h2>
                        
                        {/* Hiển thị tham chiếu thông tin WO */}
                        <div className="mb-4 bg-slate-900 p-4 rounded-xl border border-slate-700 flex justify-between items-center shadow-inner">
                            <div>
                                <p className="text-slate-400 text-xs mb-1">Lệnh sản xuất:</p>
                                <p className="text-white font-mono font-bold text-lg">{woData.WO}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-slate-400 text-xs mb-1">Đã đạt (QTY_OK):</p>
                                
                                {/* CHÈN ĐOẠN LOGIC CỦA BẠN VÀO ĐÂY */}
                                {(() => {
                                    const liveJob = activeJobs.find(job => job.WO === woData.WO);
                                    const displayQtyOk = liveJob?.QTY_OK ?? woData.QTY_OK ?? 0;
                                    
                                    return (
                                        <p className="text-emerald-400 font-mono font-bold text-3xl">
                                            {displayQtyOk}
                                        </p>
                                    );
                                })()}
                            </div>
                        </div>

                        <div className="mb-6 mt-4">
                            <label className="block text-slate-300 font-bold mb-2">Số lượng VỪA LÀM THÊM (+):</label>
                            <input 
                                type="number" 
                                autoFocus 
                                value={updateModal.qty} 
                                onChange={(e) => setUpdateModal({...updateModal, qty: e.target.value})} 
                                onKeyDown={(e) => e.key === 'Enter' && handleUpdateProgress()}
                                className="w-full bg-slate-900 border border-orange-500/50 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-2xl font-mono text-center" 
                                placeholder="Nhập số lượng..."
                            />
                        </div>
                        
                        <div className="flex gap-3">
                            <button onClick={() => setUpdateModal({isOpen: false, qty: ''})} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-bold transition-colors">
                                HỦY
                            </button>
                            <button onClick={handleUpdateProgress} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-lg shadow-lg transition-colors">
                                THÊM
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default FrameMachiningProc;