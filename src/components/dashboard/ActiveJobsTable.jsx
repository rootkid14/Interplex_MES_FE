import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Clock, Wifi, WifiOff } from 'lucide-react';
import WorkOrderCard from './WorkOrderCard';

const ActiveJobsTable = ({ setTotalActiveJobs }) => {
    const { t } = useTranslation();
    
    // State quản lý dữ liệu và UI
    const [activeJobs, setActiveJobs] = useState([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    
    // Trạng thái kết nối SSE: 'connecting', 'connected', 'error'
    const [connectionStatus, setConnectionStatus] = useState('connecting');

    useEffect(() => {
        // 1. MỞ ĐƯỜNG ỐNG LẮNG NGHE (Thay đổi URL này khớp với Backend của bạn)
        // Lưu ý: SSE dùng URL trực tiếp, không qua Axios interceptors
        const backendStreamUrl = 'http://localhost:8000/api/v1/workorders/stream'; 
        const eventSource = new EventSource(backendStreamUrl);

        // 2. KHI KẾT NỐI THÀNH CÔNG
        eventSource.onopen = () => {
            console.log("🟢 Đã kết nối với hệ thống phát thanh SSE của Xưởng");
            setConnectionStatus('connected');
        };

        // 3. KHI BACKEND PHÁT DỮ LIỆU MỚI XUỐNG
        eventSource.onmessage = (event) => {
            try {
                // Bước 1: Parse lần đầu
                let parsedData = JSON.parse(event.data);
                
                // Bước 2: Sát thủ diệt "Chuỗi lồng Chuỗi"
                // Nếu Backend lỡ tay dumps 2 lần, biến nó thành mảng thực sự!
                if (typeof parsedData === 'string') {
                    parsedData = JSON.parse(parsedData);
                }
                
                // Đảm bảo nó là mảng để không làm crash hàm .map() bên dưới
                const wosList = Array.isArray(parsedData) ? parsedData : [];
                
                setActiveJobs(wosList);
                
                // BÁO CÁO TỔNG SỐ LƯỢNG LÊN COMPONENT CHA
                if (setTotalActiveJobs) {
                    setTotalActiveJobs(wosList.length);
                }

                setLastUpdated(new Date());
                setIsInitialLoading(false);
                setConnectionStatus('connected');
            } catch (error) {
                console.error("🔴 Lỗi khi parse dữ liệu từ Backend:", error, "Dữ liệu thô:", event.data);
            }
        };

        // 4. KHI RỚT MẠNG HOẶC LỖI KẾT NỐI
        eventSource.onerror = (error) => {
            console.error("🔴 Mất kết nối SSE, Trình duyệt đang tự động thử lại...", error);
            setConnectionStatus('error');
            // Ghi chú: Không cần viết code gọi lại, EventSource sẽ TỰ ĐỘNG reconnect!
        };

        // 5. CLEANUP: TẮT LOA KHI ĐÓNG MÀN HÌNH NÀY
        return () => {
            console.log("Đóng kết nối SSE để giải phóng bộ nhớ.");
            eventSource.close();
        };
    }, []); // Hook chạy 1 lần duy nhất khi mount

    // Format thời gian
    const timeString = lastUpdated.toLocaleTimeString('vi-VN', { 
        hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });

    // MÀN HÌNH CHỜ LẦN ĐẦU
    if (isInitialLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-blue-400">
                <RefreshCw className="animate-spin mb-4" size={32} />
                <p className="text-lg font-semibold animate-pulse">Đang đồng bộ luồng dữ liệu thời gian thực...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* HEADER DASHBOARD */}
            <div className="flex justify-between items-end mb-6 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                
                {/* Chỉ báo trạng thái Mạng & Thời gian */}
                <div className="flex items-center gap-4 bg-slate-900/80 px-4 py-2 rounded-lg border border-slate-700">
                    
                    {/* Đèn báo trạng thái kết nối SSE */}
                    <div className="flex items-center gap-2">
                        {connectionStatus === 'connected' ? (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                                <Wifi size={14} className="animate-pulse" /> Live
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded">
                                <WifiOff size={14} /> Mất kết nối...
                            </span>
                        )}
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
                    <p className="text-slate-500 text-lg">Không có lệnh sản xuất nào bị tồn đọng.</p>
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