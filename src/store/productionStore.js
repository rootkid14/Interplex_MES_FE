// src/store/productionStore.js
import { create } from 'zustand';

const useProductionStore = create((set, get) => ({
  // 1. STATE AUTH (Giữ nguyên của bạn)
  isAuthenticated: true, 

  // 2. STATE CHỨA DỮ LIỆU REAL-TIME (TỪ SSE)
  activeJobs: [],
  systemMessages: [],

  // 3. STATE CỦA TRẠM LÀM VIỆC (WORKSTATION)
  currentWorkstation: null, // Sẽ chứa: { WO, ModelNO, PlanQTY, rules: {...} }

  // ==========================================
  // CÁC HÀM ACTIONS CẬP NHẬT STATE
  // ==========================================
  setActiveJobs: (jobs) => set({ activeJobs: jobs }),
  setSystemMessages: (messages) => set({ systemMessages: messages }),
  
  setCurrentWorkstation: (data) => set({ currentWorkstation: data }),
  clearCurrentWorkstation: () => set({ currentWorkstation: null }),

  // Tiện ích bổ sung: Lấy dữ liệu LIVE của WO đang làm việc
  getLiveActiveJob: () => {
    const { activeJobs, currentWorkstation } = get();
    if (!currentWorkstation) return null;
    return activeJobs.find(job => job.WO === currentWorkstation.WO) || null;
  }
}));

export default useProductionStore;