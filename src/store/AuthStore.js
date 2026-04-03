import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi } from '../api/authApi';

const useAuthStore = create(
  persist(
    (set) => ({
      // 1. STATE VARIABLES
      user: null,             // { id: 'V0001', name: 'admin', role: 'Worker' }
      isAuthenticated: false,
      authError: '',          // Đổi tên thành authError để không nhầm với lỗi máy móc

      // 2. ACTIONS
      login: async (username, password) => {
        try {
          const userData = await authApi.login(username, password);
          set({ 
            isAuthenticated: true, 
            user: userData, 
            authError: '' 
          });
          return true;
        } catch (error) {
          const msg = error.response?.data?.detail || 'Login Failed';
          set({ authError: msg });
          return false;
        }
      },

      logout: () => set({ 
        isAuthenticated: false, 
        user: null, 
        authError: '' 
      }),

      clearAuthError: () => set({ authError: '' })
    }),

    // 3. PERSIST CONFIGURATION
    {
      name: 'mes-auth-storage', // Tên key lưu trong LocalStorage
      storage: createJSONStorage(() => localStorage),
      // Chỉ lưu lại những thông tin định danh, bỏ qua các lỗi tạm thời
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

export default useAuthStore;