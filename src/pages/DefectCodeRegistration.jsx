import React, { useState, useEffect } from "react";
import { Search, Plus, Edit, Trash2, X, ShieldAlert, Tag, LayoutGrid } from "lucide-react";
import Sidebar from "../components/layout/Sidebar";
import TopSystemBar from "../components/layout/TopSystemBar";
import { ActionButton } from "../components/common/ActionButton";
import { defectCodeAPI } from "../api/defectCodeApi";

const DefectCodeRegistration = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [codes, setCodes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStation, setFilterStation] = useState("All");

    const [modal, setModal] = useState({ isOpen: false, mode: 'add', data: null });
    const [formData, setFormData] = useState({ code: '', station: 'All', englishName: '', vietnameseName: '' });

    useEffect(() => { fetchCodes(); }, []);

    const fetchCodes = async () => {
        setIsLoading(true);
        try {
            const res = await defectCodeAPI.getAllCodes();
            setCodes(res.data || []);
        } catch (error) {
            console.error("Lỗi tải danh sách mã lỗi", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Tự động quét danh sách trạm từ dữ liệu thực tế
    const uniqueStations = Array.from(new Set(codes.map(c => c.Station))).filter(s => s);

    const handleOpenModal = (mode, data = null) => {
        if (mode === 'edit' && data) {
            setFormData({ code: data.Code, station: data.Station, englishName: data.EnglishName, vietnameseName: data.VietnameseName });
        } else {
            setFormData({ code: '', station: 'All', englishName: '', vietnameseName: '' });
        }
        setModal({ isOpen: true, mode, data });
    };

    const handleSave = async () => {
        if (!formData.code || !formData.station || !formData.englishName || !formData.vietnameseName) {
            return alert("Vui lòng điền đầy đủ các thông tin!");
        }
        try {
            if (modal.mode === 'add') {
                const res = await defectCodeAPI.createCode(formData);
                if(res.success) alert("Đã thêm mã lỗi mới!");
                else return alert(res.message);
            } else {
                const res = await defectCodeAPI.updateCode(modal.data.ID, formData);
                if(res.success) alert("Đã cập nhật mã lỗi!");
                else return alert(res.message);
            }
            setModal({ isOpen: false, mode: 'add', data: null });
            fetchCodes();
        } catch (error) {
            alert("Lỗi khi lưu dữ liệu lên Server!");
        }
    };

    const handleDelete = async (id, codeStr) => {
        if(window.confirm(`Xóa mã lỗi [${codeStr}]? Hành động này không thể hoàn tác.`)) {
            try {
                await defectCodeAPI.deleteCode(id);
                fetchCodes();
            } catch (error) {
                alert("Xóa thất bại!");
            }
        }
    };

    const filteredCodes = codes.filter(c => {
        const matchSearch = c.Code.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            c.VietnameseName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchStation = filterStation === "All" || c.Station === filterStation;
        return matchSearch && matchStation;
    });

    return (
        <div className="flex h-screen bg-slate-900 text-white font-sans overflow-hidden">
            <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            <main className="flex-1 flex flex-col min-w-0 bg-slate-900 relative">
                <TopSystemBar />

                <div className="flex-1 p-6 overflow-auto custom-scrollbar">
                    <div className="max-w-6xl mx-auto space-y-6">
                        
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                            <div>
                                <h1 className="text-3xl font-black flex items-center gap-3">
                                    <ShieldAlert className="text-rose-500" size={36}/> 
                                    Master Defect Registry
                                </h1>
                                <p className="text-slate-500 font-medium tracking-wide">Quản lý mã lỗi và Trạm chịu trách nhiệm lý thuyết</p>
                            </div>
                            <ActionButton label="THÊM MÃ LỖI (ADD)" color="blue" icon={<Plus size={18}/>} onClick={() => handleOpenModal('add')} />
                        </div>

                        <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50 flex flex-col sm:flex-row gap-4 shadow-inner">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-3 text-slate-500" size={18}/>
                                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Tìm mã lỗi hoặc tên..." className="w-full bg-slate-900/50 border border-slate-600 text-white pl-10 pr-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                            </div>
                            <div className="w-full sm:w-64 relative">
                                <LayoutGrid className="absolute left-3 top-3 text-slate-500" size={18}/>
                                <select value={filterStation} onChange={(e) => setFilterStation(e.target.value)} className="w-full bg-slate-900/50 border border-slate-600 text-white pl-10 pr-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer">
                                    <option value="All">Tất cả Trạm</option>
                                    {uniqueStations.map(st => <option key={st} value={st}>Trạm: {st}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl relative">
                            {isLoading && <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-10 flex items-center justify-center font-bold">ĐANG TẢI...</div>}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-900 text-slate-400 text-xs uppercase tracking-widest">
                                        <tr>
                                            <th className="p-4 border-b border-slate-700">Mã (Code)</th>
                                            <th className="p-4 border-b border-slate-700">Tên Tiếng Việt</th>
                                            <th className="p-4 border-b border-slate-700 text-slate-500 italic">English Name</th>
                                            <th className="p-4 border-b border-slate-700">Trạm Lý Thuyết</th>
                                            <th className="p-4 border-b border-slate-700 text-center">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/50">
                                        {filteredCodes.length === 0 ? (
                                            <tr><td colSpan="5" className="p-12 text-center text-slate-600 font-medium">Chưa có dữ liệu mã lỗi cho tiêu chí này.</td></tr>
                                        ) : (
                                            filteredCodes.map(c => (
                                                <tr key={c.ID} className="hover:bg-slate-700/20 transition-colors group">
                                                    <td className="p-4 font-mono font-bold text-rose-400">{c.Code}</td>
                                                    <td className="p-4 text-slate-200 font-medium">{c.VietnameseName}</td>
                                                    <td className="p-4 text-slate-500 text-sm italic">{c.EnglishName}</td>
                                                    <td className="p-4">
                                                        <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-md text-[11px] font-black uppercase flex items-center gap-1.5 w-max">
                                                            <Tag size={10}/> {c.Station}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 flex justify-center gap-2">
                                                        <button onClick={() => handleOpenModal('edit', c)} className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"><Edit size={18}/></button>
                                                        <button onClick={() => handleDelete(c.ID, c.Code)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"><Trash2 size={18}/></button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </div>

                {modal.isOpen && (
                    <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
                        <div className="bg-slate-800 w-full max-w-lg rounded-3xl border border-slate-700 shadow-2xl overflow-hidden p-1">
                            <div className="p-6 bg-slate-800">
                                <div className="flex justify-between items-center mb-8">
                                    <h2 className="text-2xl font-black text-white tracking-tight">{modal.mode === 'add' ? 'Thêm Mã Lỗi Mới' : 'Sửa Mã Lỗi'}</h2>
                                    <button onClick={() => setModal({isOpen: false, mode: 'add', data: null})} className="p-2 bg-slate-900 hover:bg-red-500/20 text-slate-500 hover:text-red-500 rounded-full transition-all"><X size={20}/></button>
                                </div>
                                <div className="space-y-5 mb-8">
                                    <div>
                                        <label className="block text-slate-500 text-xs font-black uppercase mb-1.5 ml-1">Mã Lỗi (Code) *</label>
                                        <input type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} placeholder="VD: SCRATCH, 3510..." className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl outline-none focus:border-blue-500 font-mono" />
                                    </div>
                                    <div>
                                        <label className="block text-slate-500 text-xs font-black uppercase mb-1.5 ml-1">Trạm Chịu Trách Nhiệm (Station) *</label>
                                        <input type="text" value={formData.station} onChange={e => setFormData({...formData, station: e.target.value})} placeholder="VD: Machining, Painting, All..." className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl outline-none focus:border-blue-500" />
                                    </div>
                                    <div className="grid grid-cols-1 gap-5">
                                        <div>
                                            <label className="block text-slate-500 text-xs font-black uppercase mb-1.5 ml-1">Tên Tiếng Việt *</label>
                                            <input type="text" value={formData.vietnameseName} onChange={e => setFormData({...formData, vietnameseName: e.target.value})} placeholder="VD: Xước bề mặt..." className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl outline-none focus:border-blue-500" />
                                        </div>
                                        <div>
                                            <label className="block text-slate-500 text-xs font-black uppercase mb-1.5 ml-1">English Name *</label>
                                            <input type="text" value={formData.englishName} onChange={e => setFormData({...formData, englishName: e.target.value})} placeholder="VD: Surface Scratch..." className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl outline-none focus:border-blue-500" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setModal({isOpen: false, mode: 'add', data: null})} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-2xl font-bold transition-all">HỦY BỎ</button>
                                    <button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-900/40 transition-all active:scale-95">LƯU CẤU HÌNH</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
export default DefectCodeRegistration;