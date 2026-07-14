import apiClient from "./client";

export const wipAPI = {
  // Lấy danh sách có phân trang và filter
  getList: async (params) => {
    // params: { page, limit, batch, status_filter }
    const response = await apiClient.get('/wip', { params });
    return response.data; // Trả về { data: [], pagination: {} }
  },

  scanIn: async (batch) => {
    const response = await apiClient.post('/wip/scan-in', { batch });
    return response.data;
  },

  scanOut: async (batch) => {
    const response = await apiClient.post('/wip/scan-out', { batch });
    return response.data;
  },
  getByModel: async (modelNo) => {
        const safeModelNo = encodeURIComponent(modelNo);
        const response = await apiClient.get(`/wip/by-model/${safeModelNo}`);
        return response.data;
    }
};