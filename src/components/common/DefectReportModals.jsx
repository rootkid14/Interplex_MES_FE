import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Save, Loader2, Filter } from 'lucide-react';
import { workstationAPI } from '../../api/workstationApi';
import { defectCodeAPI } from '../../api/defectCodeApi';
import { SearchableDefectSelector } from '../common/SearchableDefectSelector';
import { MESSAGE_TYPE, STATION_MAPPING } from '../common/Constants';


// Đổi prop `availablePNs` thành `modelNo`
const DefectReportModal = ({ isOpen, onClose, wo, modelNo, onUpdateSuccess }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [allDefectCodes, setAllDefectCodes] = useState([]);
    const [uniqueStations, setUniqueStations] = useState([]);
    const [filterStation, setFilterStation] = useState("All");

    const [formData, setFormData] = useState({
        pn: '',
        defectCode: '',
        defectObject: null,
        desc: '',
        qty: ''
    });

    // 1. Load mã lỗi và reset Form mỗi khi mở Modal
    useEffect(() => {
        if (isOpen) {
            // Khởi tạo lại form với Model NO cố định
            setFormData({
                pn: modelNo || '',
                defectCode: '',
                defectObject: null,
                desc: '',
                qty: ''
            });

            const fetchDefects = async () => {
                try {
                    const res = await defectCodeAPI.getAllCodes();
                    const codes = res.data || res;
                    setAllDefectCodes(codes);
                    
                    const stations = Array.from(new Set(codes.map(c => c.Station))).filter(Boolean);
                    setUniqueStations(stations);
                } catch (e) {
                    console.error("Lỗi load Defect Codes", e);
                }
            };
            fetchDefects();
        }
    }, [isOpen, modelNo]);

    const filteredCodes = filterStation === "All" 
        ? allDefectCodes 
        : allDefectCodes.filter(c => c.Station === filterStation);

    const handleSubmit = async () => {
        const ngQty = parseFloat(formData.qty);
        if (isNaN(ngQty) || ngQty <= 0) return alert("Số lượng không hợp lệ!");
        if (!formData.defectObject) return alert("Vui lòng chọn mã lỗi!");

        setIsLoading(true);
        try {
            const payload = {
                WO: wo,
                PartNO: formData.pn, // Lúc này sẽ gửi đi modelNo
                QTY: ngQty,
                DefectCode: formData.defectObject.Code,
                Station: formData.defectObject.Station,
                Description: formData.desc || "",
                Type: MESSAGE_TYPE.DEFECT
            };

            const result = await workstationAPI.logDefect(payload);
            if (result.success) {
                alert("Đã gửi báo cáo lỗi (NG) thành công!");
                onClose();
                if (onUpdateSuccess) onUpdateSuccess();
            } else {
                alert(result.message || "Lỗi khi gửi báo cáo.");
            }
        } catch (error) {
            alert("Lỗi kết nối máy chủ!");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-800 w-full max-w-md rounded-2xl border border-red-500/50 shadow-2xl p-6 flex flex-col max-h-[90vh] animate-fade-in-up">
                <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-3 shrink-0">
                    <h2 className="text-xl font-bold text-red-400 flex items-center gap-2"><AlertTriangle/> Báo Lỗi (NG)</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24}/></button>
                </div>

                <div className="overflow-y-auto custom-scrollbar pr-2 pb-4 space-y-4">
                    {/* 1. HIỂN THỊ MODEL NO CỐ ĐỊNH */}
                    <div>
                        <label className="block text-slate-300 font-bold mb-1 text-sm">1. Model bị lỗi (Fixed)</label>
                        <input 
                            type="text"
                            readOnly
                            value={formData.pn} 
                            className="w-full bg-slate-900/50 border border-slate-700 text-slate-400 px-4 py-3 rounded-lg outline-none font-mono cursor-not-allowed select-none"
                        />
                    </div>

                    {/* 2. THANH FILTER TRẠM */}
                    <div>
                        <label className="block text-slate-300 font-bold mb-1 text-sm">2. Lọc theo Trạm (Station)</label>
                        <div className="relative">
                            <Filter className="absolute left-3 top-3.5 text-slate-500" size={16}/>
                            <select 
                                value={filterStation} 
                                onChange={(e) => {
                                    setFilterStation(e.target.value);
                                    setFormData({...formData, defectCode: '', defectObject: null});
                                }}
                                className="w-full bg-slate-900 border border-slate-600 text-white pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                            >
                                <option value="All">Tất cả Trạm (All Stations)</option>
                                {uniqueStations.map(st => (
                                    <option key={st} value={st}>
                                        {STATION_MAPPING[st] ? `${STATION_MAPPING[st]} (${st})` : st}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 3. Chọn Mã Lỗi */}
                    <div>
                        <label className="block text-slate-300 font-bold mb-1 text-sm">3. Loại lỗi (Defect Code) *</label>
                        <SearchableDefectSelector 
                            codes={filteredCodes} 
                            selectedCode={formData.defectCode} 
                            onSelect={(obj) => setFormData({ ...formData, defectCode: obj.Code, defectObject: obj })} 
                        />
                    </div>

                    {/* 4. Nhập số lượng */}
                    <div>
                        <label className="block text-slate-300 font-bold mb-1 text-sm">4. Số lượng NG (QTY) *</label>
                        <input 
                            type="number" 
                            value={formData.qty} 
                            onChange={(e) => setFormData({...formData, qty: e.target.value})}
                            className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-red-500 outline-none font-mono text-xl text-center"
                            placeholder="0"
                        />
                    </div>

                    {/* 5. Ghi chú */}
                    <div>
                        <label className="block text-slate-300 font-bold mb-1 text-sm">5. Ghi chú thêm</label>
                        <textarea 
                            value={formData.desc} 
                            onChange={(e) => setFormData({...formData, desc: e.target.value})}
                            className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-red-500 outline-none h-20"
                            placeholder="Nhập chi tiết nếu cần..."
                        />
                    </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-700 shrink-0">
                    <button onClick={onClose} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-bold">HỦY BỎ</button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={isLoading}
                        className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg shadow-lg flex justify-center items-center gap-2"
                    >
                        {isLoading ? <Loader2 size={20} className="animate-spin"/> : <Save size={20}/>} XÁC NHẬN
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DefectReportModal;