import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database,Plus, TableIcon, Layers,BarChart2, Filter, Play, Download, Trash2, EyeOff, Eye, ChevronLeft, ChevronRight, Loader2, X, ArrowLeft, Settings2, Maximize2, Copy, Check, Edit2, Save } from 'lucide-react';
import { useDBEngineStore } from '../store/DatabaseEngineStore';
import PlotEngineView from '../components/common/database_engine/PlotEngineView';
import useAuthStore from '../store/AuthStore';
// === COMPONENT ĐỆ QUY CHO BỘ LỌC CÂY ===
// === COMPONENT ĐỆ QUY CHO BỘ LỌC CÂY (ĐÃ PHÓNG TO UI) ===
const FilterNode = ({ 
    node, 
    schema, 
    isRoot = false, 
    index = 0, 
    parentLogic = null, 
    parentId = null 
}) => {
    const store = useDBEngineStore();

    const toggleParentLogic = () => {
        if (parentId) {
            const newLogic = parentLogic === 'AND' ? 'OR' : 'AND';
            store.updateNode(parentId, { logic: newLogic });
        }
    };

    const InlineLogic = () => {
        if (index === 0) {
            return (
                <div className="w-16 shrink-0 flex justify-center pt-3"> {/* Đổi w-12 thành w-16 */}
                    {!isRoot && <div className="w-[2px] h-5 bg-slate-700/30 rounded"></div>}
                </div>
            );
        }

        return (
            <div className="w-16 shrink-0 flex justify-center pt-2">
                <button
                    onClick={toggleParentLogic}
                    title="Click để đổi logic của cả nhóm"
                    className={`text-xs font-black rounded px-2.5 py-1 transition-all shadow-sm
                        ${parentLogic === 'AND' ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/40' : 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/40'}`}
                >
                    {parentLogic}
                </button>
            </div>
        );
    };

    if (node.logic) {
        return (
            <div className={`flex ${!isRoot ? 'mb-3' : ''}`}>
                {!isRoot && <InlineLogic />}

                <div className={`flex-1 p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-inner ${isRoot ? 'w-full' : ''}`}>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                {isRoot ? "ROOT FILTER" : "GROUP"}
                            </span>
                            <button
                                onClick={() => store.updateNode(node.id, { logic: node.logic === 'AND' ? 'OR' : 'AND' })}
                                className="text-xs font-bold text-slate-300 hover:text-white bg-slate-950 px-3 py-1 rounded border border-slate-700 transition-colors shadow-sm"
                            >
                                Logic: <span className={node.logic === 'AND' ? 'text-blue-400' : 'text-amber-400'}>{node.logic}</span>
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => store.addRule(node.id)} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded font-bold transition-colors">+ RULE</button>
                            <button onClick={() => store.addGroup(node.id)} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded font-bold transition-colors">+ GROUP</button>
                            {!isRoot && (
                                <button onClick={() => store.removeNode(node.id)} className="text-rose-500 hover:bg-rose-500/20 px-2 py-1.5 rounded transition-colors">
                                    <Trash2 size={16}/> {/* Icon to hơn */}
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className="space-y-0">
                        {node.rules.map((child, idx) => (
                            <FilterNode 
                                key={child.id} 
                                node={child} 
                                schema={schema} 
                                index={idx} 
                                parentLogic={node.logic} 
                                parentId={node.id}       
                            />
                        ))}
                        {node.rules.length === 0 && (
                            <div className="text-xs text-slate-600 italic mt-3 ml-16">Empty group...</div>
                        )}
                    </div>
                </div>
            </div>
        );
    }
    
    const currentColumnDef = schema.find(c => c.name === node.column);
    const isDateTime = currentColumnDef && (currentColumnDef.type.toLowerCase().includes('date') || currentColumnDef.type.toLowerCase().includes('time'));

    return (
        <div className="flex mb-3">
            <InlineLogic />

            <div className="flex-1 bg-slate-950 p-3 rounded-xl border border-slate-700/50 flex flex-col gap-2 hover:border-blue-500/50 transition-colors shadow-sm">
                
                {/* ĐÃ SỬA: HIGHLIGHT DROPDOWN CHỌN CỘT */}
                <div className="flex items-center">
                    <div className="bg-blue-900/40 border border-blue-500/50 rounded-lg px-2 py-1 flex items-center gap-2 w-full sm:w-2/3 transition-colors hover:bg-blue-900/60">
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        <select 
                            value={node.column} 
                            onChange={e => store.updateNode(node.id, { column: e.target.value })} 
                            className="bg-transparent text-blue-300 text-sm font-bold outline-none cursor-pointer w-full"
                        >
                            {schema.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                        </select>
                        <span className="text-[10px] text-blue-400/50 font-mono ml-auto px-2 uppercase">{currentColumnDef?.type || 'unknown'}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 mt-1">
                    <select 
                        value={node.operator} 
                        onChange={e => store.updateNode(node.id, { operator: e.target.value })} 
                        className="bg-slate-900 border border-slate-700 text-amber-500 text-xs sm:text-sm font-black rounded px-2 py-1.5 outline-none"
                    >
                        <option value="==">==</option>
                        <option value="!=">!=</option>
                        <option value=">">&gt;</option>
                        <option value="<">&lt;</option>
                        <option value="CONTAINS">LIKE</option>
                    </select>
                    
                    {/* ĐÃ SỬA: AUTO ĐỔI SANG DATE-PICKER NẾU LÀ DATETIME */}
                    <input 
                        type={isDateTime ? "datetime-local" : "text"} 
                        value={node.value} 
                        onChange={e => store.updateNode(node.id, { value: e.target.value })} 
                        placeholder={isDateTime ? "" : "Nhập giá trị..."} 
                        className={`flex-1 bg-slate-900 border border-slate-700 text-white text-sm rounded px-3 py-1.5 outline-none font-mono min-w-[50px] focus:border-blue-500 transition-colors ${isDateTime ? 'cursor-pointer' : ''}`} 
                    />
                    
                    <button onClick={() => store.removeNode(node.id)} className="text-slate-500 hover:text-rose-500 transition-colors p-1 bg-slate-900 rounded">
                        <X size={18}/>
                    </button>
                </div>
            </div>
        </div>
    );
};

// === MODAL: XEM CHI TIẾT CELL DÀI / JSON ===
const CellViewerModal = ({ content, onClose }) => {
    const [copied, setCopied] = useState(false);
    let displayContent = content;
    try {
        if (typeof content === 'string' && (content.startsWith('{') || content.startsWith('['))) {
            displayContent = JSON.stringify(JSON.parse(content), null, 2);
        }
    } catch(e) {}

    const handleCopy = () => {
        navigator.clipboard.writeText(displayContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh]">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50 rounded-t-xl">
                    <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2"><Maximize2 size={18}/> Cell Inspector</h3>
                    <div className="flex gap-2">
                        <button onClick={handleCopy} className="text-slate-300 hover:text-emerald-400 bg-slate-800 px-3 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition-colors">
                            {copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'COPIED!' : 'COPY'}
                        </button>
                        <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded"><X size={16}/></button>
                    </div>
                </div>
                <div className="p-4 flex-1 overflow-auto">
                    <pre className="text-sm text-emerald-300 font-mono whitespace-pre-wrap word-break">{displayContent}</pre>
                </div>
            </div>
        </div>
    );
};

// === MODAL: SỬA DỮ LIỆU ===
const RowEditModal = ({ row, schema, pkColumn, onSave, onClose }) => {
    const [formData, setFormData] = useState({ ...row });
    return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-700 bg-amber-900/20 text-amber-500 font-bold flex justify-between items-center rounded-t-xl">
                    <span className="flex items-center gap-2"><Edit2 size={18}/> Edit Record ({pkColumn}: {row[pkColumn]})</span>
                    <button onClick={onClose} className="text-amber-500/70 hover:text-amber-500"><X size={20}/></button>
                </div>
                <div className="p-6 flex-1 overflow-auto space-y-4">
                    {schema.map(col => (
                        <div key={col.name}>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{col.name}</label>
                            <textarea 
                                value={formData[col.name] !== null ? formData[col.name] : ''} 
                                onChange={e => setFormData({...formData, [col.name]: e.target.value})}
                                disabled={col.name === pkColumn}
                                rows={typeof formData[col.name] === 'string' && formData[col.name].length > 50 ? 3 : 1}
                                className="w-full bg-slate-950 border border-slate-700 text-white rounded p-2 text-sm font-mono outline-none focus:border-blue-500 disabled:opacity-50"
                            />
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-slate-700 flex justify-end gap-3 bg-slate-800/30 rounded-b-xl">
                    <button onClick={onClose} className="px-5 py-2 text-slate-400 hover:text-white font-bold text-sm">Cancel</button>
                    <button onClick={() => onSave(formData)} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded shadow font-bold text-sm flex items-center gap-2">
                        <Save size={16}/> LƯU THAY ĐỔI
                    </button>
                </div>
            </div>
        </div>
    );
};

// === GIAO DIỆN CHÍNH ===
const DatabaseEnginePage = () => {
    const store = useDBEngineStore();
    const { user } = useAuthStore();
    const navigate = useNavigate();

    const totalPages = Math.ceil(store.totalRows / store.pageSize) || 1;
    const canEditDatabase = user?.dept === 'IT';
    
    const [showColsMenu, setShowColsMenu] = useState(false);
    const [cellViewerData, setCellViewerData] = useState(null);
    const [editRowData, setEditRowData] = useState(null);

    // Xử lý Resize cột Sidebar
    const [sidebarWidth, setSidebarWidth] = useState(450); 
    const isResizing = useRef(false);

    const startResizing = () => { isResizing.current = true; document.body.style.cursor = 'col-resize'; };
    const stopResizing = () => { isResizing.current = false; document.body.style.cursor = 'default'; };
    
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing.current) return;
            const newWidth = e.clientX;
            if (newWidth > 300 && newWidth < 800) setSidebarWidth(newWidth);
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResizing);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', stopResizing);
        };
    }, []);

    useEffect(() => { store.fetchTables(); }, []);

    const pkColumn = store.schema.length > 0 ? store.schema[0].name : null;

    const handleDelete = (row) => {
        if (!pkColumn) return alert("Không nhận diện được Primary Key.");
        if (window.confirm(`Nguy hiểm: Bạn có chắc muốn xóa bản ghi có [${pkColumn} = ${row[pkColumn]}] không?`)) {
            store.deleteRecord(pkColumn, row[pkColumn]);
        }
    };

    const handleSaveEdit = (newData) => {
        store.updateRecord(pkColumn, newData[pkColumn], newData);
        setEditRowData(null);
    };

    return (
        <div className="h-screen w-screen flex flex-col bg-slate-950 font-sans text-slate-200 overflow-hidden">
            {cellViewerData && <CellViewerModal content={cellViewerData} onClose={() => setCellViewerData(null)} />}
            {editRowData && <RowEditModal row={editRowData} schema={store.schema} pkColumn={pkColumn} onSave={handleSaveEdit} onClose={() => setEditRowData(null)} />}

            {/* HEADER */}
            <div className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0 relative z-50 shadow-sm">
                <div className="flex items-center gap-6">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors border border-slate-700 shadow-sm font-bold text-sm">
                        <ArrowLeft size={18}/> BACK TO MES
                    </button>
                    <div className="w-px h-8 bg-slate-800"></div>
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600/20 p-2 rounded-lg"><Database className="text-blue-500" size={20} /></div>
                        <h1 className="text-xl font-black text-white tracking-widest uppercase">Data Explorer</h1>
                    </div>
                </div>

                {/* MODE SWITCHER */}
                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-700/50 shadow-inner">
                    <button 
                        onClick={() => store.setViewMode('table')}
                        className={`flex items-center gap-2 px-6 py-1.5 rounded text-xs font-black uppercase tracking-widest transition-all ${store.viewMode === 'table' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <TableIcon size={14}/> Table Data
                    </button>
                    <button 
                        onClick={() => store.setViewMode('visualize')}
                        className={`flex items-center gap-2 px-6 py-1.5 rounded text-xs font-black uppercase tracking-widest transition-all ${store.viewMode === 'visualize' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <BarChart2 size={14}/> Visualize
                    </button>
                </div>
                
                {/* TOOLBAR BÊN PHẢI (Chỉ hiện nút tùy biến ở mode Table) */}
                <div className="flex items-center gap-3">
                    {store.viewMode === 'table' && (
                        <div className="relative">
                            <button onClick={() => setShowColsMenu(!showColsMenu)} disabled={!store.selectedTable} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 border border-slate-700">
                                <Settings2 size={18}/> LAYOUT
                            </button>
                            {showColsMenu && (
                                <>
                                    <div className="fixed inset-0 z-30" onClick={() => setShowColsMenu(false)}></div>
                                    <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-600 p-4 rounded-xl shadow-2xl z-40 animate-fade-in-up">
                                        <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase flex justify-between">Toggle Columns <span className="bg-slate-800 px-2 rounded text-white">{store.schema.filter(c=>c.isVisible).length}/{store.schema.length}</span></h4>
                                        <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                            {store.schema.map(col => (
                                                <button key={col.name} onClick={() => store.toggleColumnVisibility(col.name)} className={`flex items-center gap-2 p-2 rounded border text-xs font-mono truncate transition-all ${col.isVisible ? 'bg-slate-800 border-slate-600 text-blue-300' : 'bg-slate-950 border-slate-800 text-slate-600'}`}>
                                                    {col.isVisible ? <Eye size={14}/> : <EyeOff size={14}/>} <span className="truncate">{col.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <button 
                        onClick={() => store.exportFullCSV()} 
                        disabled={store.totalRows === 0} 
                        className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 border border-emerald-500/30"
                    >
                        {store.isExporting ? <Loader2 size={18} className="animate-spin"/> : <Download size={18}/>}
                        {store.isExporting ? 'GENERATING CSV...' : 'EXPORT CSV'}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* === CỘT TRÁI: ĐIỀU KHIỂN CHUNG (CÓ THỂ KÉO GIÃN) === */}
                <div style={{ width: sidebarWidth }} className="bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 relative z-10">
                    
                    {/* Chọn Bảng */}
                    <div className="p-5 border-b border-slate-800 bg-slate-800/30">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Target Table</label>
                        <select 
                            value={store.selectedTable || ''} 
                            onChange={e => store.selectTable(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 text-blue-400 font-bold text-sm rounded-lg px-3 py-3 outline-none focus:border-blue-500 shadow-inner cursor-pointer"
                        >
                            <option value="" disabled>-- Select a table --</option>
                            {store.allowedTables.map(t => <option key={t.id} value={t.id}>{t.name} ({t.id})</option>)}
                        </select>
                    </div>

                    {/* Query Builder dạng Cây */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="p-4 flex justify-between items-center bg-slate-800/10 border-b border-slate-800/50 shrink-0">
                            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Filter size={18}/> Query Filters</span>
                        </div>
                        
                        {/* Wrapper cho phép Scroll cả 2 chiều */}
                        <div className="flex-1 overflow-auto p-4 custom-scrollbar bg-slate-950 relative">
                            {store.selectedTable ? (
                                <div className="min-w-[380px] pb-4">
                                    <FilterNode node={store.filterTree} schema={store.schema} isRoot={true} />
                                </div>
                            ) : (
                                <div className="text-center text-slate-500 text-sm italic mt-8 p-4 rounded-xl border border-dashed border-slate-700">Hãy chọn một bảng để bắt đầu.</div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-900 border-t border-slate-800 shrink-0">
                            <button 
                                onClick={() => store.setPage(1)} 
                                disabled={!store.selectedTable || store.isLoading} 
                                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white py-3.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                            >
                                {store.isLoading ? <Loader2 size={18} className="animate-spin"/> : <Play size={18}/>} 
                                {store.isLoading ? 'FETCHING...' : 'EXECUTE QUERY'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* THANH KÉO (RESIZER) */}
                <div onMouseDown={startResizing} className="w-1 bg-slate-800 hover:bg-blue-500 cursor-col-resize z-20 transition-colors"></div>

                {/* === CỘT PHẢI: KHÔNG GIAN LÀM VIỆC CHÍNH === */}
                <div className="flex-1 bg-slate-950 flex flex-col min-w-0">
                    
                    {store.viewMode === 'table' ? (
                        <>
                            {/* --- CHẾ ĐỘ 1: XEM BẢNG DỮ LIỆU --- */}
                            <div className="flex-1 overflow-auto p-4 sm:p-6 custom-scrollbar relative">
                                {store.isLoading && (
                                    <div className="absolute inset-0 z-20 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center">
                                        <div className="bg-slate-800 border border-slate-700 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4">
                                            <Loader2 size={32} className="animate-spin text-blue-500" />
                                            <span className="font-bold text-slate-300 tracking-wider">LOADING...</span>
                                        </div>
                                    </div>
                                )}
                                {!store.selectedTable ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50 border-2 border-dashed border-slate-800 rounded-2xl m-4">
                                        <Database size={80} className="mb-4 text-slate-700" />
                                        <p className="text-xl font-bold tracking-wide">Select a table and Execute.</p>
                                    </div>
                                ) : store.results.length === 0 && !store.isLoading ? (
                                    <div className="h-full flex items-center justify-center text-slate-500 text-lg italic">No records found.</div>
                                ) : (
                                    <div className="bg-slate-900 rounded-xl border border-slate-700 shadow-xl overflow-hidden w-full h-full flex flex-col">
                                        <div className="overflow-auto flex-1 custom-scrollbar">
                                            <table className="min-w-max w-full text-left border-collapse whitespace-nowrap">
                                                <thead className="bg-slate-800/80 sticky top-0 z-10 shadow-sm border-b border-slate-700">
                                                    <tr>
                                                        {/* CHỈ HIỂN THỊ THẺ TH KHI CÓ QUYỀN */}
                                                        {canEditDatabase && <th className="py-4 px-4 text-xs font-black text-slate-500 uppercase w-10 text-center">Act</th>}
                                                        
                                                        {store.schema.filter(c=>c.isVisible).map(col => (
                                                            <th key={col.name} className="py-4 px-6 text-xs font-black text-blue-400 uppercase tracking-wider border-l border-slate-700/50">{col.name}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-800/50">
                                                    {store.results.map((row, i) => (
                                                        <tr key={i} className="hover:bg-slate-800/60 transition-colors group">
                                                            
                                                            {/* CHỈ HIỂN THỊ THẺ TD KHI CÓ QUYỀN */}
                                                            {canEditDatabase && (
                                                                <td className="py-3 px-4 text-center border-r border-slate-800">
                                                                    <div className="flex justify-center gap-3 opacity-30 group-hover:opacity-100 transition-opacity">
                                                                        <button onClick={() => setEditRowData(row)} className="text-amber-500 hover:text-amber-400"><Edit2 size={16}/></button>
                                                                        <button onClick={() => handleDelete(row)} className="text-rose-500 hover:text-rose-400"><Trash2 size={16}/></button>
                                                                    </div>
                                                                </td>
                                                            )}
                                                            {store.schema.filter(c=>c.isVisible).map(col => {
                                                                const val = row[col.name];
                                                                const isLong = val !== null && String(val).length > 40;
                                                                return (
                                                                    <td key={col.name} 
                                                                        onClick={() => { if(isLong) setCellViewerData(String(val)) }}
                                                                        className={`py-3 px-6 text-sm font-mono text-slate-300 max-w-[300px] truncate border-l border-slate-800/50 ${isLong ? 'cursor-pointer hover:bg-blue-900/30 hover:text-blue-300' : ''}`}
                                                                    >
                                                                        {val !== null ? String(val) : <span className="text-slate-600 italic">null</span>}
                                                                    </td>
                                                                )
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* PAGINATION BAR */}
                            {store.selectedTable && (
                                <div className="h-16 bg-slate-900 border-t border-slate-800 px-8 flex items-center justify-between shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.2)] z-20">
                                    <span className="text-sm font-bold text-slate-400 tracking-wider">
                                        TOTAL: <span className="text-white text-base ml-1">{store.totalRows}</span> RECORDS
                                    </span>
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-3 text-sm font-bold text-slate-400">
                                            Rows:
                                            <select value={store.pageSize} onChange={e => store.setPageSize(Number(e.target.value))} className="bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 cursor-pointer">
                                                <option value="25">25</option><option value="50">50</option><option value="100">100</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 rounded-lg p-1.5">
                                            <button onClick={() => store.setPage(store.page - 1)} disabled={store.page === 1} className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-30 text-slate-300 transition-colors">
                                                <ChevronLeft size={20}/>
                                            </button>
                                            
                                            <span className="text-sm font-black text-white px-4 border-x border-slate-700 select-none">
                                                PAGE {store.page} / {totalPages}
                                            </span>

                                            <button onClick={() => store.setPage(store.page + 1)} disabled={store.page >= totalPages} className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-30 text-slate-300 transition-colors">
                                                <ChevronRight size={20}/>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        /* --- CHẾ ĐỘ 2: PLOT VISUALIZER --- */
                        <PlotEngineView />
                    )}
                </div>
            </div>
        </div>
    );
};

export default DatabaseEnginePage;