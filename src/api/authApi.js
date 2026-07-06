import apiClient from "./client";


export const authApi = {
    login: async (username, password) => {
        const response = await apiClient.post('/auth/login', {
            username,
            password
        });
        return response.data;
    },

    checkHealth: async () => {
        const response = await apiClient.get('http://' + window.location.hostname + ':8000/health');
        return response.data;
    },

    // ==========================================
    // API QUẢN LÝ TÀI KHOẢN (ACCOUNT MANAGEMENT)
    // ==========================================
    
    // Lấy danh sách tất cả tài khoản
    getUsers: async () => {
        const response = await apiClient.get('/auth/users');
        return response.data;
    },

    // Tạo tài khoản mới
    createUser: async (userData) => {
        const response = await apiClient.post('/auth/users', userData);
        return response.data;
    },

    // Cập nhật tài khoản
    updateUser: async (empId, userData) => {
        const response = await apiClient.put(`/auth/users/${empId}`, userData);
        return response.data;
    },

    // Xóa tài khoản
    deleteUser: async (empId) => {
        const response = await apiClient.delete(`/auth/users/${empId}`);
        return response.data;
    }
};