import { create } from "zustand";
import { bomAPI } from "../api/bomAPI"; 
import { modelConfigAPI } from "../api/modelconfigApi";
import useAuthStore from "./AuthStore";

const useModelConfigStore = create((set, get) => ({
  // =====================================
  // 1. DATA CONTAINERS
  // =====================================
  BomJSON: [],
  MasterRouting: [],
  configRules: {},
  scanRulesConfig: {},
  isLoading: false,
  isLazyLoading: {}, 

  ecnContext: null,
  setEcnContext: (ecnData, targetModel) => set({ ecnContext: { ecnData, targetModel } }),
  clearEcnContext: () => set({ ecnContext: null }),

  configType: 'PACKING', 
  outSourcePN: '',       

  // STATE QUẢN LÝ THƯ VIỆN & UI
  savedModelsList: [], 
  hideIgnored: false, 
  
  // TÍNH NĂNG MỚI (VÁ LỖI): Cẩm nang lưu giữ toàn bộ Rule đã nén khi tải từ DB
  savedCompactRules: null, 

  globalEcnAlert: { hasAlert: false, message: "" },

  sandboxRules: [
    { id: Date.now(), action: 'SKIP', conditions: [{ id: Date.now(), tools_target: 'PREFIX', tools_type: 'EQUAL', value: '' }] }
  ],

  setConfigType: (type) => set({ configType: type, MasterRouting: [], BomJSON: [], configRules: {} }),
  setOutSourcePN: (pn) => set({ outSourcePN: pn }),
  toggleHideIgnored: () => set(s => ({ hideIgnored: !s.hideIgnored })),
  acknowledgeGlobalEcn: () => set({ globalEcnAlert: { hasAlert: false, message: "" } }),
  setSandboxRules: (rules) => set({ sandboxRules: rules }),
  toggleWildcard: (partNo) => set(s => ({ configRules: { ...s.configRules, [partNo]: { ...s.configRules[partNo], isWildcard: !s.configRules[partNo].isWildcard } } })),
  updateWildcardLength: (partNo, len) => set(s => ({ configRules: { ...s.configRules, [partNo]: { ...s.configRules[partNo], wildcardLength: len } } })),


  // =====================================
  // 2. MANAGER: FETCH TỪ DB HOẶC ERP
  // =====================================
  fetchConfigOrBom: async (partNo) => {
    set({ isLoading: true });
    try {
      let dbRes = null;
      try {
        const configRes = await modelConfigAPI.getModelByNo(partNo);
        if (configRes && configRes.routingData && Object.keys(configRes.routingData).length > 0) {
          dbRes = configRes;
        }
      } catch (e) {
        console.log("Model chưa có trong DB, kéo mới hoàn toàn từ ERP...");
      }

      const bomRes = await bomAPI.getLazyBOM(partNo);
      const rawBom = bomRes.data || [];

      if (dbRes) {
        const rData = dbRes.routingData;
        const savedRules = rData.compactRules || {}; 
        const initialRules = { ...savedRules }; 

        const applySavedRules = (nodes) => {
          nodes.forEach(node => {
            // NẾU LÀ MÃ MỚI (CHƯA CÓ TRONG CONFIG CŨ) -> AUTO-FILL PN VÀO FIXED STRING
            if (!initialRules[node.Component]) {
              initialRules[node.Component] = {
                role: 'STANDARD', 
                scanType: 'IGNORE', 
                fixedString: node.Component, // <--- AUTO FILL
                boxQTY: '0', 
                mode: null, 
                isWildcard: false, 
                wildcardLength: ''
              };
            }
            if (node.children) applySavedRules(node.children);
          });
        };
        applySavedRules(rawBom);

        set({
          configType: rData.configType || 'PACKING',
          outSourcePN: rData.outSourcePN || dbRes.jsonData?.outSourcePN || '', 
          MasterRouting: rawBom, 
          configRules: initialRules,
          scanRulesConfig: dbRes.jsonData || {},
          savedCompactRules: savedRules,
          isLoading: false,
          globalEcnAlert: { hasAlert: true, message: `Lưu ý: Đã phục hồi cấu hình cũ từ Database.` }
        });

        // Tự động bung đệ quy những HALB đang được EXTEND
        rawBom[0]?.children?.forEach(child => {
          if (child.MaterialType === 'HALB' && initialRules[child.Component]?.mode === 'EXTEND') {
            get().lazyLoadHalb(child.Component, child);
          }
        });

      } else {
        const { configType } = get();
        const initialRules = {};
        const initRules = (nodes, currentLevel = 0) => {
          nodes.forEach(node => {
            let defaultScanType = 'IGNORE', defaultRole = 'STANDARD', defaultMode = null;
            
            if (configType === 'PACKING') {
              if (node.MaterialType === 'FERT') { defaultScanType = 'BOX_RULE'; defaultRole = 'PACKING_BOX'; } 
              else if (node.MaterialType === 'HALB') { defaultRole = 'ASSY_LABEL'; defaultScanType = currentLevel === 1 ? 'OUTPUT_MAIN' : 'MAIN_INPUT'; } 
              else if (node.MaterialType === 'ROH') { defaultScanType = 'RAW_QTY'; }
            } 
            else if (configType === 'MACHINING') {
              if (currentLevel === 0) { defaultScanType = 'IGNORE'; defaultRole = 'STANDARD'; } 
              else if (node.MaterialType === 'HALB') { defaultRole = 'STANDARD'; defaultScanType = 'MAIN_INPUT'; } 
              else if (node.MaterialType === 'ROH') { defaultScanType = 'RAW_QTY'; }
            }

            // MÔI TRƯỜNG TẠO MỚI HOÀN TOÀN -> AUTO-FILL PN VÀO FIXED STRING TẤT CẢ VẬT TƯ
            initialRules[node.Component] = { 
                role: defaultRole, 
                scanType: defaultScanType, 
                fixedString: node.Component, // <--- AUTO FILL
                boxQTY: node.MaterialType === 'FERT' ? '1' : '0', 
                mode: defaultMode, 
                isWildcard: false, 
                wildcardLength: '' 
            };
            
            if (node.children) initRules(node.children, currentLevel + 1);
          });
        };
        
        initRules(rawBom);
        set({ BomJSON: rawBom, MasterRouting: rawBom, configRules: initialRules, savedCompactRules: null, isLoading: false, globalEcnAlert: {hasAlert: false, message: ""} });
      }
    } catch (e) {
      console.error("Error loading data:", e);
      set({ isLoading: false });
    }
  },

  // =====================================
  // 3. LAZY LOAD HALB (VÁ LỖI MẤT CONFIG)
  // =====================================
  lazyLoadHalb: async (halbPartNo, nodeRef) => {
    set(s => ({ isLazyLoading: { ...s.isLazyLoading, [halbPartNo]: true } }));
    try {
      const res = await bomAPI.getLazyBOM(halbPartNo);
      const fetchedNode = res.data[0];
      
      if (fetchedNode && fetchedNode.children) {
        const { configRules, MasterRouting, savedCompactRules } = get();
        const newRules = { ...configRules };
        
        fetchedNode.children.forEach(child => {
          if (!newRules[child.Component]) {
             if (savedCompactRules && savedCompactRules[child.Component]) {
                 // NẾU TRONG CẨM NANG ĐÃ LƯU CÓ MÃ NÀY -> LẤY ĐỒ CŨ (Giữ nguyên user input)
                 newRules[child.Component] = savedCompactRules[child.Component];
             } else {
                 // MÃ MỚI TINH HOẶC CHƯA LƯU -> AUTO-FILL FIXED STRING
                 newRules[child.Component] = { 
                     role: 'STANDARD', 
                     scanType: child.MaterialType === 'ROH' ? 'RAW_QTY' : 'MAIN_INPUT', 
                     fixedString: child.Component, // <--- AUTO FILL
                     boxQTY: '0', 
                     mode: null 
                 };
             }
          }
        });

        const insertChildren = (nodes) => {
          for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].Component === halbPartNo) {
              nodes[i].children = fetchedNode.children;
              return true;
            }
            if (nodes[i].children && insertChildren(nodes[i].children)) return true;
          }
          return false;
        };

        const newRouting = [...MasterRouting];
        insertChildren(newRouting);
        set({ MasterRouting: newRouting, configRules: newRules });
      }
    } catch (e) {
      console.error("Lỗi lazy load", e);
    } finally {
      set(s => ({ isLazyLoading: { ...s.isLazyLoading, [halbPartNo]: false } }));
    }
  },

  // =====================================
  // 3. LAZY LOAD HALB (VÁ LỖI MẤT CONFIG)
  // =====================================
  lazyLoadHalb: async (halbPartNo, nodeRef) => {
    set(s => ({ isLazyLoading: { ...s.isLazyLoading, [halbPartNo]: true } }));
    try {
      const res = await bomAPI.getLazyBOM(halbPartNo);
      const fetchedNode = res.data[0];
      
      if (fetchedNode && fetchedNode.children) {
        const { configRules, MasterRouting, savedCompactRules } = get();
        const newRules = { ...configRules };
        
        // VÁ LỖI QUAN TRỌNG TẠI ĐÂY
        fetchedNode.children.forEach(child => {
          if (!newRules[child.Component]) {
             if (savedCompactRules) {
                 // NẾU ĐANG PHỤC HỒI TỪ DB: Lấy từ cẩm nang ra (để giữ nguyên Raw/MainInput và fixedString)
                 // Nếu trong cẩm nang không có -> nó đã bị user IGNORE lúc save -> trả về IGNORE
                 newRules[child.Component] = savedCompactRules[child.Component] || { 
                     role: 'STANDARD', scanType: 'IGNORE', fixedString: '', boxQTY: '0', mode: null 
                 };
             } else {
                 // NẾU LÀ TẠO MỚI HOÀN TOÀN: Sinh luật Default
                 newRules[child.Component] = { 
                     role: 'STANDARD', scanType: child.MaterialType === 'ROH' ? 'RAW_QTY' : 'MAIN_INPUT', fixedString: child.Component, boxQTY: '0', mode: null 
                 };
             }
          }
        });

        const insertChildren = (nodes) => {
          for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].Component === halbPartNo) {
              nodes[i].children = fetchedNode.children;
              return true;
            }
            if (nodes[i].children && insertChildren(nodes[i].children)) return true;
          }
          return false;
        };

        const newRouting = [...MasterRouting];
        insertChildren(newRouting);
        set({ MasterRouting: newRouting, configRules: newRules });
      }
    } catch (e) {
      console.error("Lỗi lazy load", e);
    } finally {
      set(s => ({ isLazyLoading: { ...s.isLazyLoading, [halbPartNo]: false } }));
    }
  },

  // =====================================
  // CÁC HÀM CÒN LẠI GIỮ NGUYÊN BẢN CŨ
  // =====================================
  fetchAllSavedConfigs: async () => {
    try {
      const data = await modelConfigAPI.getAllModels();
      set({ savedModelsList: data || [] }); 
    } catch (e) {
      console.error("Failed to fetch saved models", e);
      set({ savedModelsList: [] });
    }
  },

  deleteSavedConfig: async (partNo) => {
    try {
      await modelConfigAPI.deleteModel(partNo);
      set((state) => ({ savedModelsList: (state.savedModelsList || []).filter(m => m.modelNo !== partNo) }));
    } catch (e) {
      console.error("Delete failed", e);
      throw e;
    }
  },

  setRole: (partNo, role) => set(s => ({ configRules: { ...s.configRules, [partNo]: { ...s.configRules[partNo], role } } })),
  enableScanning: (partNo, scanType) => set(s => ({ configRules: { ...s.configRules, [partNo]: { ...s.configRules[partNo], scanType } } })),
  updateFixedString: (partNo, str) => set(s => ({ configRules: { ...s.configRules, [partNo]: { ...s.configRules[partNo], fixedString: str } } })),
  updateBoxQty: (partNo, qty) => set(s => ({ configRules: { ...s.configRules, [partNo]: { ...s.configRules[partNo], boxQTY: qty } } })),
  
  extendAssyGroup: (partNo, mode, node) => {
    set((state) => ({
      configRules: { 
        ...state.configRules, 
        [partNo]: { ...state.configRules[partNo], mode, scanType: mode === 'EXTEND' ? 'IGNORE' : 'MAIN_INPUT' } 
      }
    }));
    if (mode === 'EXTEND' && (!node.children || node.children.length === 0)) {
      get().lazyLoadHalb(partNo, node);
    }
  },

  formulateFilter: (rules_array) => {
    const { MasterRouting, configRules } = get();
    const newRules = { ...configRules };
    let matchCount = 0;

    const scanTree = (nodes) => {
      nodes.forEach(node => {
        let nodeMatched = false;
        const comp = node.Component.toUpperCase();

        rules_array.forEach(rule => {
          const { action, conditions } = rule;
          
          const isMatch = conditions.every(cond => {
            if (cond.tools_target !== 'MAT_TYPE' && (!cond.value || !cond.value.trim())) return false;
            const vals = cond.value.split(',').map(v => v.trim().toUpperCase()).filter(v => v);
            
            return vals.some(val => {
              if (cond.tools_type === 'NOT_EQUAL') {
                 if (cond.tools_target === 'DEPARTMENT') return (node.Department || '') !== val;
                 if (cond.tools_target === 'WORKCENTER') return (node.Workcenter || '') !== val;
                 if (cond.tools_target === 'PREFIX') return !comp.startsWith(val);
              }

              if (['PREFIX', 'SUFFIX', 'STRING'].includes(cond.tools_target)) {
                if (cond.tools_type === 'CONTAINS') return comp.includes(val);
                if (cond.tools_type === 'EQUAL') {
                  if (cond.tools_target === 'PREFIX') return comp.startsWith(val);
                  if (cond.tools_target === 'SUFFIX') return comp.endsWith(val);
                  if (cond.tools_target === 'STRING') return comp === val;
                }
              } 
              else if (cond.tools_target === 'NUMBER') {
                const levelVal = parseInt(val, 10);
                if (cond.tools_type === 'EQUAL') return node.Level === levelVal;
                if (cond.tools_type === 'ABOVE') return node.Level > levelVal;
              } 
              else if (cond.tools_target === 'MAT_TYPE') {
                return node.MaterialType === val;
              }
              else if (cond.tools_target === 'DEPARTMENT') {
                if (cond.tools_type === 'EQUAL') return node.Department === val;
              }
              else if (cond.tools_target === 'WORKCENTER') {
                if (cond.tools_type === 'EQUAL') return node.Workcenter === val;
              }
              return false;
            });
          });

          if (isMatch && conditions.length > 0) {
            nodeMatched = true;
            if (action === 'SKIP') newRules[node.Component].scanType = 'IGNORE';
          }
        });

        if (nodeMatched) matchCount++;
        if (node.children) scanTree(node.children);
      });
    };

    scanTree(MasterRouting);
    set({ configRules: newRules });
    return matchCount;
  },

  parseMasterRoutingToRules: () => {
    const { MasterRouting, configRules, configType, outSourcePN } = get();
    const rules = { mainInputs: [], rawMaterials: [] };
    
    if (configType === 'PACKING') {
      rules.boxRule = null;
      rules.outputMain = null;
    } else {
      rules.outSourcePN = outSourcePN || "";
    }

    // FIX LỖI: Thêm tham số currentLevel để biết đang ở tầng nào của BOM
    const traverse = (nodes, currentLevel = 0) => {
      nodes.forEach(node => {
        const config = configRules[node.Component];
        if (!config) return;

        const ruleObj = { partNumber: node.Component, fixedString: config.fixedString };

        if (config.scanType === 'MAIN_INPUT') rules.mainInputs.push(ruleObj);
        else if (config.scanType === 'RAW_QTY') rules.rawMaterials.push(ruleObj);
        else if (config.scanType === 'OUTPUT_MAIN') rules.outputMain = ruleObj;
        else if (config.scanType === 'BOX_RULE' && configType === 'PACKING') {
          // [ĐÃ CẬP NHẬT]: Gom thêm thuộc tính Wildcard vào cục boxRule để đẩy xuống môi trường Production
          rules.boxRule = { 
            ...ruleObj, 
            boxQTY: config.boxQTY || "0",
            isWildcard: config.isWildcard || false,
            wildcardLength: config.wildcardLength || ""
          };
        }

        if (node.children && (currentLevel === 0 || node.MaterialType !== 'HALB' || config.mode === 'EXTEND')) {
          traverse(node.children, currentLevel + 1);
        }
      });
    };
    traverse(MasterRouting, 0);
    set({ scanRulesConfig: rules });
  },

  saveConfig: async (partNo) => {
    const { scanRulesConfig, configType, outSourcePN, configRules, MasterRouting } = get();
    // ... (Code map IDBOM giữ nguyên) ...
    const idBomMap = {};
    const extractIdBoms = (nodes) => {
      nodes.forEach(node => {
        if (!idBomMap[node.Component]) idBomMap[node.Component] = node.IDBOM;
        if (node.children) extractIdBoms(node.children);
      });
    };
    extractIdBoms(MasterRouting);

    const compactRules = {};
    Object.keys(configRules).forEach(key => {
      const rule = configRules[key];
      if (rule.scanType !== 'IGNORE' || rule.mode === 'EXTEND') {
        compactRules[key] = { ...rule, IDBOM: idBomMap[key] || null };
      }
    });
    
    let mergedScanRules = { ...scanRulesConfig };
    if (outSourcePN && outSourcePN.trim() !== '') {
      mergedScanRules.outSourcePN = outSourcePN.trim();
    }

    const finalPayload = {
      type: configType,
      jsonData: mergedScanRules, 
      routingData: { configType, compactRules, outSourcePN: (outSourcePN || '').trim() },
      // Lấy tên user hoặc mã nhân viên đang đăng nhập hiện tại
      updatedBy: useAuthStore.getState().user?.Emp_Name || useAuthStore.getState().user?.Emp_Login || 'Unknown'
    };
    
    console.log("Payload hợp lệ chuẩn bị gửi:", finalPayload);
    await modelConfigAPI.updateModelJson(partNo, finalPayload);
    get().clearEcnContext();
    return true;
  }
}));

export default useModelConfigStore;