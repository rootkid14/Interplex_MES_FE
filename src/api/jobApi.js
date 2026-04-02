import apiClient from './client';

export const jobApi = {
  getJobs: async ({ page = 1, limit = 50, jobNo, batchId, status, date }) => {
    try {
      const response = await apiClient.get('/jobs/', {
        params: {
          skip: (page - 1) * limit,
          limit,
          job_no: jobNo || undefined,
          batch_id: batchId || undefined,
          status: status || undefined,
          date: date || undefined
        }
      });
      return response.data;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  }
};