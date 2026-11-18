import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Wifi, Search, X } from 'lucide-react';
import WorkOrderCard from './WorkOrderCard';
import useProductionStore from '../../store/productionStore';

const ActiveJobsTable = () => {
    const { t } = useTranslation();
    
    // 1. CHỈ CẦN 1 DÒNG NÀY LÀ LẤY ĐƯỢC TOÀN BỘ DATA LIVE
    const activeJobs = useProductionStore(state => state.activeJobs);
    
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [woSearch, setWoSearch] = useState('');
    // Filter the live SSE jobs; no new API or database search is performed.
    const visibleJobs = useMemo(() => {
        const query = woSearch.trim().replace(/^#/, '').toLocaleLowerCase();
        if (!query) return activeJobs;
        return activeJobs.filter((job) =>
            String(job.WO ?? '').toLocaleLowerCase().includes(query)
        );
    }, [activeJobs, woSearch]);

    // Cập nhật lại đồng hồ hiển thị mỗi khi activeJobs thay đổi
    useEffect(() => {
        setLastUpdated(new Date());
    }, [activeJobs]);

    const timeString = lastUpdated.toLocaleTimeString('vi-VN', { 
        hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });

    return (
        <div className="flex flex-col h-full">
            {/* HEADER DASHBOARD */}
            <div className="flex justify-between items-end mb-6 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                
                {/* Chỉ báo trạng thái Mạng & Thời gian */}
                <div className="flex items-center gap-4 bg-slate-900/80 px-4 py-2 rounded-lg border border-slate-700">
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                            <Wifi size={14} className="animate-pulse" /> Global SSE Live
                        </span>
                    </div>

                    <div className="w-px h-4 bg-slate-700"></div>

                    {/* Giờ cập nhật */}
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <Clock size={16} className="text-slate-400" />
                        <span className="text-slate-300">LastRefresh:</span>
                        <span className="text-blue-400 font-mono tracking-wider">{timeString}</span>
                    </div>
                </div>
            </div>

            {/* LIVE WORK ORDER FILTER */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <label className="relative flex items-center flex-1 min-w-[220px] max-w-lg">
                    <Search size={18} className="absolute left-3 text-slate-400 pointer-events-none" />
                    <input
                        type="search"
                        autoComplete="off"
                        inputMode="search"
                        aria-label="Tìm kiếm WO"
                        placeholder="Tìm WO đang hiển thị"
                        value={woSearch}
                        onChange={(event) => setWoSearch(event.target.value)}
                        className="w-full bg-slate-900 text-slate-100 placeholder:text-slate-500 border border-slate-600 rounded-xl pl-10 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {woSearch && (
                        <button type="button" title="Xóa tìm kiếm" aria-label="Xóa tìm kiếm"
                            onClick={() => setWoSearch('')}
                            className="absolute right-2 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700">
                            <X size={17} />
                        </button>
                    )}
                </label>
                <span className="text-sm text-slate-400" aria-live="polite">
                    Hiển thị <strong className="text-slate-200">{visibleJobs.length}</strong> / {activeJobs.length} WO đang hoạt động
                </span>
            </div>

            {/* LƯỚI CARD CÔNG VIỆC */}
            {activeJobs.length === 0 ? (
                <div className="flex-1 flex items-center justify-center bg-slate-800/30 border border-slate-700 border-dashed rounded-xl p-10">
                    <p className="text-slate-500 text-lg">{t('dashboard.nopendingwo')}</p>
                </div>
            ) : visibleJobs.length === 0 ? (
                <div className="flex-1 flex flex-col gap-3 items-center justify-center bg-slate-800/30 border border-slate-700 border-dashed rounded-xl p-10">
                    <p className="text-slate-300">Không tìm thấy WO khớp “{woSearch.trim()}” trong danh sách đang hoạt động.</p>
                    <button type="button" onClick={() => setWoSearch('')}
                        className="text-blue-300 hover:text-blue-200 underline">Xóa bộ lọc</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto pb-10">
                    {visibleJobs.map((job) => (
                        <WorkOrderCard key={job.WO} data={job} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ActiveJobsTable;