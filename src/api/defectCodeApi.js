import apiClient from "./client";

export const defectCodeAPI = {
  getAllCodes: async () => {
    const res = await apiClient.get('/defect-codes/');
    return res.data;
  },
  createCode: async (payload) => {
    const res = await apiClient.post('/defect-codes/', payload);
    return res.data;
  },
  updateCode: async (id, payload) => {
    const res = await apiClient.put(`/defect-codes/${id}`, payload);
    return res.data;
  },
  deleteCode: async (id) => {
    const res = await apiClient.delete(`/defect-codes/${id}`);
    return res.data;
  }
};