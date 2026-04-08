import apiClient from "./client";


export const dashboardAPI = {
    clearDashboardMessage: async (messageId) => {
    const response = await apiClient.post('/dashboard/clearMessage', {
        MessageID: messageId
    });
    return response.data;
  },
};