// ==========================================
// ĐỊNH NGHĨA TRẠNG THÁI (WO STATUS)
// ==========================================

export const WO_STATUS = {
  WAITING: 0,
  IN_PROGRESS: 1,
  COMPLETED: 2,
  OUTSOURCE: 3,
};

// 2. Dùng để hiển thị text ra màn hình (Labels)
export const WO_STATUS_LABEL = {
  [WO_STATUS.WAITING]: "Waiting For Allocation",
  [WO_STATUS.IN_PROGRESS]: "In-Progress",
  [WO_STATUS.COMPLETED]: "Completed",
  [WO_STATUS.OUTSOURCE]: "Outsourced (Vendor)",
};

// 3. Dùng để tô màu UI tương ứng với từng trạng thái
export const WO_STATUS_COLOR = {
  [WO_STATUS.WAITING]: "bg-slate-600 text-slate-200 border-slate-500",
  [WO_STATUS.IN_PROGRESS]: "bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse",
  [WO_STATUS.COMPLETED]: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  [WO_STATUS.OUTSOURCE]: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.2)]", // Tông màu vàng đồng bộ với màn hình Outsource
};

export const MESSAGE_TYPE = {
  MATERIAL_REQUEST: 1,
  DEFECT: 2,
  WARNING: 3,
  SYSTEM_INFO: 4
};


export const STATION_MAPPING = {
    "Stamping": "Dập",
    "CNC": "CNC",
    "Cleaning": "Làm sạch",
    "Powder Coating": "Sơn",
    "Plating": "Mạ",
    "Assembly": "Lắp ráp",
    "Welding": "Hàn"
};