// MES2 RW Phase C — exact Phase B API contract. All writes are explicit UI actions.
import apiClient from './client';

export const reworkAPI = {
  open: async (payload) => (await apiClient.post('/rework/open', payload)).data,
  addInput: async (payload) => (await apiClient.post('/rework/add-input', payload)).data,
  progress: async (payload) => (await apiClient.post('/rework/progress', payload)).data,
  complete: async (payload) => (await apiClient.post('/rework/complete', payload)).data,
  reopen: async (payload) => (await apiClient.post('/rework/reopen', payload)).data,
  details: async (wo) => (await apiClient.get(`/rework/details/${encodeURIComponent(String(wo))}`)).data,
  allocationBalance: async (wo) => (await apiClient.get(`/allocation/balance/${encodeURIComponent(String(wo))}`)).data,
};

export const rwApiError = (error, fallback = 'Thao tác Rework thất bại.') => {
  if (error?.response?.data?.message) return error.response.data.message;
  if (typeof error?.response?.data?.detail === 'string') return error.response.data.detail;
  if (error?.message) return error.message;
  return fallback;
};
