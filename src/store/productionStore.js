// src/store/productionStore.js
import { create } from 'zustand';

const useProductionStore = create((set, get) => ({
  // 1. STATE AUTH
  isAuthenticated: false, 

  // 2. STATE CHỨA DỮ LIỆU REAL-TIME (TỪ SSE)
  activeJobs: [],
  systemMessages: [],
  ecnAlerts: [], // BỔ SUNG: Chứa danh sách ECN đang chờ xử lý

  // ==========================================
  // CÁC HÀM ACTIONS CẬP NHẬT STATE
  // ==========================================
  setActiveJobs: (jobs) => set({ activeJobs: jobs }),
  setSystemMessages: (messages) => set({ systemMessages: messages }),
  setEcnAlerts: (alerts) => set({ ecnAlerts: alerts }), // BỔ SUNG: Hàm hứng data ECN
  
  // STATE CỦA TRẠM LÀM VIỆC (WORKSTATION)
  currentWorkstation: null,
  setCurrentWorkstation: (data) => set({ currentWorkstation: data }),
  clearCurrentWorkstation: () => set({ currentWorkstation: null }),

  currentAllocation: null,
  setCurrentAllocation: (data) => set({ currentAllocation: data }),
  clearCurrentAllocation: () => set({ currentAllocation: null }),

  getLiveActiveJob: () => {
    const { activeJobs, currentWorkstation } = get();
    if (!currentWorkstation) return null;
    return activeJobs.find(job => job.WO === currentWorkstation.WO) || null;
  },
  configAlerts: [],
  setConfigAlerts: (alerts) => set({ configAlerts: alerts }),
}));

export default useProductionStore;