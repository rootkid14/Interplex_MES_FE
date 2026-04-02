import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi } from '../api/authApi';

const useProductionStore = create(
  persist(
    (set, get) => ({
      // 1. STATE VARIABLES (The "Data")
      
      // --- USER SESSION ---
      user: null,             // e.g. { id: 'V0001', name: 'admin', role: 'Worker' }
      isAuthenticated: false,
      stationId: 'A84P1606',  // Hardcoded Work Center for this specific machine

      // --- PRODUCTION CONTEXT ---
      currentJob: null,       // e.g. { jobNo: '1003...', model: 'NVI...', target: 5000 }
      activeInputBatches: [], // List of raw materials linked to this session
      sessionQty: 0,          // Total parts produced in this specific run
      
      // --- UI STATUS (Temporary - Not Saved) ---
      systemStatus: 'IDLE',   // 'IDLE' | 'RUNNING' | 'ERROR' | 'LOCKED'
      errorMessage: '',

      // 2. ACTIONS

      // --- LOGIN / LOGOUT ---
      login: async (username, password) => {
        // SIMULATION: Later, replace this with axios.post('/api/login', ...)
        try {
          const userData = await authApi.login(username, password)
          set({ 
            isAuthenticated: true, 
            user: userData, 
            errorMessage: '' 
          });
        return true;
        } catch (error) {
          const msg = error.response?.data?.detail || 'Login Failed';
          set({ errorMessage: msg });
          return false;
        }
      },

      logout: () => set({ 
        isAuthenticated: false, 
        user: null, 
        currentJob: null, 
        activeInputBatches: [], 
        errorMessage: '',
        systemStatus: 'IDLE'
      }),

      // --- JOB CONTROL ---
      setJob: (jobData) => set({ 
        currentJob: jobData, 
        systemStatus: 'RUNNING', 
        errorMessage: '' 
      }),

      // --- MATERIAL TRACEABILITY (The "Check & Add" Logic) ---
      addInputBatch: (batchId) => {
        // 1. Check duplicate scan
        const exists = get().activeInputBatches.find(b => b.batchId === batchId);
        if (exists) return; 

        // 2. Add to state
        set((state) => ({
          activeInputBatches: [
            ...state.activeInputBatches, 
            { batchId, scannedAt: new Date() }
          ]
        }));
      },

      // --- OUTPUT & SESSION ---
      incrementQty: (amount) => set((state) => ({ 
        sessionQty: state.sessionQty + amount 
      })),
      
      resetSession: () => set({ 
        currentJob: null, 
        activeInputBatches: [], 
        sessionQty: 0, 
        systemStatus: 'IDLE' 
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
      
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated,
        stationId: state.stationId,
        currentJob: state.currentJob,
        activeInputBatches: state.activeInputBatches,
        sessionQty: state.sessionQty,
      }),
    }
  )
);

export default useProductionStore;