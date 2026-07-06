import React, { useState, useRef, useEffect } from "react";
import { ScanLine, CheckCircle, AlertTriangle, Box, PackagePlus, Trash2, Camera, Link as LinkIcon, Lock, MonitorDot, X, XCircle, ListChecks } from "lucide-react";
import { ActionButton } from "../common/ActionButton";
import { BoxContentExpandable } from "../common/BoxContentExpandable";
import BarcodeScanner from '../common/BarcodeScanner';
import useProductionStore from '../../store/productionStore';
import { workstationAPI } from '../../api/workstationApi';
import DefectReportModal from "../common/DefectReportModals";
import { useTranslation } from 'react-i18next';
import WctrSelectionModal from "../common/WctrSelectionModal";

const FrameAssyPackingMaster = () => {
    const { t } = useTranslation();
    const inputRef = useRef(null);
    const boxInputRef = useRef(null);
    const itemInputRef = useRef(null);

    const currentWorkstation = useProductionStore(state => state.currentWorkstation);
    const clearCurrentWorkstation = useProductionStore(state => state.clearCurrentWorkstation);
    const woData = currentWorkstation;

    const [wctrModalOpen, setWctrModalOpen] = useState(false);
    const [isSubmittingWctr, setIsSubmittingWctr] = useState(false);

    
    // TRÍCH XUẤT CẤU HÌNH (RULES)
    const scanRulesRaw = woData?.rules || {};
    const actualRules = scanRulesRaw.jsonData || scanRulesRaw.rules || scanRulesRaw;
    const compactRules = woData?.routingData?.compactRules || {};
    
    const outputMainRule = actualRules.outputMain || {};
    const boxRule = actualRules.boxRule || {};
    const MAX_QTY_PER_BOX = parseInt(boxRule.boxQTY) || 10;
    const fallbackPN = outputMainRule?.partNumber || (actualRules.mainInputs && actualRules.mainInputs[0]?.partNumber) || "UNKNOWN";

    // ========================================================
    // 1. STATE QUẢN LÝ DỮ LIỆU
    // ========================================================
    const [activeTab, setActiveTab] = useState('inputs');
    const [isLoading, setIsLoading] = useState(true);

    const [masterData, setMasterData] = useState({
        linkedAliases: [], 
        mainInputs: [],
        rawMaterials: [],
        boxes: []
    });

    const [aliasInput, setAliasInput] = useState('');
    const [matInput, setMatInput] = useState('');
    const [boxInput, setBoxInput] = useState('');
    const [itemInput, setItemInput] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const activeBox = masterData.boxes.find(b => !b.isFinished);

    // Scanners & Modals
    const [showMatScanner, setShowMatScanner] = useState(false);
    const [showBoxScanner, setShowBoxScanner] = useState(false);
    const [showItemScanner, setShowItemScanner] = useState(false);
    const [showDoneScanner, setShowDoneScanner] = useState(false);
    const [isAliasModalOpen, setIsAliasModalOpen] = useState(false);

    const [qtyModal, setQtyModal] = useState({ isOpen: false, scannedCode: '', matchedRule: null });
    const [inputQty, setInputQty] = useState('');
    const [qtyWarningModal, setQtyWarningModal] = useState({ isOpen: false, boxId: null, message: '', isSkip: false }); 
    const [doneModal, setDoneModal] = useState({ isOpen: false, scannedWo: '', error: '' });
    const [isNgModalOpen, setIsNgModalOpen] = useState(false);
    const [skipModal, setSkipModal] = useState({ isOpen: false, boxId: '', reason: '' });

    // ========================================================
    // 2. LỌC ALIAS & TÍNH TOÁN ĐỊNH MỨC POKA-YOKE
    // ========================================================
    
    const requiredAliasRules = Object.entries(compactRules).filter(([pn, rule]) => 
        rule.scanType === 'OUTPUT_MAIN' || rule.mode === 'EXTEND'
    );
    const requiredAliasPNs = requiredAliasRules.map(([pn]) => pn);
    const missingPNs = requiredAliasPNs.filter(pn => !masterData.linkedAliases.some(a => a.pn === pn));
    const isChecklistComplete = missingPNs.length === 0;

    const requiredMainPNs = (actualRules.mainInputs || []).map(r => r.partNumber).filter(Boolean);
    const requiredRawPNs = (actualRules.rawMaterials || []).map(r => r.partNumber).filter(Boolean);

    let maxAllowedQty = Infinity;
    let hasRequiredItems = false;

    if (requiredMainPNs.length > 0) {
        hasRequiredItems = true;
        const groupedMain = masterData.mainInputs.reduce((acc, item) => {
            acc[item.pn] = (acc[item.pn] || 0) + (Number(item.qty) || 0);
            return acc;
        }, {});
        const possible = requiredMainPNs.map(pn => groupedMain[pn] || 0);
        maxAllowedQty = Math.min(maxAllowedQty, ...possible);
    }
    if (requiredRawPNs.length > 0) {
        hasRequiredItems = true;
        const groupedRaw = masterData.rawMaterials.reduce((acc, item) => {
            acc[item.pn] = (acc[item.pn] || 0) + (Number(item.qty) || 0);
            return acc;
        }, {});
        const possible = requiredRawPNs.map(pn => groupedRaw[pn] || 0);
        maxAllowedQty = Math.min(maxAllowedQty, ...possible);
    }
    if (!hasRequiredItems) maxAllowedQty = 99999; 

    const currentTotalPacked = masterData.boxes.reduce((sum, b) => sum + b.items.length, 0);

    // ========================================================
    // 3. TẢI DỮ LIỆU BAN ĐẦU (GỘP CHUNG KIỂM TRA WCTR)
    // ========================================================
    useEffect(() => {
        const fetchStatus = async () => {
            if (!woData?.WO) return;
            try {
                // Tải song song 3 luồng dữ liệu một lần duy nhất
                const [matRes, boxRes, aliasRes] = await Promise.all([
                    workstationAPI.getLoggedMaterials(woData.WO).catch(() => ({data: {}})),
                    workstationAPI.getLoggedBoxes(woData.WO).catch(() => ({data: []})),
                    workstationAPI.getLinkedAliases(woData.WO).catch(() => ({data: []}))
                ]);

                // Trích xuất dữ liệu
                const mInputs = matRes?.data?.mainInputs || [];
                const rMaterials = matRes?.data?.rawMaterials || [];
                const bBoxes = boxRes?.data || [];
                
                // ==========================================
                // LOGIC CHUẨN: KIỂM TRA WORKCENTER Ở ĐÂY
                // ==========================================
                const processedQty = (Number(woData.QTY_OK) || 0) + (Number(woData.QTY_NG) || 0);
                
                // NẾU: Chưa làm ra cái nào + Chưa nạp vật tư + Chưa đóng hộp nào + Đang là 'TBC' -> Mới bật Modal
                if (processedQty === 0 && mInputs.length === 0 && rMaterials.length === 0 && bBoxes.length === 0 && woData.WCtr === 'TBC') {
                    setWctrModalOpen(true);
                }

                // Cập nhật State cho toàn bộ Component
                setMasterData(prev => ({
                    ...prev,
                    linkedAliases: aliasRes?.data || [], 
                    mainInputs: mInputs,
                    rawMaterials: rMaterials,
                    boxes: bBoxes
                }));
            } catch (e) { 
                console.warn(e); 
            } finally { 
                setIsLoading(false); 
            }
        };
        fetchStatus();
    }, [woData.WO]);

    // ========================================================
    // 4. LOGIC QUÉT MÃ LỆNH & VẬT TƯ
    // ========================================================

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

    const handleScanAlias = async (code) => {
        const cleaned = code.trim();
        if (!cleaned) return;
        setErrorMsg('');

        try {
            const resInfo = await workstationAPI.checkAliasWoInfo(cleaned);
            if (!resInfo || !resInfo.success) return setErrorMsg(resInfo?.message || "Không tìm thấy thông tin Lệnh sản xuất này!");
            
            const actualPN = resInfo.data.PartNumber;

            if (!requiredAliasPNs.includes(actualPN)) {
                return setErrorMsg(`Lệnh [${cleaned}] (PN: ${actualPN}) KHÔNG thuộc quy trình của Model này!`);
            }
            if (masterData.linkedAliases.some(a => a.wo === cleaned)) {
                return setErrorMsg(`Lệnh [${cleaned}] đã được khai báo trước đó!`);
            }

            const linkRes = await workstationAPI.linkAssyPacking(cleaned, woData.WO);
            if (linkRes.success) {
                setMasterData(prev => ({ ...prev, linkedAliases: [{ wo: cleaned, pn: actualPN }, ...prev.linkedAliases] }));
                setAliasInput('');
            } else {
                setErrorMsg(linkRes.message || "Lỗi khi liên kết Lệnh!");
            }
        } catch (error) {
            setErrorMsg("Lỗi kết nối máy chủ khi kiểm tra Lệnh phụ!");
        }
    };

    const handleScanMaterial = async (code) => {
        const cleaned = code.trim();
        if(!cleaned) return;
        setErrorMsg('');

        const matchedMain = (actualRules.mainInputs || []).find(r => r.fixedString && cleaned.toUpperCase().includes(r.fixedString.toUpperCase()));
        if (matchedMain) {
            try {
                const res = await workstationAPI.logInputMain(woData.WO, cleaned);
                if (res.success) {
                    const newItem = { code: cleaned, pn: matchedMain.partNumber, qty: res.data?.Added_QTY || 1, time: new Date().toLocaleTimeString() };
                    setMasterData(prev => ({ ...prev, mainInputs: [newItem, ...prev.mainInputs] }));
                    setMatInput('');
                } else setErrorMsg(res.message);
            } catch (e) { setErrorMsg("Lỗi hệ thống khi ghi nhận Vật tư chính."); }
            return;
        }

        const matchedRaw = (actualRules.rawMaterials || []).find(r => r.fixedString && cleaned.toUpperCase().includes(r.fixedString.toUpperCase()));
        if (matchedRaw) {
            setQtyModal({ isOpen: true, scannedCode: cleaned, matchedRule: matchedRaw });
            setMatInput('');
            return;
        }

        setErrorMsg("Mã vật tư không hợp lệ!");
        console.log(actualRules.mainInputs)
        console.log(actualRules.rawMaterials)
        setMatInput('');
    };

    const handleSubmitRawQty = async () => {
        const qty = parseFloat(inputQty);
        if (isNaN(qty) || qty <= 0) return alert("Vui lòng nhập định mức hợp lệ!");
        try {
            const res = await workstationAPI.logRawMaterial(woData.WO, qtyModal.scannedCode, qty, qtyModal.matchedRule.partNumber);
            if (res.success) {
                const newItem = { code: qtyModal.scannedCode, pn: qtyModal.matchedRule.partNumber, qty: qty, time: new Date().toLocaleTimeString() };
                setMasterData(prev => ({ ...prev, rawMaterials: [newItem, ...prev.rawMaterials] }));
                setQtyModal({ isOpen: false, scannedCode: '', matchedRule: null });
                setInputQty('');
            } else alert(res.message);
        } catch (error) { alert("Lỗi khi ghi nhận tiêu hao phụ liệu!"); }
    };

    // ========================================================
    // 5. ĐÓNG GÓI & TỰ ĐỘNG CHỐT THÙNG (AUTO-FINISH)
    // ========================================================

    const handleScanBox = async (code) => {
        const cleanedCode = code.trim();
        if(!cleanedCode) return;
        setErrorMsg('');
        
        // ===============================================
        // [MỚI]: KIỂM TRA ĐỊNH DẠNG HOẶC ĐỘ DÀI (WILDCARD)
        // ===============================================
        if (boxRule?.isWildcard) {
            console.log(boxRule?.isWildcard)
            // NẾU LÀ WILDCARD: Bỏ qua fixedString, chỉ kiểm tra độ dài
            const reqLen = parseInt(boxRule.wildcardLength);
            // Nếu người dùng có thiết lập độ dài bắt buộc (> 0) thì check
            if (reqLen > 0 && cleanedCode.length !== reqLen) {
                return setErrorMsg(`Mã Bao bì sai độ dài! Yêu cầu: ${reqLen} ký tự. Bạn vừa quét ${cleanedCode.length} ký tự.`);
            }
        } else {
            // NẾU LÀ FIXED STRING NHƯ CŨ
            if (boxRule?.fixedString && !cleanedCode.toUpperCase().includes(boxRule.fixedString.toUpperCase())) {
                return setErrorMsg(`Mã Bao bì sai định dạng cố định!`);
            }
        }

        // Các Validation chống lỗi trùng lặp/kẹt hàng vẫn giữ nguyên
        if (masterData.boxes.some(b => b.id === cleanedCode)) return setErrorMsg("Mã Bao bì này đã được sử dụng!");
        if (activeBox) return setErrorMsg("Vui lòng hoàn tất Thùng hiện tại trước khi tạo mới!");
        if (currentTotalPacked >= maxAllowedQty) return setErrorMsg(`Thiếu vật tư! Vui lòng Nạp thêm vật tư trước khi đóng gói.`);
        
        const newBox = { id: cleanedCode, maxQty: MAX_QTY_PER_BOX, items: [], isFinished: false };
        setMasterData(prev => ({ ...prev, boxes: [newBox, ...prev.boxes] }));
        setBoxInput('');
    };

    const handleScanItem = async (code) => {
        const cleanedCode = code.trim();
        if(!cleanedCode || !activeBox) return;
        setErrorMsg('');
        
        if (outputMainRule?.fixedString && !cleanedCode.toUpperCase().includes(outputMainRule.fixedString.toUpperCase())){
            console.log(outputMainRule)
            return setErrorMsg(`Mã Thành phẩm sai định dạng!`)
        };
        if (activeBox.items.length >= activeBox.maxQty) return setErrorMsg("Thùng đã đạt định mức tối đa!");
        if (currentTotalPacked + 1 > maxAllowedQty) return setErrorMsg(`Vật tư chỉ đủ xuất ${maxAllowedQty} SP. Vui lòng Nạp thêm vật tư!`);
        
        const newItem = { code: cleanedCode, time: new Date().toLocaleTimeString() };
        const newItemsArray = [newItem, ...activeBox.items]; 
        
        setMasterData(prev => ({
            ...prev,
            boxes: prev.boxes.map(b => b.id === activeBox.id ? { ...b, items: newItemsArray } : b)
        }));
        setItemInput('');

        // TỰ ĐỘNG CHỐT KHI ĐẦY THÙNG
        if (newItemsArray.length >= activeBox.maxQty) {
            proceedFinishBoxWithData(activeBox.id, newItemsArray, false, ""); 
        }
    };

    const handleDeleteBox = (boxId) => {
        if (window.confirm(`Xác nhận HỦY BỎ Thùng #${boxId}? Toàn bộ lịch sử quét mã bên trong sẽ bị xóa!`)) {
            setMasterData(prev => ({ ...prev, boxes: prev.boxes.filter(b => b.id !== boxId) }));
        }
    };

    const handleRemoveItem = (boxId, itemIndex) => {
        setMasterData(prev => ({
            ...prev,
            boxes: prev.boxes.map(b => {
                if (b.id === boxId) {
                    const newItems = [...b.items];
                    newItems.splice(itemIndex, 1);
                    return { ...b, items: newItems };
                }
                return b;
            })
        }));
    };

    const handleManualFinish = () => {
        if (!activeBox) return;
        proceedFinishBoxWithData(activeBox.id, activeBox.items, false, "");
    };

    const handleSubmitSkipBox = async () => {
        if (!skipModal.reason.trim()) return alert("Yêu cầu nhập lý do xuất ngoại lệ (Đóng non)!");
        if (!activeBox) return;

        if (currentTotalPacked > maxAllowedQty) {
            setQtyWarningModal({ isOpen: true, boxId: activeBox.id, message: `Lỗi: Sản lượng quét vượt mức Vật tư nạp vào (${maxAllowedQty} SP).`, isSkip: true });
            return;
        }
        
        proceedFinishBoxWithData(activeBox.id, activeBox.items, true, skipModal.reason);
    };

    const proceedFinishBoxWithData = async (boxId, itemsArray, isSkipped, skipReason) => {
        try {
            const payload = {
                WO: woData.WO, BoxId: boxId, PN: fallbackPN,
                BoxQty: itemsArray.length, Items: itemsArray.map(item => item.code), 
                IsSkipped: isSkipped, SkipReason: skipReason
            };
            const result = await workstationAPI.logPacking(payload);
            
            if (result.success) {
                setMasterData(prev => ({
                    ...prev,
                    boxes: prev.boxes.map(b => b.id === boxId ? { ...b, isFinished: true, skipReason: skipReason } : b)
                }));
                setSkipModal({ isOpen: false, boxId: '', reason: '' });
                setQtyWarningModal({ isOpen: false, boxId: null, message: '', isSkip: false });
            } else {
                alert(result.message || "Lỗi ghi nhận lên Hệ thống!");
            }
        } catch (error) {
            alert("Lỗi mạng: Không thể xác nhận Đóng gói!");
        }
    };

    // ========================================================
    // 6. CHỐT LỆNH MASTER
    // ========================================================
    const verifyAndMarkDone = async (scannedWo) => {
        const safeScanned = String(scannedWo || "").trim();
        const safeTarget = String(woData?.WO || "").trim();

        if (safeScanned !== safeTarget) return setDoneModal(prev => ({...prev, error: `Mã Lệnh không khớp! Yêu cầu: ${safeTarget}`}));

        try {
            const result = await workstationAPI.markDone({ WO: parseInt(safeTarget), Status: 2 });
            if (result && result.success) {
                alert("Đã xác nhận Hoàn tất Lệnh Sản Xuất!");
                setDoneModal({ isOpen: false, scannedWo: '', error: '' });
                clearCurrentWorkstation();
            } else setDoneModal(prev => ({...prev, error: result?.message}));
        } catch (error) { setDoneModal(prev => ({...prev, error: "Lỗi giao tiếp với máy chủ MES!"})); }
    };

    if (isLoading) return <div className="p-10 text-center text-white font-bold animate-pulse">Đang đồng bộ dữ liệu Hệ thống...</div>;

    return (
        <div className="w-full mx-auto bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl flex flex-col min-h-[700px] h-full relative overflow-hidden">
            {/* Scanners */}
            {showMatScanner && <BarcodeScanner onScanSuccess={(text) => { setShowMatScanner(false); handleScanMaterial(text); }} onClose={() => setShowMatScanner(false)} />}
            {showBoxScanner && <BarcodeScanner onScanSuccess={(text) => { setShowBoxScanner(false); handleScanBox(text); }} onClose={() => setShowBoxScanner(false)} />}
            {showItemScanner && <BarcodeScanner onScanSuccess={(text) => { setShowItemScanner(false); handleScanItem(text); }} onClose={() => setShowItemScanner(false)} />}
            {showDoneScanner && <BarcodeScanner onScanSuccess={(text) => { setShowDoneScanner(false); verifyAndMarkDone(text); }} onClose={() => setShowDoneScanner(false)} />}

            {/* HEADER TÍCH HỢP NÚT ALIAS LUÔN THƯỜNG TRỰC */}
            <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <MonitorDot className="text-blue-400" size={32} />
                    <div>
                        <h1 className="text-slate-200 font-bold text-xl uppercase flex flex-wrap items-center gap-4">
                            Kiểm soát Lắp ráp & Đóng gói
                            
                            {/* NÚT ALIAS THƯỜNG TRỰC */}
                            {requiredAliasPNs.length > 0 && (
                                <ActionButton 
                                    onClick={() => setIsAliasModalOpen(true)} 
                                    label={isChecklistComplete ? "Quản lý Lệnh Phụ" : "Khai báo Lệnh Phụ"} 
                                    color={isChecklistComplete ? "slate" : "orange"} 
                                    icon={<ListChecks size={18}/>} 
                                    className={`text-sm px-4 py-1.5 ${!isChecklistComplete ? 'animate-pulse shadow-[0_0_15px_rgba(249,115,22,0.4)]' : ''}`} 
                                />
                            )}

                            {isChecklistComplete && (
                                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded text-sm tracking-widest shadow-inner">
                                    GIỚI HẠN XUẤT: <b className="text-white ml-1">{maxAllowedQty === 99999 ? "MAX" : maxAllowedQty}</b>
                                </span>
                            )}
                        </h1>
                        <p className="text-slate-400 text-sm font-mono mt-1">WO Master: <span className="text-blue-400 font-bold">{woData.WO}</span> | Model: {woData.ModelNO}</p>
                    </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <ActionButton onClick={() => setDoneModal({ isOpen: true, error: '', scannedWo: '' })} label="KẾT THÚC LỆNH" color="emerald" icon={<CheckCircle size={20}/>} className="flex-1 justify-center" />
                    <ActionButton onClick={clearCurrentWorkstation} label="Đóng Trạm" color="red" icon={<XCircle size={20}/>} className="flex-1 justify-center" />
                </div>
            </div>

            {/* MÀN HÌNH KHÓA NẾU CHƯA KHAI BÁO ALIAS */}
            {!isChecklistComplete ? (
                <div className="p-8 flex-1 flex flex-col items-center justify-center bg-slate-900/80 animate-fade-in">
                    <Lock size={80} className="text-orange-500 mb-6 drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]" />
                    <h2 className="text-3xl font-black text-white mb-2 uppercase">Trạm Đang Khóa</h2>
                    <p className="text-slate-400 mb-8 text-center max-w-lg text-lg">Hệ thống yêu cầu khai báo xác nhận Lệnh Lắp ráp (Sub-Assy WO) cho các mã linh kiện bắt buộc trước khi tiến hành sản xuất.</p>
                    
                    <ActionButton 
                        onClick={() => setIsAliasModalOpen(true)} 
                        label="MỞ BẢNG KHAI BÁO LỆNH (ALIAS)" 
                        color="orange" 
                        icon={<ListChecks size={24}/>} 
                        className="py-4 px-10 text-xl font-black shadow-xl hover:scale-105" 
                    />
                </div>
            ) : (
                /* KHU VỰC LÀM VIỆC CHÍNH */
                <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
                    <div className="flex border-b border-slate-700 bg-slate-900/50 shrink-0">
                        <button onClick={() => { setActiveTab('inputs'); setErrorMsg(''); }} className={`flex-1 py-4 font-black uppercase tracking-wider transition-colors ${activeTab === 'inputs' ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-900/10' : 'text-slate-500 hover:text-slate-300'}`}>
                            1. Quét Nạp Vật Tư (Input)
                        </button>
                        <button onClick={() => { setActiveTab('packing'); setErrorMsg(''); }} className={`flex-1 py-4 font-black uppercase tracking-wider transition-colors ${activeTab === 'packing' ? 'text-orange-400 border-b-2 border-orange-500 bg-orange-900/10' : 'text-slate-500 hover:text-slate-300'}`}>
                            2. Quét Đóng Gói (Output)
                        </button>
                    </div>

                    {errorMsg && (
                        <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/50 text-red-400 font-bold rounded-lg flex items-center gap-2 animate-pulse shrink-0">
                            <AlertTriangle size={18}/> {errorMsg}
                        </div>
                    )}

                    <div className="flex-1 overflow-auto custom-scrollbar p-6">
                        {/* ======================= TAB 1: INPUTS ======================= */}
                        {activeTab === 'inputs' && (
                            <div className="space-y-6">
                                <div className="flex gap-3">
                                    <input type="text" ref={inputRef} value={matInput} onChange={e => setMatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleScanMaterial(matInput)} placeholder="Quét mã linh kiện, bán thành phẩm..." className="flex-1 bg-slate-900 border border-slate-600 text-white px-5 py-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-lg" />
                                    <ActionButton onClick={() => setShowMatScanner(true)} label="CAMERA" color="slate" icon={<Camera size={20}/>} className="px-6" />
                                    <ActionButton onClick={() => handleScanMaterial(matInput)} label="NẠP VẬT TƯ" color="blue" className="px-8" />
                                </div>
                                <div className="flex gap-2">
                                     <ActionButton onClick={() => setIsNgModalOpen(true)} label={t('production.ngReport')} color="red" icon={<AlertTriangle size={18}/>} className="py-2 px-6" />
                                </div>
                                
                                <div className="space-y-3">
                                    <h3 className="text-slate-400 font-bold uppercase text-sm border-b border-slate-700 pb-2">Lịch sử tiêu hao vật tư ({masterData.mainInputs.length + masterData.rawMaterials.length}):</h3>
                                    {[...masterData.mainInputs, ...masterData.rawMaterials].map((item, i) => (
                                        <div key={i} className="bg-slate-800/50 border border-slate-700 p-3 rounded-lg flex justify-between items-center hover:bg-slate-700 transition-colors">
                                            <div>
                                                <p className="text-emerald-300 font-mono font-bold">{item.code}</p>
                                                <p className="text-slate-500 text-xs mt-1">PN: {item.pn} | Kích hoạt: {item.time}</p>
                                            </div>
                                            <span className="bg-slate-900 text-emerald-400 px-3 py-1 rounded font-bold border border-emerald-500/30">+{item.qty}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ======================= TAB 2: PACKING ======================= */}
                        {activeTab === 'packing' && (
                            <div className="space-y-6">
                                {!activeBox ? (
                                    <div className="flex gap-3 bg-orange-900/10 p-6 rounded-xl border border-orange-500/20">
                                        <input ref={boxInputRef} type="text" value={boxInput} onChange={e => setBoxInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleScanBox(boxInput)} placeholder="Quét mã Bao Bì (Thùng rỗng) để bắt đầu..." className="flex-1 bg-slate-900 border border-orange-500/50 text-white px-5 py-4 rounded-xl focus:ring-2 outline-none font-mono text-lg" />
                                        <ActionButton onClick={() => setShowBoxScanner(true)} label="CAMERA" color="slate" icon={<Camera size={20}/>} className="px-6" />
                                        <ActionButton onClick={() => handleScanBox(boxInput)} label="TẠO THÙNG" color="orange" className="px-8" />
                                    </div>
                                ) : (
                                    <div className="bg-slate-800/80 border-b border-slate-700 shadow-xl p-6 rounded-xl animate-fade-in-up">
                                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                                            <input ref={itemInputRef} type="text" value={itemInput} onChange={(e) => setItemInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleScanItem(itemInput)} disabled={activeBox.items.length >= activeBox.maxQty} placeholder={activeBox.items.length >= activeBox.maxQty ? "Hệ thống đang chốt..." : "Quét tem Thành Phẩm..."} className={`flex-1 w-full bg-slate-900 border border-slate-600 text-white px-4 py-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-lg disabled:opacity-50`} />
                                            <div className="flex gap-2 w-full sm:w-auto">
                                                {itemInput.trim().length === 0 ? (
                                                    <ActionButton onClick={() => setShowItemScanner(true)} disabled={activeBox.items.length >= activeBox.maxQty} label="CAMERA" color="blue" icon={<Camera size={20}/>} className="py-4 px-6 disabled:opacity-50 flex-1 sm:flex-none" />
                                                ) : (
                                                    <ActionButton onClick={() => handleScanItem(itemInput)} disabled={activeBox.items.length >= activeBox.maxQty} label="QUÉT" color="blue" icon={<ScanLine size={20}/>} className="py-4 px-8 disabled:opacity-50 flex-1 sm:flex-none" />
                                                )}
                                                <ActionButton onClick={() => setSkipModal({...skipModal, isOpen: true, boxId: activeBox.id})} label="XUẤT NGOẠI LỆ" color="slate" icon={<PackagePlus size={20}/>} className="py-4 px-6 flex-1 sm:flex-none" title="Chốt hộp dù chưa đủ định mức" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* DANH SÁCH THÙNG */}
                                <div className="space-y-4 pt-4">
                                    {masterData.boxes.map((box) => {
                                        const isCurrentActive = !box.isFinished && box.id === activeBox?.id;
                                        const isFull = box.items.length >= box.maxQty;
                                        return (
                                            <BoxContentExpandable key={box.id} title={box.isFinished ? `Box #${box.id} (Đã xuất)` : `Box #${box.id} (Đang đóng)`} variant={isCurrentActive ? "orange" : "slate"} BoxTotal={box.maxQty} BoxQty={box.items.length} defaultOpen={isCurrentActive}>
                                                <div className="p-2">
                                                    {isCurrentActive && (
                                                        <div className="mb-4 flex flex-col gap-3">
                                                            {/* Nếu thùng đầy nhưng kẹt mạng không chốt được, hiện nút ấn thủ công */}
                                                            {isFull && (
                                                                <div className="bg-amber-500/10 border border-amber-500/50 p-4 rounded-xl flex justify-between items-center animate-fade-in-up">
                                                                    <span className="text-amber-400 font-bold flex items-center gap-2"><AlertTriangle/> Đồng bộ dữ liệu thất bại!</span>
                                                                    <ActionButton onClick={handleManualFinish} label="GỬI LẠI YÊU CẦU CHỐT" color="orange" icon={<CheckCircle size={20}/>} className="py-2" />
                                                                </div>
                                                            )}
                                                            <div className="flex justify-end">
                                                                <button onClick={() => handleDeleteBox(box.id)} className="flex items-center gap-2 px-4 py-2 bg-red-900/40 hover:bg-red-600/60 text-red-300 font-semibold border border-red-700/50 rounded-lg text-sm transition-all shadow-md">
                                                                    <Trash2 size={18} /> HỦY DỮ LIỆU THÙNG NÀY
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="space-y-3 font-mono text-sm sm:text-base max-h-60 overflow-y-auto pr-2">
                                                        {box.items.length === 0 ? <p className="text-slate-500 italic text-center py-4">Bao bì trống.</p> : box.items.map((item, idx) => (
                                                            <div key={idx} className="flex justify-between items-center border-b border-slate-600/50 pb-2 hover:bg-slate-700/20 px-2 pt-2 rounded group">
                                                                <span className={isCurrentActive ? "text-orange-300" : "text-slate-300"}>{item.code}</span>
                                                                <div className="flex items-center gap-4">
                                                                    <span className="text-slate-400 text-xs">{item.time}</span>
                                                                    {isCurrentActive && <button onClick={() => handleRemoveItem(box.id, idx)} className="text-slate-500 hover:text-red-400"><Trash2 size={18} /></button>}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {box.isFinished && box.skipReason && (
                                                        <div className="mt-4 pt-3 border-t border-slate-700 text-amber-400/80 text-sm italic flex items-center gap-2"><AlertTriangle size={16}/> Ghi chú xuất ngoại lệ: {box.skipReason}</div>
                                                    )}
                                                </div>
                                            </BoxContentExpandable>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODALS */}
            {/* ======================================================== */}
            
            {/* 1. Modal Nhập QTY */}
            {qtyModal.isOpen && (
                <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-800 w-full max-w-md rounded-2xl border border-emerald-500/50 shadow-2xl p-6">
                        <h2 className="text-xl font-bold text-emerald-400 mb-4 border-b border-slate-700 pb-3 flex items-center justify-between">
                            Khai báo số lượng tiêu hao <button onClick={() => setQtyModal({...qtyModal, isOpen: false})}><X className="text-slate-400 hover:text-white"/></button>
                        </h2>
                        <div className="mb-4 bg-slate-900 p-3 rounded text-sm text-emerald-300 font-mono break-all">{qtyModal.scannedCode}</div>
                        <input type="number" value={inputQty} onChange={e => setInputQty(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmitRawQty()} autoFocus className="w-full bg-slate-900 border border-emerald-500/50 text-white px-4 py-4 rounded-xl focus:ring-2 outline-none text-2xl text-center mb-4" />
                        <button onClick={handleSubmitRawQty} className="w-full bg-emerald-600 py-4 rounded-xl font-bold text-white shadow-lg">XÁC NHẬN TIÊU HAO</button>
                    </div>
                </div>
            )}

            {/* 2. Modal Đóng hộp non (Skip Box) */}
            {skipModal.isOpen && (
                <div className="absolute inset-0 z-[60] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-800 w-full max-w-md rounded-2xl border border-slate-600 shadow-2xl p-6 text-center animate-fade-in-up">
                        <PackagePlus className="text-slate-400 mx-auto mb-3" size={48} />
                        <h2 className="text-xl font-bold text-white mb-2">Xuất Ngoại Lệ (Đóng hộp non)</h2>
                        <p className="text-slate-400 mb-6 text-sm">Bạn đang yêu cầu chốt hộp <b>#{skipModal.boxId}</b> dù chưa đạt định mức đóng gói tiêu chuẩn.</p>
                        
                        <div className="mb-6 text-left">
                            <label className="block text-slate-300 font-bold mb-2">Ghi chú / Lý do:</label>
                            <input autoFocus type="text" value={skipModal.reason} onChange={(e) => setSkipModal({...skipModal, reason: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && handleSubmitSkipBox()} className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono" placeholder="VD: Hết ca, Hàng mẫu, Lô cuối..." />
                        </div>
                        
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setSkipModal({isOpen: false, boxId: '', reason: ''})} className="flex-1 bg-slate-700 text-white py-3 rounded-lg font-bold">HỦY BỎ</button>
                            <button onClick={handleSubmitSkipBox} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg shadow-lg">XÁC NHẬN XUẤT</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. Cảnh báo quá giới hạn */}
            {qtyWarningModal.isOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-slate-800 border-2 border-orange-500 rounded-3xl w-full max-w-lg shadow-[0_0_50px_rgba(249,115,22,0.3)] overflow-hidden">
                        <div className="bg-orange-600 p-6 flex items-center gap-3 text-white">
                            <AlertTriangle size={28} />
                            <h3 className="text-xl font-black uppercase tracking-wider">Cảnh báo Vượt Định Mức</h3>
                        </div>
                        <div className="p-8">
                            <p className="text-slate-300 text-lg mb-6">{qtyWarningModal.message}</p>
                            <div className="flex gap-4">
                                <button onClick={() => setQtyWarningModal({ isOpen: false, boxId: null, message: '', isSkip: false })} className="flex-1 bg-slate-700 text-white font-bold py-4 rounded-xl">BỔ SUNG VẬT TƯ</button>
                                <button onClick={() => proceedFinishBoxWithData(qtyWarningModal.boxId, activeBox.items, qtyWarningModal.isSkip, skipModal.reason)} className="flex-1 bg-orange-600 text-white font-black py-4 rounded-xl shadow-lg">XÁC NHẬN VẪN XUẤT</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <DefectReportModal isOpen={isNgModalOpen} onClose={() => setIsNgModalOpen(false)} wo={woData.WO} modelNo={woData.ModelNO} />
            
            {/* 4. Modal Khai báo Alias Bảng Thông Minh */}
            {isAliasModalOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-800 w-full max-w-3xl rounded-2xl border border-blue-500/50 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-fade-in-up">
                        <div className="bg-slate-900 p-6 border-b border-slate-700 flex justify-between items-center">
                            <h2 className="text-xl font-black text-white flex items-center gap-3">
                                <ListChecks className="text-blue-500"/> Quản lý Lệnh Phụ (Sub-Assy)
                            </h2>
                            <button onClick={() => setIsAliasModalOpen(false)} className="text-slate-400 hover:text-white"><X size={24}/></button>
                        </div>
                        
                        <div className="p-0 overflow-y-auto">
                            <table className="w-full text-left text-sm text-slate-400">
                                <thead className="bg-slate-950 text-slate-300 uppercase text-xs sticky top-0 shadow-md">
                                    <tr>
                                        <th className="p-4">Mã Linh Kiện (PN)</th>
                                        <th className="p-4">Danh sách Lệnh đã Khai báo</th>
                                        <th className="p-4 w-32 text-center">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {requiredAliasRules.map(([pn, rule]) => {
                                        const linkedWOs = masterData.linkedAliases.filter(a => a.pn === pn);
                                        const isDone = linkedWOs.length > 0;
                                        return (
                                            <tr key={pn} className={`bg-slate-800 hover:bg-slate-700 ${isDone ? 'opacity-75' : ''}`}>
                                                <td className="p-4 font-mono font-bold text-blue-300">{pn}</td>
                                                <td className="p-4 font-mono text-slate-300">
                                                    {isDone ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {linkedWOs.map((link, idx) => (
                                                                <span key={idx} className="bg-slate-900 border border-slate-600 px-2 py-1 rounded text-xs">{link.wo}</span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-500 italic">Chưa phát sinh dữ liệu</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-center">
                                                    {isDone ? (
                                                        <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20"><CheckCircle size={14}/> Đã duyệt</span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-amber-500 font-bold bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20"><Lock size={14}/> Cần khai báo</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-6 bg-slate-900 border-t border-slate-700">
                            <input 
                                autoFocus
                                type="text" 
                                value={aliasInput} 
                                onChange={e => setAliasInput(e.target.value)} 
                                onKeyDown={e => e.key === 'Enter' && handleScanAlias(aliasInput)}
                                placeholder="Quét mã Lệnh Lắp Ráp (Assy WO) vào đây..." 
                                className="w-full bg-slate-950 border border-slate-600 text-white px-5 py-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-lg" 
                            />
                        </div>

                        <div className="p-6 bg-slate-900 flex gap-3">
                            <button onClick={() => setIsAliasModalOpen(false)} className="flex-1 bg-slate-700 py-4 rounded-xl font-bold text-white hover:bg-slate-600">ĐÓNG BẢNG</button>
                            <button onClick={() => handleScanAlias(aliasInput)} className="flex-[2] bg-blue-600 py-4 rounded-xl font-bold text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500">XÁC NHẬN LIÊN KẾT LỆNH</button>
                        </div>
                        {errorMsg && <div className="p-3 bg-red-900/30 text-red-400 text-center font-bold border-t border-red-800">{errorMsg}</div>}
                    </div>
                </div>
            )}
            {wctrModalOpen && (
                <WctrSelectionModal 
                    isOpen={wctrModalOpen}
                    woData={woData}
                    isLoadingSubmit={isSubmittingWctr}
                    onClose={() => { setWctrModalOpen(false); clearCurrentWorkstation(); }}
                    onConfirm={handleSetWctr}
                />
            )}
        </div>
    );
};

export default FrameAssyPackingMaster;