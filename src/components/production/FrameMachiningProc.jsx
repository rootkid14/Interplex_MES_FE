import React, { useState, useRef, useEffect } from "react";
import { ExpandableSection } from "../common/ExpandableSection";
import { ActionButton } from "../common/ActionButton";
import { ScanLine, XCircle, AlertTriangle, PackagePlus, MonitorDot, CheckCircle, X, Camera, RefreshCcw, MapPin } from "lucide-react";
import { useTranslation } from 'react-i18next';
import useProductionStore from '../../store/productionStore';
import { workstationAPI } from '../../api/workstationApi';
import BarcodeScanner from '../common/BarcodeScanner';
import { MESSAGE_TYPE, WO_STATUS } from '../common/Constants';
import { SearchableDefectSelector } from '../common/SearchableDefectSelector';
import { defectCodeAPI } from '../../api/defectCodeApi';
import DefectReportModal from "../common/DefectReportModals";
import WctrSelectionModal from "../common/WctrSelectionModal";

const FrameMachiningProc = () => {
    const { t } = useTranslation();
    const inputRef = useRef(null);

    const currentWorkstation = useProductionStore(state => state.currentWorkstation);
    const activeJobs = useProductionStore(state => state.activeJobs);
    const clearCurrentWorkstation = useProductionStore(state => state.clearCurrentWorkstation);

    if (!currentWorkstation) return null;
    const woData = currentWorkstation;

    const [wctrModalOpen, setWctrModalOpen] = useState(false);
    const [isSubmittingWctr, setIsSubmittingWctr] = useState(false);

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
    const [remainderModal, setRemainderModal] = useState({
        isOpen: false,
        batch: '',
        matchedRule: null,
        previousWO: null,
        previousQTY: 0,
        requestedWO: null,
        value: '',
        error: '',
        isSubmitting: false
    });

    const [showMatScanner, setShowMatScanner] = useState(false);
    const [showDoneScanner, setShowDoneScanner] = useState(false);

    const [isNgModalOpen, setIsNgModalOpen] = useState(false);
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

    const loadMaterialHistory = async () => {
        if (!woData?.WO) return { mainInputs: [], rawMaterials: [] };

        const result = await workstationAPI.getLoggedMaterials(woData.WO);
        if (!result.success) {
            throw new Error(result.message || "Không thể tải lịch sử vật tư.");
        }

        const mInputs = result.data?.mainInputs || [];
        const rMaterials = result.data?.rawMaterials || [];
        setMainInputs(mInputs);
        setRawMaterials(rMaterials);
        return { mainInputs: mInputs, rawMaterials: rMaterials };
    };

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const { mainInputs: mInputs, rawMaterials: rMaterials } = await loadMaterialHistory();
                const processedQty = (Number(woData.QTY_OK) || 0) + (Number(woData.QTY_NG) || 0);

                if (processedQty === 0 && mInputs.length === 0 && rMaterials.length === 0) {
                    setWctrModalOpen(true);
                }
            } catch (error) {
                console.error("Lỗi khi tải lịch sử:", error);
            }
        };

        fetchHistory();
    }, [woData.WO]);

    useEffect(() => {
        if (!qtyModal.isOpen && !remainderModal.isOpen && !isNgModalOpen && !matReqModal.isOpen && !doneModal.isOpen && !showMatScanner && !showDoneScanner && inputRef.current) {
            inputRef.current.focus();
        }
    }, [qtyModal.isOpen, remainderModal.isOpen, isNgModalOpen, matReqModal.isOpen, doneModal.isOpen, showMatScanner, showDoneScanner, mainInputs, rawMaterials]);

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
                    await loadMaterialHistory();
                    setMaterialInput('');
                } else if (
                    result.message === "BATCH_REMAINDER_REQUIRED" ||
                    result.data?.Action === "BATCH_REMAINDER_REQUIRED"
                ) {
                    setRemainderModal({
                        isOpen: true,
                        batch: scannedCode,
                        matchedRule: matchedMainRule,
                        previousWO: result.data?.PreviousWO,
                        previousQTY: Number(result.data?.PreviousQTY || 0),
                        requestedWO: result.data?.RequestedWO || woData.WO,
                        value: '',
                        error: '',
                        isSubmitting: false
                    });
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

        setScanError(`Mã ${scannedCode} không hợp lệ: Không khớp với bất kỳ chuỗi nhận diện Vật tư nào của Model ${woData.ModelNO}`);
        console.log(rawRules)
        console.log(mainInputRules)
        setMaterialInput('');
    };

    const handleKeyDown = (e) => { if (e.key === 'Enter') handleScanMaterial(materialInput); };
    const handleMatCameraScan = (decodedText) => { setShowMatScanner(false); setMaterialInput(decodedText); handleScanMaterial(decodedText); };

    const handleSubmitRemainder = async () => {
        const remainingQty = Number(remainderModal.value);
        const maxQty = Number(remainderModal.previousQTY);

        if (!Number.isFinite(remainingQty) || remainingQty <= 0) {
            return setRemainderModal(prev => ({ ...prev, error: "Remainder phải lớn hơn 0." }));
        }
        if (remainingQty >= maxQty) {
            return setRemainderModal(prev => ({
                ...prev,
                error: `Remainder phải nhỏ hơn số lượng WO trước đang giữ (${maxQty}).`
            }));
        }

        setRemainderModal(prev => ({ ...prev, isSubmitting: true, error: '' }));
        try {
            const result = await workstationAPI.transferInputBatch(
                woData.WO,
                remainderModal.batch,
                remainingQty
            );

            if (!result.success) {
                return setRemainderModal(prev => ({
                    ...prev,
                    isSubmitting: false,
                    error: result.message || "Không thể chuyển remainder."
                }));
            }

            await loadMaterialHistory();
            setRemainderModal({
                isOpen: false,
                batch: '',
                matchedRule: null,
                previousWO: null,
                previousQTY: 0,
                requestedWO: null,
                value: '',
                error: '',
                isSubmitting: false
            });
            setScanError('');
        } catch (error) {
            const backendMessage = error.response?.data?.detail || error.response?.data?.message;
            setRemainderModal(prev => ({
                ...prev,
                isSubmitting: false,
                error: backendMessage || "Lỗi kết nối server khi chuyển remainder."
            }));
        }
    };

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

            // ==========================================
            // LOGIC MỚI: KIỂM TRA SẢN LƯỢNG THỰC TẾ VS TARGET
            // ==========================================
            const liveJob = activeJobs.find(job => job.WO === woData.WO);
            const currentOk = Number(liveJob?.QTY_OK ?? woData?.QTY_OK ?? 0);
            const currentNg = Number(liveJob?.QTY_NG ?? woData?.QTY_NG ?? 0);
            const targetQty = Number(liveJob?.QTY_Target ?? woData?.QTY_Target ?? 0);
            const totalProcessed = currentOk + currentNg;

            if (totalProcessed < targetQty) {
                const isConfirmed = window.confirm(
                    `CẢNH BÁO THIẾU HÀNG!\n\n` +
                    `Tổng sản lượng đã làm (OK: ${currentOk} + NG: ${currentNg}) = ${totalProcessed}\n` +
                    `Mục tiêu Lệnh (Target) = ${targetQty}\n\n` +
                    `Lệnh này chưa làm đủ số lượng. Bạn có CHẮC CHẮN muốn đóng Lệnh không?`
                );
                
                // Nếu người dùng chọn "Cancel" (Hủy) -> Dừng lại không đóng lệnh nữa
                if (!isConfirmed) {
                    setDoneModal(prev => ({...prev, scannedWo: ''})); // Xóa trắng ô input để quét lại nếu cần
                    return; 
                }
            }
            // ==========================================

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
        const addedQty = parseInt(updateModal.qty);
        
        if (isNaN(addedQty) || addedQty <= 0) {
            return setUpdateModal({...updateModal, error: "Vui lòng nhập số lượng hợp lệ!"});
        }

        // ==========================================
        // BƯỚC 1: KIỂM TRA ĐÃ SCAN ĐỦ CÁC PN YÊU CẦU CHƯA
        // ==========================================
        // Lấy danh sách các PN được định nghĩa trong cấu hình (Rules)
        const requiredMainPNs = mainInputRules.map(rule => rule.partNumber).filter(Boolean);
        const requiredRawPNs = (rawRules || []).map(rule => rule.partNumber).filter(Boolean);

        
        // Lấy danh sách các PN thực tế đã scan
        const scannedMainPNs = mainInputs.map(item => item.pn);
        const scannedRawPNs = rawMaterials.map(item => item.pn);
        
        // Đối chiếu tìm ra các PN chưa được scan
        const missingMainPNs = requiredMainPNs.filter(pn => !scannedMainPNs.includes(pn));
        const missingRawPNs = requiredRawPNs.filter(pn => !scannedRawPNs.includes(pn));
        
        if (missingMainPNs.length > 0 || missingRawPNs.length > 0) {
            const missingAll = [...missingMainPNs, ...missingRawPNs].join(', ');
            return setUpdateModal({
                ...updateModal,
                error: `Chưa scan đủ loại vật tư! Vui lòng scan thêm các PN sau: ${missingAll}`
            });
        }

        // ==========================================
        // BƯỚC 2: TÌM PN MAIN INPUT CÓ TỔNG SỐ LƯỢNG MIN
        // ==========================================
        let minMainQty = Infinity;
        
        if (requiredMainPNs.length > 0) {
            for (const pn of requiredMainPNs) {
                // Tính tổng số lượng đã scan của từng loại PN trong mainInputs
                const totalQtyForPn = mainInputs
                    .filter(item => item.pn === pn)
                    .reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
                
                // Cập nhật lại giá trị Min
                if (totalQtyForPn < minMainQty) {
                    minMainQty = totalQtyForPn;
                }
            }
        } else {
            // Nếu không có yêu cầu main inputs, gán min = 0 để bỏ qua bước 3
            minMainQty = 0; 
        }

        // ==========================================
        // BƯỚC 3: KIỂM TRA GIỚI HẠN SỐ LƯỢNG SẢN XUẤT
        // ==========================================
        const liveJob = activeJobs.find(job => job.WO === woData.WO);
        const currentOkQty = Number(liveJob?.QTY_OK ?? woData.QTY_OK ?? 0);
        console.log(currentOkQty)
        
        if (requiredMainPNs.length > 0 && (currentOkQty + addedQty > minMainQty)) {
            return setUpdateModal({
                ...updateModal, 
                error: `Không thể cập nhật! Tổng số lượng hoàn thành (${currentOkQty + addedQty}) vượt quá giới hạn vật tư chính (Giới hạn hiện tại: ${minMainQty}).`
            });
        }

        // ==========================================
        // BƯỚC 4: GỌI API CẬP NHẬT (Giữ nguyên)
        // ==========================================
        try {
            const result = await workstationAPI.updateWOProgress({
                WO: woData.WO,
                QTY: addedQty
            });
            if (result.success) {
                alert(`Đã cập nhật thêm ${addedQty} sản phẩm hoàn thành!`);
                setUpdateModal({ isOpen: false, qty: '', error: '' });
            } else {
                setUpdateModal({...updateModal, error: result.message});
            }
        } catch (error) {
            const backendMessage = error.response?.data?.detail || error.response?.data?.message;
            setUpdateModal({...updateModal, error: backendMessage || "Lỗi kết nối máy chủ!"});
        }
    };

    const handleSetWctr = async (selectedLineCode) => {
        setIsSubmittingWctr(true);
        try {
            const res = await workstationAPI.setWctr(woData.WO, selectedLineCode);
            if (res.success) {
                alert("Đã ghi nhận Line/Trạm thành công!");
                useProductionStore.getState().setCurrentWorkstation({ ...woData, WCtr: selectedLineCode });
                setWctrModalOpen(false);
            } else {
                alert(res.message || "Lỗi hệ thống khi cập nhật Line/Trạm!");
            }
        } catch (error) {
            alert("Lỗi kết nối máy chủ!");
        } finally {
            setIsSubmittingWctr(false);
        }
    };

    const buildMaterialChecklist = (rules = [], scannedItems = []) =>
        rules.map((rule, index) => {
            const pn = rule.partNumber || `UNDEFINED-${index + 1}`;
            const matchedItems = scannedItems.filter(item => item.pn === rule.partNumber);
            const totalQty = matchedItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
            return {
                key: `${pn}-${index}`,
                pn,
                fixedString: rule.fixedString || '',
                isScanned: matchedItems.length > 0,
                scanCount: matchedItems.length,
                totalQty
            };
        });

    const mainChecklist = buildMaterialChecklist(mainInputRules, mainInputs);
    const rawChecklist = buildMaterialChecklist(rawRules || [], rawMaterials);

    return(
        <div className="w-full mx-auto bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden min-h-[700px] relative animate-fade-in">
            {showMatScanner && <BarcodeScanner onScanSuccess={handleMatCameraScan} onClose={() => setShowMatScanner(false)} />}
            {showDoneScanner && <BarcodeScanner onScanSuccess={handleDoneCameraScan} onClose={() => setShowDoneScanner(false)} />}

            {/* 1. TRẠM HEADER (Đã Fix Responsive Mobile) */}
            <div className="w-full px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 bg-slate-800/40 border-b border-slate-700">
                
                {/* KHỐI BÊN TRÁI: THÔNG TIN TRẠM */}
                <div className="flex items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto min-w-0">
                    <MonitorDot className="text-blue-400 shrink-0 mt-1 sm:mt-0" size={32} />
                    
                    <div className="min-w-0 flex-1">
                        <h1 className="text-slate-200 font-bold text-lg sm:text-xl tracking-wide uppercase truncate">
                            Machining Process
                        </h1>
                        
                        {/* Dùng flex-wrap để WO và Model rớt dòng nếu màn hình quá nhỏ */}
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-md font-mono font-bold tracking-wider text-xs sm:text-sm">
                                WO: {woData.WO}
                            </span>
                            <span className="text-slate-500 text-xs sm:text-sm font-mono truncate max-w-full">
                                Model: {woData.ModelNO}
                            </span>
                        </div>
                    </div>
                </div>

                {/* KHỐI BÊN PHẢI: NÚT ĐÓNG TRẠM */}
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

            <div className="bg-slate-800 rounded-xl border-b border-slate-700 shadow-lg p-4 sm:p-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-5 xl:gap-6">
                <div className="flex flex-col w-full xl:flex-1 xl:max-w-xl">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
                        <span className="text-slate-400 font-bold whitespace-nowrap hidden sm:block">Quét Vật tư:</span>
                        <input ref={inputRef} type="text" value={materialInput} onChange={(e) => setMaterialInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Quét mã..." className={`flex-1 bg-slate-900 border ${scanError ? 'border-red-500' : 'border-slate-600 focus:ring-blue-500'} text-white px-4 py-3 rounded-lg focus:ring-2 outline-none transition-all w-full shadow-inner font-mono`} />
                        <ActionButton onClick={() => setShowMatScanner(true)} label="Nhập" color="blue" icon={<ScanLine size={18}/>} className="py-3 px-6" />
                    </div>
                    {scanError && <span className="text-red-400 text-sm mt-2 font-semibold ml-0 sm:ml-28 animate-pulse">{scanError}</span>}
                </div>

                <div className="w-full h-px bg-slate-700 xl:hidden"></div>

                {/* SỬA LỖI RESPONSIVE: Dùng flex-wrap và flex-1 cho các thiết bị nhỏ tự co giãn nút bấm */}
                <div className="w-full flex flex-wrap sm:flex-nowrap items-stretch gap-2 sm:gap-3 xl:w-auto">
                    <ActionButton onClick={() => setIsNgModalOpen(true)} label={t('production.ngReport')} color="red" icon={<AlertTriangle size={18}/>} className="flex-1 min-w-[140px] py-3" />
                    <ActionButton onClick={() => setMatReqModal({ ...matReqModal, isOpen: true })} label={t('production.matRequest')} color="emerald" icon={<PackagePlus size={18}/>} className="flex-1 min-w-[140px] py-3" />
                    <ActionButton onClick={() => setDoneModal({ ...doneModal, isOpen: true, error: '', scannedWo: '' })} label={t('production.markDone')} color="blue" icon={<CheckCircle size={18}/>} className="flex-1 min-w-[140px] py-3" />
                    <ActionButton onClick={() => setUpdateModal({ isOpen: true, qty: '' })} label="UPDATE" color="orange" icon={<RefreshCcw size={18}/>}  className="flex-1 min-w-[140px] py-3" />
                </div>
            </div>

            {/* Các nội dung hiển thị Material & Modals giữ nguyên như cũ ... */}
            <div className="p-4 sm:p-6 pb-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 bg-slate-900/30">
                <ExpandableSection
                    title={`Main Input Material (${mainChecklist.filter(item => item.isScanned).length}/${mainChecklist.length} PN đã scan)`}
                    variant="blue"
                    defaultOpen={true}
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {mainChecklist.map(item => (
                                <div
                                    key={item.key}
                                    className={`rounded-xl border p-3 flex items-center justify-between gap-3 ${
                                        item.isScanned
                                            ? 'bg-emerald-500/10 border-emerald-500/40'
                                            : 'bg-amber-500/5 border-amber-500/30'
                                    }`}
                                >
                                    <div className="min-w-0">
                                        <p className={`font-bold font-mono break-all ${item.isScanned ? 'text-emerald-300' : 'text-amber-300'}`}>
                                            PN: {item.pn}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1 break-all">
                                            Nhận diện: {item.fixedString || 'Không khai báo fixedString'}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={`text-xs font-black uppercase ${item.isScanned ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {item.isScanned ? 'Đã scan' : 'Chưa scan'}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {item.scanCount} mã · {item.totalQty} PCS
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {mainChecklist.length === 0 && (
                                <div className="text-slate-500 italic">Model không yêu cầu Main Input.</div>
                            )}
                        </div>

                        <div className="border-t border-slate-700 pt-3 space-y-3 font-mono text-sm sm:text-base max-h-60 overflow-y-auto pr-2">
                            {mainInputs.length === 0 ? (
                                <div className="min-h-[50px] flex items-center justify-center text-slate-500 italic text-sm">
                                    Chưa có lịch sử scan Main Input.
                                </div>
                            ) : mainInputs.map((item, idx) => (
                                <div key={`${item.code}-${idx}`} className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-600/50 pb-3 gap-1 sm:gap-4">
                                    <div>
                                        <span className="text-blue-300 break-all">{item.code}</span>
                                        <span className="block text-slate-500 text-xs mt-0.5">PN: {item.pn}</span>
                                    </div>
                                    <div className="flex gap-4 items-center">
                                        <span className="text-slate-400 text-xs bg-slate-800 px-2 py-1 rounded">Số lượng: {item.qty} PCS</span>
                                        <span className="text-slate-400 text-xs">{item.time}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </ExpandableSection>

                <ExpandableSection
                    title={`Raw Material (${rawChecklist.filter(item => item.isScanned).length}/${rawChecklist.length} PN đã scan)`}
                    variant="green"
                    defaultOpen={false}
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {rawChecklist.map(item => (
                                <div
                                    key={item.key}
                                    className={`rounded-xl border p-3 flex items-center justify-between gap-3 ${
                                        item.isScanned
                                            ? 'bg-emerald-500/10 border-emerald-500/40'
                                            : 'bg-amber-500/5 border-amber-500/30'
                                    }`}
                                >
                                    <div className="min-w-0">
                                        <p className={`font-bold font-mono break-all ${item.isScanned ? 'text-emerald-300' : 'text-amber-300'}`}>
                                            PN: {item.pn}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1 break-all">
                                            Nhận diện: {item.fixedString || 'Không khai báo fixedString'}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={`text-xs font-black uppercase ${item.isScanned ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {item.isScanned ? 'Đã scan' : 'Chưa scan'}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {item.scanCount} mã · {item.totalQty} PCS
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {rawChecklist.length === 0 && (
                                <div className="text-slate-500 italic">Model không yêu cầu Raw Material.</div>
                            )}
                        </div>

                        <div className="border-t border-slate-700 pt-3 space-y-3 font-mono text-sm sm:text-base max-h-60 overflow-y-auto pr-2">
                            {rawMaterials.length === 0 ? (
                                <div className="min-h-[50px] flex items-center justify-center text-slate-500 italic text-sm">
                                    Chưa có lịch sử scan Raw Material.
                                </div>
                            ) : rawMaterials.map((item, idx) => (
                                <div key={`${item.code}-${idx}`} className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-600/50 pb-3 gap-1 sm:gap-4">
                                    <span className="text-emerald-300 break-all">{item.code}</span>
                                    <div className="flex gap-4 items-center">
                                        <span className="text-slate-500 text-xs">PN: {item.pn}</span>
                                        <span className="text-emerald-400 font-bold text-xs bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">{item.qty} pcs</span>
                                        <span className="text-slate-400 text-xs">{item.time}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </ExpandableSection>
            </div>



            {/* 4. Chèn Component mới vào cuối */}
            <DefectReportModal 
                isOpen={isNgModalOpen} 
                onClose={() => setIsNgModalOpen(false)} 
                wo={woData.WO}
                modelNo={woData.ModelNO}
            />

            {remainderModal.isOpen && (
                <div className="absolute inset-0 z-[60] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-800 w-full max-w-lg rounded-2xl border border-amber-500/50 shadow-2xl p-6 animate-fade-in-up">
                        <div className="flex justify-between items-start gap-4 mb-4 border-b border-slate-700 pb-3">
                            <div>
                                <h2 className="text-xl font-black text-amber-400">Xác nhận số lượng dư</h2>
                                <p className="text-slate-400 text-sm mt-1">Batch này đang thuộc một WO trước đó.</p>
                            </div>
                            <button
                                onClick={() => setRemainderModal(prev => ({ ...prev, isOpen: false, error: '' }))}
                                disabled={remainderModal.isSubmitting}
                                className="text-slate-400 hover:text-white disabled:opacity-50"
                            >
                                <X size={24}/>
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
                            <div className="col-span-2 bg-slate-900 p-3 rounded-lg border border-slate-700">
                                <p className="text-slate-500 text-xs">Batch</p>
                                <p className="text-blue-300 font-mono font-bold break-all">{remainderModal.batch}</p>
                                <p className="text-slate-500 text-xs mt-1">PN: {remainderModal.matchedRule?.partNumber}</p>
                            </div>
                            <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                                <p className="text-slate-500 text-xs">WO trước</p>
                                <p className="text-white font-mono font-bold">{remainderModal.previousWO}</p>
                            </div>
                            <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                                <p className="text-slate-500 text-xs">Đang giữ</p>
                                <p className="text-amber-300 font-mono font-bold">{remainderModal.previousQTY} PCS</p>
                            </div>
                        </div>

                        <label className="block text-slate-300 font-bold mb-2">
                            Số lượng remainder chuyển sang WO {remainderModal.requestedWO}
                        </label>
                        <input
                            autoFocus
                            type="number"
                            min="1"
                            max={Math.max(1, remainderModal.previousQTY - 1)}
                            value={remainderModal.value}
                            onChange={e => setRemainderModal(prev => ({ ...prev, value: e.target.value, error: '' }))}
                            onKeyDown={e => e.key === 'Enter' && !remainderModal.isSubmitting && handleSubmitRemainder()}
                            className="w-full bg-slate-900 border border-amber-500/50 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-2xl font-mono text-center"
                            placeholder={`1 - ${Math.max(1, remainderModal.previousQTY - 1)}`}
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            WO trước sẽ được chốt còn lại: {Math.max(0, remainderModal.previousQTY - (Number(remainderModal.value) || 0))} PCS.
                        </p>

                        {remainderModal.error && (
                            <p className="text-red-400 text-sm font-bold mt-3">{remainderModal.error}</p>
                        )}

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setRemainderModal(prev => ({ ...prev, isOpen: false, error: '' }))}
                                disabled={remainderModal.isSubmitting}
                                className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white py-3 rounded-lg font-bold"
                            >
                                HỦY
                            </button>
                            <button
                                onClick={handleSubmitRemainder}
                                disabled={remainderModal.isSubmitting}
                                className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white py-3 rounded-lg font-bold"
                            >
                                {remainderModal.isSubmitting ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                            <input type="number" value={inputQty} onChange={(e) => setInputQty(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSubmitRawQty()} className="w-full bg-slate-900 border border-emerald-500/50 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-xl font-mono text-center" />
                        </div>
                        <button onClick={handleSubmitRawQty} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-lg">XÁC NHẬN SỐ LƯỢNG</button>
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
                            <input type="number" value={matReqModal.qty} onChange={(e) => setMatReqModal({...matReqModal, qty: e.target.value})} className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-xl text-center" />
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
                                 
                                value={updateModal.qty} 
                                onChange={(e) => setUpdateModal({...updateModal, qty: e.target.value})} 
                                onKeyDown={(e) => e.key === 'Enter' && handleUpdateProgress()}
                                className="w-full bg-slate-900 border border-orange-500/50 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-2xl font-mono text-center" 
                                placeholder="Nhập số lượng..."
                            />
                        </div>

                        {updateModal.error && (
                        <p className="text-red-400 text-sm mb-4 font-bold animate-pulse text-center break-words">
                        {updateModal.error}
                        </p>
                        )}
                        
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

            <WctrSelectionModal 
                isOpen={wctrModalOpen}
                woData={woData}
                isLoadingSubmit={isSubmittingWctr}
                onClose={() => { setWctrModalOpen(false); clearCurrentWorkstation(); }}
                onConfirm={handleSetWctr}
            />
        </div>
    );
};
export default FrameMachiningProc;