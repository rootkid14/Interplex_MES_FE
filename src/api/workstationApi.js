import apiClient from "./client";
console.log("I am a real file")
export const workstationAPI = {
  /**
   * Gọi API Backend để xác thực mã Lệnh Sản Xuất (WO)
   * @param {string} scannedWO - Mã WO vừa quét
   * @returns {Promise<Object>} - Gói StandardResponse { success, message, data }
   */
  validateWorkOrder: async (wo, isAllocation = false, isRework = false) => {
    try {
      // Truyền thêm is_rework vào URL query
      const response = await apiClient.get(`/validation/validate/${wo}?is_allocation=${isAllocation}&is_rework=${isRework}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  linkAssyPacking: async (assyWo, packingWo) => {
    const response = await apiClient.post('/validation/linkAssyPacking', {
        AssyWO: assyWo,
        PackingWO: packingWo
    });
    return response.data;
  },

  setWctr: async (wo, wctr) => {
    // Gọi method POST và gửi kèm body dạng JSON { WO, WCtr }
    const response = await apiClient.post('/validation/setWCTR', {
        WO: wo,
        WCtr: wctr
    });
    return response.data;
  },

  logInputMain: async (wo, batchCode) => {
    //Gọi API này để log vậy liệu inputBatch chính
    const response = await apiClient.post('/validation/logInputMain', {
        WO: wo,
        Batch: batchCode
    });
    return response.data;
  },
  

  logRawMaterial: async (wo, materialCode, qty, partNumber) => {
    // Gọi API này để log vật liệu Raw Material (phụ liệu) kèm theo Part Number
    const response = await apiClient.post('/validation/logRawMaterial', {
        WO: wo,
        RawMaterial: materialCode,
        QTY: qty,
        PartNO: partNumber
    });
    return response.data;
  },

  getLoggedMaterials: async (wo) => {
    const response = await apiClient.get(`/validation/getLoggedMaterials/${wo}`);
    return response.data;
  },

  logDefect: async (payload) => {
    // payload bao gồm: { WO, PartNO, QTY, Description, Type }
    const response = await apiClient.post('/validation/defectLog', payload);
    return response.data;
  },

  requestMaterial: async (payload) => {
    // payload bao gồm: { WO, PartNO, QTY, Type }
    const response = await apiClient.post('/validation/materialRequest', payload);
    return response.data;
  },

  markDone: async (payload) => {
    // payload sẽ là: { WO: 123456, Status: 0 }
    const response = await apiClient.post('/validation/markdone', payload);
    return response.data;
  },

  allocateBatches: async (payload) => {
    // Payload dự kiến: { WO: 12345, Batches: [{code: "B01", qty: 50}, {code: "B02", qty: 25}] }
    const response = await apiClient.post('/validation/batchallocate', payload);
    return response.data;
  },

  logPacking: async (payload) => {
        const response = await apiClient.post('/packing/logPacking', payload);
        return response.data;
    },
    getLoggedBoxes: async (wo) => {
        const response = await apiClient.get(`/packing/getLoggedBoxes/${wo}`);
        return response.data;
    },

    updateWOProgress: async (data) => {
        try {
            const response = await apiClient.post('/validation/updateWOprogress', data);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
  
    getAllocationStatus: async (wo) => {
        return (await apiClient.get(`/allocation/status/${wo}`)).data;
    },
    generateBatches: async (payload) => {
        return (await apiClient.post('/allocation/generate', payload)).data;
    },
    verifyAllocationCard: async (payload) => {
        return (await apiClient.post('/allocation/verify_card', payload)).data;
    },
    verifyBulkCards: async (payload) => {
        return (await apiClient.post('/allocation/verify_bulk', payload)).data;
    },
    printBatches: async (payload) => {
        return (await apiClient.post('/allocation/print_batches', payload)).data;
    },
    initOutsourceAllocation: async (payload) => {
    const response = await apiClient.post('/allocation/outsource/init', payload);
    return response.data;
    },
    deleteAllocation: async (payload) => {
    const response = await apiClient.delete('/allocation/deleteAllocation', {data: payload});
    return response.data;
    },
    getWorkCenters: async () => {
      try {
          const response = await apiClient.get('/validation/getWorkCenters'); // Đổi đường dẫn theo router của bạn
          return response.data;
      } catch (error) {
          throw error;
      }
    },
    // =================================================================
    // CÁC API MỚI CHO QUY TRÌNH HỢP NHẤT (MASTER - DETAIL POOL MODEL)
    // =================================================================

    // Lấy toàn bộ trạng thái của bể chứa (Linkage, Inputs, Boxes)
    getPackingMasterStatus: async (packingWo) => {
      const response = await apiClient.get(`/packing/master/status/${packingWo}`);
      return response.data;
    },


    // Quét mã WO để check xem nó thuộc PartNumber nào (Phục vụ ghép Checklist)
    checkAliasWoInfo: async (aliasWo) => {
      const response = await apiClient.get(`/packing/master/check_alias/${aliasWo}`);
      return response.data;
    },

    // Liên kết 1 Alias WO vào Packing Master
    linkMasterAlias: async (payload) => {
      // payload: { PackingWO: "...", AliasWO: "...", PartNumber: "..." }
      const response = await apiClient.post('/packing/master/link_alias', payload);
      return response.data;
    },

    // Ghi nhận vật tư (Main Input / Raw) vào bể chứa chung của Packing
    logMasterMaterial: async (payload) => {
      // payload: { PackingWO: "...", Code: "...", QTY: 1, Type: "MAIN_INPUT", PartNumber: "..." }
      const response = await apiClient.post('/packing/master/log_material', payload);
      return response.data;
    },

    // Chốt thùng (Đã bao gồm Validate sản lượng chặt chẽ ở Backend)
    logMasterBox: async (payload) => {
      // payload: { PackingWO: "...", BoxId: "...", Items: [], IsSkipped: false, SkipReason: "" }
      const response = await apiClient.post('/packing/master/log_box', payload);
      return response.data;
    },

    // Chốt lệnh tổng (Sẽ tự động chốt luôn các Alias)
    markMasterDone: async (packingWo) => {
      const response = await apiClient.post('/packing/master/mark_done', { PackingWO: packingWo });
      return response.data;
    },

    // Lấy danh sách các Lệnh con (Sub-Assy) đã được liên kết
  // Lấy danh sách các Lệnh phụ (Sub-Assy Alias) đã được lưu trong Database
      getLinkedAliases: async (packingWo) => {
          try {
              const response = await apiClient.get(`/validation/getLinkedAliases/${packingWo}`);
              return response.data;
          } catch (error) {
              throw error;
          }
      },
};