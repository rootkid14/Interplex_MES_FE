import React, { useState, useEffect } from "react";
import { ActionButton } from "../common/ActionButton";
import { ScanLine, XCircle, CheckCircle, Package, Box, Printer, FilePlus, CheckSquare, Square, X, CheckCheck, Cpu, MousePointerClick, RefreshCcw, Trash2, Settings2, Edit3 } from "lucide-react";
import useProductionStore from '../../store/productionStore';
import { workstationAPI } from '../../api/workstationApi';

const FrameBatchAllocator = () => {
    const currentAllocation = useProductionStore(state => state.currentAllocation);
    const clearCurrentAllocation = useProductionStore(state => state.clearCurrentAllocation);
    const liveWOData = useProductionStore(state => state.activeJobs.find(job => job.WO === state.currentAllocation?.WO));
    
    const woData = currentAllocation;

    const [cards, setCards] = useState([]); 
    const [config, setConfig] = useState({ pn: '', maxQty: '', customQty: '' });
    const [loading, setLoading] = useState(false);
    
    // STATE: CHẾ ĐỘ TẠO (Auto: Chia lô | Manual: Tạo lẻ)
    const [creationMode, setCreationMode] = useState('auto'); 

    // STATE IN ẤN
    const [showPrintTypeSelector, setShowPrintTypeSelector] = useState(false);
    const [printMode, setPrintMode] = useState('none'); 
    const [selectedForPrint, setSelectedForPrint] = useState([]);

    const wo = woData?.WO;
    const currentWOStatus = liveWOData?.Status ?? woData?.Status;
    const isWOInProgress = currentWOStatus === 1;

    const loadStatus = async () => {
        if (!wo) return;
        setLoading(true);
        const res = await workstationAPI.getAllocationStatus(wo);
        if (res.success) {
            setCards(res.data);
            if (res.data.length > 0) {
                const firstCard = res.data[0];
                setConfig(prev => ({ ...prev, pn: firstCard.pn, maxQty: firstCard.qty || prev.maxQty }));
            }
            else{
                const autoPn = woData?.ModelNO || '';
                setConfig(prev => ({ ...prev, pn: autoPn }));
            }
        }
        setLoading(false);
    };

    useEffect(() => { loadStatus(); }, [wo]);

    // TÍNH TOÁN TIẾN ĐỘ
    const totalProducedOK = liveWOData?.QTY_OK ?? woData?.QTY_OK ?? 0;
    const totalAllocated = cards.reduce((sum, c) => sum + (c.qty || 0), 0);
    const remainingToAllocate = totalProducedOK - totalAllocated;
    
    const isConfigLocked = cards.length > 0; 
    const maxQtyNum = parseInt(config.maxQty) || 0;
    const customQtyNum = parseInt(config.customQty) || 0;

    // Logic vô hiệu hóa nút Generate
    const canGenerate = remainingToAllocate > 0 && (creationMode === 'auto' ? maxQtyNum > 0 : (customQtyNum > 0 && customQtyNum <= remainingToAllocate));

    // ==========================================
    // CÁC HÀM XỬ LÝ DỮ LIỆU
    // ==========================================
    const handleGenerate = async () => {
        if (!config.pn) return alert("Vui lòng nhập Part Number!");
        
        let payload = { WO: wo, PN: config.pn };

        if (creationMode === 'auto') {
            payload.MaxQTY = maxQtyNum;
            payload.IsManual = false;
        } else {
            payload.MaxQTY = customQtyNum; // Truyền tạm vào MaxQTY để backend không báo lỗi required
            payload.CustomQTY = customQtyNum;
            payload.IsManual = true;
        }

        const res = await workstationAPI.generateBatches(payload);
        if (res.success) {
            // Không cần alert nếu tạo thành công để thao tác nhanh hơn
            loadStatus();
            if (creationMode === 'manual') setConfig(prev => ({...prev, customQty: ''})); // Reset ô nhập tay
        } else alert(res.message);
    };

    const handleDeleteCard = async (barcodeToDelete) => {
        if (!window.confirm("THU HỒI TEM: Bạn có chắc chắn muốn thu hồi (xóa) mã cấp phát này? Số lượng sẽ được hoàn lại vào kho chờ.")) return;
        
        try {
            const payload = {"barcode" : barcodeToDelete};
            const res = await workstationAPI.deleteAllocation(payload);
            if (res.success) {
                setCards(prev => prev.filter(c => c.barcode !== barcodeToDelete));
            } else {
                alert(res.message);
            }
        } catch (err) {
            alert("Lỗi khi xóa: " + err.message);
        }
    };

    // ... (Giữ nguyên handleVerify, handleBulkVerify, startPrintMode, cancelPrintMode, selectAllEligible, executePrint từ code cũ) ...
    const handleVerify = async (barcode, qty) => {
        const res = await workstationAPI.verifyAllocationCard({ WO: wo, BarcodeData: barcode, QTY: qty, MaxQTY: maxQtyNum });
        if (res.success) loadStatus();
        else alert(res.message);
    };

    const handleBulkVerify = async () => {
        const unverifiedCards = cards.filter(c => c.state === 'Wait-Verify');
        if (unverifiedCards.length === 0) return alert("Không có thẻ nào đang chờ duyệt!");

        const payload = {
            WO: wo, MaxQTY: maxQtyNum,
            Cards: unverifiedCards.map(c => ({ BarcodeData: c.barcode, QTY: c.qty }))
        };

        const res = await workstationAPI.verifyBulkCards(payload);
        if (res.success) {
            loadStatus();
        } else alert(res.message);
    };

    const startPrintMode = (mode) => {
        setShowPrintTypeSelector(false);
        setPrintMode(mode);
        if (mode === 'new') {
            const waitPrintCards = cards.filter(c => c.state === 'Wait-Printing').map(c => c.barcode);
            if (waitPrintCards.length === 0) {
                alert("Không có thẻ nào đang chờ in!");
                setPrintMode('none');
                return;
            }
            setSelectedForPrint(waitPrintCards);
        } else {
            const exportedCards = cards.filter(c => c.state === 'Exported');
            if (exportedCards.length === 0) {
                alert("Chưa có thẻ nào được xuất để in lại!");
                setPrintMode('none');
                return;
            }
            setSelectedForPrint([]); 
        }
    };

    const cancelPrintMode = () => {
        setPrintMode('none');
        setSelectedForPrint([]);
    };

    const selectAllEligible = () => {
        const targetCards = cards.filter(c => c.state === (printMode === 'new' ? 'Wait-Printing' : 'Exported')).map(c => c.barcode);
        setSelectedForPrint(targetCards);
    };

    const executePrint = async () => {
        if (selectedForPrint.length === 0) return alert("Vui lòng chọn ít nhất 1 thẻ để in!");
        try {
            const fileContent = selectedForPrint.map(barcode => {
                const targetCard = cards.find(c => c.barcode === barcode);
                return `${barcode},${wo},${targetCard ? targetCard.qty : 0}`; 
            }).join('\n');

            const blob = new Blob([fileContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Print_WO_${wo}_${new Date().getTime()}.txt`; 
            a.click();
            URL.revokeObjectURL(url);

            if (printMode === 'new') {
                const res = await workstationAPI.printBatches({ WO: wo, Barcodes: selectedForPrint });
                if (res.success) {
                    loadStatus();
                } else alert("Lỗi từ máy chủ: " + res.message);
            }
        } catch (error) {
            alert("Lỗi quá trình in: " + error.message);
        } finally {
            cancelPrintMode();
        }
    };

    if (!currentAllocation) return null;
    const isPrintModeActive = printMode !== 'none';
    const displayCards = [...cards].reverse(); 

    return (
        <div className="flex flex-col h-full bg-slate-900 border-l border-slate-700 animate-fade-in relative z-10">
            
            {/* HEADER */}
            <div className="bg-slate-800 p-4 sm:p-6 shadow-md z-10 flex-shrink-0 border-b border-slate-700">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-wide">
                            <ScanLine className="text-blue-400" size={28} /> BATCH ALLOCATION
                        </h2>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                            <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-md font-mono font-bold tracking-wider">WO: {wo}</span>
                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${isWOInProgress ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                {isWOInProgress ? '● IN-PROGRESS' : '● CLOSED'}
                            </span>
                        </div>
                    </div>
                    {!isPrintModeActive && (
                        <ActionButton icon={<XCircle size={24} />} label="Đóng" color="red" onClick={clearCurrentAllocation} />
                    )}
                </div>

                {/* BẢNG ĐIỀU KHIỂN */}
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-700 shadow-inner">
                    <div className="grid grid-cols-3 gap-3 mb-5 text-center">
                        <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-600/50">
                            <span className="text-xs text-slate-400 font-bold uppercase block mb-1">Produced (OK)</span>
                            <span className="text-blue-400 font-black text-2xl">{totalProducedOK}</span>
                        </div>
                        <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-600/50">
                            <span className="text-xs text-slate-400 font-bold uppercase block mb-1">Allocated</span>
                            <span className="text-emerald-400 font-black text-2xl">{totalAllocated}</span>
                        </div>
                        <div className="bg-slate-800/80 p-3 rounded-xl border border-orange-500/20 relative">
                            <span className="text-xs text-slate-400 font-bold uppercase block mb-1">Wait Allocate</span>
                            <span className={`font-black text-2xl ${remainingToAllocate < 0 ? 'text-red-500' : 'text-orange-400'}`}>{remainingToAllocate}</span>
                        </div>
                    </div>

                    {/* VÙNG CHỌN CHẾ ĐỘ & TẠO TEM */}
                    <div className="flex flex-col gap-3">
                        {/* Tabs chế độ */}
                        <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-700 w-max">
                            <button 
                                onClick={() => setCreationMode('auto')}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-colors ${creationMode === 'auto' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <Settings2 size={14}/> Tự động chia lô
                            </button>
                            <button 
                                onClick={() => setCreationMode('manual')}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-colors ${creationMode === 'manual' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <Edit3 size={14}/> Nhập lẻ thủ công
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                            <div className="sm:col-span-6">
                                <label className="text-xs text-slate-400 font-bold uppercase mb-1 block ml-1">Part Number (PN)</label>
                                <input 
                                    type="text" disabled={isConfigLocked || isPrintModeActive} value={config.pn} 
                                    onChange={(e) => setConfig({...config, pn: e.target.value.toUpperCase()})}
                                    className={`w-full bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-xl focus:border-blue-500 outline-none transition-all ${(isConfigLocked || isPrintModeActive) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                />
                            </div>
                            
                            <div className="sm:col-span-3">
                                {creationMode === 'auto' ? (
                                    <>
                                        <label className="text-xs text-blue-400 font-bold uppercase mb-1 block ml-1">Max QTY / Lô</label>
                                        <input 
                                            type="number" disabled={isPrintModeActive} value={config.maxQty} 
                                            onChange={(e) => setConfig({...config, maxQty: e.target.value})}
                                            className="w-full bg-slate-900 border-2 border-blue-900/50 focus:border-blue-500 text-white px-4 py-2.5 rounded-xl outline-none text-center font-mono text-lg transition-all"
                                        />
                                    </>
                                ) : (
                                    <>
                                        <label className="text-xs text-orange-400 font-bold uppercase mb-1 block ml-1">SL Xuất 1 Lô lẻ</label>
                                        <input 
                                            type="number" disabled={isPrintModeActive} value={config.customQty} 
                                            onChange={(e) => setConfig({...config, customQty: e.target.value})}
                                            placeholder="Nhập SL..."
                                            className="w-full bg-slate-900 border-2 border-orange-900/50 focus:border-orange-500 text-white px-4 py-2.5 rounded-xl outline-none text-center font-mono text-lg transition-all"
                                        />
                                    </>
                                )}
                            </div>
                            
                            <div className="sm:col-span-3">
                                <button 
                                    onClick={handleGenerate}
                                    disabled={!canGenerate || isPrintModeActive}
                                    className={`w-full h-[50px] flex items-center justify-center gap-2 rounded-xl font-black tracking-wider transition-all shadow-lg 
                                        ${(!canGenerate || isPrintModeActive) ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed' : 
                                        creationMode === 'auto' ? 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 shadow-blue-900/50' : 'bg-orange-600 hover:bg-orange-500 text-white border border-orange-500 shadow-orange-900/50'}`}
                                >
                                    <FilePlus size={20}/> TẠO MÃ
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* THANH CÔNG CỤ (Duyệt/In) */}
            {!isPrintModeActive && cards.length > 0 && (
                <div className="bg-slate-800/90 backdrop-blur-md border-b border-slate-700 p-3 flex flex-wrap gap-3 shadow-sm z-20">
                    <button onClick={handleBulkVerify} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/50 text-emerald-400 px-5 py-2.5 rounded-xl font-bold text-sm transition-colors">
                        <CheckCheck size={18}/> DUYỆT TẤT CẢ
                    </button>
                    <div className="w-px bg-slate-600 mx-1 hidden sm:block"></div>
                    <button onClick={() => setShowPrintTypeSelector(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-colors">
                        <Printer size={18}/> IN TEM MÃ VẠCH
                    </button>
                </div>
            )}

            {/* DANH SÁCH THẺ CHÍNH */}
            <div className={`flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar ${isPrintModeActive ? 'bg-slate-950 shadow-inner' : 'bg-slate-900'}`}>
                {displayCards.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                        <Box size={64} className="opacity-20" />
                        <p className="font-medium tracking-wide">Chưa có mã tem nào được sinh ra.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 pb-20">
                        {displayCards.map((card) => {
                            const isSelected = selectedForPrint.includes(card.barcode);
                            const isEligible = isPrintModeActive ? (printMode === 'new' ? card.state === 'Wait-Printing' : card.state === 'Exported') : true;

                            return (
                                <div 
                                    key={card.barcode} 
                                    onClick={() => {
                                        if (isPrintModeActive && isEligible) {
                                            setSelectedForPrint(prev => prev.includes(card.barcode) ? prev.filter(b => b !== card.barcode) : [...prev, card.barcode]);
                                        }
                                    }}
                                    className={`relative rounded-xl p-3.5 border transition-all duration-200 ${
                                        isPrintModeActive 
                                            ? (isEligible 
                                                ? (isSelected ? 'bg-slate-800 border-slate-400 shadow-[0_0_15px_rgba(255,255,255,0.1)] cursor-pointer' : 'bg-slate-800/40 border-slate-700 hover:border-slate-500 cursor-pointer')
                                                : 'bg-slate-900 border-slate-800 opacity-30 grayscale cursor-not-allowed')
                                            : (card.state === 'Exported' ? 'bg-slate-800/80 border-slate-700' : card.state === 'Wait-Printing' ? 'bg-orange-900/10 border-orange-500/30' : 'bg-slate-800/80 border-blue-500/30')
                                    }`}
                                >
                                    {isPrintModeActive && isEligible && (
                                        <div className="absolute top-3 right-3 z-10 bg-slate-800 rounded">
                                            {isSelected ? <CheckSquare className="text-white" size={18}/> : <Square className="text-slate-500" size={18}/>}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between mb-2">
                                        <div className={`flex items-center gap-2.5 min-w-0 ${isPrintModeActive && isEligible ? 'pr-7' : ''}`}>
                                            <div className="bg-slate-700/50 p-1.5 rounded-lg shrink-0">
                                                <Package className={card.state === 'Exported' ? 'text-slate-400' : 'text-blue-400'} size={16} />
                                            </div>
                                            <p className={`font-mono font-bold text-xs truncate tracking-wider ${isSelected ? 'text-white' : 'text-slate-200'}`} title={card.barcode}>
                                                {card.barcode}
                                            </p>
                                        </div>
                                        {!isPrintModeActive && (
                                            <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider shrink-0 ${
                                                card.state === 'Exported' ? 'bg-slate-700 text-slate-400' :
                                                card.state === 'Wait-Printing' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                                'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                            }`}>
                                                {card.state === 'Exported' ? 'Đã Xuất' : card.state === 'Wait-Printing' ? 'Chờ In' : 'Chờ Duyệt'}
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="flex justify-between items-center pt-2.5 border-t border-slate-700/50">
                                        <span className="text-xs text-slate-500 uppercase font-bold">QTY: <b className={`text-sm ${isSelected ? 'text-white' : 'text-emerald-500'}`}>{card.qty}</b></span>
                                        
                                        <div className="flex gap-1.5">
                                            {/* NÚT DUYỆT */}
                                            {!isPrintModeActive && card.state === 'Wait-Verify' && (
                                                <button onClick={(e) => { e.stopPropagation(); handleVerify(card.barcode, card.qty); }} className="text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded font-bold flex items-center gap-1 transition-colors shadow">
                                                    <CheckCircle size={14}/> DUYỆT
                                                </button>
                                            )}
                                            
                                            {/* NÚT THU HỒI (RECALL) - Hiển thị cho mọi trạng thái nếu không trong mode in */}
                                            {!isPrintModeActive && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteCard(card.barcode); }} 
                                                    className="text-[11px] bg-slate-800 hover:bg-red-600 border border-slate-700 hover:border-red-500 text-slate-400 hover:text-white px-2 py-1 rounded font-bold flex items-center gap-1 transition-all shadow group"
                                                    title="Thu hồi tem này về kho chờ cấp phát"
                                                >
                                                    <Trash2 size={14} className="group-hover:animate-pulse"/> THU HỒI
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* FLOATING ACTION PILL (Thanh Xác Nhận In) */}
            {isPrintModeActive && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 border-2 border-white/20 rounded-full pl-6 pr-2 py-2 shadow-2xl z-50 flex items-center gap-4 animate-fade-in-up w-max max-w-[90vw]">
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                            <span className="text-white font-bold text-xs sm:text-sm uppercase whitespace-nowrap">
                                {printMode === 'new' ? 'IN MỚI' : 'IN LẠI'}
                            </span>
                            <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-xs font-black border border-slate-700 whitespace-nowrap">
                                {selectedForPrint.length} Thẻ
                            </span>
                        </div>
                    </div>
                    
                    <div className="w-px h-8 bg-slate-600"></div>
                    
                    <div className="flex items-center gap-2">
                        <button onClick={selectAllEligible} className="text-blue-400 hover:text-blue-300 text-xs font-bold px-3 py-2 rounded-full transition-colors whitespace-nowrap hidden sm:block">Chọn tất cả</button>
                        <button onClick={cancelPrintMode} className="text-slate-400 hover:bg-slate-700 text-xs font-bold px-4 py-2.5 rounded-full transition-colors">HỦY</button>
                        <button 
                            onClick={executePrint} 
                            disabled={selectedForPrint.length === 0} 
                            className={`text-xs font-black px-6 py-2.5 rounded-full flex items-center gap-1.5 transition-all whitespace-nowrap ${selectedForPrint.length === 0 ? 'bg-slate-700 text-slate-500' : 'bg-white text-slate-900 hover:bg-slate-200 shadow-lg'}`}
                        >
                            <Printer size={16}/> XÁC NHẬN IN
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL HỎI LOẠI IN */}
            {showPrintTypeSelector && (
                <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-800 rounded-3xl w-full max-w-sm border border-slate-700 shadow-2xl overflow-hidden">
                        <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                            <h3 className="text-white font-black text-lg flex items-center gap-2">
                                <Printer className="text-white" size={20}/> CHỌN CHẾ ĐỘ IN
                            </h3>
                            <button onClick={() => setShowPrintTypeSelector(false)} className="text-slate-400 hover:text-red-400 bg-slate-900 p-1.5 rounded-full transition-colors"><X size={18}/></button>
                        </div>
                        <div className="p-6 space-y-3">
                            <button onClick={() => startPrintMode('new')} className="w-full flex items-center justify-between p-4 bg-slate-700 hover:bg-slate-600 rounded-2xl transition-all group">
                                <div className="text-left">
                                    <p className="text-white font-black text-base">IN TEM MỚI</p>
                                    <p className="text-slate-400 text-xs mt-0.5">In các lô vừa được duyệt</p>
                                </div>
                                <FilePlus className="text-white opacity-50 group-hover:opacity-100" size={24}/>
                            </button>
                            <button onClick={() => startPrintMode('reprint')} className="w-full flex items-center justify-between p-4 bg-slate-700 hover:bg-slate-600 rounded-2xl transition-all group">
                                <div className="text-left">
                                    <p className="text-white font-black text-base">IN LẠI TEM</p>
                                    <p className="text-slate-400 text-xs mt-0.5">In lại các tem đã bị rách/hỏng</p>
                                </div>
                                <RefreshCcw className="text-white opacity-50 group-hover:opacity-100" size={24}/>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FrameBatchAllocator;