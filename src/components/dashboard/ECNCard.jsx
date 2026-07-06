import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Loader2, CheckCircle2, Edit3, PlusCircle, Trash2, Settings2, GitPullRequest } from 'lucide-react';
import { ActionButton } from '../common/ActionButton';
import { dashboardAPI } from '../../api/dashboardAPI';
import useModelConfigStore from '../../store/ModelConfigStore';

// Định nghĩa Theme màu sắc cục bộ để đảm bảo component độc lập
const THEME_COLORS = {
  indigo: {
    cardHover: 'hover:border-indigo-500/50',
    text: 'text-indigo-400'
  }
};

const ECNCard = ({ ecn, readonly = false }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const navigate = useNavigate();
  const setEcnContext = useModelConfigStore(state => state.setEcnContext);

  // Logic chuyển trang mượt mà (Fire & Forget)
  const handleNavigateToConfig = async (e, modelNo) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. Lưu ngữ cảnh ngay lập tức
    setEcnContext(ecn, modelNo);

    // 2. Chuyển trang NGAY LẬP TỨC để tạo cảm giác phản hồi nhanh
    navigate('/model-config'); // Đảm bảo route này khớp với dự án của bạn

    // 3. Bắn API xác nhận chạy ngầm
    try {
      await dashboardAPI.acknowledgeECNSingleModel(ecn.LogID, modelNo);
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái ECN:", error);
    }
  };

  const handleAcknowledge = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setIsUpdating(true);
      const result = await dashboardAPI.acknowledgeECN(ecn.LogID); 
      if (!result.success) {
        alert(result.message);
        setIsUpdating(false);
      }
    } catch (error) {
      alert("Lỗi kết nối máy chủ!");
      setIsUpdating(false);
    }
  };

  // Logic Smart Diff
  const { diffs, changeIcon, changeColor, changeLabel } = useMemo(() => {
    let computedDiffs = [];
    let icon, color, label;
    const cleanString = (val) => (typeof val === 'string' ? val.trim() : val);

    if (ecn.ChangeType === 'UPDATE') {
      icon = <Edit3 size={16} className="mr-1" />;
      color = 'text-amber-400 bg-amber-900/40 border-amber-500/30';
      label = 'MODIFIED';
      const allKeys = new Set([...Object.keys(ecn.OldData || {}), ...Object.keys(ecn.NewData || {})]);
      allKeys.forEach(key => {
        const oldVal = cleanString(ecn.OldData?.[key]);
        const newVal = cleanString(ecn.NewData?.[key]);
        if (oldVal !== newVal && key !== 'IDBOM') {
          computedDiffs.push({ field: key, old: oldVal || '(Trống)', new: newVal || '(Trống)' });
        }
      });
    } else if (ecn.ChangeType === 'INSERT') {
      icon = <PlusCircle size={16} className="mr-1" />;
      color = 'text-emerald-400 bg-emerald-900/40 border-emerald-500/30';
      label = 'ADDED';
      ['BaseQty', 'Unit', 'Workcenter', 'Op', 'DescComponent'].forEach(key => {
        if (ecn.NewData?.[key]) computedDiffs.push({ field: key, new: cleanString(ecn.NewData[key]) });
      });
    } else if (ecn.ChangeType === 'DELETE') {
      icon = <Trash2 size={16} className="mr-1" />;
      color = 'text-rose-400 bg-rose-900/40 border-rose-500/30';
      label = 'REMOVED';
      ['BaseQty', 'Unit', 'Workcenter', 'Op', 'DescComponent'].forEach(key => {
        if (ecn.OldData?.[key]) computedDiffs.push({ field: key, old: cleanString(ecn.OldData[key]) });
      });
    }
    return { diffs: computedDiffs, changeIcon: icon, changeColor: color, changeLabel: label };
  }, [ecn]);

  const displayName = ecn.Component || (ecn.NewData?.Component ? ecn.NewData.Component.trim() : '(Root Level)');

  return (
    <div className={`bg-slate-800/80 border border-slate-600/50 p-5 rounded-xl flex flex-col gap-4 group transition-all duration-300 ${isUpdating ? 'opacity-50 pointer-events-none' : ''}`}>
      
      {/* HEADER */}
      <div className="flex justify-between items-start border-b border-slate-700/50 pb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className={`flex items-center text-xs font-black px-2.5 py-1 rounded border ${changeColor}`}>{changeIcon} {changeLabel}</span>
            <span className="text-xl font-black text-white tracking-tight">ID: {ecn.IDBOM}</span>
          </div>
          <p className="text-slate-300 text-sm flex items-center gap-2">
            <Package size={16} className="text-indigo-400"/>
            Part: <span className="font-bold text-white bg-slate-700 px-2 py-0.5 rounded">{displayName}</span>
          </p>
        </div>
        
        {!readonly && (
            <ActionButton 
                label={isUpdating ? "..." : "Acknowledge"} 
                icon={isUpdating ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16} />} 
                color="indigo" 
                onClick={handleAcknowledge}
            />
        )}
      </div>

      {/* DIFF TABLE */}
      {diffs.length > 0 && (
        <div className="bg-slate-900/60 rounded-lg border border-slate-700 overflow-hidden">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-700">
                    <tr>
                        <th className="px-4 py-2">Thuộc tính</th>
                        {ecn.ChangeType !== 'INSERT' && <th className="px-4 py-2">Cũ</th>}
                        {ecn.ChangeType !== 'DELETE' && <th className="px-4 py-2">Mới</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 font-mono">
                    {diffs.map((diff, idx) => (
                        <tr key={idx}>
                            <td className="px-4 py-2 font-bold text-indigo-300">{diff.field}</td>
                            {ecn.ChangeType !== 'INSERT' && <td className="px-4 py-2 text-rose-400 line-through opacity-70">{diff.old}</td>}
                            {ecn.ChangeType !== 'DELETE' && <td className="px-4 py-2 text-emerald-400 font-bold">{diff.new}</td>}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}

      {/* MODELS FOOTER */}
      <div className="flex flex-col gap-2">
        <span className="text-xs text-slate-400 uppercase font-bold">Các Model bị ảnh hưởng (Click để xử lý):</span>
        <div className="flex flex-wrap gap-2">
          {Object.entries(
            Array.isArray(ecn.AffectedModels) 
              ? ecn.AffectedModels.reduce((acc, curr) => ({ ...acc, [curr]: false }), {}) 
              : (ecn.AffectedModels || {})
          ).map(([model, isChecked]) => (
            <button 
              key={model} 
              disabled={readonly}
              type="button" 
              onClick={(e) => handleNavigateToConfig(e, model)} 
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded text-s font-mono font-bold border transition-all ${isChecked ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/30 line-through opacity-60' : 'bg-rose-900/50 text-indigo-200 border-rose-500/60 hover:bg-rose-600/40'}`}
            >
              {isChecked ? <CheckCircle2 size={14}/> : <Settings2 size={14}/>}
              {model}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ECNCard;