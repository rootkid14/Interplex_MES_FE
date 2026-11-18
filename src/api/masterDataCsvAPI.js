import client from './client';

export const masterDataCsvAPI = {
  exportCSV: async (payload) => (await client.post('/master-data-csv/export', payload)).data,
  previewCSV: async (payload) => (await client.post('/master-data-csv/preview', payload)).data,
  applyCSV: async (payload) => (await client.post('/master-data-csv/apply', payload)).data,
};
