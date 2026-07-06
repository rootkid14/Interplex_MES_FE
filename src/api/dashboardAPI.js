import apiClient from "./client";

export const dashboardAPI = {
  clearDashboardMessage: async (messageId) => {
    const response = await apiClient.post('/dashboard/clearMessage', {
        MessageID: messageId
    });
    return response.data;
  },

  // THÊM MỚI: API Force Close toàn bộ ECN
  acknowledgeECN: async (logId) => {
    const response = await apiClient.post('/dashboard/ecn/acknowledge', {
        LogID: logId
    });
    return response.data;
  },

  // THÊM MỚI: API Tick xác nhận từng Model bị ảnh hưởng
  acknowledgeECNSingleModel: async (logId, modelNo) => {
    const response = await apiClient.post('/dashboard/ecn/acknowledge-model', {
        LogID: logId,
        ModelNO: modelNo
    });
    return response.data;
  },
  ackConfigChange: async (logId) => {
    const response = await apiClient.post('/dashboard/config-changes/acknowledge', { LogID: logId });
    return response.data;
  },
};