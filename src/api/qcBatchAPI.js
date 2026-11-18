import apiClient from './client';

export const qcBatchAPI = {
  status: async (batch) => (await apiClient.get(`/qc-batch/status/${encodeURIComponent(batch)}`)).data,
  heldList: async (payload) => (await apiClient.post('/qc-batch/held-list', payload)).data,
  exportHeld: async (payload) => (await apiClient.post('/qc-batch/held-export', payload, { responseType: 'blob' })).data,
  previewBulkUnhold: async (payload) => (await apiClient.post('/qc-batch/bulk-unhold/preview', payload)).data,
  applyBulkUnhold: async (payload) => (await apiClient.post('/qc-batch/bulk-unhold/apply', payload)).data,
  change: async (payload) => (await apiClient.post('/qc-batch/change', payload)).data,
};
