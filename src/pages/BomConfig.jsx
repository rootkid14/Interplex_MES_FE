import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, FileJson, ChevronDown, Package, Layers, Settings2, Save, X, Search, Wrench, CheckCircle2, Box, Cpu, Plus, Trash2, Play, Link as LinkIcon, Filter, AlertCircle, FolderOpen, Download, EyeOff, Eye, BellRing, Loader2 } from 'lucide-react';
import useModelConfigStore from '../store/ModelConfigStore';
import ECNCard from '../components/dashboard/ECNCard';

// ==========================================
// 1. DYNAMIC TABLE ROW
// ==========================================
const ConfigTableRow = ({ node, depth = 0 }) => {
  const { configRules, configType, enableScanning, extendAssyGroup, updateFixedString, updateBoxQty, hideIgnored, isLazyLoading, toggleWildcard, updateWildcardLength } = useModelConfigStore();

  const config = configRules[node.Component] || {};
  const isHalb = node.MaterialType === 'HALB';
  const isFert = node.MaterialType === 'FERT';
  const isRoh  = node.MaterialType === 'ROH';
  const isIgnored = config.scanType === 'IGNORE';
  
  
  // VÁ LỖI 1: Tự động mở rộng UI nếu node được load từ DB có cờ là EXTEND
  const [isExpanded, setIsExpanded] = useState(depth < 1 || config.mode === 'EXTEND');

  // Đảm bảo đồng bộ giao diện khi cây bị load đệ quy hoặc load chậm
  useEffect(() => {
    if (config.mode === 'EXTEND') {
       setIsExpanded(true);
    }
  }, [config.mode]);

  // Ẩn dòng nếu là IGNORE và đang bật toggle
  if (isIgnored && hideIgnored && depth > 0) return null;

  let rowBg = 'border-b border-slate-800/50 transition-colors ';
  if (isFert) rowBg += 'bg-emerald-900/10 hover:bg-slate-800/80 ';
  else if (isHalb) rowBg += 'bg-purple-900/10 hover:bg-slate-800/80 ';
  else rowBg += 'hover:bg-slate-800/80 ';

  if (isIgnored) rowBg += 'opacity-40 bg-slate-900/40 grayscale ';

  const handleToggleMode = () => {
    const newMode = config.mode === 'EXTEND' ? 'ENDPOINT' : 'EXTEND';
    extendAssyGroup(node.Component, newMode, node); 
    setIsExpanded(newMode === 'EXTEND');
  };

  return (
    <>
      <tr className={rowBg}>
        {/* COL 1: Hierarchy & PartNo */}
        <td className="py-3 px-4 transition-all duration-300">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 24}px` }}>
            {node.children?.length > 0 || (isHalb && config.mode !== 'EXTEND') ? (
              <button onClick={() => setIsExpanded(!isExpanded)} className="text-slate-400 hover:text-white w-4 mt-0.5">
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            ) : <span className="w-4"></span>}
            
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider shrink-0 border ${
              isFert ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 
              isHalb ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 
              'bg-amber-500/20 text-amber-400 border-amber-500/30'
            }`}>{node.MaterialType}</span>
            <span className="font-mono text-[14px] font-semibold text-slate-200 tracking-wide">{node.Component}</span>
            
            {isHalb && (
              <button onClick={handleToggleMode} disabled={isLazyLoading[node.Component]} className={`ml-2 flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold tracking-widest uppercase transition-all disabled:opacity-50 ${config.mode === 'EXTEND' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-purple-600/30 text-purple-300 hover:bg-purple-600/50'}`}>
                {isLazyLoading[node.Component] && <Loader2 size={10} className="animate-spin"/>}
                {config.mode === 'EXTEND' ? 'Shrink' : 'Expand'}
              </button>
            )}
          </div>
        </td>

        {/* COL 2: Description */}
        <td className="py-3 px-4">
           <span className="text-sm font-semibold text-sky-300 line-clamp-2 w-[200px]" title={node.DescComponent}>{node.DescComponent}</span>
        </td>

        {/* COL 3: Workcenter */}
        <td className="py-3 px-4">
           {node.Workcenter && (
              <div className="flex flex-col">
                 <span className="text-[11px] font-bold text-slate-400 uppercase">WCTR: <span className="text-orange-300">{node.Workcenter}</span></span>
                 {node.Department && <span className="text-[10px] text-slate-500">Dept: {node.Department}</span>}
              </div>
           )}
        </td>

        {/* COL 4: Scan Role */}
        <td className="py-2 px-4 w-[200px]">
            <select value={config.scanType} onChange={(e) => enableScanning(node.Component, e.target.value)}
              className={`bg-slate-900 text-xs rounded border outline-none px-3 py-2.5 w-full font-semibold transition-colors shadow-inner ${config.scanType === 'MAIN_INPUT' ? 'border-blue-500 text-blue-300 bg-blue-900/10' : config.scanType === 'RAW_QTY' ? 'border-amber-500 text-amber-300' : config.scanType === 'OUTPUT_MAIN' ? 'border-emerald-500 text-emerald-300 bg-emerald-900/10' : config.scanType === 'BOX_RULE' ? 'border-purple-500 text-purple-300 bg-purple-900/10' : 'border-slate-800 text-slate-500'}`}>
              {isFert && configType === 'PACKING' && <option value="BOX_RULE">📦 Box Rule (Packing)</option>}
              {isFert && <option value="OUTPUT_MAIN">🌟 Main Output (Finished)</option>}
              {isHalb && <option value="MAIN_INPUT">✅ Main Input (Barcode)</option>}
              {isHalb && configType === 'PACKING' && <option value="OUTPUT_MAIN">🌟 Sub-Assy Output</option>}
              {isHalb && <option value="RAW_QTY">⚖️ Raw Material (QTY)</option>}
              {isRoh && <option value="RAW_QTY">⚖️ Raw Material (QTY)</option>}
              {isRoh && <option value="MAIN_INPUT">✅ Main Input (Barcode)</option>}
              <option value="IGNORE">🚫 Ignore (Do not scan)</option>
            </select>
        </td>

        {/* COL 5: Formatting */}
        {/* COL 5: Formatting */}
        <td className="py-2 px-4 w-[350px]">
          {!isIgnored && (
            <div className="flex gap-2 items-center flex-wrap w-full">
              
              {/* NẾU LÀ BOX RULE -> RENDER UI WILDCARD VÀ QTY */}
              {config.scanType === 'BOX_RULE' ? (
                 <div className="flex flex-col w-full gap-2 bg-purple-900/10 p-2 rounded-lg border border-purple-500/20">
                     <div className="flex items-center justify-between">
                         <label className="text-[10px] text-orange-400 font-bold flex items-center gap-1.5 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={config.isWildcard || false} 
                                onChange={() => toggleWildcard(node.Component)} 
                                className="accent-orange-500 w-10 h-10" 
                            />
                            Mã ngẫu nhiên (Bỏ trống chiều dài nếu không xác định)
                         </label>
                         
                         <div className="flex items-center gap-1 bg-purple-900/40 border border-purple-500/50 rounded px-2 py-1 shadow-inner">
                          <span className="text-[10px] text-purple-300 uppercase font-bold">QTY/Thùng:</span>
                          <input type="number" value={config.boxQTY || ''} onChange={(e) => updateBoxQty(node.Component, e.target.value)} className="bg-transparent text-white text-xs w-10 text-center font-mono outline-none font-black"/>
                        </div>
                     </div>
                     
                     <div className="flex gap-2 items-center">
                         {config.isWildcard ? (
                             <input 
                                type="number" 
                                placeholder="Bỏ trống chiều dài nếu không xác định" 
                                value={config.wildcardLength || ''} 
                                onChange={(e) => updateWildcardLength(node.Component, e.target.value)} 
                                className="w-full bg-slate-900 border border-orange-500/50 text-orange-300 text-sm px-3 py-1.5 rounded font-mono outline-none focus:border-orange-500" 
                             />
                         ) : (
                             <input 
                                type="text" 
                                placeholder="Format cố định (VD: BXP-)" 
                                value={config.fixedString} 
                                onChange={(e) => updateFixedString(node.Component, e.target.value)} 
                                className="w-full bg-slate-900 border border-slate-600 text-emerald-300 text-sm px-3 py-1.5 rounded font-mono outline-none focus:border-emerald-500" 
                             />
                         )}
                     </div>
                 </div>
              ) : (
                  // CÁC RULE KHÁC CHỈ CÓ FIXED STRING BÌNH THƯỜNG
                  <input type="text" placeholder="Format (VD: P/N:)" value={config.fixedString} onChange={(e) => updateFixedString(node.Component, e.target.value)} className="w-full bg-slate-900 border border-slate-600 text-emerald-300 text-sm px-3 py-1.5 rounded font-mono outline-none focus:border-emerald-500" />
              )}
            </div>
          )}
        </td>
      </tr>
      {isExpanded && node.children?.map((child, idx) => (
        <ConfigTableRow key={`${child.IDBOM}-${idx}`} node={child} depth={depth + 1} />
      ))}
    </>
  );
};

// ==========================================
// CÁC THÀNH PHẦN MODAL (Sandbox, Manager, Review) GIỮ NGUYÊN
// ==========================================
const SandboxModal = ({ onClose }) => {
  const { formulateFilter, sandboxRules, setSandboxRules } = useModelConfigStore();

  const updateRuleAction = (ruleId, val) => setSandboxRules(sandboxRules.map(r => r.id === ruleId ? { ...r, action: val } : r));
  const addRule = () => setSandboxRules([...sandboxRules, { id: Date.now(), action: 'SKIP', conditions: [{ id: Date.now(), tools_target: 'PREFIX', tools_type: 'EQUAL', value: '' }] }]);
  const removeRule = (ruleId) => { if(sandboxRules.length > 1) setSandboxRules(sandboxRules.filter(r => r.id !== ruleId)); };

  const addCondition = (ruleId) => setSandboxRules(sandboxRules.map(r => r.id === ruleId ? { ...r, conditions: [...r.conditions, { id: Date.now(), tools_target: 'PREFIX', tools_type: 'EQUAL', value: '' }] } : r));
  const removeCondition = (ruleId, condId) => setSandboxRules(sandboxRules.map(r => r.id === ruleId ? { ...r, conditions: r.conditions.filter(c => c.id !== condId) } : r));
  const updateCondition = (ruleId, condId, field, val) => setSandboxRules(sandboxRules.map(r => r.id === ruleId ? { ...r, conditions: r.conditions.map(c => c.id === condId ? { ...c, [field]: val } : c) } : r));

  const handleExecute = () => {
    const count = formulateFilter(sandboxRules);
    alert(`Đã áp dụng Filter. Thay đổi (Ignore) cho ${count} vật tư thỏa mãn điều kiện.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-800 flex justify-between bg-slate-800/50 rounded-t-xl items-center">
          <h3 className="text-xl font-bold text-blue-400 flex items-center gap-2"><Filter size={20}/> Advanced Rule Sandbox</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24}/></button>
        </div>
        
        <div className="p-6 overflow-auto flex-1 space-y-6 bg-slate-950">
          <p className="text-sm text-slate-400">Thiết lập luật để tự động IGNORE linh kiện hàng loạt. Trạng thái của Sandbox được lưu xuyên suốt session.</p>

          {sandboxRules.map((rule, rIndex) => (
            <div key={rule.id} className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 relative shadow-inner">
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">RULE {rIndex + 1}</span>
                <select value={rule.action} onChange={e => updateRuleAction(rule.id, e.target.value)} className="bg-slate-900 px-3 py-1.5 rounded text-sm text-white border border-slate-600 outline-none font-bold">
                  <option value="SKIP">🚫 Bỏ qua (SKIP/IGNORE)</option>
                </select>
                <span className="text-slate-400 text-sm">NẾU (Thỏa mãn TẤT CẢ):</span>
                <button onClick={() => removeRule(rule.id)} className="ml-auto text-rose-500 hover:text-rose-400 p-1"><Trash2 size={18}/></button>
              </div>

              <div className="space-y-2 pl-4 border-l-2 border-slate-700 ml-4">
                {rule.conditions.map((cond, cIndex) => (
                  <div key={cond.id} className="flex gap-2 items-center">
                    {cIndex > 0 && <span className="text-blue-400 font-bold text-xs w-8">AND</span>}
                    {cIndex === 0 && <span className="w-8"></span>}
                    
                    <select value={cond.tools_target} onChange={e => updateCondition(rule.id, cond.id, 'tools_target', e.target.value)} className="bg-slate-900 p-2 rounded text-xs text-white border border-slate-700 outline-none w-[140px]">
                      <option value="PREFIX">Prefix</option><option value="SUFFIX">Suffix</option><option value="STRING">String</option><option value="NUMBER">Level</option><option value="MAT_TYPE">Material Type</option>
                      <option value="WORKCENTER">Workcenter</option>
                      <option value="DEPARTMENT">Department</option>
                    </select>
                    
                    <select value={cond.tools_type} onChange={e => updateCondition(rule.id, cond.id, 'tools_type', e.target.value)} className="bg-slate-900 p-2 rounded text-xs text-blue-300 font-bold border border-slate-700 outline-none w-[120px]">
                      <option value="EQUAL">Bằng (==)</option>
                      <option value="NOT_EQUAL">Khác (!=)</option>
                      <option value="CONTAINS">Chứa (in)</option>
                      {cond.tools_target === 'NUMBER' && <option value="ABOVE">Lớn hơn</option>}
                    </select>
                    
                    {cond.tools_target === 'MAT_TYPE' ? (
                      <select value={cond.value} onChange={e => updateCondition(rule.id, cond.id, 'value', e.target.value)} className="flex-1 bg-slate-900 p-2 rounded text-xs text-emerald-300 border border-slate-700 font-mono outline-none">
                        <option value="">-- Chọn Loại --</option><option value="UNBW">UNBW</option><option value="ROH">ROH</option><option value="HALB">HALB</option>
                      </select>
                    ) : cond.tools_target === 'DEPARTMENT' ? (
                      <select value={cond.value} onChange={e => updateCondition(rule.id, cond.id, 'value', e.target.value)} className="flex-1 bg-slate-900 p-2 rounded text-xs text-emerald-300 border border-slate-700 font-mono outline-none">
                        <option value="">-- Chọn Department --</option>
                        <option value="COATING">Coating</option><option value="MOLDING">Molding</option><option value="PLATING">Plating</option>
                        <option value="NCT">NCT</option><option value="STAMPING">Stamping</option><option value="SECONDARY">Secondary</option>
                      </select>
                    ) : (
                      <input type={cond.tools_target === 'NUMBER' ? 'number' : 'text'} placeholder="Giá trị (hỗ trợ phân cách dấu phẩy)..." value={cond.value} onChange={e => updateCondition(rule.id, cond.id, 'value', e.target.value)} className="flex-1 bg-slate-900 p-2 rounded text-xs text-emerald-300 font-mono border border-slate-700 outline-none focus:border-blue-500"/>
                    )}
                    
                    <button onClick={() => removeCondition(rule.id, cond.id)} disabled={rule.conditions.length === 1} className="p-2 text-rose-500/50 hover:text-rose-500 disabled:opacity-0"><X size={16}/></button>
                  </div>
                ))}
                <button onClick={() => addCondition(rule.id)} className="mt-2 text-[11px] font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded flex items-center gap-1 transition-colors"><Plus size={12}/> THÊM ĐIỀU KIỆN (AND)</button>
              </div>
            </div>
          ))}
          <button onClick={addRule} className="w-full text-sm font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 py-3 border border-blue-500/30 border-dashed rounded-xl transition-colors">
             + THÊM LUẬT MỚI (OR)
          </button>
        </div>

        <div className="p-5 border-t border-slate-800 flex justify-end gap-4 bg-slate-900 rounded-b-xl">
          <button onClick={onClose} className="px-6 py-2.5 text-slate-400 hover:text-white font-bold">Đóng</button>
          <button onClick={handleExecute} className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold text-white shadow-lg flex items-center gap-2 transition-transform active:scale-95"><Play size={18}/> THỰC THI FILTER</button>
        </div>
      </div>
    </div>
  );
};

const ConfigManagerModal = ({ onClose, onLoad }) => {
  const { savedModelsList, fetchAllSavedConfigs, deleteSavedConfig } = useModelConfigStore();
  const [search, setSearch] = useState('');

  useEffect(() => { fetchAllSavedConfigs(); }, []);

  const handleDelete = async (pn) => {
    if(window.confirm(`Xóa cấu hình của ${pn}?`)) {
      await deleteSavedConfig(pn);
    }
  };

  const safeList = Array.isArray(savedModelsList) ? savedModelsList : [];
  const filtered = safeList.filter(m => m.modelNo?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[80vh]">
        <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-800/80 rounded-t-xl">
          <h3 className="text-xl font-bold text-blue-400 flex items-center gap-2"><FolderOpen size={20}/> Thư viện Cấu hình</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24}/></button>
        </div>
        
        <div className="p-5 border-b border-slate-800 bg-slate-950">
          <input type="text" placeholder="Tìm kiếm mã vật tư đã lưu..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-white font-mono outline-none focus:border-blue-500" />
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-3 bg-slate-950">
          {filtered.length === 0 ? (
            <p className="text-center text-slate-500 italic mt-10">Không tìm thấy cấu hình.</p>
          ) : (
            filtered.map(model => (
              <div key={model.modelNo} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex justify-between items-center hover:border-slate-500 transition-colors">
                <div>
                  <h4 className="text-lg font-bold text-slate-200">{model.modelNo}</h4>
                  <span className="text-xs text-slate-500 mt-1 block">Quy trình: {model.type}</span>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleDelete(model.modelNo)} className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded font-bold"><Trash2 size={16}/></button>
                  <button onClick={() => { onLoad(model.modelNo); onClose(); }} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold flex items-center gap-2 shadow"><Download size={16}/> TẢI LÊN</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const ReviewModal = ({ onClose, onSave }) => {
  const { scanRulesConfig, configType, outSourcePN, setOutSourcePN } = useModelConfigStore();

  const renderCard = (item) => (
    <div className="bg-slate-800/50 border border-slate-700 rounded p-3 flex justify-between items-center shadow-inner">
      <span className="text-slate-200 font-mono text-sm font-semibold">{item.partNumber}</span>
      <span className="text-emerald-400 font-mono text-xs bg-emerald-900/20 px-2.5 py-1 rounded border border-emerald-500/20">{item.fixedString || '---'}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-700 bg-slate-800/80 flex justify-between items-center rounded-t-xl">
          <h3 className="text-2xl font-bold text-emerald-400 flex items-center gap-2"><CheckCircle2 size={24}/> Xác nhận Cấu hình Máy quét</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24}/></button>
        </div>
        
        <div className="p-6 flex-1 overflow-auto bg-slate-950 space-y-6">
          <div className="flex gap-4">
            <div className="bg-blue-900/20 px-5 py-4 rounded-xl border border-blue-500/30 flex flex-col justify-center min-w-[200px]">
              <span className="text-blue-400 text-xs uppercase block mb-1">Loại quy trình</span>
              <span className="text-blue-300 font-bold text-xl">{configType === 'PACKING' ? 'Assy - Packing' : 'Machining'}</span>
            </div>
            {configType === 'MACHINING' && (
              <div className="flex-1 bg-orange-900/10 px-5 py-4 rounded-xl border border-orange-500/30">
                <span className="text-orange-400 text-xs uppercase block mb-2 flex items-center gap-1 font-bold"><LinkIcon size={14}/> Mã OutSource PN (Liên kết Vendor)</span>
                <input type="text" placeholder="Nhập mã từ Vendor..." value={outSourcePN} onChange={e => setOutSourcePN(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-orange-300 font-mono outline-none focus:border-orange-500 shadow-inner" />
              </div>
            )}
          </div>

          {configType === 'PACKING' && (
            <div className="grid grid-cols-2 gap-6">
               {scanRulesConfig?.outputMain && (
                 <div className="bg-emerald-900/10 border border-emerald-500/30 p-5 rounded-xl">
                   <h4 className="text-emerald-400 text-sm font-bold mb-4 flex items-center gap-2"><Package size={18}/> MAIN OUTPUT</h4>
                   {renderCard(scanRulesConfig.outputMain)}
                 </div>
               )}
               {scanRulesConfig?.boxRule && (
                 <div className="bg-purple-900/10 border border-purple-500/30 p-5 rounded-xl relative">
                   <h4 className="text-purple-400 text-sm font-bold mb-4 flex items-center gap-2"><Box size={18}/> BOX RULE</h4>
                   {renderCard(scanRulesConfig.boxRule)}
                   <div className="absolute top-5 right-5 text-center bg-slate-900 px-4 py-1.5 rounded-lg border border-slate-700 shadow-inner">
                     <span className="block text-[10px] text-purple-300 uppercase font-bold">SL</span>
                     <span className="text-2xl font-bold text-purple-400 leading-none">{scanRulesConfig.boxRule.boxQTY}</span>
                   </div>
                 </div>
               )}
            </div>
          )}

          {configType === 'MACHINING' && scanRulesConfig?.outputMain && (
             <div className="bg-emerald-900/10 border border-emerald-500/30 p-5 rounded-xl mb-6">
               <h4 className="text-emerald-400 text-sm font-bold mb-4 flex items-center gap-2"><Package size={18}/> MAIN OUTPUT</h4>
               {renderCard(scanRulesConfig.outputMain)}
             </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-800">
             <div>
               <h4 className="text-blue-400 text-sm font-bold mb-4 flex items-center gap-2 pb-2">✅ MAIN INPUTS ({scanRulesConfig?.mainInputs?.length || 0})</h4>
               {scanRulesConfig?.mainInputs?.length > 0 ? (
                 <div className="space-y-3">{scanRulesConfig.mainInputs.map((item, i) => <React.Fragment key={i}>{renderCard(item)}</React.Fragment>)}</div>
               ) : <div className="text-slate-500 italic text-sm flex items-center gap-2"><AlertCircle size={16}/> Chưa có Main Input.</div>}
             </div>
             <div>
               <h4 className="text-amber-400 text-sm font-bold mb-4 flex items-center gap-2 pb-2">⚖️ RAW MATERIALS ({scanRulesConfig?.rawMaterials?.length || 0})</h4>
               {scanRulesConfig?.rawMaterials?.length > 0 ? (
                 <div className="space-y-3">{scanRulesConfig.rawMaterials.map((item, i) => <React.Fragment key={i}>{renderCard(item)}</React.Fragment>)}</div>
               ) : <div className="text-slate-500 italic text-sm flex items-center gap-2"><AlertCircle size={16}/> Chưa có Raw Material.</div>}
             </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-700 bg-slate-900 flex justify-end gap-4 rounded-b-xl">
          <button onClick={onClose} className="px-6 py-2.5 text-slate-400 hover:text-white font-semibold">BACK</button>
          <button onClick={onSave} className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold text-white shadow-lg shadow-emerald-900/20 transition-transform active:scale-95 flex items-center gap-2">
            <Save size={20}/> SAVE
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 5. MAIN LAYOUT
// ==========================================
const BomConfig = ({ onClose }) => {
  const { MasterRouting, isLoading, fetchConfigOrBom, parseMasterRoutingToRules, saveConfig, configType, setConfigType, hideIgnored, toggleHideIgnored, globalEcnAlert, acknowledgeGlobalEcn, ecnContext, clearEcnContext } = useModelConfigStore();
  const navigate = useNavigate();
  const [searchPN, setSearchPN] = useState('');
  const [showSandbox, setShowSandbox] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showManager, setShowManager] = useState(false); 
  const [showEcnReview, setShowEcnReview] = useState(false);

  const handleSearch = () => { if (searchPN.trim()) fetchConfigOrBom(searchPN.trim()); };
  const handleProceed = () => { 
    // 1. Phân tích cây BOM thành cấu trúc Rules
    parseMasterRoutingToRules(); 
    
    // 2. Lấy bộ Rules TƯƠI NHẤT vừa được parse từ Store (Tránh lỗi bất đồng bộ của React)
    const { scanRulesConfig } = useModelConfigStore.getState();

    // 3. TẬP HỢP DANH SÁCH CÁC MÃ BỊ LỖI (Bỏ trống Format)
    // - Lọc các Main Inputs thiếu Format
    const invalidMainInputs = (scanRulesConfig.mainInputs || []).filter(r => !r.fixedString?.trim());
    
    // - Lọc các Raw Materials thiếu Format
    const invalidRaws = (scanRulesConfig.rawMaterials || []).filter(r => !r.fixedString?.trim());
    
    // - Kiểm tra Output Main (Thành phẩm / Bán thành phẩm)
    const invalidOutput = (scanRulesConfig.outputMain && !scanRulesConfig.outputMain.fixedString?.trim()) 
                          ? [scanRulesConfig.outputMain] : [];
                          
    // - Kiểm tra Box Rule (Chỉ báo lỗi nếu KHÔNG BẬT Wildcard mà lại bỏ trống Format)
    const invalidBox = (scanRulesConfig.boxRule && !scanRulesConfig.boxRule.isWildcard && !scanRulesConfig.boxRule.fixedString?.trim()) 
                        ? [scanRulesConfig.boxRule] : [];

    // 4. GỘP CHUNG VÀ CẢNH BÁO
    const allInvalids = [...invalidMainInputs, ...invalidRaws, ...invalidOutput, ...invalidBox];

    if (allInvalids.length > 0) {
        const errorList = allInvalids.map(item => `• ${item.partNumber}`).join('\n');
        alert(`🚨 CẢNH BÁO POKA-YOKE (CHỐNG QUÉT NHẦM) 🚨\n\nBạn chưa thiết lập Format nhận diện (Fixed String) cho các vật tư sau:\n${errorList}\n\nĐể đảm bảo an toàn sản xuất, vui lòng nhập tiền tố/định dạng bắt buộc cho các vật tư trên trước khi Generate!`);
        return; // Dừng lập tức, KHÔNG cho mở Modal Review
    }

    // 5. Nếu an toàn 100%, cho phép đi tiếp
    setShowReview(true); 
  };
  
  const handleFinalSave = async () => {
    await saveConfig(searchPN);
    alert("Cấu hình Model đã được lưu thành công vào Database!");
    setShowReview(false);
    if(onClose) onClose();
  };

  useEffect(() => {
    if (ecnContext?.targetModel) {
      // 1. Set PN vào ô input (nếu bạn có state searchPN)
      setSearchPN(ecnContext.targetModel);
      
      // 2. Tự động trigger hàm fetch
      fetchConfigOrBom(ecnContext.targetModel);
      
      // 3. (Tùy chọn) Xóa context sau khi đã load để tránh lặp lại không mong muốn
      // clearEcnContext(); 
    }
  }, [ecnContext]); // Chạy lại mỗi khi ecnContext thay đổi

  return (
    <div className="fixed inset-0 z-40 bg-slate-950 flex flex-col font-sans">
      <div className="bg-slate-900 border-b border-slate-800 h-16 px-6 flex items-center justify-between shrink-0 shadow-sm z-20">
        
        {/* WRAP THE BACK BUTTON AND TITLE IN A FLEX CONTAINER */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              clearEcnContext();
              navigate('/')
            }} 
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700 shadow-sm text-sm font-bold"
          >
            <ArrowLeft size={18} /> BACK
          </button>
          
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <Layers className="text-blue-500" size={24}/> Routing & Scan Configurator
          </h2>
        </div>

        <div className="flex gap-4 items-center">
          
          {/* NÚT THÔNG BÁO ECN (Popover Approach) */}
          {ecnContext && (
            <div className="relative">
              {/* Nút trigger */}
              <button 
                onClick={() => setShowEcnReview(!showEcnReview)} 
                className={`relative p-2 rounded-lg transition-all flex items-center gap-2 border ${
                  showEcnReview 
                    ? 'bg-amber-900/60 border-amber-500 text-amber-100' 
                    : 'bg-amber-900/40 text-amber-400 hover:bg-amber-900/60 border-amber-500/50'
                } shadow-inner`}
              >
                <BellRing size={20} className="animate-pulse" /> 
                <span className="text-sm font-bold uppercase tracking-wider">ECN REVIEW</span>
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-slate-900"></span>
              </button>

              {/* Dropdown Card */}
              {showEcnReview && (
                <>
                  {/* Overlay để click ra ngoài là đóng */}
                  <div className="fixed inset-0 z-40" onClick={() => setShowEcnReview(false)}></div>
                  
                  {/* Card hiển thị tuyệt đối */}
                  <div className="absolute top-14 right-0 w-[500px] z-50 shadow-2xl animate-in fade-in slide-in-from-top-2">
                    <div className="bg-slate-800 border border-slate-600 rounded-xl overflow-hidden shadow-2xl">
                      <div className="p-3 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
                        <span className="text-amber-500 font-bold text-xs uppercase flex items-center gap-2">
                          <AlertCircle size={14}/> Change Details
                        </span>
                        <button onClick={() => setShowEcnReview(false)} className="text-slate-400 hover:text-white"><X size={16}/></button>
                      </div>
                      <div className="p-2">
                        <ECNCard 
                          ecn={ecnContext.ecnData} 
                          readonly={true} 
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <button onClick={toggleHideIgnored} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors border ${hideIgnored ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>
            {hideIgnored ? <EyeOff size={18}/> : <Eye size={18}/>} {hideIgnored ? 'SHOW IGNORE' : 'HIDE IGNORE'}
          </button>
          <button onClick={() => setShowManager(true)} className="flex items-center gap-2 text-slate-300 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg font-bold transition-colors border border-slate-700 shadow-sm">
            <FolderOpen size={18}/> LOAD CONFIG
          </button>
          {onClose && <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-lg"><X size={20}/></button>}
        </div>
      </div>

      <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex gap-8 items-end shrink-0 shadow-lg z-10">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">SELECT PROCESS TYPE</label>
          <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700/50">
            <button onClick={() => setConfigType('PACKING')} className={`px-5 py-2.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${configType === 'PACKING' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}><Box size={16}/> ASSY - PACKING</button>
            <button onClick={() => setConfigType('MACHINING')} className={`px-5 py-2.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${configType === 'MACHINING' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}><Cpu size={16}/> MACHINING</button>
          </div>
        </div>

        <div className="flex-1 max-w-xl flex gap-3">
          <div className="flex-1">
            <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-2">LOOK UP A CONFIG</label>
            <input type="text" placeholder="Nhập Part No..." value={searchPN} onChange={e => setSearchPN(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white font-mono outline-none focus:border-blue-500 shadow-inner" />
          </div>
          <button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-lg mt-6 flex items-center gap-2 shadow-lg font-bold transition-all"><Search size={18}/>GET</button>
        </div>

        <div className="ml-auto flex gap-4 mt-6">
          <button onClick={() => setShowSandbox(true)} disabled={MasterRouting.length === 0} className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 text-blue-400 px-6 py-3 rounded-lg flex items-center gap-2 font-bold transition-all shadow-sm"><Wrench size={18}/> FILTER TOOL</button>
          <button onClick={handleProceed} disabled={MasterRouting.length === 0} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/20 transition-all"><FileJson size={20}/> GENERATE RULES</button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto bg-slate-950 relative">
        {isLoading ? (
           <div className="absolute inset-0 flex items-center justify-center text-blue-400 animate-pulse font-bold text-lg">SCANNING...</div>
        ) : MasterRouting.length === 0 ? (
           <div className="absolute inset-0 flex items-center justify-center text-slate-600 italic">SYSTEM READY.</div>
        ) : (
          <div className="bg-slate-900 rounded-xl border border-slate-700 shadow-2xl overflow-hidden w-full h-full flex flex-col">
            <div className="overflow-auto flex-1 custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[1300px]">
                <thead>
                  <tr className="bg-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-bold sticky top-0 shadow-md z-10 border-b border-slate-700">
                    <th className="py-4 px-6 w-[35%]">BOM ROUTING</th>
                    <th className="py-4 px-4 w-[20%]">Description</th>
                    <th className="py-4 px-4 w-[15%]">Workcenter</th>
                    <th className="py-4 px-4 w-[15%]">SCAN TYPE</th>
                    <th className="py-4 px-6 w-[15%]">FORMAT</th>
                  </tr>
                </thead>
                <tbody>
                  {MasterRouting.map((rootNode, idx) => (
                    <ConfigTableRow key={`${rootNode.IDBOM}-${idx}`} node={rootNode} depth={0} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showSandbox && <SandboxModal onClose={() => setShowSandbox(false)} />}
      {showReview && <ReviewModal onClose={() => setShowReview(false)} onSave={handleFinalSave} />}
      
      {showManager && (
         <ConfigManagerModal 
            onClose={() => setShowManager(false)} 
            onLoad={(pn) => { setSearchPN(pn); fetchConfigOrBom(pn); }} 
         />
      )}
    </div>
  );
};

export default BomConfig;