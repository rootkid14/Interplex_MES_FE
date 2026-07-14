import apiClient from "./client";

export const bomAPI = {
  // Thay thế hàm cũ bằng hàm gọi Lazy Load
  getLazyBOM: async (parentMaterial) => {
    const safeBaseMaterial = encodeURIComponent(parentMaterial);
    const response = await apiClient.get(`/bom/lazy/${safeBaseMaterial}`);
    return response.data; // { success: true, data: [...], mapping: {...} }
  },
  fetchRoutingApi: async (jobNO, targetPN) => {
    try {
      // Dùng params để truyền query string, Axios sẽ tự nối URL và encode
      const response = await apiClient.get(`/bom/fetch_routing`, {
        params: {
          job_no: jobNO,
          target_pn: targetPN
        }
      });
      // Nếu thành công, trả về data
      return response.data; 
    } catch (error) {
      // Với Axios, nếu lỗi xảy ra, nó sẽ nằm trong 'error.response.data' hoặc 'error.message'
      const errorMessage = error.response?.data?.detail || "Có lỗi xảy ra khi lấy dữ liệu Routing";
      throw new Error(errorMessage);
    }
  },
  generateDynamicRouting: async (jobNO, targetPN) => {
    try {
      const response = await apiClient.get(`/bom/generate-routing`, {
        params: { job_no: jobNO, target_part_no: targetPN }
      });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.detail || "Lỗi khi chạy thuật toán tự động";
      throw new Error(errorMessage);
    }
  },

  // Lưu cấu hình vào DB
  saveRoutingConfig: async (payload) => {
    try {
      const response = await apiClient.post(`/bom/save-routing`, payload);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.detail || "Lỗi khi lưu cấu hình";
      throw new Error(errorMessage);
    }
  },
  // Thêm vào trong bomAPI
  getShiftOptions: async () => {
    const response = await apiClient.get(`bom/master/shifts`);
    return response.data;
  },
  
  getMachineOptions: async () => {
    const response = await apiClient.get(`bom/master/machines`);
    return response.data;
  },
};