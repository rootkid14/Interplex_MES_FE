import apiClient from "./client";

export const workstationAPI = {
  /**
   * Gọi API Backend để xác thực mã Lệnh Sản Xuất (WO)
   * @param {string} scannedWO - Mã WO vừa quét
   * @returns {Promise<Object>} - Gói StandardResponse { success, message, data }
   */
  validateWorkOrder: async (scannedWO, isAllocation = false) => {
    // Truyền cờ is_allocation lên Backend qua Query Parameter
    const response = await apiClient.get(`/validation/validate/${scannedWO}?is_allocation=${isAllocation}`);
    return response.data; 
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
};