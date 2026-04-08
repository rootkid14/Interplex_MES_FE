import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Package, GitMerge, FileBox, Database, ChevronRight, ChevronDown, AlertTriangle, ArrowUpRight, CheckSquare, Square, Loader2, ArrowLeftRight, ArrowDownRight, Info, Download, ShieldAlert } from 'lucide-react';
import { traceabilityApi } from '../../api/traceabilityAPI';

// Hàm Tiện Ích Export CSV
const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${(row[header] || '').toString().replace(/"/g, '""')}"`).join(','))
    ];
    const csvString = csvRows.join('\n');
    const blob = new Blob(["\ufeff" + csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
};

const WOTreeNode = ({ node, level = 0, selectedWOs, onToggleWO, onViewDetails }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedWOs.includes(node.WO);

    return (
        <div className="w-full">
            <div className={`flex items-center py-3 pr-4 pl-2 border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors group ${isSelected ? 'bg-rose-500/10 border-l-4 border-l-rose-500' : 'border-l-4 border-l-transparent'}`} style={{ paddingLeft: `${level * 24 + 8}px` }}>
                <div className="w-6 flex justify-center mr-1">
                    {hasChildren ? (
                        <button onClick={() => setIsExpanded(!isExpanded)} className="text-slate-400 hover:text-white">
                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>
                    ) : (<div className="w-[1px] h-full bg-slate-600 ml-3 opacity-30"></div>)}
                </div>
                <button onClick={() => onToggleWO(node.WO)} className="mr-3 text-slate-400 hover:text-rose-400 transition-colors">
                    {isSelected ? <CheckSquare size={20} className="text-rose-500" /> : <Square size={20} />}
                </button>
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                    <div className="flex items-center gap-2">
                        <FileBox size={16} className={isSelected ? 'text-rose-400' : 'text-blue-400'} />
                        <span className={`font-bold tracking-wide ${isSelected ? 'text-rose-400' : 'text-slate-200'}`}>
                            WO: {node.WO}
                        </span>
                    </div>
                    {node.Model && <span className="text-xs text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded">Model: {node.Model}</span>}
                </div>
                
                <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onViewDetails('batches', node.WO)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-emerald-600/20 text-slate-300 hover:text-emerald-400 text-xs font-bold rounded border border-slate-600 hover:border-emerald-500/50 transition-colors" title="Xem Batches đã sử dụng">
                        <Package size={14} /> Batches
                    </button>
                    <button onClick={() => onViewDetails('materials', node.WO)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-amber-600/20 text-slate-300 hover:text-amber-400 text-xs font-bold rounded border border-slate-600 hover:border-amber-500/50 transition-colors" title="Xem Vật liệu đã sử dụng">
                        <Database size={14} /> Materials
                    </button>
                    {/* BỔ SUNG NÚT XEM DEFECT LOG CHO MỖI WO */}
                    <button onClick={() => onViewDetails('defects', node.WO)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-rose-600/20 text-slate-300 hover:text-rose-400 text-xs font-bold rounded border border-slate-600 hover:border-rose-500/50 transition-colors" title="Xem Báo lỗi (NG)">
                        <ShieldAlert size={14} /> Defects
                    </button>
                </div>
            </div>
            {isExpanded && hasChildren && (
                <div className="relative">
                    <div className="absolute top-0 bottom-0 border-l border-slate-600/30 border-dashed z-0" style={{ left: `${level * 24 + 19}px` }}></div>
                    <div className="relative z-10">
                        {node.children.map((childNode, idx) => (
                            <WOTreeNode key={`${childNode.WO}-${idx}`} node={childNode} level={level + 1} selectedWOs={selectedWOs} onToggleWO={onToggleWO} onViewDetails={onViewDetails} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const TraceabilityView = () => {
    const { t } = useTranslation();
    const [searchMode, setSearchMode] = useState('BOX');
    const [searchInput, setSearchInput] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [targetBoxId, setTargetBoxId] = useState(null);
    const [treeData, setTreeData] = useState(null);
    const [selectedWOs, setSelectedWOs] = useState([]);
    const [detailPanel, setDetailPanel] = useState(null);

    const executeForwardTrace = async (boxId) => {
        setIsSearching(true);
        setTreeData(null);
        setSelectedWOs([]);
        setDetailPanel(null);
        setErrorMsg('');
        try {
            setTargetBoxId(boxId);
            const fwdRes = await traceabilityApi.boxForwardTrace(boxId);
            if (!fwdRes.success) throw new Error(fwdRes.message || "Không tìm thấy thông tin cấu thành Box này.");
            setTreeData(fwdRes.data);
        } catch (error) {
            setErrorMsg(error.message || "Lỗi kết nối đến máy chủ truy xuất.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        const query = searchInput.trim();
        if (!query) return;
        if (searchMode === 'BOX') {
            executeForwardTrace(query);
        } else {
            setIsSearching(true);
            setErrorMsg('');
            setTreeData(null);
            setSelectedWOs([]);
            setDetailPanel(null);
            setTargetBoxId(null);
            try {
                const prodRes = await traceabilityApi.searchBoxByProduct(query);
                if (!prodRes.success) throw new Error(prodRes.message);
                const { boxes, warning } = prodRes.data;
                setDetailPanel({ type: 'product_search', loading: false, data: { boxes, warning }, title: `Kết quả tra cứu '${query}'` });
            } catch (error) {
                setErrorMsg(error.message || "Lỗi truy xuất mã sản phẩm.");
            } finally {
                setIsSearching(false);
            }
        }
    };

    const handleToggleWO = (woId) => {
        setSelectedWOs(prev => prev.includes(woId) ? prev.filter(id => id !== woId) : [...prev, woId] );
    };

    const handleViewDetails = async (type, payload) => {
        setDetailPanel({ type, loading: true, data: [], title: `Đang tải dữ liệu...` });
        try {
            let apiCall;
            let titleStr = '';
            
            // Xử lý API động theo Action
            if (type === 'batches') { apiCall = traceabilityApi.getBatchesByWO(payload); titleStr = `Input Batches (WO: ${payload})`; }
            else if (type === 'materials') { apiCall = traceabilityApi.getMaterialsByWO(payload); titleStr = `Raw Materials (WO: ${payload})`; }
            else if (type === 'defects') { apiCall = traceabilityApi.getDefectsByWO(payload); titleStr = `Defects Log (WO: ${payload})`; }
            else if (type === 'box_items') { apiCall = traceabilityApi.getItemsByBox(payload); titleStr = `Products in Box: ${payload}`; }

            const res = await apiCall;
            if (!res.success) throw new Error(res.message || "Không có dữ liệu.");
            
            setDetailPanel({ type, loading: false, data: res.data || [], title: titleStr });
        } catch (error) {
            setDetailPanel({ type, loading: false, data: [], title: `Lỗi: ${error.message}` });
        }
    };

    const handleExecuteReverseTrace = async () => {
        if (selectedWOs.length === 0) return;
        setDetailPanel({ type: 'reverse', loading: true, data: [], title: `Đang quét toàn hệ thống cho ${selectedWOs.length} WO(s)...` });
        try {
            const res = await traceabilityApi.reverseTrace(selectedWOs);
            if (!res.success) throw new Error(res.message || "Thất bại khi quét ngược.");
            setDetailPanel({ type: 'reverse', loading: false, data: res.data || [], title: `KẾT QUẢ KHOANH VÙNG (REVERSE TRACE)` });
        } catch (error) {
            setDetailPanel({ type: 'reverse', loading: false, data: [], title: `Lỗi truy xuất: ${error.message}` });
        }
    };

    // Hàm Phẳng Hóa Cây Phả Hệ để Export
    const flattenTree = (node, result = []) => {
        result.push({ Lệnh_Sản_Xuất: node.WO, Mã_Sản_Phẩm: node.Model });
        if (node.children) node.children.forEach(c => flattenTree(c, result));
        return result;
    };

    const handleExportTree = () => {
        if (treeData) {
            const flat = Array.isArray(treeData) ? treeData.flatMap(n => flattenTree(n)) : flattenTree(treeData);
            exportToCSV(flat, `TraceTree_Box_${targetBoxId}`);
        }
    };

    const handleExportDetails = () => {
        if (detailPanel?.data) {
            exportToCSV(detailPanel.data, `Export_${detailPanel.type}_Data`);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-900 overflow-hidden">
            <div className="bg-slate-800 border-b border-slate-700 p-4 sm:p-6 shrink-0 z-10 shadow-lg">
                <div className="max-w-4xl">
                    <h1 className="text-2xl font-black text-white mb-1 flex items-center gap-2">
                        <GitMerge className="text-blue-400" /> Traceability
                    </h1>
                    <p className="text-slate-400 text-sm mb-6">{t('traceability.Explaination')}</p>
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                        <div className="flex bg-slate-900 rounded-xl border border-slate-600 p-1">
                            <button type="button" onClick={() => setSearchMode('BOX')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${searchMode === 'BOX' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>{t('traceability.tracebybox')}</button>
                            <button type="button" onClick={() => setSearchMode('PRODUCT')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${searchMode === 'PRODUCT' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>{t('traceability.tracebyprd')}</button>
                        </div>
                        <div className="flex-1 relative">
                            <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder={searchMode === 'BOX' ? t('traceability.EnterBoxID') : t('traceability.EnterProductID')} className="w-full bg-slate-900 border border-slate-600 text-white pl-4 pr-12 py-3.5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-lg" />
                            <Search className="absolute right-4 top-4 text-slate-500" />
                        </div>
                        <button type="submit" disabled={isSearching || !searchInput.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white px-8 py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 min-w-[140px]">
                            {isSearching ? <Loader2 size={20} className="animate-spin"/> : t('traceability.Trace')}
                        </button>
                    </form>
                    {errorMsg && <p className="text-red-400 mt-3 font-semibold flex items-center gap-1.5"><AlertTriangle size={16}/> {errorMsg}</p>}
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-900/50">
                <div className="w-full lg:w-7/12 flex flex-col border-r border-slate-700 bg-slate-800/30 overflow-hidden">
                    <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center shrink-0">
                        <div>
                            <h2 className="font-bold text-white flex items-center gap-2">
                                <ArrowDownRight className="text-emerald-400" size={18}/> {t('traceability.HierachyTree')}
                            </h2>
                            {targetBoxId && <p className="text-xs text-slate-400 mt-1">Phân tích: <span className="font-mono text-emerald-300 bg-emerald-900/30 px-1 rounded">{targetBoxId}</span></p>}
                        </div>
                        <div className="flex items-center gap-2">
                            {/* NÚT EXPORT TREE */}
                            {treeData && (
                                <button onClick={handleExportTree} className="p-2 bg-emerald-600/20 hover:bg-emerald-500/40 text-emerald-400 rounded-lg transition-colors border border-emerald-500/30" title="Xuất Cây Phả Hệ">
                                    <Download size={18} />
                                </button>
                            )}
                            <button onClick={handleExecuteReverseTrace} disabled={selectedWOs.length === 0} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${selectedWOs.length > 0 ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}>
                                <ArrowUpRight size={16} /> {t('traceability.defectLocalization')} {selectedWOs.length > 0 ? `(${selectedWOs.length})` : ''}
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 pb-10">
                        {!treeData ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50 p-8 text-center">
                                <GitMerge size={64} className="mb-4 text-slate-600" />
                                <p>Nhập mã Box hoặc Sản phẩm và bấm Truy Vết.</p>
                            </div>
                        ) : (
                            <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden animate-fade-in">
                                {Array.isArray(treeData) ? (
                                    treeData.map((node, idx) => <WOTreeNode key={`root-${idx}`} node={node} selectedWOs={selectedWOs} onToggleWO={handleToggleWO} onViewDetails={handleViewDetails} />)
                                ) : (
                                    <WOTreeNode node={treeData} selectedWOs={selectedWOs} onToggleWO={handleToggleWO} onViewDetails={handleViewDetails} />
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-full lg:w-5/12 flex flex-col bg-slate-900 overflow-hidden">
                    <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center shrink-0">
                        <h2 className="font-bold text-white flex items-center gap-2">
                            <ArrowLeftRight className="text-blue-400" size={18}/> {t('traceability.details')}
                        </h2>
                        {/* NÚT EXPORT BẢNG DETAIL PANEL */}
                        {detailPanel?.data?.length > 0 && detailPanel.type !== 'product_search' && (
                            <button onClick={handleExportDetails} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-500/40 text-blue-400 text-xs font-bold rounded border border-blue-500/30 transition-colors">
                                <Download size={14} /> Xuất CSV
                            </button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {!detailPanel ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50 p-8 text-center border-2 border-dashed border-slate-700 rounded-xl">
                                <Database size={48} className="mb-3 text-slate-600" />
                                <p>Bấm xem Batches/Materials ở danh sách bên trái,<br/>hoặc thực hiện Quét Khoanh Vùng để xem kết quả tại đây.</p>
                            </div>
                        ) : (
                            <div className="animate-fade-in">
                                <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 pb-2 border-b ${detailPanel.type === 'reverse' ? 'text-rose-400 border-rose-500/30' : detailPanel.type === 'defects' ? 'text-red-400 border-red-500/30' : 'text-blue-400 border-blue-500/30'}`}>
                                    {detailPanel.type === 'reverse' && <AlertTriangle size={20}/>}
                                    {detailPanel.type === 'defects' && <ShieldAlert size={20}/>}
                                    {['batches', 'materials', 'box_items'].includes(detailPanel.type) && <Database size={20}/>}
                                    {detailPanel.title}
                                </h3>
                                
                                {detailPanel.loading ? (
                                    <div className="flex justify-center items-center py-10 text-blue-400"><Loader2 size={32} className="animate-spin" /></div>
                                ) : (
                                    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                                        
                                        {/* TABLE VIEW CHO BATCHES, MATERIALS VÀ BOX_ITEMS */}
                                        {['batches', 'materials', 'box_items'].includes(detailPanel.type) && (
                                            detailPanel.data.length === 0 ? (
                                                <p className="p-4 text-slate-400 italic text-center">Không có dữ liệu cho mục này.</p>
                                            ) : (
                                                <table className="w-full text-left border-collapse">
                                                    <thead className="bg-slate-900/50 border-b border-slate-700 text-slate-400 text-xs uppercase">
                                                        <tr>
                                                            {detailPanel.type !== 'box_items' && <th className="p-3">Part Number</th>}
                                                            <th className="p-3">Mã Vật Tư / Code</th>
                                                            {detailPanel.type !== 'box_items' && <th className="p-3 text-right">Số Lượng</th>}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="text-sm text-slate-300 divide-y divide-slate-700/50">
                                                        {detailPanel.data.map((row, i) => (
                                                            <tr key={i} className="hover:bg-slate-700/20">
                                                                {detailPanel.type !== 'box_items' && <td className="p-3 font-bold">{row.PartNO || "N/A"}</td>}
                                                                <td className="p-3 font-mono text-blue-300">{row.Batch || row.RawMaterial || row.Product}</td>
                                                                {detailPanel.type !== 'box_items' && <td className="p-3 text-right font-mono">{row.QTY || 0}</td>}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )
                                        )}

                                        {/* TABLE VIEW CHO DEFECTS */}
                                        {detailPanel.type === 'defects' && (
                                            detailPanel.data.length === 0 ? (
                                                <p className="p-4 text-emerald-400 italic text-center font-bold bg-emerald-900/10">WO này không có báo lỗi (NG) nào.</p>
                                            ) : (
                                                <table className="w-full text-left border-collapse">
                                                    <thead className="bg-slate-900/50 border-b border-slate-700 text-slate-400 text-xs uppercase">
                                                        <tr>
                                                            <th className="p-3">Part Number</th>
                                                            <th className="p-3">Ghi chú</th>
                                                            <th className="p-3 text-right">SL Báo (QTY)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="text-sm text-slate-300 divide-y divide-slate-700/50">
                                                        {detailPanel.data.map((row, i) => (
                                                            <tr key={i} className="hover:bg-slate-700/20 text-rose-300">
                                                                <td className="p-3 font-bold">{row.PartNO}</td>
                                                                <td className="p-3">{row.Description}</td>
                                                                <td className="p-3 text-right font-mono font-bold text-rose-400">{row.QTY}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )
                                        )}

                                        {/* LIST VIEW CHO KẾT QUẢ KHOANH VÙNG REVERSE */}
                                        {detailPanel.type === 'reverse' && (
                                            detailPanel.data.length === 0 ? (
                                                <p className="p-6 text-emerald-400 font-bold text-center bg-emerald-900/20"> Không tìm thấy Box nào khác bị ảnh hưởng bởi các WO lỗi. </p>
                                            ) : (
                                                <div>
                                                    <div className="p-3 bg-rose-500/10 text-rose-400 text-sm font-bold border-b border-rose-500/20 flex items-center justify-between">
                                                        <span>PHẠM VI KHOANH VÙNG BỊ LỖI</span>
                                                        <span className="bg-rose-500 text-white px-2 py-0.5 rounded text-xs">{detailPanel.data.length} BOXES</span>
                                                    </div>
                                                    <ul className="divide-y divide-slate-700/50 max-h-[60vh] overflow-y-auto">
                                                        {detailPanel.data.map((box, i) => (
                                                            <li key={i} className="p-3 sm:p-4 hover:bg-slate-700/30 flex flex-col group cursor-default">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <Package className="text-rose-400 opacity-50" />
                                                                        <p className="font-bold text-slate-200 font-mono text-lg">{box.BoxID || box.Box || box}</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <button onClick={() => handleViewDetails('box_items', box.BoxID || box.Box || box)} className="text-xs bg-slate-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded transition-colors" title="Xem danh sách mã trong thùng này">
                                                                            XEM ITEMS
                                                                        </button>
                                                                        <button onClick={() => { setSearchMode('BOX'); setSearchInput(box.BoxID || box.Box || box); executeForwardTrace(box.BoxID || box.Box || box); }} className="text-xs bg-slate-700 hover:bg-blue-600 text-white px-3 py-1.5 rounded transition-colors">
                                                                            XEM PHẢ HỆ
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )
                                        )}

                                        {/* VIEW TRÚT TÌM BẰNG SẢN PHẨM GIỮ NGUYÊN */}
                                        {detailPanel.type === 'product_search' && (
                                            <div>
                                                {detailPanel.data.warning && (
                                                    <div className="p-4 bg-amber-500/10 text-amber-300 text-sm leading-relaxed border-b border-amber-500/20 flex items-start gap-3">
                                                        <AlertTriangle className="shrink-0 mt-0.5" size={20} /> <p><b>{detailPanel.data.warning}</b></p>
                                                    </div>
                                                )}
                                                <ul className="divide-y divide-slate-700/50 max-h-[60vh] overflow-y-auto">
                                                    {detailPanel.data.boxes.map((box, i) => (
                                                        <li key={i} className="p-3 sm:p-4 hover:bg-slate-700/30 flex items-center justify-between group transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <Package className="text-blue-500/70" />
                                                                <div>
                                                                    <p className="font-bold text-slate-200 font-mono text-lg select-all">{box.BoxID}</p>
                                                                    <p className="text-xs text-slate-400">Đóng gói lúc: {box.PackTime}</p>
                                                                </div>
                                                            </div>
                                                            <button onClick={() => { navigator.clipboard.writeText(box.BoxID); setSearchMode('BOX'); setSearchInput(box.BoxID); alert(`Đã copy mã Thùng: ${box.BoxID}. Vui lòng bấm TRUY VẾT.`); }} className="text-xs bg-slate-700 hover:bg-blue-600 text-white px-3 py-2 rounded transition-all shadow-md active:scale-95 font-bold"> Truy vết </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
export default TraceabilityView;