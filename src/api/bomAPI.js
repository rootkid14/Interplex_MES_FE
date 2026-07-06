import apiClient from "./client";

export const bomAPI = {
  // Thay thế hàm cũ bằng hàm gọi Lazy Load
  getLazyBOM: async (parentMaterial) => {
    const safeBaseMaterial = encodeURIComponent(parentMaterial);
    const response = await apiClient.get(`/bom/lazy/${safeBaseMaterial}`);
    return response.data; // { success: true, data: [...], mapping: {...} }
  }
};