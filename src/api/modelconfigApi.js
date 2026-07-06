import apiClient from "./client";

export const modelConfigAPI = {
  getAllModels: async () => {
    const response = await apiClient.get('/models/');
    return response.data;
  },

  getModelByNo: async (modelNo) => {
    const safeModelNo = encodeURIComponent(modelNo);
    const response = await apiClient.get(`/models/${safeModelNo}`);
    return response.data; 
  },

  createModel: async (payload) => {
    const response = await apiClient.post('/models/', payload);
    return response.data;
  },

  updateModelJson: async (modelNo, payload) => {
    const safeModelNo = encodeURIComponent(modelNo);
    const response = await apiClient.put(`/models/${safeModelNo}`, {
      type: payload.type || "Auto-Generated",
      jsonData: payload.jsonData,
      routingData: payload.routingData,
      updatedBy: payload.updatedBy // <--- BỔ SUNG DÒNG NÀY ĐỂ TRUYỀN USERNAME ĐI
    });
    return response.data;
  },

  deleteModel: async (modelNo) => {
    const safeModelNo = encodeURIComponent(modelNo);
    const response = await apiClient.delete(`/models/${safeModelNo}`);
    return response.data;
  }
};