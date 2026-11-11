import apiClient from './client';

export const qcBatchAPI = {
  status: async (batch) => (await apiClient.get(`/qc-batch/status/${encodeURIComponent(batch)}`)).data,
  heldList: async (payload) => (await apiClient.post('/qc-batch/held-list', payload)).data,
  exportHeld: async (payload) => (await apiClient.post('/qc-batch/held-export', payload, { responseType: 'blob' })).data,
  change: async (payload) => (await apiClient.post('/qc-batch/change', payload)).data,
};
