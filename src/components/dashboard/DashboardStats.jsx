import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, CheckCircle2, AlertTriangle, Hammer, Package } from 'lucide-react';
import { MESSAGE_TYPE } from '../common/Constants';
import { ActionButton } from '../common/ActionButton';

// ==========================================
// CẤU HÌNH MÀU SẮC ĐỘNG CHO TAILWIND (BẮT BUỘC KHAI BÁO RÕ RÀNG)
// ==========================================
const THEME_COLORS = {
  emerald: {
    cardHover: 'hover:border-emerald-500/50',
    btnBg: 'bg-emerald-600/20 hover:bg-emerald-500',
    btnText: 'text-emerald-400 hover:text-white',
    btnBorder: 'border-emerald-500/30',
    text: 'text-emerald-400'
  },
  rose: {
    cardHover: 'hover:border-rose-500/50',
    btnBg: 'bg-rose-600/20 hover:bg-rose-500',
    btnText: 'text-rose-400 hover:text-white',
    btnBorder: 'border-rose-500/30',
    text: 'text-rose-400'
  },
  amber: {
    cardHover: 'hover:border-amber-500/50',
    btnBg: 'bg-amber-600/20 hover:bg-amber-500',
    btnText: 'text-amber-400 hover:text-white',
    btnBorder: 'border-amber-500/30',
    text: 'text-amber-400'
  }
};


// ==========================================
// COMPONENT: THẺ TIN NHẮN (TRONG MODAL)
// ==========================================
const MessageCard = ({ message, typeColor }) => {
  const theme = THEME_COLORS[typeColor];

  // Chuyển đổi màu sắc của Modal (rose, amber) sang màu mà ActionButton của bạn hỗ trợ
  let btnColor = 'default';
  if (typeColor === 'emerald') btnColor = 'emerald';
  if (typeColor === 'rose') btnColor = 'red';
  // amber sẽ tự rơi vào 'default' (màu slate) vì ActionButton của bạn chưa định nghĩa màu cam.

  return (
    <div className={`bg-slate-800/80 border border-slate-700 p-4 rounded-xl flex justify-between items-center group transition-colors ${theme.cardHover}`}>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold bg-slate-700 text-slate-300 px-2 py-0.5 rounded">WO</span>
          <span className="text-lg font-black text-white">#{message.WO}</span>
        </div>
        <p className="text-slate-300 text-sm">{message.Content}</p>
      </div>
      
      {/* Đã sửa lại đúng chuẩn Props của ActionButton.jsx */}
      <ActionButton 
        label="Clear" 
        icon={<CheckCircle2 size={16} />} 
        color={btnColor}
        onClick={() => alert(`Sẽ gọi API xóa Message ID: ${message.ID} của WO: ${message.WO}`)}
      />
    </div>
  );
};

// ==========================================
// COMPONENT CHÍNH: DASHBOARD STATS (THỰC THỂ ĐỘC LẬP)
// ==========================================
const DashboardStats = ({ totalActiveJobs = 0 }) => {
  const { t } = useTranslation();
  
  // 1. STATE LƯU TRỮ TIN NHẮN ĐỘC LẬP
  const [systemMessages, setSystemMessages] = useState([]);
  
  // State quản lý Modal
  const [modalConfig, setModalConfig] = useState({ 
    isOpen: false, 
    title: '', 
    typeColor: 'emerald', // Giá trị mặc định an toàn
    data: [] 
  });

  // 2. EFFECT: KẾT NỐI SSE ĐỘC LẬP CHO MESSAGE
  useEffect(() => {
    // Thay đổi URL này cho khớp với router Backend của bạn
    const messageStreamUrl = 'http://localhost:8000/api/v1/workorders/messages/stream'; 
    const eventSource = new EventSource(messageStreamUrl);

    eventSource.onopen = () => console.log("Bảng Stats đã kết nối với luồng Message");

    eventSource.onmessage = (event) => {
      try {
        // Kỳ vọng Backend ném xuống thẳng 1 array JSON: [{"ID": 1, "WO": 123, "MessageType": 1, ...}]
        const newMessages = JSON.parse(event.data);
        setSystemMessages(newMessages);
        
        // Auto-update Modal nếu nó đang mở
        setModalConfig(prev => {
          if (!prev.isOpen) return prev;
          // Cập nhật lại list data trong Modal theo dữ liệu mới nhất
          const updatedData = newMessages.filter(m => m.MessageType === prev.data[0]?.MessageType);
          // Nếu xử lý xong hết lỗi thì tự đóng modal
          if (updatedData.length === 0) return { ...prev, isOpen: false };
          return { ...prev, data: updatedData };
        });

      } catch (error) {
        console.error("Lỗi khi parse dữ liệu Message:", error);
      }
    };

    eventSource.onerror = () => console.error("Stats rớt mạng, đang kết nối lại luồng Message...");

    return () => eventSource.close();
  }, []);

  // 3. BÓC TÁCH DỮ LIỆU
  const matReqMsgs = systemMessages.filter(m => m.MessageType === MESSAGE_TYPE.MATERIAL_REQUEST);
  const defectMsgs = systemMessages.filter(m => m.MessageType === MESSAGE_TYPE.DEFECT);
  const warningMsgs = systemMessages.filter(m => m.MessageType === MESSAGE_TYPE.WARNING);

  // Hàm mở Modal
  const handleOpenModal = (title, typeColor, data) => {
    if (data.length === 0) return; 
    setModalConfig({ isOpen: true, title, typeColor, data });
  };

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 animate-fade-in-up mb-6">
        
        {/* Thẻ 1: Total Jobs (Nhận prop từ ActiveJobsTable truyền sang) */}
        <DashboardCard 
          title={t('dashboard.totalJobs')} 
          value={totalActiveJobs} 
          color="blue" 
          clickable={false}
        />
        
        {/* Thẻ 2: Material Request */}
        <DashboardCard 
          title={t('dashboard.matreq')} 
          value={matReqMsgs.length} 
          color="green"
          clickable={matReqMsgs.length > 0}
          onClick={() => handleOpenModal(t('dashboard.matreq'), 'emerald', matReqMsgs)}
        />
        
        {/* Thẻ 3: Defects */}
        <DashboardCard 
          title={t('dashboard.defects')} 
          value={defectMsgs.length} 
          color="red"
          clickable={defectMsgs.length > 0}
          onClick={() => handleOpenModal(t('dashboard.defects'), 'rose', defectMsgs)}
        />
        
        {/* Thẻ 4: Warnings */}
        <DashboardCard 
          title="WARNINGS" 
          value={warningMsgs.length} 
          color="orange"
          clickable={warningMsgs.length > 0}
          onClick={() => handleOpenModal("System Warnings", 'amber', warningMsgs)}
        />
      </div>

      {/* GIAO DIỆN MODAL NỔI */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal}></div>
          
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-fade-in-up">
            
            {/* Header Modal */}
            <div className={`p-5 border-b border-slate-700 flex justify-between items-center ${THEME_COLORS[modalConfig.typeColor].text}`}>
              <h2 className="text-xl font-black uppercase tracking-wider flex items-center gap-2">
                {modalConfig.typeColor === 'emerald' && <Package size={24} />}
                {modalConfig.typeColor === 'rose' && <Hammer size={24} />}
                {modalConfig.typeColor === 'amber' && <AlertTriangle size={24} />}
                {modalConfig.title}
                <span className="bg-slate-800 text-white text-sm px-2 py-0.5 rounded-full ml-2">
                  {modalConfig.data.length}
                </span>
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Thân Modal */}
            <div className="p-5 overflow-y-auto flex flex-col gap-3 custom-scrollbar flex-1">
              {modalConfig.data.map((msg) => (
                <MessageCard key={msg.ID} message={msg} typeColor={modalConfig.typeColor} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ==========================================
// COMPONENT: THẺ THỐNG KÊ NHỎ
// ==========================================
const DashboardCard = ({ title, value, color, clickable, onClick }) => {
  const gradients = {
    blue: "from-blue-500/20 to-blue-600/5 border-blue-500/30 text-blue-400 group-hover:border-blue-400/50",
    green: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 text-emerald-400 group-hover:border-emerald-400/50",
    red: "from-rose-500/20 to-rose-600/5 border-rose-500/30 text-rose-400 group-hover:border-rose-400/50",
    orange: "from-amber-500/20 to-amber-600/5 border-amber-500/30 text-amber-400 group-hover:border-amber-400/50",
  };
  
  const [from, to, border, text, hoverBorder] = gradients[color].split(" ");
  
  const interactClasses = clickable 
    ? `cursor-pointer hover:-translate-y-1.5 ${hoverBorder}` 
    : `cursor-default opacity-80`;

  return (
    <div 
      onClick={clickable ? onClick : undefined}
      className={`bg-gradient-to-br ${from} ${to} bg-slate-800 rounded-2xl p-4 md:p-6 border ${border} shadow-xl relative overflow-hidden group transition-all duration-300 ${interactClasses}`}
    >
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/5 rounded-full blur-xl group-hover:bg-white/10 transition-colors"></div>
      
      <h3 className={`text-xs md:text-sm font-bold uppercase tracking-wider truncate ${text}`}>
        {title}
      </h3>
      
      <p className="text-2xl md:text-4xl font-black text-white mt-1 md:mt-3 tracking-tight">
        {value}
      </p>
    </div>
  );
}

export default DashboardStats;