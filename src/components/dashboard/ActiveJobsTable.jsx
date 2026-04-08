import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Wifi } from 'lucide-react';
import WorkOrderCard from './WorkOrderCard';
import useProductionStore from '../../store/productionStore';

const ActiveJobsTable = () => {
    const { t } = useTranslation();
    
    // 1. CHỈ CẦN 1 DÒNG NÀY LÀ LẤY ĐƯỢC TOÀN BỘ DATA LIVE
    const activeJobs = useProductionStore(state => state.activeJobs);
    
    const [lastUpdated, setLastUpdated] = useState(new Date());

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

            {/* LƯỚI CARD CÔNG VIỆC */}
            {activeJobs.length === 0 ? (
                <div className="flex-1 flex items-center justify-center bg-slate-800/30 border border-slate-700 border-dashed rounded-xl p-10">
                    <p className="text-slate-500 text-lg">{t('dashboard.nopendingwo')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto pb-10">
                    {activeJobs.map((job) => (
                        <WorkOrderCard key={job.WO} data={job} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ActiveJobsTable;