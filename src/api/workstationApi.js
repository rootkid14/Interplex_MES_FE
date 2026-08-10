import apiClient from "./client";
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
  
  checkAssyPackingLink: async (assyWo, packingWo) => {
    const response = await apiClient.post(
      '/validation/checkAssyPackingLink',
      {
        AssyWO: Number(assyWo),
        PackingWO: Number(packingWo),
      }
    );
    return response.data;
  },

  linkAssyPacking: async (assyWo, packingWo) => {
    const response = await apiClient.post(
      '/validation/linkAssyPacking',
      {
        AssyWO: Number(assyWo),
        PackingWO: Number(packingWo),
      }
    );
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
    // Gọi API để ghi nhận vật liệu Input Batch chính.
    const response = await apiClient.post('/validation/logInputMain', {
        WO: Number(wo),
        Batch: String(batchCode).trim()
    });
    return response.data;
  },

  transferInputBatch: async (wo, batchCode, remainingQty) => {
    // RemainingQTY là phần còn dư được chuyển sang WO mới.
    const response = await apiClient.post('/validation/transferInputBatch', {
        WO: Number(wo),
        Batch: String(batchCode).trim(),
        RemainingQTY: Number(remainingQty)
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

  // Giữ endpoint cũ cho các màn hình/module chưa migrate.
  logPacking: async (payload) => {
    const response = await apiClient.post('/packing/logPacking', payload);
    return response.data;
  },

  // Scan box hợp lệ -> tạo Box_Status với Status = 0.
  createPackingBox: async (packingWo, boxId) => {
    const response = await apiClient.post(
      '/packing/master/create_box',
      {
        PackingWO: Number(packingWo),
        BoxId: String(boxId).trim(),
      }
    );
    return response.data;
  },

  // Scan item nào -> commit PackingLogItems ngay item đó.
  logPackingItem: async (packingWo, boxId, itemCode) => {
    const response = await apiClient.post(
      '/packing/master/log_box_item',
      {
        PackingWO: Number(packingWo),
        BoxId: String(boxId).trim(),
        ItemCode: String(itemCode).trim(),
      }
    );
    return response.data;
  },

  // Chỉ xác nhận đóng thùng hoặc skip; không gửi lại mảng Items.
  finishPackingBox: async (payload) => {
    const response = await apiClient.post(
      '/packing/master/finish_box',
      {
        PackingWO: Number(payload.PackingWO),
        BoxId: String(payload.BoxId).trim(),
        PN: String(payload.PN || '').trim(),
        IsSkipped: Boolean(payload.IsSkipped),
        SkipReason: String(payload.SkipReason || ''),
      }
    );
    return response.data;
  },

  removePackingItem: async (packingWo, boxId, itemCode) => {
    const response = await apiClient.post(
      '/packing/master/remove_box_item',
      {
        PackingWO: Number(packingWo),
        BoxId: String(boxId).trim(),
        ItemCode: String(itemCode).trim(),
      }
    );
    return response.data;
  },

  deleteOpenPackingBox: async (packingWo, boxId) => {
    const response = await apiClient.post(
      '/packing/master/delete_open_box',
      {
        PackingWO: Number(packingWo),
        BoxId: String(boxId).trim(),
      }
    );
    return response.data;
  },

  getOpenPackingBox: async (wo) => {
    const response = await apiClient.get(
      `/packing/master/get_open_box/${wo}`
    );
    return response.data;
  },

  // Giữ dữ liệu thùng đã hoàn tất từ Batches_Master/Box_Master,
  // đồng thời chèn thùng đang làm dở lấy từ Box_Status.
  getLoggedBoxes: async (wo) => {
    const [finishedResponse, openResponse] = await Promise.all([
      apiClient.get(`/packing/getLoggedBoxes/${wo}`),
      apiClient.get(`/packing/master/get_open_box/${wo}`),
    ]);

    const finishedResult = finishedResponse.data;
    const openResult = openResponse.data;
    const finishedBoxes = finishedResult?.data || [];
    const openBox = openResult?.data || null;

    return {
      success: Boolean(
        finishedResult?.success
        || openResult?.success
      ),
      message: (
        finishedResult?.message
        || openResult?.message
      ),
      data: openBox
        ? [
            openBox,
            ...finishedBoxes.filter(
              box => box.id !== openBox.id
            ),
          ]
        : finishedBoxes,
    };
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


    // API legacy: chỉ đọc PN từ SAP.
    checkAliasWoInfo: async (aliasWo) => {
      const response = await apiClient.get(
        `/packing/master/check_alias/${aliasWo}`
      );
      return response.data;
    },

    // API legacy được giữ để tương thích. Backend vẫn revalidate đầy đủ
    // và không còn nhận PartNumber từ frontend.
    checkMasterAliasLink: async (payload) => {
      const response = await apiClient.post(
        '/packing/master/check_link_alias',
        {
          PackingWO: Number(payload.PackingWO),
          AliasWO: Number(payload.AliasWO),
          CreatedBy: payload.CreatedBy || null,
        }
      );
      return response.data;
    },

    linkMasterAlias: async (payload) => {
      const response = await apiClient.post(
        '/packing/master/link_alias',
        {
          PackingWO: Number(payload.PackingWO),
          AliasWO: Number(payload.AliasWO),
          CreatedBy: payload.CreatedBy || null,
        }
      );
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

    // Chốt Packing Master và deactivate linkage.
    // Backend không tự động đóng trạng thái của Assy WO.
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