import { create } from "zustand";
import { bomAPI } from "../api/bomAPI"; 
import { modelConfigAPI } from "../api/modelconfigApi";
import useAuthStore from "./AuthStore";

// MES2 UOM: BOM already carries Unit in /bom/lazy; keep the server as authority on save.
const normalizedUom = (unit) => String(unit ?? '').trim().toUpperCase();

// Duplicate Components can appear at different BOM levels. Never silently choose one Unit.
export const rawUomIssues = (nodes, configRules) => {
  const found = new Map();
  const problems = [];
  const walk = (items) => (items || []).forEach(node => {
    const part = String(node.Component || '').trim();
    if (configRules[part]?.scanType === 'RAW_QTY') {
      const unit = normalizedUom(node.Unit);
      if (!unit) problems.push(`${part}: BOM Unit is empty`);
      else if (found.has(part) && found.get(part) !== unit) {
        problems.push(`${part}: conflicting BOM Units (${found.get(part)} / ${unit})`);
      } else found.set(part, unit);
    }
    walk(node.children);
  });
  walk(nodes);
  Object.entries(configRules).forEach(([pn, rule]) => {
    if (rule.scanType === 'RAW_QTY' && !found.has(pn) && !problems.some(p => p.startsWith(`${pn}:`))) {
      problems.push(`${pn}: missing BOM node for active RAW_QTY rule`);
    }
  });
  return [...new Set(problems)];
};

const hydrateRawUoms = (nodes, configRules) => {
  const updated = { ...configRules };
  const changes = [];
  const walk = (items) => (items || []).forEach(node => {
    const pn = String(node.Component || '').trim();
    const rule = updated[pn];
    if (rule?.scanType === 'RAW_QTY') {
      const unit = normalizedUom(node.Unit);
      if (unit && rule.expected_uom && normalizedUom(rule.expected_uom) !== unit) {
        changes.push(`${pn}: ${rule.expected_uom} → ${unit}`);
      }
      // Source of truth is the current BOM node, not a previously saved string.
      updated[pn] = { ...rule, expected_uom: unit };
    }
    walk(node.children);
  });
  walk(nodes);
  return { updated, changes };
};

// Restore every persisted EXTEND branch before Generate Rules is allowed.
// The BOM endpoint is lazy: a parent can load while its expanded grandchildren are still absent.
const restoreSavedExtendedBOM = async (nodes, savedRules, loadBOM, parentPath = new Set(), depth = 0) => {
  if (depth > 48) throw new Error('BOM depth limit exceeded while restoring saved EXTEND rules.');
  for (const node of (nodes || [])) {
    const pn = String(node.Component || '').trim();
    const lineage = new Set(parentPath);
    if (node.MaterialType === 'HALB' && savedRules?.[pn]?.mode === 'EXTEND') {
      if (lineage.has(pn)) throw new Error(`Circular BOM reference while expanding ${pn}.`);
      lineage.add(pn);
      // Always refetch an explicitly EXTENDed HALB: initial lazy BOM may include
      // only a partial child list, even when node.children is not empty.
      const result = await loadBOM(pn);
      const children = result?.data?.[0]?.children;
      if (!Array.isArray(children)) throw new Error(`Cannot restore expanded BOM branch ${pn}. No children were returned.`);
      if (children.length > 0 || !Array.isArray(node.children) || node.children.length === 0) {
        node.children = children;
      }
    }
    if (Array.isArray(node.children) && node.children.length) {
      await restoreSavedExtendedBOM(node.children, savedRules, loadBOM, lineage, depth + 1);
    }
  }
};

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
  loadError: '',

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
  rawUomChanges: [],

  sandboxRules: [
    { id: Date.now(), action: 'SKIP', conditions: [{ id: Date.now(), tools_target: 'PREFIX', tools_type: 'EQUAL', value: '' }] }
  ],

  setConfigType: (type) => set({ configType: type, MasterRouting: [], BomJSON: [], configRules: {}, scanRulesConfig: {}, savedCompactRules: null, loadError: '' }),
  setOutSourcePN: (pn) => set({ outSourcePN: pn }),
  toggleHideIgnored: () => set(s => ({ hideIgnored: !s.hideIgnored })),
  acknowledgeGlobalEcn: () => set({ globalEcnAlert: { hasAlert: false, message: "" } }),
  setSandboxRules: (rules) => set({ sandboxRules: rules }),
  toggleWildcard: (partNo) => set(s => {
    const previous = s.configRules[partNo] || {};
    const enabled = !previous.isWildcard;
    // Wildcard and fixed-string restrictions are mutually exclusive.
    return { configRules: { ...s.configRules, [partNo]: {
      ...previous, isWildcard: enabled, fixedString: enabled ? '' : (previous.fixedString || '')
    } } };
  }),
  updateWildcardLength: (partNo, len) => set(s => ({ configRules: { ...s.configRules, [partNo]: { ...s.configRules[partNo], wildcardLength: len } } })),


  // =====================================
  // 2. MANAGER: FETCH TỪ DB HOẶC ERP
  // =====================================
  fetchConfigOrBom: async (partNo) => {
    set({ isLoading: true, MasterRouting: [], BomJSON: [], configRules: {}, scanRulesConfig: {}, savedCompactRules: null, isLazyLoading: {}, loadError: '' });
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
        // Await the entire saved hierarchy (including nested HALB EXTEND branches).
        // Do not leave Generation enabled while children are still missing.
        await restoreSavedExtendedBOM(rawBom, savedRules, (pn) => bomAPI.getLazyBOM(pn));

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
        const hydrated = hydrateRawUoms(rawBom, initialRules);

        set({
          configType: rData.configType || 'PACKING',
          outSourcePN: rData.outSourcePN || dbRes.jsonData?.outSourcePN || '', 
          MasterRouting: rawBom,
          BomJSON: rawBom,
          loadError: '',
          configRules: hydrated.updated,
          rawUomChanges: hydrated.changes,
          scanRulesConfig: dbRes.jsonData || {},
          savedCompactRules: savedRules,
          isLoading: false,
          globalEcnAlert: { hasAlert: true, message: `Lưu ý: Đã phục hồi cấu hình cũ từ Database.` }
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
        const hydrated = hydrateRawUoms(rawBom, initialRules);
        set({ BomJSON: rawBom, MasterRouting: rawBom, configRules: hydrated.updated, rawUomChanges: [], savedCompactRules: null, isLoading: false, globalEcnAlert: {hasAlert: false, message: ""} });
      }
    } catch (e) {
      console.error("Error loading data:", e);
      set({ isLoading: false, loadError: e?.message || 'Không thể khôi phục cây BOM.' });
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
      
      if (fetchedNode && Array.isArray(fetchedNode.children)) {
        const { configRules, MasterRouting, savedCompactRules } = get();
        const newRules = { ...configRules };
        // Recursively restore any nested saved EXTEND branches before publishing this subtree.
        await restoreSavedExtendedBOM(fetchedNode.children, configRules, (pn) => bomAPI.getLazyBOM(pn));
        const addRuleForEveryDescendant = (nodes) => (nodes || []).forEach(child => {
          const pn = String(child.Component || '').trim();
          if (!newRules[pn]) {
            newRules[pn] = savedCompactRules
              ? (savedCompactRules[pn] || { role: 'STANDARD', scanType: 'IGNORE', fixedString: '', boxQTY: '0', mode: null })
              : { role: 'STANDARD', scanType: child.MaterialType === 'ROH' ? 'RAW_QTY' : 'MAIN_INPUT', fixedString: pn, boxQTY: '0', mode: null };
          }
          addRuleForEveryDescendant(child.children);
        });
        addRuleForEveryDescendant(fetchedNode.children);

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
        const hydrated = hydrateRawUoms(newRouting, newRules);
        set({ MasterRouting: newRouting, configRules: hydrated.updated,
          rawUomChanges: [...get().rawUomChanges, ...hydrated.changes] });
      }
    } catch (e) {
      console.error("Lỗi lazy load", e);
      set({ loadError: e?.message || `Không thể tải BOM cho ${halbPartNo}.` });
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
  enableScanning: (partNo, scanType) => set(s => {
    const matching = [];
    const walk = (nodes) => (nodes || []).forEach(n => {
      if (String(n.Component).trim() === partNo) matching.push(normalizedUom(n.Unit));
      walk(n.children);
    });
    walk(s.MasterRouting);
    const unique = [...new Set(matching.filter(Boolean))];
    return { configRules: { ...s.configRules, [partNo]: {
      ...s.configRules[partNo], scanType,
      expected_uom: scanType === 'RAW_QTY' && unique.length === 1 ? unique[0] : ''
    } } };
  }),
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
    const { MasterRouting, configRules, configType, outSourcePN, isLoading, isLazyLoading, loadError } = get();
    if (isLoading || Object.values(isLazyLoading).some(Boolean)) throw new Error('BOM is still loading. Wait for all extended branches.');
    if (loadError) throw new Error(`BOM load incomplete: ${loadError}`);
    const issues = rawUomIssues(MasterRouting, configRules);
    if (issues.length) throw new Error(`RAW UOM validation failed:\n${issues.join('\n')}`);
    const rules = { mainInputs: [], rawMaterials: [] };
    const registeredRaw = new Set();
    
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

        const ruleObj = { partNumber: node.Component,
          fixedString: config.scanType === 'BOX_RULE' && config.isWildcard ? '' : (config.fixedString || '') };

        if (config.scanType === 'MAIN_INPUT') rules.mainInputs.push(ruleObj);
        else if (config.scanType === 'RAW_QTY' && !registeredRaw.has(node.Component)) {
          registeredRaw.add(node.Component);
          rules.rawMaterials.push({ ...ruleObj, expected_uom: normalizedUom(node.Unit), bom_id: node.IDBOM });
        }
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
    const { scanRulesConfig, configType, outSourcePN, configRules, MasterRouting, isLoading, isLazyLoading, loadError } = get();
    if (isLoading || Object.values(isLazyLoading).some(Boolean) || loadError) throw new Error('BOM is not fully loaded. Please resolve loading errors before Save.');
    const issues = rawUomIssues(MasterRouting, configRules);
    if (issues.length) throw new Error(`RAW UOM validation failed:\n${issues.join('\n')}`);
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
        compactRules[key] = {
          ...rule,
          fixedString: rule.scanType === 'BOX_RULE' && rule.isWildcard ? '' : (rule.fixedString || ''),
          IDBOM: idBomMap[key] ?? rule.IDBOM ?? null
        };
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