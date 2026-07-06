import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, Settings2, CheckCircle2, AlertTriangle, Hammer, Package, Loader2, GitPullRequest, FileJson, ArrowRight, PlusCircle, Trash2, Edit3 } from 'lucide-react';
import { MESSAGE_TYPE } from '../common/Constants';
import { ActionButton } from '../common/ActionButton';
import useProductionStore from '../../store/productionStore';
import { dashboardAPI } from '../../api/dashboardAPI';
import useModelConfigStore from '../../store/ModelConfigStore';
import ECNCard from './ECNCard';

// ==========================================
// CẤU HÌNH MÀU SẮC ĐỘNG
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
  },
  indigo: {
    cardHover: 'hover:border-indigo-500/50',
    btnBg: 'bg-indigo-600/20 hover:bg-indigo-500',
    btnText: 'text-indigo-400 hover:text-white',
    btnBorder: 'border-indigo-500/30',
    text: 'text-indigo-400'
  },
  teal: {
    cardHover: 'hover:border-teal-500/50',
    btnBg: 'bg-teal-600/20 hover:bg-teal-500',
    btnText: 'text-teal-400 hover:text-white',
    btnBorder: 'border-teal-500/30',
    text: 'text-teal-400'
  }
};

// ==========================================
// THUẬT TOÁN JSON DIFFING (TÌM ĐIỂM KHÁC BIỆT)
// ==========================================
const getJsonDiff = (oldObj, newObj, path = '') => {
  let changes = [];
  const oldSafe = oldObj || {};
  const newSafe = newObj || {};
  const allKeys = new Set([...Object.keys(oldSafe), ...Object.keys(newSafe)]);

  allKeys.forEach(key => {
      // Đặt lại format đường dẫn (path) cho dễ nhìn
      const currentPath = path ? (Array.isArray(oldObj) ? `${path}[${key}]` : `${path}.${key}`) : key;
      const oldVal = oldSafe[key];
      const newVal = newSafe[key];

      if (oldVal === undefined && newVal !== undefined) {
          changes.push({ path: currentPath, type: 'added', val: newVal });
      } else if (oldVal !== undefined && newVal === undefined) {
          changes.push({ path: currentPath, type: 'removed', val: oldVal });
      } else if (typeof oldVal === 'object' && typeof newVal === 'object' && oldVal !== null && newVal !== null) {
          // Đệ quy chui vào object/mảng con
          changes = changes.concat(getJsonDiff(oldVal, newVal, currentPath));
      } else if (oldVal !== newVal) {
          changes.push({ path: currentPath, type: 'modified', oldVal, newVal });
      }
  });
  return changes;
};

// ==========================================
// COMPONENT: THẺ TIN NHẮN CHUNG
// ==========================================
const MessageCard = ({ message, typeColor }) => {
  const theme = THEME_COLORS[typeColor];
  const [isClearing, setIsClearing] = useState(false);

  let btnColor = 'default';
  if (typeColor === 'emerald') btnColor = 'emerald';
  if (typeColor === 'rose') btnColor = 'red';

  const handleClearMessage = async () => {
    try {
      setIsClearing(true); 
      const result = await dashboardAPI.clearDashboardMessage(message.ID);
      if (!result.success) {
        alert(result.message);
        setIsClearing(false); 
      }
    } catch (error) {
      alert("Lỗi kết nối máy chủ khi xóa tin nhắn!");
      setIsClearing(false);
    }
  };

  return (
    <div className={`bg-slate-800/80 border border-slate-700 p-4 rounded-xl flex justify-between items-center group transition-colors ${theme.cardHover} ${isClearing ? 'opacity-50 pointer-events-none' : ''}`}>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold bg-slate-700 text-slate-300 px-2 py-0.5 rounded">WO</span>
          <span className="text-lg font-black text-white">#{message.WO}</span>
        </div>
        <p className="text-slate-300 text-sm">{message.Content}</p>
      </div>
      <ActionButton 
        label={isClearing ? "Đang xử lý..." : "Clear"} 
        icon={isClearing ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16} />} 
        color={btnColor}
        onClick={handleClearMessage}
      />
    </div>
  );
};

// ==========================================
// COMPONENT: THẺ CONFIG CHANGE (DIFF VIEWER)
// ==========================================
const ConfigChangeCard = ({ item }) => {
  const [isClearing, setIsClearing] = useState(false);

  // Gọi thuật toán bóc tách khác biệt
  const diffs = useMemo(() => {
    return getJsonDiff(item.OldData, item.NewData);
  }, [item.OldData, item.NewData]);

  const handleAck = async () => {
    try {
      setIsClearing(true);
      const res = await dashboardAPI.ackConfigChange(item.LogID); 
      if (!res.success) {
         alert(res.message);
         setIsClearing(false);
      }
    } catch (e) {
      alert("Lỗi khi xác nhận!");
      setIsClearing(false);
    }
  };

  return (
    <div className={`bg-slate-800/80 border border-teal-500/30 p-4 rounded-xl flex flex-col transition-colors hover:border-teal-500/50 ${isClearing ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-3 border-b border-slate-700/50 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold bg-slate-700 text-slate-300 px-2 py-0.5 rounded">MODEL</span>
                <span className="text-lg font-black text-white tracking-widest">{item.ModelNO}</span>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm mt-2">
                Modified by: <span className="text-teal-300 font-bold bg-teal-900/20 px-2 py-0.5 rounded border border-teal-500/20">{item.ChangedBy}</span> at <span className="font-mono">{item.ChangeTime}</span>
              </p>
            </div>
            <ActionButton 
              label={isClearing ? "Đang xử lý..." : "Mark as Reviewed"} 
              icon={isClearing ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16} />} 
              color="teal"
              onClick={handleAck}
            />
        </div>

        {/* VÙNG HIỂN THỊ DIFF TƯỜNG MINH */}
        <div className="mt-4 bg-slate-900/50 rounded-xl border border-slate-700/50 p-4 shadow-inner">
           <h4 className="text-[11px] font-black text-slate-500 mb-3 uppercase tracking-widest flex items-center gap-2">
             <Settings2 size={14}/> Detail Changes ({diffs.length})
           </h4>
           
           {diffs.length === 0 ? (
               <p className="text-sm text-slate-500 italic flex items-center gap-2"><CheckCircle2 size={16}/> Không phát hiện sự thay đổi cấu trúc dữ liệu nào.</p>
           ) : (
               <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                   {diffs.map((diff, idx) => (
                       <div key={idx} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 text-xs font-mono bg-slate-800 p-3 rounded-lg border border-slate-700/50">
                          
                          {/* Label Loại thay đổi */}
                          {diff.type === 'added' && <span className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 font-bold w-max sm:w-20 shrink-0 text-center">[+] ADD</span>}
                          {diff.type === 'removed' && <span className="text-rose-400 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20 font-bold w-max sm:w-20 shrink-0 text-center">[-] DROP</span>}
                          {diff.type === 'modified' && <span className="text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 font-bold w-max sm:w-20 shrink-0 text-center">[*] EDIT</span>}
                          
                          {/* Nội dung thay đổi */}
                          <div className="flex-1 min-w-0">
                              <span className="text-sky-300 font-bold block mb-1 truncate" title={diff.path}>{diff.path}</span>
                              
                              {diff.type === 'added' && <span className="text-emerald-200 bg-slate-900 px-2 py-1 rounded block w-max max-w-full truncate">{JSON.stringify(diff.val)}</span>}
                              {diff.type === 'removed' && <span className="text-rose-300/50 line-through bg-slate-900 px-2 py-1 rounded block w-max max-w-full truncate">{JSON.stringify(diff.val)}</span>}
                              
                              {diff.type === 'modified' && (
                                  <div className="flex items-center gap-2 flex-wrap bg-slate-900 p-2 rounded-lg border border-slate-700/50 mt-1.5">
                                      <span className="bg-rose-500/10 text-rose-300 px-2 py-1 rounded border border-rose-500/20 line-through max-w-[200px] truncate" title={JSON.stringify(diff.oldVal)}>
                                        {JSON.stringify(diff.oldVal) || '""'}
                                      </span>
                                      <ArrowRight size={14} className="text-slate-500 shrink-0"/>
                                      <span className="bg-emerald-500/10 text-emerald-300 px-2 py-1 rounded border border-emerald-500/20 font-bold max-w-[200px] truncate" title={JSON.stringify(diff.newVal)}>
                                        {JSON.stringify(diff.newVal) || '""'}
                                      </span>
                                  </div>
                              )}
                          </div>
                       </div>
                   ))}
               </div>
           )}
        </div>
    </div>
  );
};


// ==========================================
// COMPONENT CHÍNH: DASHBOARD STATS
// ==========================================
const DashboardStats = () => {
  const { t } = useTranslation();
  
  const systemMessages = useProductionStore(state => state.systemMessages);
  const activeJobs = useProductionStore(state => state.activeJobs);
  const ecnAlerts = useProductionStore(state => state.ecnAlerts);
  const configAlerts = useProductionStore(state => state.configAlerts); 
  
  const totalActiveJobs = activeJobs.length;

  const [modalConfig, setModalConfig] = useState({ 
    isOpen: false, 
    title: '', 
    typeColor: 'emerald',
    data: [] 
  });

  useEffect(() => {
    if (modalConfig.isOpen) {
      if (modalConfig.typeColor === 'indigo') {
        if (ecnAlerts.length === 0) setModalConfig(prev => ({ ...prev, isOpen: false }));
        else setModalConfig(prev => ({ ...prev, data: ecnAlerts }));
      } 
      else if (modalConfig.typeColor === 'teal') {
        if (configAlerts?.length === 0) setModalConfig(prev => ({ ...prev, isOpen: false }));
        else setModalConfig(prev => ({ ...prev, data: configAlerts }));
      }
      else if (modalConfig.data.length > 0) {
        const currentMessageType = modalConfig.data[0].MessageType;
        const updatedData = systemMessages.filter(m => m.MessageType === currentMessageType);
        
        if (updatedData.length === 0) setModalConfig(prev => ({ ...prev, isOpen: false }));
        else setModalConfig(prev => ({ ...prev, data: updatedData }));
      }
    }
  }, [systemMessages, ecnAlerts, configAlerts]); 

  const matReqMsgs = systemMessages.filter(m => m.MessageType === MESSAGE_TYPE.MATERIAL_REQUEST);
  const defectMsgs = systemMessages.filter(m => m.MessageType === MESSAGE_TYPE.DEFECT);
  const warningMsgs = systemMessages.filter(m => m.MessageType === MESSAGE_TYPE.WARNING);

  const handleOpenModal = (title, typeColor, data) => {
    if (data.length === 0) return; 
    setModalConfig({ isOpen: true, title, typeColor, data });
  };

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 md:gap-6 animate-fade-in-up mb-6">
        <DashboardCard 
          title={t('dashboard.totalJobs')} 
          value={totalActiveJobs} 
          color="blue" 
          clickable={false}
        />
        <DashboardCard 
          title={t('dashboard.matreq')} 
          value={matReqMsgs.length} 
          color="green"
          clickable={matReqMsgs.length > 0}
          onClick={() => handleOpenModal(t('dashboard.matreq'), 'emerald', matReqMsgs)}
        />
        <DashboardCard 
          title={t('dashboard.defects')} 
          value={defectMsgs.length} 
          color="red"
          clickable={defectMsgs.length > 0}
          onClick={() => handleOpenModal(t('dashboard.defects'), 'rose', defectMsgs)}
        />
        <DashboardCard 
          title="WARNINGS" 
          value={warningMsgs.length} 
          color="orange"
          clickable={warningMsgs.length > 0}
          onClick={() => handleOpenModal("System Warnings", 'amber', warningMsgs)}
        />
        <DashboardCard 
          title="BOM CHANGES (ECN)" 
          value={ecnAlerts.length} 
          color="indigo" 
          clickable={ecnAlerts.length > 0}
          onClick={() => handleOpenModal("Pending ECNs", 'indigo', ecnAlerts)}
        />
        <DashboardCard 
          title="CONFIG ALERTS" 
          value={configAlerts?.length || 0} 
          color="teal" 
          clickable={(configAlerts?.length || 0) > 0}
          onClick={() => handleOpenModal("Config Modifications", 'teal', configAlerts)}
        />
      </div>

      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/70 " onClick={closeModal}></div>
          
          <div className="relative bg-slate-900 border border-slate-600 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl animate-fade-in-up">
            
            <div className={`p-5 border-b border-slate-700 flex justify-between items-center ${THEME_COLORS[modalConfig.typeColor].text}`}>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider flex items-center gap-3">
                {modalConfig.typeColor === 'emerald' && <Package size={28} />}
                {modalConfig.typeColor === 'rose' && <Hammer size={28} />}
                {modalConfig.typeColor === 'amber' && <AlertTriangle size={28} />}
                {modalConfig.typeColor === 'indigo' && <GitPullRequest size={28} />}
                {modalConfig.typeColor === 'teal' && <FileJson size={28} />}
                {modalConfig.title}
                <span className="bg-slate-800 border border-slate-700 text-white text-sm px-3 py-1 rounded-full ml-3 shadow-inner">
                  {modalConfig.data.length}
                </span>
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-white hover:bg-rose-500/20 p-2 rounded-full transition-all duration-200">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex flex-col gap-4 custom-scrollbar flex-1 bg-slate-900/50">
              {modalConfig.data.map((item) => {
                if (modalConfig.typeColor === 'indigo') return <ECNCard key={item.LogID} ecn={item} />;
                if (modalConfig.typeColor === 'teal') return <ConfigChangeCard key={item.LogID} item={item} />;
                return <MessageCard key={item.ID} message={item} typeColor={modalConfig.typeColor} />;
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const DashboardCard = ({ title, value, color, clickable, onClick }) => {
  const gradients = {
    blue: "from-blue-500/20 to-blue-600/5 border-blue-500/30 text-blue-400 group-hover:border-blue-400/50",
    green: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 text-emerald-400 group-hover:border-emerald-400/50",
    red: "from-rose-500/20 to-rose-600/5 border-rose-500/30 text-rose-400 group-hover:border-rose-400/50",
    orange: "from-amber-500/20 to-amber-600/5 border-amber-500/30 text-amber-400 group-hover:border-amber-400/50",
    indigo: "from-indigo-500/20 to-indigo-600/5 border-indigo-500/30 text-indigo-400 group-hover:border-indigo-400/50",
    teal: "from-teal-500/20 to-teal-600/5 border-teal-500/30 text-teal-400 group-hover:border-teal-400/50"
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
      <h3 className={`text-xs md:text-sm font-bold uppercase tracking-wider truncate ${text}`}>{title}</h3>
      <p className="text-2xl md:text-4xl font-black text-white mt-1 md:mt-3 tracking-tight">{value}</p>
    </div>
  );
}

export default DashboardStats;