import apiClient from "./client";

export const traceabilityApi = {
  // 1. Tìm BoxID dựa trên ProductID (Tem dán trên sản phẩm)
  searchBoxByProduct: async (productId) => {
    const response = await apiClient.get(`/tracebility/boxbyproduct/${encodeURIComponent(productId)}`);
    return response.data;
  },

  // 2. FORWARD TRACE: Từ BoxID quét ra toàn bộ Cây WO (Cây gia phả)
  boxForwardTrace: async (boxId) => {
    const response = await apiClient.get(`/tracebility/boxforward/${encodeURIComponent(boxId)}`);
    return response.data;
  },

  // 3. Xem các lô vật liệu chính (Batches) đã dùng cho 1 WO
  getBatchesByWO: async (wo) => {
    const response = await apiClient.get(`/tracebility/batchestracebywo/${wo}`);
    return response.data;
  },

  // 4. Xem các phụ liệu (Raw Materials) đã dùng cho 1 WO
  getMaterialsByWO: async (wo) => {
    const response = await apiClient.get(`/tracebility/materialstracebywo/${wo}`);
    return response.data;
  },

  // 5. REVERSE TRACE: Từ danh sách các WO nghi ngờ, tìm ra tất cả các Box bị ảnh hưởng
  reverseTrace: async (woList) => {
    // Vì woList là một mảng, dùng POST body là an toàn và chuẩn RESTful nhất
    const response = await apiClient.post(`/tracebility/ReverseTrace`, { WOs: woList });
    return response.data;
  },
  // 6. Xem lịch sử Defect của 1 WO
    getDefectsByWO: async (wo) => {
        const response = await apiClient.get(`/tracebility/defectstracebywo/${wo}`);
        return response.data;
    },
    // 7. Xem danh sách Item bên trong Box
    getItemsByBox: async (boxId) => {
        const response = await apiClient.get(`/tracebility/itemsbybox/${encodeURIComponent(boxId)}`);
        return response.data;
    }
};