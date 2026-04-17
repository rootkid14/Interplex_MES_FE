import React, { useState, useEffect } from "react";
import { ActionButton } from "../common/ActionButton";
import { Truck, XCircle, CheckCircle, Package, Box, Printer, FilePlus, CheckSquare, Square, X, CheckCheck, Cpu, MousePointerClick, RefreshCcw } from "lucide-react";
import useProductionStore from '../../store/productionStore';
import { workstationAPI } from '../../api/workstationApi';

const FrameOutSourceAllocator = () => {
    // ==========================================
    // 1. STATE & STORE
    // ==========================================
    const currentWorkstation = useProductionStore(state => state.currentWorkstation);
    const clearCurrentWorkstation = useProductionStore(state => state.clearCurrentWorkstation);
    const woData = currentWorkstation;

    const [cards, setCards] = useState([]); 
    const [config, setConfig] = useState({ pn: '', maxQty: '' });
    const [loading, setLoading] = useState(false);
    
    // STATE IN ẤN
    const [showPrintTypeSelector, setShowPrintTypeSelector] = useState(false);
    const [printMode, setPrintMode] = useState('none'); 
    const [selectedForPrint, setSelectedForPrint] = useState([]);

    const wo = woData?.WO;

    // ==========================================
    // 2. DATA FETCHING
    // ==========================================
    const loadStatus = async () => {
        if (!wo) return;
        setLoading(true);
        const res = await workstationAPI.getAllocationStatus(wo);
        if (res.success) {
            setCards(res.data);
            if (res.data.length > 0) {
                const firstCard = res.data[0];
                setConfig({ pn: firstCard.pn, maxQty: firstCard.qty });
            }
        }
        setLoading(false);
    };

    useEffect(() => { loadStatus(); }, [wo]);

    // ==========================================
    // 3. TÍNH TOÁN TIẾN ĐỘ CHUẨN XÁC
    // ==========================================
    // Điểm KHÁC BIỆT CHÍNH SO VỚI INHOUSE: Lấy QTY_OK (Tổng lượng đã nhận từ Vendor) làm mốc
    const totalProducedOK = woData?.QTY_OK || 0;
    const totalAllocated = cards.reduce((sum, c) => sum + (c.qty || 0), 0);
    const remainingToAllocate = totalProducedOK - totalAllocated;
    
    const isConfigLocked = cards.length > 0; 
    const maxQtyNum = parseInt(config.maxQty) || 0;

    // OUTSOURCE LUÔN LUÔN CHO PHÉP TẠO LÔ LẺ (Vì quy trình In-Progress không áp dụng khắt khe như inhouse)
    const canGenerate = remainingToAllocate > 0 && maxQtyNum > 0;

    // ==========================================
    // 4. HÀM GỌI API ALLOCATION
    // ==========================================
    const handleGenerate = async () => {
        if (!config.pn || !maxQtyNum) return alert("Vui lòng nhập Part Number mới và Max QTY!");
        
        const res = await workstationAPI.generateBatches({ WO: wo, PN: config.pn, MaxQTY: maxQtyNum });
        if (res.success) {
            alert(res.message);
            loadStatus();
        } else alert(res.message);
    };

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
            alert(res.message);
            loadStatus();
        } else alert(res.message);
    };

    // ==========================================
    // 5. CÁC HÀM XỬ LÝ IN
    // ==========================================
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
            const fileContent = selectedForPrint.join('\n');
            const blob = new Blob([fileContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Outsource_Print_WO_${Math.abs(wo)}_${new Date().getTime()}.txt`; 
            a.click();
            URL.revokeObjectURL(url);

            if (printMode === 'new') {
                const res = await workstationAPI.printBatches({ WO: wo, Barcodes: selectedForPrint });
                if (res.success) {
                    alert(`Đã xuất ${selectedForPrint.length} mã ra file txt và cập nhật hệ thống!`);
                    loadStatus();
                } else alert("Lỗi từ máy chủ: " + res.message);
            } else {
                alert(`Đã xuất lại file txt cho ${selectedForPrint.length} mã!`);
            }
        } catch (error) {
            alert("Lỗi quá trình in: " + error.message);
        } finally {
            cancelPrintMode();
        }
    };

    if (!currentWorkstation) return null;

    const isPrintModeActive = printMode !== 'none';
    const displayCards = [...cards].reverse(); 

    return (
        <div className="flex flex-col h-full bg-slate-900 border-l-4 border-yellow-600 animate-fade-in relative z-10">
            
            {/* ================================================== */}
            {/* HEADER & THIẾT LẬP */}
            {/* ================================================== */}
            <div className="bg-slate-800 p-4 sm:p-6 shadow-md z-10 flex-shrink-0 border-b border-slate-700">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-3xl font-black text-white flex items-center gap-3 tracking-tighter">
                            <Truck className="text-yellow-500" size={32} /> OUTSOURCE ALLOCATION
                        </h2>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                            <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-3 py-1 rounded-md font-mono font-bold tracking-wider flex items-center gap-2">
                                ORIGIN WO: {Math.abs(wo)}
                            </span>
                            {woData?.ModelNO && (
                                <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-md font-mono font-bold tracking-wider flex items-center gap-2">
                                    <Cpu size={14}/> MODEL: {woData.ModelNO}
                                </span>
                            )}
                            <span className="bg-slate-700 text-slate-300 px-3 py-1 rounded-md font-bold">
                                MODE: RECEIVING & RE-LABELING
                            </span>
                        </div>
                    </div>
                    {!isPrintModeActive && (
                        <ActionButton icon={<XCircle size={24} />} label="Thoát" color="red" onClick={clearCurrentWorkstation} />
                    )}
                </div>

                <div className="bg-slate-900/80 p-4 rounded-3xl border border-yellow-500/20 shadow-inner">
                    <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-5 text-center">
                        <div className="bg-slate-800 p-3 sm:p-4 rounded-2xl border border-slate-700">
                            <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase block mb-1">Total Received</span>
                            <span className="text-yellow-500 font-black text-2xl sm:text-3xl">{totalProducedOK}</span>
                        </div>
                        <div className="bg-slate-800 p-3 sm:p-4 rounded-2xl border border-slate-700">
                            <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase block mb-1">Re-Labeled</span>
                            <span className="text-emerald-400 font-black text-2xl sm:text-3xl">{totalAllocated}</span>
                        </div>
                        <div className="bg-slate-800 p-3 sm:p-4 rounded-2xl border border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.1)]">
                            <span className="text-[10px] sm:text-xs text-yellow-500 font-bold uppercase block mb-1">Wait Re-Label</span>
                            <span className="text-white font-black text-2xl sm:text-3xl">{remainingToAllocate}</span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-[3]">
                            <label className="text-xs text-slate-500 font-black uppercase mb-2 block ml-2">New Part Number (Sau Outsource)</label>
                            <input 
                                type="text" disabled={isConfigLocked || isPrintModeActive} value={config.pn} 
                                onChange={(e) => setConfig({...config, pn: e.target.value.toUpperCase()})}
                                className={`w-full bg-slate-900 border-2 border-slate-700 text-white px-5 py-3.5 rounded-2xl focus:border-yellow-500 outline-none transition-all font-bold ${(isConfigLocked || isPrintModeActive) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs text-slate-500 font-black uppercase mb-2 block ml-2">QTY/Lô</label>
                            <input 
                                type="number" disabled={isConfigLocked || isPrintModeActive} value={config.maxQty} 
                                onChange={(e) => setConfig({...config, maxQty: e.target.value})}
                                className={`w-full bg-slate-900 border-2 border-slate-700 text-white px-5 py-3.5 rounded-2xl text-center font-black text-xl ${(isConfigLocked || isPrintModeActive) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            />
                        </div>
                        <button 
                            onClick={handleGenerate}
                            disabled={!canGenerate || isPrintModeActive}
                            className={`h-[60px] px-10 rounded-2xl font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap w-full sm:w-auto ${(!canGenerate || isPrintModeActive) ? 'bg-slate-800 text-slate-500 border-2 border-slate-700 cursor-not-allowed' : 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-lg shadow-yellow-900/40 active:scale-95'}`}
                        >
                            <FilePlus size={24}/> TẠO MÃ TEM
                        </button>
                    </div>
                </div>
            </div>

            {/* ================================================== */}
            {/* THANH CÔNG CỤ (Ẩn đi khi đang chọn In) */}
            {/* ================================================== */}
            {!isPrintModeActive && cards.length > 0 && (
                <div className="bg-slate-800/90 backdrop-blur-md border-b border-slate-700 p-3 flex flex-wrap gap-3 shadow-sm z-20">
                    <button onClick={handleBulkVerify} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/50 text-emerald-400 px-5 py-2.5 rounded-xl font-bold text-sm transition-colors">
                        <CheckCheck size={18}/> DUYỆT TẤT CẢ
                    </button>
                    <div className="w-px bg-slate-600 mx-1 hidden sm:block"></div>
                    <button onClick={() => setShowPrintTypeSelector(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-orange-900/40 transition-colors">
                        <Printer size={18}/> IN TEM MÃ VẠCH
                    </button>
                </div>
            )}

            {/* ================================================== */}
            {/* DANH SÁCH THẺ CHÍNH (THIẾT KẾ COMPACT + SORT MỚI NHẤT LÊN ĐẦU) */}
            {/* ================================================== */}
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
                                                ? (isSelected ? 'bg-slate-800 border-orange-500 shadow-[0_0_15px_rgba(234,88,12,0.2)] cursor-pointer' : 'bg-slate-800/40 border-slate-700 hover:border-slate-500 cursor-pointer')
                                                : 'bg-slate-900 border-slate-800 opacity-30 grayscale cursor-not-allowed')
                                            : (card.state === 'Exported' ? 'bg-slate-800/80 border-slate-700 opacity-60' : card.state === 'Wait-Printing' ? 'bg-orange-900/10 border-orange-500/30' : 'bg-slate-800/80 border-blue-500/30')
                                    }`}
                                >
                                    {isPrintModeActive && isEligible && (
                                        <div className="absolute top-3 right-3 z-10 bg-slate-800 rounded">
                                            {isSelected ? <CheckSquare className="text-orange-500" size={18}/> : <Square className="text-slate-500" size={18}/>}
                                        </div>
                                    )}

                                    {/* Hàng 1: Icon + Barcode + Trạng thái */}
                                    <div className="flex items-center justify-between mb-2">
                                        <div className={`flex items-center gap-2.5 min-w-0 ${isPrintModeActive && isEligible ? 'pr-7' : ''}`}>
                                            <div className="bg-slate-700/50 p-1.5 rounded-lg shrink-0">
                                                <Package className="text-yellow-500" size={16} />
                                            </div>
                                            <p className={`font-mono font-bold text-base truncate tracking-wider ${isSelected ? 'text-white' : 'text-slate-200'}`} title={card.barcode}>
                                                {card.barcode}
                                            </p>
                                        </div>
                                        {!isPrintModeActive && (
                                            <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider shrink-0 ${
                                                card.state === 'Exported' ? 'bg-slate-700 text-slate-400' :
                                                card.state === 'Wait-Printing' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                                'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                            }`}>
                                                {card.state === 'Exported' ? 'Đã Xuất' : card.state === 'Wait-Printing' ? 'Chờ In' : 'Chờ Duyệt'}
                                            </span>
                                        )}
                                    </div>
                                    
                                    {/* Hàng 2: QTY + Nút Action */}
                                    <div className="flex justify-between items-center pt-2.5 border-t border-slate-700/50">
                                        <span className="text-xs text-slate-500 uppercase font-bold">QTY: <b className={`text-sm ${isSelected ? 'text-emerald-400' : 'text-emerald-500/70'}`}>{card.qty}</b></span>
                                        
                                        {!isPrintModeActive && card.state === 'Wait-Verify' && (
                                            <button onClick={(e) => { e.stopPropagation(); handleVerify(card.barcode, card.qty); }} className="text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded font-bold flex items-center gap-1 transition-colors shadow">
                                                <CheckCircle size={14}/> DUYỆT
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ================================================== */}
            {/* FLOATING ACTION PILL (Thanh Xác Nhận In) */}
            {/* ================================================== */}
            {isPrintModeActive && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 border-2 border-orange-500/80 rounded-full pl-6 pr-2 py-2 shadow-[0_10px_40px_rgba(234,88,12,0.3)] z-50 flex items-center gap-4 animate-fade-in-up w-max max-w-[90vw]">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-500/20 p-1.5 rounded-full text-orange-400 hidden sm:block"><MousePointerClick size={16}/></div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                            <span className="text-orange-400 font-bold text-xs sm:text-sm uppercase whitespace-nowrap">
                                {printMode === 'new' ? 'IN MỚI' : 'IN LẠI'}
                            </span>
                            <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-xs font-black border border-slate-700 whitespace-nowrap">
                                {selectedForPrint.length} Thẻ
                            </span>
                        </div>
                    </div>
                    
                    <div className="w-px h-8 bg-slate-600"></div>
                    
                    <div className="flex items-center gap-2">
                        <button onClick={selectAllEligible} className="text-blue-400 hover:text-blue-300 text-xs font-bold px-3 py-2 rounded-full transition-colors whitespace-nowrap hidden sm:block">
                            Chọn tất cả
                        </button>
                        <button onClick={cancelPrintMode} className="text-slate-400 hover:bg-slate-700 text-xs font-bold px-4 py-2.5 rounded-full transition-colors">
                            HỦY
                        </button>
                        <button 
                            onClick={executePrint} 
                            disabled={selectedForPrint.length === 0} 
                            className={`text-xs font-black px-6 py-2.5 rounded-full flex items-center gap-1.5 transition-all whitespace-nowrap ${selectedForPrint.length === 0 ? 'bg-slate-700 text-slate-500' : 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/30'}`}
                        >
                            <Printer size={16}/> XÁC NHẬN IN
                        </button>
                    </div>
                </div>
            )}

            {/* ================================================== */}
            {/* MODAL HỎI LOẠI IN */}
            {/* ================================================== */}
            {showPrintTypeSelector && (
                <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-800 rounded-3xl w-full max-w-sm border border-slate-700 shadow-2xl overflow-hidden">
                        <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                            <h3 className="text-white font-black text-lg flex items-center gap-2">
                                <Printer className="text-orange-500" size={20}/> CHỌN CHẾ ĐỘ IN
                            </h3>
                            <button onClick={() => setShowPrintTypeSelector(false)} className="text-slate-400 hover:text-red-400 bg-slate-900 p-1.5 rounded-full transition-colors"><X size={18}/></button>
                        </div>
                        <div className="p-6 space-y-3">
                            <button 
                                onClick={() => startPrintMode('new')}
                                className="w-full flex items-center justify-between p-4 bg-orange-600/10 hover:bg-orange-600 border border-orange-500/50 hover:border-orange-500 rounded-2xl transition-all group"
                            >
                                <div className="text-left">
                                    <p className="text-orange-500 group-hover:text-white font-black text-base transition-colors">IN TEM MỚI</p>
                                    <p className="text-slate-400 group-hover:text-orange-200 text-xs mt-0.5 transition-colors">In các lô vừa được duyệt</p>
                                </div>
                                <FilePlus className="text-orange-500 group-hover:text-white transition-colors" size={24}/>
                            </button>
                            
                            <button 
                                onClick={() => startPrintMode('reprint')}
                                className="w-full flex items-center justify-between p-4 bg-blue-600/10 hover:bg-blue-600 border border-blue-500/50 hover:border-blue-500 rounded-2xl transition-all group"
                            >
                                <div className="text-left">
                                    <p className="text-blue-500 group-hover:text-white font-black text-base transition-colors">IN LẠI TEM</p>
                                    <p className="text-slate-400 group-hover:text-blue-200 text-xs mt-0.5 transition-colors">In lại các tem đã bị rách/hỏng</p>
                                </div>
                                <RefreshCcw className="text-blue-500 group-hover:text-white transition-colors" size={24}/>
                            </button>
                        </div>
                        <div className="p-3 border-t border-slate-700 bg-slate-900/50">
                            <button onClick={() => setShowPrintTypeSelector(false)} className="w-full py-3 text-slate-400 hover:text-white font-bold text-sm transition-colors rounded-xl">HỦY BỎ</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FrameOutSourceAllocator;