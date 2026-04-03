// ==========================================
// ĐỊNH NGHĨA TRẠNG THÁI (WO STATUS)
// ==========================================

export const WO_STATUS = {
  WAITING: 0,
  IN_PROGRESS: 1,
  COMPLETED: 2,
};

// 2. Dùng để hiển thị text ra màn hình (Labels)
export const WO_STATUS_LABEL = {
  [WO_STATUS.WAITING]: "Waiting For Allocation",
  [WO_STATUS.IN_PROGRESS]: "In-Progress",
  [WO_STATUS.COMPLETED]: "Completed",
};

// 3. Dùng để tô màu UI tương ứng với từng trạng thái
export const WO_STATUS_COLOR = {
  [WO_STATUS.WAITING]: "bg-slate-600 text-slate-200 border-slate-500",
  [WO_STATUS.IN_PROGRESS]: "bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse",
  [WO_STATUS.COMPLETED]: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

export const MESSAGE_TYPE = {
  MATERIAL_REQUEST: 1,
  DEFECT: 2,
  WARNING: 3,
  SYSTEM_INFO: 4
};