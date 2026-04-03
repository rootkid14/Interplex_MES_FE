import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useProductionStore = create(
  persist(
    (set, get) => ({
      // 1. STATE VARIABLES (The "Machine & Production Data")
      stationId: 'A84P1606',  // Work Center ID
      currentJob: null,       // { jobNo: '1003...', model: 'NVI...', target: 5000 }
      activeInputBatches: [], 
      sessionQty: 0,          
      
      // UI STATUS
      systemStatus: 'IDLE',   // 'IDLE' | 'RUNNING' | 'ERROR' | 'LOCKED'
      errorMessage: '',       // Dành riêng cho lỗi hệ thống máy/quy trình

      // 2. ACTIONS
      setJob: (jobData) => set({ 
        currentJob: jobData, 
        systemStatus: 'RUNNING', 
        errorMessage: '' 
      }),

      addInputBatch: (batchId) => {
        const exists = get().activeInputBatches.find(b => b.batchId === batchId);
        if (exists) return; 

        set((state) => ({
          activeInputBatches: [
            ...state.activeInputBatches, 
            { batchId, scannedAt: new Date() }
          ]
        }));
      },

      incrementQty: (amount) => set((state) => ({ 
        sessionQty: state.sessionQty + amount 
      })),
      
      resetSession: () => set({ 
        currentJob: null, 
        activeInputBatches: [], 
        sessionQty: 0, 
        systemStatus: 'IDLE',
        errorMessage: ''
      }),
      
      setError: (msg) => set({ 
        systemStatus: 'ERROR', 
        errorMessage: msg 
      }),
    }),

    // 3. PERSIST CONFIGURATION
    {
      name: 'mes-production-storage', 
      storage: createJSONStorage(() => localStorage),
      // Lưu lại trạng thái của ca sản xuất hiện tại
      partialize: (state) => ({ 
        stationId: state.stationId,
        currentJob: state.currentJob,
        activeInputBatches: state.activeInputBatches,
        sessionQty: state.sessionQty,
      }),
    }
  )
);

export default useProductionStore;