import React, { useState, useRef, useEffect } from "react";
import BarcodeScanner from '../common/BarcodeScanner';
import { ScanLine, XCircle, AlertTriangle, PackagePlus, MonitorDot, Box, Camera, CheckCircle, Trash2 } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { ActionButton } from "../common/ActionButton";
import { BoxContentExpandable } from "../common/BoxContentExpandable";
import useProductionStore from '../../store/productionStore';
import { workstationAPI } from '../../api/workstationApi';
import { MESSAGE_TYPE, WO_STATUS } from '../common/Constants';

const FramePackingProc = () => {
    const { t } = useTranslation();
    const itemInputRef = useRef(null);
    const boxInputRef = useRef(null);

    const currentWorkstation = useProductionStore(state => state.currentWorkstation);
    const clearCurrentWorkstation = useProductionStore(state => state.clearCurrentWorkstation);
    const liveWOData = useProductionStore(state => state.activeJobs.find(job => job.WO === state.currentWorkstation?.WO));
    if (!currentWorkstation) return null;
    
    const woData = currentWorkstation;
    const boxRule = woData.rules?.boxRule;
    const outputMain = woData.rules?.outputMain;
    const availablePNs = [];
    if (outputMain?.partNumber) availablePNs.push(outputMain.partNumber);
    if (boxRule?.partNumber) availablePNs.push(boxRule.partNumber);
    
    const MAX_QTY_PER_BOX = parseInt(boxRule?.boxQTY) || 10;

    const [boxInput, setBoxInput] = useState('');
    const [itemInput, setItemInput] = useState('');
    const [boxError, setBoxError] = useState('');
    const [itemError, setItemError] = useState('');
    const [boxes, setBoxes] = useState([]);
    const activeBox = boxes.find(b => !b.isFinished);
    
    const [showBoxScanner, setShowBoxScanner] = useState(false);
    const [showItemScanner, setShowItemScanner] = useState(false);
    
    const [ngModal, setNgModal] = useState({ isOpen: false, pn: availablePNs[0] || '', desc: '', qty: '' });
    const [skipModal, setSkipModal] = useState({ isOpen: false, boxId: '', reason: '' });
    const [doneModal, setDoneModal] = useState({ isOpen: false, scannedWo: '', error: '' });
    const [showDoneScanner, setShowDoneScanner] = useState(false);

    // FETCH LỊCH SỬ ĐÓNG GÓI TỪ DB 
    useEffect(() => {
        const fetchHistory = async () => {
            if (!woData?.WO) return;
            try {
                const result = await workstationAPI.getLoggedBoxes(woData.WO);
                if (result.success && result.data) {
                    setBoxes(result.data); // result.data đã được map đúng format ở backend
                }
            } catch (error) {
                console.error("Lỗi khi tải lịch sử đóng gói:", error);
            }
        };
        fetchHistory();
    }, [woData.WO]);

    useEffect(() => {
        if (!ngModal.isOpen && !skipModal.isOpen && !doneModal.isOpen && !showBoxScanner && !showItemScanner && !showDoneScanner) {
            if (activeBox && activeBox.items.length < activeBox.maxQty && itemInputRef.current) {
                itemInputRef.current.focus();
            } else if (!activeBox && boxInputRef.current) {
                boxInputRef.current.focus();
            }
        }
    }, [ngModal.isOpen, skipModal.isOpen, doneModal.isOpen, showBoxScanner, showItemScanner, showDoneScanner, boxes, activeBox]);

    const handleScanBox = async (code) => {
        const cleanedCode = code.trim();
        if(!cleanedCode) return;
        setBoxError('');
        
        if (boxRule?.fixedString && !cleanedCode.includes(boxRule.fixedString)) {
            setBoxError(`Mã thùng không hợp lệ! Chuỗi không chứa '${boxRule.fixedString}'.`);
            setBoxInput('');
            return;
        }
        if (boxes.some(b => b.id === cleanedCode)) {
            setBoxError("Mã thùng này đã được quét/sử dụng!");
            setBoxInput('');
            return;
        }
        if (activeBox) {
            setBoxError("Vui lòng chốt hoặc skip thùng hiện tại trước khi tạo thùng mới!");
            setBoxInput('');
            return;
        }
        
        const newBox = { id: cleanedCode, maxQty: MAX_QTY_PER_BOX, items: [], isFinished: false, createdAt: new Date().toLocaleTimeString() };
        setBoxes([newBox, ...boxes]);
        setBoxInput('');
    };

    const handleScanItem = async (code) => {
        const cleanedCode = code.trim();
        if(!cleanedCode || !activeBox) return;
        setItemError('');
        
        if (outputMain?.fixedString && !cleanedCode.includes(outputMain.fixedString)) {
            setItemError(`Mã sản phẩm không hợp lệ! Chuỗi không chứa '${outputMain.fixedString}'.`);
            setItemInput('');
            return;
        }
        if (activeBox.items.length >= activeBox.maxQty) {
            setItemError("Thùng đã đầy! Vui lòng ấn XÁC NHẬN CHỐT THÙNG NÀY.");
            setItemInput('');
            return;
        }
        
        const newItem = { code: cleanedCode, time: new Date().toLocaleTimeString() };
        const updatedBoxes = boxes.map(b => b.id === activeBox.id ? { ...b, items: [newItem, ...b.items] } : b );
        setBoxes(updatedBoxes);
        setItemInput('');
    };

    const handleRemoveItem = (boxId, itemIndex) => {
        const updatedBoxes = boxes.map(b => {
            if (b.id === boxId) {
                const newItems = [...b.items];
                newItems.splice(itemIndex, 1);
                return { ...b, items: newItems };
            }
            return b;
        });
        setBoxes(updatedBoxes);
    };

    const handleDeleteBox = (boxId) => {
        const confirmDelete = window.confirm(`CẢNH BÁO: Bạn có chắc chắn muốn XÓA BỎ hoàn toàn thùng #${boxId} này không?\n\nToàn bộ sản phẩm đã quét bên trong sẽ bị hủy để bạn quét lại thùng mới!`);
        if (confirmDelete) {
            const updatedBoxes = boxes.filter(b => b.id !== boxId);
            setBoxes(updatedBoxes);
            setBoxError('');
            setItemError('');
        }
    };

    const handleFinishBox = async (boxId) => {
        const boxToFinish = boxes.find(b => b.id === boxId);
        if (!boxToFinish) return;
        try {
            const payload = {
                WO: woData.WO, BoxId: boxToFinish.id, PN: outputMain?.partNumber || availablePNs[0],
                BoxQty: boxToFinish.items.length, Items: boxToFinish.items.map(item => item.code), IsSkipped: false, SkipReason: ""
            };
            const result = await workstationAPI.logPacking(payload);
            if (result.success) {
                const updatedBoxes = boxes.map(b => b.id === boxId ? { ...b, isFinished: true } : b);
                setBoxes(updatedBoxes);
            } else {
                alert(result.message || "Lỗi khi chốt thùng!");
            }
        } catch (error) {
            alert("Lỗi kết nối máy chủ!");
        }
    };

    const handleSubmitSkipBox = async () => {
        if (!skipModal.reason.trim()) return alert("Vui lòng nhập lý do đóng hộp non!");
        const boxToFinish = boxes.find(b => b.id === skipModal.boxId);
        if (!boxToFinish) return;
        try {
            const payload = {
                WO: woData.WO, BoxId: boxToFinish.id, PN: outputMain?.partNumber || availablePNs[0],
                BoxQty: boxToFinish.items.length, Items: boxToFinish.items.map(item => item.code), IsSkipped: true, SkipReason: skipModal.reason
            };
            const result = await workstationAPI.logPacking(payload);
            if (result.success) {
                const updatedBoxes = boxes.map(b => b.id === skipModal.boxId ? { ...b, isFinished: true, skipReason: skipModal.reason } : b );
                setBoxes(updatedBoxes);
                setSkipModal({ isOpen: false, boxId: '', reason: '' });
            } else {
                alert(result.message || "Lỗi khi chốt hộp non!");
            }
        } catch (error) {
            alert("Lỗi kết nối máy chủ!");
        }
    };

    const handleSubmitNg = async () => {
        const ngQty = parseFloat(ngModal.qty);
        if (isNaN(ngQty) || ngQty <= 0) return alert("Vui lòng nhập số lượng lỗi hợp lệ!");
        if (!ngModal.desc.trim()) return alert("Vui lòng nhập mô tả lỗi!");
        try {
            const payload = { WO: woData.WO, PartNO: ngModal.pn, QTY: ngQty, Description: ngModal.desc, Type: MESSAGE_TYPE.DEFECT };
            const result = await workstationAPI.logDefect(payload);
            if (result.success) {
                alert("Đã gửi báo cáo NG thành công!");
                setNgModal({ isOpen: false, pn: availablePNs[0] || '', desc: '', qty: '' });
            } else {
                alert(result.message || "Lỗi khi báo cáo NG!");
            }
        } catch (error) {
            alert("Lỗi kết nối máy chủ!");
        }
    };

    const verifyAndMarkDone = async (woToVerify) => {
        if (String(woToVerify) !== String(woData.WO)) {
            setDoneModal({ ...doneModal, scannedWo: woToVerify, error: "Mã WO không khớp! Vui lòng quét đúng mã đang chạy." });
            return;
        }
        try {
            const payload = { WO: woData.WO, Status: WO_STATUS.COMPLETED };
            const result = await workstationAPI.markDone(payload);
            if (result.success) {
                alert("Đã chốt Lệnh Sản Xuất! Hệ thống đã ghi nhận.");
                clearCurrentWorkstation();
            } else {
                setDoneModal({ ...doneModal, error: result.message || "Lỗi khi chốt WO!" });
            }
        } catch (error) {
            alert("Lỗi kết nối máy chủ!");
        }
    };

    const handleDoneCameraScan = (decodedText) => { setShowDoneScanner(false); verifyAndMarkDone(decodedText); };

    return(
        <div className="w-full mx-auto bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden min-h-[700px] relative animate-fade-in">
            {showBoxScanner && <BarcodeScanner onScanSuccess={(text) => { setShowBoxScanner(false); handleScanBox(text); }} onClose={() => setShowBoxScanner(false)} />}
            {showDoneScanner && (<BarcodeScanner onScanSuccess={handleDoneCameraScan} onClose={() => setShowDoneScanner(false)} />)}
            {showItemScanner && <BarcodeScanner onScanSuccess={(text) => { setShowItemScanner(false); handleScanItem(text); }} onClose={() => setShowItemScanner(false)} />}
            
            <div className="w-full px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 bg-slate-800/40 border-b border-slate-700">
                <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                    <MonitorDot className="text-orange-400 shrink-0" size={32} />
                    <div>
                        <h1 className="text-slate-200 font-bold text-lg sm:text-xl tracking-wide uppercase">Packing Process</h1>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="bg-orange-500/20 text-orange-300 text-xs px-2 py-0.5 rounded border border-orange-500/30 whitespace-nowrap">WO: {woData.WO}</span>
                            <span className="text-slate-500 text-xs sm:text-sm font-mono truncate">Model: {woData.ModelNO}</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    <ActionButton onClick={() => setDoneModal({ ...doneModal, isOpen: true, error: '', scannedWo: '' })} label="CHỐT LỆNH" color="emerald" icon={<CheckCircle size={22}/>} className="hover:scale-105 shadow-lg flex-1 sm:flex-none justify-center" />
                    <ActionButton onClick={clearCurrentWorkstation} label="Đóng Trạm" color="red" icon={<XCircle size={22}/>} className="hover:scale-105 shadow-lg flex-1 sm:flex-none justify-center" />
                </div>
            </div>

            {!activeBox && (
                <div className="bg-slate-800 border-b border-slate-700 p-4 sm:p-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-6 animate-fade-in-up">
                    <div className="flex flex-col w-full xl:flex-1 xl:max-w-xl">
                        <div className="flex flex-row items-center gap-2 sm:gap-3 w-full">
                            <span className="text-slate-400 font-bold whitespace-nowrap hidden sm:block w-24">Quét Thùng:</span>
                            <input ref={boxInputRef} type="text" value={boxInput} onChange={(e) => setBoxInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleScanBox(boxInput)} placeholder="Quét mã Thùng..." className={`flex-1 w-0 bg-slate-900 border ${boxError ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-orange-500'} text-white px-3 sm:px-4 py-3 sm:py-4 rounded-xl focus:ring-2 outline-none font-mono text-base sm:text-lg shadow-inner`} />
                            {boxInput.trim().length === 0 ? (
                                <ActionButton onClick={() => setShowBoxScanner(true)} label="MỞ CAMERA" color="emerald" icon={<Camera size={20}/>} className="py-3 sm:py-4 px-4 sm:px-6 flex-shrink-0" />
                            ) : (
                                <ActionButton onClick={() => handleScanBox(boxInput)} label="NHẬP" color="emerald" icon={<Box size={20}/>} className="py-3 sm:py-4 px-4 sm:px-8 flex-shrink-0" />
                            )}
                        </div>
                        {boxError && <span className="text-red-400 text-sm mt-2 font-semibold ml-0 sm:ml-28 animate-pulse">{boxError}</span>}
                    </div>
                    <p className="text-orange-400 font-bold animate-pulse text-sm xl:text-base mt-2 xl:mt-0">* Vui lòng quét mã thùng rỗng để bắt đầu đóng gói!</p>
                </div>
            )}

            {activeBox && (
                <div className="bg-slate-800/80 border-b border-slate-700 shadow-xl p-4 sm:p-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 sm:gap-6 relative z-10 animate-fade-in-up">
                    <div className="flex flex-col w-full xl:flex-1 xl:max-w-xl">
                        <div className="flex flex-row items-center gap-2 sm:gap-3 w-full">
                            <span className="text-slate-400 font-bold whitespace-nowrap hidden sm:block w-24">Sản Phẩm:</span>
                            <input ref={itemInputRef} type="text" value={itemInput} onChange={(e) => setItemInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleScanItem(itemInput)} disabled={activeBox.items.length >= activeBox.maxQty} placeholder={activeBox.items.length >= activeBox.maxQty ? "Thùng đã đầy!" : "Quét tem Sản phẩm..."} className={`flex-1 w-0 bg-slate-900 border ${itemError ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-blue-500'} text-white px-3 sm:px-4 py-3 sm:py-4 rounded-xl focus:ring-2 outline-none font-mono text-base sm:text-lg disabled:opacity-50`} />
                            {itemInput.trim().length === 0 ? (
                                <ActionButton onClick={() => setShowItemScanner(true)} disabled={activeBox.items.length >= activeBox.maxQty} label="MỞ CAMERA" color="blue" icon={<Camera size={20}/>} className="py-3 sm:py-4 px-4 sm:px-6 flex-shrink-0 disabled:opacity-50" />
                            ) : (
                                <ActionButton onClick={() => handleScanItem(itemInput)} disabled={activeBox.items.length >= activeBox.maxQty} label="NHẬP" color="blue" icon={<ScanLine size={20}/>} className="py-3 sm:py-4 px-5 sm:px-8 flex-shrink-0 disabled:opacity-50" />
                            )}
                        </div>
                        {itemError && <span className="text-red-400 text-sm mt-2 font-semibold ml-0 sm:ml-28 animate-pulse">{itemError}</span>}
                    </div>
                    <div className="w-full h-px bg-slate-700 xl:hidden my-2"></div>
                    <div className="w-full flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 xl:w-auto self-start xl:self-center">
                        <ActionButton onClick={() => setNgModal({...ngModal, isOpen: true})} label="Báo Lỗi" color="red" icon={<AlertTriangle size={18}/>} className="flex-1 min-w-[120px] xl:flex-none py-3 sm:py-4" />
                        <ActionButton onClick={() => setSkipModal({...skipModal, isOpen: true, boxId: activeBox.id})} label="Skip Box" color="slate" icon={<PackagePlus size={18}/>} className="flex-1 min-w-[120px] xl:flex-none py-3 sm:py-4" />
                    </div>
                </div>
            )}

            <div className="p-4 sm:p-6 pb-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 bg-slate-900/30">
                {boxes.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-700 rounded-xl p-8 opacity-50">
                        <Box size={64} className="mb-4" />
                        <p className="text-xl font-bold">Chưa có dữ liệu đóng gói</p>
                    </div>
                ) : (
                    boxes.map((box, index) => {
                        const isCurrentActive = !box.isFinished && box.id === activeBox?.id;
                        const isFull = box.items.length >= box.maxQty;
                        return (
                            <BoxContentExpandable key={box.id} title={box.isFinished ? `Box #${box.id} (Đã chốt)` : `Box #${box.id} (Đang đóng)`} variant={isCurrentActive ? "orange" : "slate"} BoxTotal={box.maxQty} BoxQty={box.items.length} defaultOpen={isCurrentActive}>
                                <div className="p-2">
                                    {isCurrentActive && (
                                        <div className="mb-4 flex flex-col gap-3">
                                            {isFull && (
                                                <div className="bg-orange-500/10 border border-orange-500/50 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4 animate-fade-in-up shadow-lg">
                                                    <span className="text-orange-400 font-bold text-lg flex items-center gap-2"><CheckCircle/> Thùng đã đầy ({box.maxQty}/{box.maxQty})</span>
                                                    <ActionButton onClick={() => handleFinishBox(box.id)} label="XÁC NHẬN CHỐT THÙNG NÀY" color="orange" icon={<Box size={20}/>} className="w-full sm:w-auto py-3 px-6 text-lg animate-bounce" />
                                                </div>
                                            )}
                                            <div className="flex justify-end">
                                                <button onClick={() => handleDeleteBox(box.id)} className="flex items-center gap-2 px-4 py-2 bg-red-900/40 hover:bg-red-600/60 text-red-300 font-semibold border border-red-700/50 rounded-lg text-sm transition-all shadow-md">
                                                    <Trash2 size={18} /> HỦY / XÓA BỎ THÙNG NÀY
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-3 font-mono text-sm sm:text-base max-h-60 overflow-y-auto pr-2">
                                        {box.items.length === 0 ? (
                                            <p className="text-slate-500 italic text-center py-4">Hộp đang trống. Quét mã sản phẩm để đưa vào hộp.</p>
                                        ) : (
                                            box.items.map((item, idx) => (
                                                <div key={idx} className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-600/50 pb-2 gap-1 sm:gap-4 hover:bg-slate-700/20 px-2 pt-2 rounded transition-colors group">
                                                    <span className={isCurrentActive ? "text-orange-300 break-all" : "text-slate-300 break-all"}>{item.code}</span>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-slate-400 text-xs sm:text-sm whitespace-nowrap">{item.time}</span>
                                                        {isCurrentActive && (
                                                            <button onClick={() => handleRemoveItem(box.id, idx)} className="text-slate-500 hover:text-red-400 transition-colors p-1" title="Xóa sản phẩm này"><Trash2 size={18} /></button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    {box.isFinished && box.skipReason && (
                                        <div className="mt-4 pt-3 border-t border-slate-700 text-amber-400/80 text-sm italic flex items-center gap-2"><AlertTriangle size={16}/> Lý do đóng non: {box.skipReason}</div>
                                    )}
                                </div>
                            </BoxContentExpandable>
                        );
                    })
                )}
            </div>

            {/* Các Modal phụ trợ NG, Skip, Done giữ nguyên nội dung ... */}
            {ngModal.isOpen && (
                <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-800 w-full max-w-md rounded-2xl border border-red-500/50 shadow-2xl p-6 animate-fade-in-up">
                        <h2 className="text-xl font-bold text-red-400 mb-4 border-b border-slate-700 pb-3 flex items-center gap-2"><AlertTriangle/> Báo Lỗi (NG)</h2>
                        <div className="mb-4">
                            <label className="block text-slate-300 font-bold mb-2">Chọn Part Number:</label>
                            <select value={ngModal.pn} onChange={(e) => setNgModal({...ngModal, pn: e.target.value})} className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-red-500 outline-none font-mono">
                                {availablePNs.map((pn, i) => <option key={i} value={pn}>{pn}</option>)}
                            </select>
                        </div>
                        <div className="mb-4">
                            <label className="block text-slate-300 font-bold mb-1">Số lượng Sản phẩm NG (QTY):</label>
                            <input type="number" value={ngModal.qty} onChange={(e) => setNgModal({...ngModal, qty: e.target.value})} className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-red-500 outline-none font-mono text-xl text-center" placeholder="0" />
                        </div>
                        <div className="mb-6">
                            <label className="block text-slate-300 font-bold mb-2">Mô tả chi tiết:</label>
                            <textarea value={ngModal.desc} onChange={(e) => setNgModal({...ngModal, desc: e.target.value})} className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-red-500 outline-none h-24" placeholder="Ghi chú chi tiết..." />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setNgModal({...ngModal, isOpen: false})} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-bold">HỦY</button>
                            <button onClick={handleSubmitNg} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg shadow-lg">GỬI</button>
                        </div>
                    </div>
                </div>
            )}
            {skipModal.isOpen && (
                <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-800 w-full max-w-md rounded-2xl border border-slate-600 shadow-2xl p-6 animate-fade-in-up text-center">
                        <PackagePlus className="text-slate-400 mx-auto mb-3" size={48} />
                        <h2 className="text-2xl font-bold text-white mb-2">Đóng Hộp Non (Skip Box)</h2>
                        <p className="text-slate-400 mb-6 text-sm">Bạn đang yêu cầu chốt hộp <b>#{skipModal.boxId}</b> dù chưa đạt tiêu chuẩn (Max QTY).</p>
                        <div className="mb-6 text-left">
                            <label className="block text-slate-300 font-bold mb-2">Lý do đóng hộp non:</label>
                            <input type="text" autoFocus value={skipModal.reason} onChange={(e) => setSkipModal({...skipModal, reason: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && handleSubmitSkipBox()} className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono" placeholder="VD: Hết ca, Lô cuối..." />
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setSkipModal({...skipModal, isOpen: false})} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-bold">HỦY</button>
                            <button onClick={handleSubmitSkipBox} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg shadow-lg">XÁC NHẬN CHỐT</button>
                        </div>
                    </div>
                </div>
            )}
            {doneModal.isOpen && (
                <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-800 w-full max-w-md rounded-2xl border border-blue-500/50 shadow-2xl p-6 animate-fade-in-up text-center">
                        <CheckCircle className="text-blue-400 mx-auto mb-3" size={48} />
                        <h2 className="text-2xl font-bold text-white mb-2">Chốt Lệnh Đóng Gói</h2>
                        <p className="text-slate-400 mb-6 text-sm">Vui lòng quét lại mã Lệnh Sản Xuất (WO) để xác nhận chốt ca.</p>
                        <input type="text" autoFocus value={doneModal.scannedWo} onChange={(e) => setDoneModal({...doneModal, scannedWo: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && verifyAndMarkDone(doneModal.scannedWo)} placeholder="Quét mã WO..." className={`w-full bg-slate-900 border ${doneModal.error ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-blue-500'} text-white px-4 py-4 rounded-xl focus:ring-2 outline-none font-mono text-xl text-center tracking-widest mb-4`} />
                        <button onClick={() => setShowDoneScanner(true)} className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-500 text-white font-bold py-3 rounded-lg mb-2 flex items-center justify-center gap-2 transition-all"><Camera size={20} /> MỞ CAMERA QUÉT MÃ WO</button>
                        {doneModal.error && <p className="text-red-400 text-sm mb-2 animate-pulse font-semibold">{doneModal.error}</p>}
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
export default FramePackingProc;