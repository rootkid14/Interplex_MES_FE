import React from 'react';
import { Bell, MapPin, CheckCircle, XCircle, Package, Tag, RotateCcw, AlertTriangle } from 'lucide-react';
import { WO_STATUS_LABEL, WO_STATUS_COLOR } from '../common/Constants'; 
import { useTranslation } from 'react-i18next';
import { Link as LinkIcon } from 'lucide-react';
// ==========================================
// COMPONENT: WORK ORDER CARD
// ==========================================
const WorkOrderCard = ({ data, aliasWO }) => {
    const { t } = useTranslation();

  const {
    WO = "N/A",
    ModelNO = "N/A",
    QTY_Processed = 0,
    QTY_OK = 0,
    QTY_NG = 0,
    QTY_Target = 0,
    WCtr = "Unassigned",
    Status = 0,
    RW_Type = null,
    RW_Status = null,
    RW_InputQty = 0,
    RW_CompletedQty = 0,
    RW_InputBatchCount = 0,
    RW_SummaryError = false,
  } = data;

  const rwInputQty = Math.max(0, Number(RW_InputQty) || 0);
  const rwCompletedQty = Math.max(0, Number(RW_CompletedQty) || 0);
  const rwBatchCount = Math.max(0, Number(RW_InputBatchCount) || 0);
  const rwPercent = rwInputQty > 0 ? Math.min(100, Math.round((rwCompletedQty / rwInputQty) * 100)) : 0;
  const qtyFormat = (value) => new Intl.NumberFormat('vi-VN').format(value);

  const progressPercent = QTY_Target > 0 
    ? Math.min(Math.round((QTY_Processed / QTY_Target) * 100), 100) 
    : 0;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg hover:border-slate-500 transition-all duration-300 relative group flex flex-col gap-4">
      
      {/* 1. KHU VỰC HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h3 className="text-2xl font-black text-white tracking-wider">#{WO}

              {aliasWO && (
                <div>
                    <LinkIcon size={18} className="text-blue-400"/> 
                    #{aliasWO}
                </div>
            )}
            </h3>
            
            
            {/* GỌI BIẾN ENUM ĐỂ RENDER MÀU VÀ CHỮ */}
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${WO_STATUS_COLOR[Status]}`}>
              {WO_STATUS_LABEL[Status]}
            </span>


            
          </div>
          
          <div className="flex items-center text-slate-400 text-sm gap-1.5 font-medium">
            <MapPin size={16} className="text-slate-500" />
            <span>{t('dashboard.WCTR')}: <strong className="text-slate-200">{WCtr}</strong></span>
          </div>
          <div className="flex items-center text-slate-400 text-sm gap-1.5 font-medium">
            <Tag size={16} className="text-slate-500" />
            <span>{t('dashboard.modelNO')}: <strong className="text-slate-200">{ModelNO}</strong></span>
          </div>
        </div>

        <button 
          onClick={() => alert(`Mở bảng thông báo cho WO: ${WO}`)}
          className="p-2 text-slate-400 hover:text-yellow-400 bg-slate-900/50 hover:bg-slate-700 rounded-full transition-all group-hover:shadow-[0_0_12px_rgba(250,204,21,0.25)]"
          title="Thông báo"
        >
          <Bell size={20} />
        </button>
      </div>

      {/* MES2: Rework numbers are cumulative quantities, not output batch count. */}
      {RW_Status ? (
        <section className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3" aria-label={`RW status cho WO ${WO}`}>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <span className="flex gap-1.5 items-center text-amber-300 font-bold text-sm">
              <RotateCcw size={16} /> REWORK {RW_Type === 'BULK' ? '· BULK' : '· 1-1'}
            </span>
            <span className={`rounded-full px-2 py-0.5 border text-[11px] font-bold ${RW_Status === 'ACTIVE' ? 'bg-amber-900/30 border-amber-500/40 text-amber-300' : 'bg-emerald-900/30 border-emerald-500/40 text-emerald-300'}`}>
              {RW_Status}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-slate-950/50 p-2 border border-slate-700/60">
              <div className="text-slate-400 text-xs">Đưa vào RW ({qtyFormat(rwBatchCount)} lô)</div>
              <div className="text-amber-200 text-lg font-extrabold font-mono">{qtyFormat(rwInputQty)}</div>
            </div>
            <div className="rounded-lg bg-slate-950/50 p-2 border border-slate-700/60">
              <div className="text-slate-400 text-xs">RW hoàn thành</div>
              <div className="text-emerald-300 text-lg font-extrabold font-mono">{qtyFormat(rwCompletedQty)}</div>
            </div>
          </div>
          <div className="mt-2 bg-slate-900 rounded-full h-1.5 overflow-hidden" role="progressbar"
            aria-label="Tiến độ Rework" aria-valuemin={0} aria-valuemax={100} aria-valuenow={rwPercent}>
            <div className="h-full bg-amber-400" style={{ width: `${rwPercent}%` }} />
          </div>
          <div className="text-[11px] text-slate-400 mt-1 text-right">{rwPercent}% theo sản lượng đầu vào</div>
        </section>
      ) : RW_SummaryError ? (
        <div className="flex items-center gap-2 rounded-lg p-2 border border-amber-600/40 bg-amber-950/20 text-amber-200 text-xs">
          <AlertTriangle size={14} /> Không tải được thông tin RW; số liệu đang tạm ẩn.
        </div>
      ) : null}

      {/* 2. THANH TIẾN ĐỘ */}
      <div className="w-full">
        <div className="flex justify-between text-sm font-semibold mb-1.5">
          <span className="text-slate-400">{t('dashboard.progress')}</span>
          <span className="text-blue-400">{progressPercent}%</span>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-2.5 shadow-inner overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-600 to-cyan-400 h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* 3. LƯỚI THÔNG KÊ SẢN LƯỢNG */}
      <div className="grid grid-cols-3 gap-3 mt-1">
        <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50 flex flex-col items-center justify-center">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1 text-[11px] uppercase font-bold tracking-wide">
            <Package size={14} className="text-blue-500"/> {t('dashboard.processed')}
          </div>
          <div className="text-xl font-black text-slate-100">
            {QTY_Processed} <span className="text-sm text-slate-500 font-medium font-mono">/ {QTY_Target}</span>
          </div>
        </div>

        <div className="bg-emerald-900/10 p-3 rounded-lg border border-emerald-500/20 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="flex items-center gap-1.5 text-emerald-500 mb-1 text-[11px] uppercase font-bold tracking-wide">
            <CheckCircle size={14} /> {t('dashboard.okqty')}
          </div>
          <div className="text-xl font-black text-emerald-400 font-mono">
            {QTY_OK}
          </div>
          <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-emerald-500/10 rounded-full blur-md"></div>
        </div>

        <div className="bg-red-900/10 p-3 rounded-lg border border-red-500/20 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="flex items-center gap-1.5 text-red-500 mb-1 text-[11px] uppercase font-bold tracking-wide">
            <XCircle size={14} /> {t('dashboard.ngqty')}
          </div>
          <div className="text-xl font-black text-red-400 font-mono">
            {QTY_NG}
          </div>
          <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-red-500/10 rounded-full blur-md"></div>
        </div>
      </div>
    </div>
  );
};

export default WorkOrderCard;