import apiClient from "./client";


export const authApi = {
    login: async (username, password) => {
        const response = await apiClient.post('/auth/login',{
            username,
            password
        });
        return response.data;
    },

    checkHealth: async () => {
        const response = await apiClient.get('http://' + window.location.hostname + ':8000/health');
        return response.data;
    }
};