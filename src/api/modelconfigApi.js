import apiClient from "./client";

export const modelConfigAPI = {
  /**
   * 1. LẤY DANH SÁCH TẤT CẢ MODELS
   * Dùng để đổ dữ liệu vào bảng khi lần đầu load trang
   */
  getAllModels: async () => {
    const response = await apiClient.get('/models/');
    return response.data;
  },

  /**
   * 2. LẤY CHI TIẾT 1 MODEL (KÈM JSON DATA MỚI NHẤT)
   * Dùng khi ấn nút "Modify JSON"
   */
  getModelByNo: async (modelNo) => {
    // Ép encodeURIComponent để phòng trường hợp ModelNO có ký tự đặc biệt như dấu #
    const safeModelNo = encodeURIComponent(modelNo);
    const response = await apiClient.get(`/models/${safeModelNo}`);
    return response.data;
  },

  /**
   * 3. TẠO MỚI MỘT MODEL
   * Dùng khi ấn nút "+ Add New"
   * @param {Object} payload - Ví dụ: { modelNo: "NVI123", type: "Assembly" }
   */
  createModel: async (payload) => {
    const response = await apiClient.post('/models/', payload);
    return response.data;
  },

  /**
   * 4. CẬP NHẬT CHỈ MÌNH CỤC JSON CỦA MODEL
   * Dùng khi ấn nút "Save Configuration" trong Modal
   * @param {string} modelNo 
   * @param {Object} jsonData - Toàn bộ cấu trúc object vừa sửa
   */
  updateModelJson: async (modelNo, jsonData) => {
    const safeModelNo = encodeURIComponent(modelNo);
    // Có thể dùng PUT hoặc PATCH tùy vào thiết kế Backend của bạn
    const response = await apiClient.put(`/models/${safeModelNo}`, {
      jsonData: jsonData
    });
    return response.data;
  },

  /**
   * 5. XÓA MODEL
   * Dùng khi ấn nút "Delete"
   */
  deleteModel: async (modelNo) => {
    const safeModelNo = encodeURIComponent(modelNo);
    const response = await apiClient.delete(`/models/${safeModelNo}`);
    return response.data;
  }
};