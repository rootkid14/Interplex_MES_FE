import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    PackageSearch, PackagePlus, PackageMinus, Barcode, 
    ArrowLeft, Search, RefreshCw, CheckCircle2, XCircle, Clock, TableIcon,
    Loader2, ChevronLeft, ChevronRight, Layers, ChevronDown, Package,
    Building2, X
} from 'lucide-react';
import { wipAPI } from '../api/wipAPI';
import useAuthStore from '../store/AuthStore';

const WIP_SCHEMA = [
    { name: 'batch', label: 'Batch No.', type: 'string' },
    { name: 'pn', label: 'Part Number', type: 'string' }, // <--- THÊM CỘT PN VÀO SCHEMA BẢNG CHÍNH
    { name: 'qty', label: 'Quantity', type: 'number' },
    { name: 'in_date', label: 'In Date', type: 'datetime' },
    { name: 'out_date', label: 'Out Date', type: 'datetime' },
    { name: 'status', label: 'Status', type: 'string' }
];

const DEFAULT_ADMIN_DEPARTMENTS = [
    'COATING',
    'MOLDING',
    'PLATING',
    'NCT',
    'STAMPING',
    'SECONDARY'
];

const normalizeDepartment = (value) =>
    String(value || '').trim();

const normalizeDepartmentList = (value) => {
    if (Array.isArray(value)) {
        return value.map(normalizeDepartment).filter(Boolean);
    }
    if (typeof value === 'string') {
        return value
            .split(',')
            .map(normalizeDepartment)
            .filter(Boolean);
    }
    return [];
};

const WarehousePage = () => {
    const navigate = useNavigate();
    const user = useAuthStore(state => state.user);

    const authDepartment = normalizeDepartment(
        user?.responsible_department
        || user?.department
        || user?.Department
        || user?.Deptment
        || user?.dept
    );

    const userRole = normalizeDepartment(
        user?.role || user?.Role
    ).toUpperCase();

    const isAdmin = (
        userRole === 'ADMIN'
        || userRole === 'SUPERADMIN'
        || userRole === 'SUPERVISOR'
    );

    const departmentsFromAuth = normalizeDepartmentList(
        user?.allowed_departments
        || user?.allowedDepartments
        || user?.departments
        || user?.Departments
    );

    const departmentOptions = Array.from(
        new Set([
            ...departmentsFromAuth,
            authDepartment,
            ...(isAdmin ? DEFAULT_ADMIN_DEPARTMENTS : [])
        ].filter(Boolean))
    );

    // --- STATES ---
    const [activeTab, setActiveTab] = useState('scan'); // 'scan' | 'search' | 'model'
    const [wipData, setWipData] = useState([]);
    const [scanLogs, setScanLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [responsibleDepartment, setResponsibleDepartment] = useState('');
    const [pendingDepartment, setPendingDepartment] = useState('');
    const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);

    // Pagination & Filter (Dùng cho tra cứu dạng phẳng thông thường)
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [pagination, setPagination] = useState({ total_pages: 1, total_records: 0 });
    const [searchFilters, setSearchFilters] = useState({ batch: '', status: 'IN_STOCK' });

    // Cấu trúc States Kế thừa Khả năng từ BomConfig (Dùng tra cứu Model)
    const [modelSearchInput, setModelSearchInput] = useState('');
    const [groupedModelData, setGroupedModelData] = useState({});
    const [expandedPNs, setExpandedPNs] = useState({}); // Lưu trạng thái toggle đóng mở của các PN

    // Refs & Layout
    const scanInRef = useRef(null);
    const scanOutRef = useRef(null);
    const [sidebarWidth, setSidebarWidth] = useState(400);
    const isResizing = useRef(false);

    // --- RESIZER LOGIC ---
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

    useEffect(() => {
        if (!responsibleDepartment && authDepartment) {
            setResponsibleDepartment(authDepartment);
            setPendingDepartment(authDepartment);
        }
    }, [authDepartment, responsibleDepartment]);

    const openDepartmentModal = () => {
        setPendingDepartment(
            responsibleDepartment
            || authDepartment
            || departmentOptions[0]
            || ''
        );
        setIsDepartmentModalOpen(true);
    };

    const confirmDepartmentSwitch = () => {
        const nextDepartment = normalizeDepartment(pendingDepartment);
        if (!nextDepartment) return;

        setResponsibleDepartment(nextDepartment);
        setPage(1);
        setSearchFilters({ batch: '', status: 'IN_STOCK' });
        setModelSearchInput('');
        setGroupedModelData({});
        setExpandedPNs({});
        setActiveTab('scan');
        setIsDepartmentModalOpen(false);
        addLog(
            `Đã chuyển Workspace sang: ${nextDepartment}`,
            'success'
        );
    };

    // --- API CALLS ---
    const loadData = useCallback(async () => {
        // Chỉ tải dữ liệu bảng chính khi không nằm ở tab Model phân nhóm
        if (activeTab === 'model') return;
        setIsLoading(true);
        try {
            const result = await wipAPI.getList({
                page,
                limit: pageSize,
                batch: searchFilters.batch,
                status_filter: searchFilters.status,
                responsible_department: responsibleDepartment
            });
            setWipData(result.data);
            setPagination(result.pagination);
        } catch (error) {
            addLog("Lỗi tải dữ liệu từ server!", "error");
        } finally {
            setIsLoading(false);
        }
    }, [page, pageSize, searchFilters, activeTab, responsibleDepartment]);

    useEffect(() => { loadData(); }, [loadData]);

    // --- HOOK QUÉT TỒN KHO THEO MODEL BOM ---
    const handleModelStockQuery = async () => {
        if (!modelSearchInput.trim()) {
            alert("Vui lòng nhập mã Model cần kiểm tra!");
            return;
        }
        setIsLoading(true);
        try {
            if (!responsibleDepartment) {
                alert("Chưa chọn Responsible Department!");
                return;
            }
            const response = await wipAPI.getByModel(
                modelSearchInput.trim(),
                responsibleDepartment
            );
            if (response.success) {
                setGroupedModelData(response.grouped_data);
                setExpandedPNs({}); // Reset trạng thái collapse đóng hết lại khi có kết quả mới
                addLog(`Tra cứu cấu trúc định mức Model ${modelSearchInput} hoàn tất.`, 'success');
            }
        } catch (err) {
            setGroupedModelData({});
            addLog(err.response?.data?.detail || "Lỗi đồng bộ dữ liệu tồn kho định mức!", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const togglePNGroup = (pn) => {
        setExpandedPNs(prev => ({ ...prev, [pn]: !prev[pn] }));
    };

    // --- SCAN LOGIC ---
    const handleScanIn = async (e) => {
        if (e.key === 'Enter' && e.target.value.trim() !== '') {
            const batch = e.target.value.trim();
            e.target.value = '';
            try {
                if (!responsibleDepartment) {
                    throw new Error("Chưa chọn Responsible Department!");
                }
                const result = await wipAPI.scanIn(
                    batch,
                    responsibleDepartment
                );
                addLog(
                    `Nhập ${result?.data?.qty ?? '-'} PCS | ${batch} | ${responsibleDepartment}`,
                    'success'
                );
                loadData(); 
            } catch (err) {
                addLog(
                    err.response?.data?.detail
                    || err.message
                    || "Lỗi xử lý luồng nhập kho!",
                    "error"
                );
            }
        }
    };

    const handleScanOut = async (e) => {
        if (e.key === 'Enter' && e.target.value.trim() !== '') {
            const batch = e.target.value.trim();
            e.target.value = '';
            try {
                if (!responsibleDepartment) {
                    throw new Error("Chưa chọn Responsible Department!");
                }
                await wipAPI.scanOut(
                    batch,
                    responsibleDepartment
                );
                addLog(
                    `Xuất thành công lô: ${batch} | ${responsibleDepartment}`,
                    'success'
                );
                loadData();
            } catch (err) {
                addLog(
                    err.response?.data?.detail
                    || err.message
                    || "Lỗi xử lý luồng xuất kho!",
                    "error"
                );
            }
        }
    };

    const addLog = (message, type) => {
        const time = new Date().toLocaleTimeString();
        setScanLogs(prev => [{ time, message, type }, ...prev].slice(0, 50));
    };

    return (
        <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-200 overflow-hidden font-sans">
            {/* HEADER */}
            <div className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center shrink-0">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-sm font-bold">
                    <ArrowLeft size={18}/> BACK
                </button>
                <div className="ml-6 flex items-center gap-3">
                    <div className="bg-emerald-600/20 p-2 rounded-lg"><PackageSearch className="text-emerald-500" size={20} /></div>
                    <h1 className="text-xl font-black text-white uppercase tracking-widest">WIP Warehouse</h1>
                </div>

            </div>

            {/* WORKSPACE CONTEXT - luôn hiển thị rõ department đang chịu trách nhiệm */}
            <div className="bg-blue-950/40 border-b border-blue-500/30 px-6 py-3 flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-4 min-w-0">
                    <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl shrink-0">
                        <Building2 size={24} className="text-blue-300" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.25em] text-blue-400 font-black">Current Workspace</p>
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-0.5">
                            <h2 className={`text-2xl font-black tracking-wide ${responsibleDepartment ? 'text-white' : 'text-rose-400'}`}>
                                {responsibleDepartment || 'CHƯA THIẾT LẬP'}
                            </h2>
                            <span className="text-xs text-slate-400">
                                Mọi Scan IN/OUT, Search và Tồn theo Model đều chỉ áp dụng trong workspace này.
                            </span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={openDepartmentModal}
                    className="shrink-0 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl font-black tracking-wider shadow-lg transition-colors"
                    title="Chuyển Responsible Department workspace"
                >
                    SWITCH WORKSPACE
                    <ChevronDown size={18} />
                </button>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex overflow-hidden">
                {/* LEFT SIDEBAR */}
                <div style={{ width: sidebarWidth }} className="bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
                    <div className="flex p-2 bg-slate-950 border-b border-slate-800 gap-1">
                        <button onClick={() => setActiveTab('scan')} className={`flex-1 py-3 px-1 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-colors ${activeTab === 'scan' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-400'}`}>
                            <Barcode size={14} className="inline mr-1 mb-0.5"/> Nhập/Xuất
                        </button>
                        <button onClick={() => setActiveTab('search')} className={`flex-1 py-3 px-1 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-colors ${activeTab === 'search' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-400'}`}>
                            <Search size={14} className="inline mr-1 mb-0.5"/> Tra cứu Batch
                        </button>
                        <button onClick={() => setActiveTab('model')} className={`flex-1 py-3 px-1 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-colors ${activeTab === 'model' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-400'}`}>
                            <Layers size={14} className="inline mr-1 mb-0.5"/> Tồn theo Model 
                        </button>
                    </div>

                    <div className="flex-1 overflow-auto p-5">
                        {activeTab === 'scan' && (
                            <div className="space-y-6">
                                {!responsibleDepartment && (
                                    <button
                                        onClick={openDepartmentModal}
                                        className="w-full p-3 bg-rose-500/10 border border-rose-500/40 text-rose-300 rounded-lg text-sm font-bold"
                                    >
                                        Chọn Responsible Department trước khi scan
                                    </button>
                                )}
                                <div>
                                    <label className="text-xs font-bold text-emerald-400 mb-2 block uppercase tracking-widest">Scan IN</label>
                                    <input onKeyDown={handleScanIn} ref={scanInRef} disabled={!responsibleDepartment} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-lg text-white outline-none font-mono focus:border-emerald-500 shadow-inner" placeholder="Quét mã batch nhập kho..." />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-rose-400 mb-2 block uppercase tracking-widest">Scan OUT</label>
                                    <input onKeyDown={handleScanOut} ref={scanOutRef} disabled={!responsibleDepartment} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-lg text-white outline-none font-mono focus:border-rose-500 shadow-inner" placeholder="Quét mã batch xuất kho..." />
                                </div>
                                <div className="space-y-2 pt-4 border-t border-slate-800">
                                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-widest">Nhật ký trạm quét</span>
                                    <div className="max-h-[200px] overflow-y-auto space-y-1.5 custom-scrollbar">
                                        {scanLogs.map((log, i) => (
                                            <div key={i} className={`text-xs p-2.5 rounded border font-mono flex justify-between ${log.type === 'success' ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400' : 'bg-rose-950/30 border-rose-500/20 text-rose-400'}`}>
                                                <span>{log.message}</span>
                                                <span className="text-slate-600 shrink-0 ml-2">{log.time}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'search' && (
                            <div className="space-y-4">
                                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300">
                                    Đang tra cứu trong Workspace: <b>{responsibleDepartment || '-'}</b>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 mb-2 block uppercase">Mã Số Lô (Batch No.)</label>
                                    <input value={searchFilters.batch} onChange={(e) => setSearchFilters({...searchFilters, batch: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-lg text-white font-mono outline-none focus:border-blue-500" placeholder="Nhập ký tự tìm kiếm..."/>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 mb-2 block uppercase">Trạng thái</label>
                                    <select
                                        value={searchFilters.status}
                                        onChange={(e) => {
                                            setSearchFilters({...searchFilters, status: e.target.value});
                                            setPage(1);
                                        }}
                                        className="w-full bg-slate-950 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-blue-500"
                                    >
                                        <option value="IN_STOCK">Đang chịu trách nhiệm (IN_STOCK)</option>
                                        <option value="OUT">Đã chuyển ra (OUT)</option>
                                        <option value="">Tất cả lịch sử của workspace</option>
                                    </select>
                                </div>
                                <button onClick={loadData} className="w-full bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg font-bold transition-colors shadow">TÌM KIẾM TRONG WORKSPACE</button>
                            </div>
                        )}

                        {activeTab === 'model' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-blue-400 mb-2 block uppercase tracking-wider">Mã Model</label>
                                    <input 
                                        value={modelSearchInput} 
                                        onChange={(e) => setModelSearchInput(e.target.value)} 
                                        className="w-full bg-slate-950 border border-slate-700 p-3 rounded-lg text-white font-mono uppercase outline-none focus:border-blue-500 shadow-inner" 
                                        placeholder="Nhập mã Model sản xuất..."
                                        onKeyDown={(e) => e.key === 'Enter' && handleModelStockQuery()}
                                    />
                                </div>
                                <button onClick={handleModelStockQuery} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-lg font-black tracking-widest transition-colors flex items-center justify-center gap-2 shadow-lg">
                                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} QUÉT TỒN ĐỊNH MỨC
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* RESIZER */}
                <div onMouseDown={startResizing} className="w-1 bg-slate-800 hover:bg-blue-500 cursor-col-resize transition-colors"></div>

                {/* TABLE / CONTENT SECTION */}
                <div className="flex-1 flex flex-col min-w-0 bg-slate-950 p-6 overflow-auto">
                    {isLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-blue-400 gap-3">
                            <Loader2 className="animate-spin text-blue-500" size={36}/>
                            <span className="text-sm font-semibold tracking-wider animate-pulse">ĐANG TRUY VẤN DỮ LIỆU KHO...</span>
                        </div>
                    ) : activeTab === 'model' ? (
                        /* GIAO DIỆN TRA CỨU THEO MODEL (PHÂN NHÓM COLLAPSIBLE) */
                        <div className="flex-1 flex flex-col space-y-3">
                            {Object.keys(groupedModelData).length === 0 ? (
                                <div className="flex-1 flex items-center justify-center text-slate-600 italic border border-dashed border-slate-800 rounded-xl">
                                    Vui lòng nhập mã cấu hình Model ở cột trái và nhấn "QUÉT TỒN ĐỊNH MỨC".
                                </div>
                            ) : (
                                Object.entries(groupedModelData).map(([pn, batches]) => {
                                    const isExpanded = !!expandedPNs[pn];
                                    return (
                                        <div key={pn} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
                                            {/* Header nhóm vật tư PN */}
                                            <div 
                                                onClick={() => togglePNGroup(pn)}
                                                className="p-4 bg-slate-850 hover:bg-slate-800 cursor-pointer flex items-center justify-between transition-colors select-none"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
                                                        <Package size={16} />
                                                    </div>
                                                    <span className="font-mono font-bold text-[15px] text-white tracking-wide">{pn}</span>
                                                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${batches.length > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                                                        Tồn kho hiện tại: {batches.length} lô
                                                    </span>
                                                </div>
                                                <div className="text-slate-400">
                                                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                </div>
                                            </div>

                                            {/* Danh sách mảng lô thuộc PN */}
                                            {isExpanded && (
                                                <div className="border-t border-slate-800 bg-slate-950/50">
                                                    {batches.length === 0 ? (
                                                        <div className="p-4 text-xs text-slate-500 italic pl-6">Không tìm thấy mã lô nào đang lưu kho (IN_STOCK) cho vật tư này.</div>
                                                    ) : (
                                                        <table className="w-full text-left border-collapse">
                                                            <thead className="bg-slate-900 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                                                                <tr>
                                                                    <th className="py-2.5 px-6 font-semibold">Mã Lô (Batch)</th>
                                                                    <th className="py-2.5 px-4 font-semibold">Số lượng (Qty)</th>
                                                                    <th className="py-2.5 px-4 font-semibold">Ngày Vào (In Date)</th>
                                                                    <th className="py-2.5 px-4 font-semibold">Trạng Thái</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-900">
                                                                {batches.map((item, idx) => (
                                                                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                                                                        <td className="py-3 px-6 font-mono text-sm text-slate-200">{item.batch}</td>
                                                                        <td className="py-3 px-4 text-sm text-slate-300 font-medium">{item.qty}</td>
                                                                        <td className="py-3 px-4 text-xs text-emerald-400 font-mono">{item.in_date}</td>
                                                                        <td className="py-3 px-4 text-xs"><span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400 font-bold">{item.status}</span></td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    ) : (
                        /* GIAO DIỆN BẢNG PHẲNG TRA CỨU TIÊU CHUẨN */
                        <div className="flex-1 flex flex-col justify-between">
                            <div className="overflow-auto flex-1">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-800 text-blue-400 text-xs uppercase sticky top-0 z-10 shadow">
                                        <tr>
                                            {WIP_SCHEMA.map(col => <th key={col.name} className="p-4 border-b border-slate-700">{col.label}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {wipData.length === 0 ? (
                                            <tr><td colSpan={WIP_SCHEMA.length} className="text-center py-10 text-slate-500 italic">Không tìm thấy bản ghi nào thỏa mãn điều kiện lọc.</td></tr>
                                        ) : (
                                            wipData.map((row, i) => (
                                                <tr key={i} className="hover:bg-slate-800/60 transition-colors">
                                                    <td className="p-4 font-mono text-white">{row.batch}</td>
                                                    <td className="p-4 font-mono text-blue-300 text-sm">{row.PN || '-'}</td>
                                                    <td className="p-4 text-slate-300">{row.qty}</td>
                                                    <td className="p-4 text-emerald-400 text-sm font-mono">{row.in_date}</td>
                                                    <td className="p-4 text-rose-400 text-sm font-mono">{row.out_date || '-'}</td>
                                                    <td className="p-4 font-bold text-xs">
                                                        <span className={`px-2 py-0.5 rounded ${row.status === 'IN_STOCK' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'}`}>
                                                            {row.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* PAGINATION BAR (Chỉ hiển thị cho bảng phẳng thông thường) */}
                            <div className="h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-6 mt-4 rounded-xl shrink-0">
                                <span className="text-sm text-slate-400">Tổng: {pagination.total_records} bản ghi trong kho</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="p-2 bg-slate-800 rounded text-slate-400 hover:text-white disabled:opacity-30"><ChevronLeft size={16}/></button>
                                    <span className="px-4 py-2 font-bold text-sm bg-slate-950 rounded border border-slate-800">Trang {page} / {pagination.total_pages || 1}</span>
                                    <button onClick={() => setPage(p => Math.min(pagination.total_pages, p+1))} disabled={page >= pagination.total_pages} className="p-2 bg-slate-800 rounded text-slate-400 hover:text-white disabled:opacity-30"><ChevronRight size={16}/></button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isDepartmentModalOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-slate-900 border border-blue-500/40 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Building2 className="text-blue-400" size={22} />
                                <div>
                                    <h2 className="text-white font-black">Switch Workspace</h2>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Chuyển toàn bộ màn hình WIP sang workspace của department đã chọn.
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsDepartmentModalOpen(false)} className="text-slate-500 hover:text-white">
                                <X size={22} />
                            </button>
                        </div>

                        <div className="p-5">
                            {departmentOptions.length > 0 ? (
                                <select
                                    value={pendingDepartment}
                                    onChange={(e) => setPendingDepartment(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 text-white p-3 rounded-lg outline-none focus:border-blue-500 font-bold"
                                >
                                    {departmentOptions.map(department => (
                                        <option key={department} value={department}>
                                            {department}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-lg text-sm">
                                    Authentication response chưa có department hoặc allowed_departments.
                                </div>
                            )}

                            <div className="mt-4 p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-400">
                                Login: <span className="text-white font-bold">{user?.name || user?.username || user?.id || '-'}</span>
                                <br />
                                Workspace mặc định từ Authentication: <span className="text-blue-300 font-bold">{authDepartment || '-'}</span>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setIsDepartmentModalOpen(false)}
                                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold"
                                >
                                    HỦY
                                </button>
                                <button
                                    onClick={confirmDepartmentSwitch}
                                    disabled={!pendingDepartment}
                                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg font-black"
                                >
                                    XÁC NHẬN
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WarehousePage;