import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapPin, Search, ChevronDown, Check, AlertTriangle } from 'lucide-react';
import { workstationAPI } from '../../api/workstationApi';

const WctrSelectionModal = ({ isOpen, onClose, onConfirm, woData, isLoadingSubmit }) => {
    const [wctrData, setWctrData] = useState([]);
    const [selectedStation, setSelectedStation] = useState('');
    const [searchLine, setSearchLine] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [error, setError] = useState('');
    const dropdownRef = useRef(null);

    // Fetch data khi mở modal
    useEffect(() => {
        if (isOpen) {
            const fetchWctr = async () => {
                try {
                    const res = await workstationAPI.getWorkCenters();
                    if (res.success && res.data) {
                        setWctrData(res.data);
                        // Default chọn trạm trùng với WC_Type của Lệnh nếu có
                        const matchedStation = res.data.find(d => d.station === woData?.WC_Type);
                        setSelectedStation(matchedStation ? matchedStation.station : (res.data[0]?.station || ''));
                    }
                } catch (err) {
                    console.error("Lỗi fetch WCTR", err);
                    setError("Không thể tải danh sách Line/Trạm từ Server!");
                }
            };
            fetchWctr();
            setSearchLine('');
            setError('');
        }
    }, [isOpen, woData]);

    // Xử lý click ra ngoài để đóng dropdown tìm kiếm
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Lọc danh sách Line theo Trạm được chọn
    const availableLines = useMemo(() => {
        const stationObj = wctrData.find(s => s.station === selectedStation);
        return stationObj ? stationObj.lines : [];
    }, [wctrData, selectedStation]);

    // Lọc tiếp danh sách Line theo từ khóa gõ vào ô input
    const filteredLines = useMemo(() => {
        if (!searchLine) return availableLines;
        return availableLines.filter(line => line.toLowerCase().includes(searchLine.toLowerCase()));
    }, [availableLines, searchLine]);

    const handleConfirm = () => {
        if (!searchLine.trim()) {
            return setError("Vui lòng chọn hoặc nhập mã Line/Máy!");
        }
        // Gửi mã Line về Component cha để gọi API
        onConfirm(searchLine.trim().toUpperCase());
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-800 rounded-3xl w-full max-w-md border border-blue-500/50 shadow-[0_0_40px_rgba(59,130,246,0.3)] overflow-visible">
                <div className="bg-blue-600 p-5 flex justify-between items-center text-white rounded-t-3xl">
                    <h3 className="text-xl font-black flex items-center gap-2 uppercase tracking-wide">
                        <MapPin size={24} /> Xác nhận Line/Trạm
                    </h3>
                </div>
                
                <div className="p-6">
                    <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                        Lệnh <b>#{woData?.WO}</b> mới bắt đầu. Vui lòng chọn <b>Line/Trạm sản xuất</b> để hệ thống ghi nhận dữ liệu Traceability.
                    </p>

                    {/* 1. CHỌN LOẠI TRẠM */}
                    <div className="mb-4">
                        <label className="block text-slate-400 font-bold mb-2 text-sm uppercase">1. Chọn chuyền / Trạm</label>
                        <div className="relative">
                            <select 
                                value={selectedStation} 
                                onChange={(e) => { setSelectedStation(e.target.value); setSearchLine(''); }}
                                className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-3.5 rounded-xl appearance-none focus:ring-2 focus:ring-blue-500 outline-none font-bold cursor-pointer"
                            >
                                {wctrData.map((d, i) => (
                                    <option key={i} value={d.station}>{d.station}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                        </div>
                    </div>

                    {/* 2. CHỌN HOẶC TÌM KIẾM MÃ MÁY (COMBOBOX) */}
                    <div className="mb-6 relative" ref={dropdownRef}>
                        <label className="block text-slate-400 font-bold mb-2 text-sm uppercase">2.Chọn Mã Line/Máy</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input 
                                type="text" 
                                value={searchLine} 
                                onChange={(e) => { setSearchLine(e.target.value); setIsDropdownOpen(true); setError(''); }}
                                onFocus={() => setIsDropdownOpen(true)}
                                placeholder="Gõ để tìm nhanh mã..." 
                                className={`w-full bg-slate-900 border-2 ${error ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'} text-white pl-12 pr-4 py-3.5 rounded-xl outline-none font-mono text-lg transition-all`}
                            />
                            <ChevronDown 
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-white" 
                                size={20} 
                            />
                        </div>

                        {/* Dropdown List */}
                        {isDropdownOpen && (
                            <ul className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl max-h-48 overflow-y-auto custom-scrollbar">
                                {filteredLines.length > 0 ? (
                                    filteredLines.map((line, idx) => (
                                        <li 
                                            key={idx} 
                                            onClick={() => { setSearchLine(line); setIsDropdownOpen(false); setError(''); }}
                                            className="px-4 py-3 hover:bg-blue-600 cursor-pointer text-slate-200 font-mono transition-colors border-b border-slate-700/50 last:border-0 flex items-center justify-between group"
                                        >
                                            {line}
                                            {searchLine === line && <Check size={18} className="text-emerald-400 group-hover:text-white" />}
                                        </li>
                                    ))
                                ) : (
                                    <li className="px-4 py-3 text-slate-500 italic text-center">Không tìm thấy mã máy này</li>
                                )}
                            </ul>
                        )}
                    </div>

                    {error && (
                        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 animate-pulse text-sm font-bold">
                            <AlertTriangle size={18} className="shrink-0" /> {error}
                        </div>
                    )}

                    <div className="flex gap-3 mt-2">
                        <button 
                            onClick={onClose} 
                            disabled={isLoadingSubmit}
                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-xl font-bold transition-all disabled:opacity-50"
                        >
                            THOÁT TRẠM
                        </button>
                        <button 
                            onClick={handleConfirm} 
                            disabled={isLoadingSubmit}
                            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-900/50 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center"
                        >
                            {isLoadingSubmit ? 'ĐANG LƯU...' : 'XÁC NHẬN'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WctrSelectionModal;