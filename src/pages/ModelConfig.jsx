import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FolderOpen, Settings2, Trash2, Cpu, Wrench, X, Plus, Box } from "lucide-react";

import Sidebar from "../components/layout/Sidebar";
import TopSystemBar from "../components/layout/TopSystemBar";
import { ActionButton } from "../components/common/ActionButton";
import { modelConfigAPI } from "../api/modelconfigApi";
// import apiClient from "../api/client"; 

// ==========================================
// COMPONENT 1: MODEL CARD
// ==========================================
const ModelCard = ({ model, onModify, onDelete }) => {
  // Setup Icon và Màu sắc dựa trên Type
  let TypeIcon = Cpu; // Icon mặc định
  let typeColors = "bg-slate-500/20 text-slate-300 border-slate-500/30"; // Màu mặc định

  if (model.type === "Packing") {
    TypeIcon = Box;
    typeColors = "bg-purple-500/20 text-purple-300 border-purple-500/30"; // Packing: Màu tím
  } else if (model.type === "Assembly") {
    TypeIcon = Wrench;
    typeColors = "bg-blue-500/20 text-blue-300 border-blue-500/30"; // Assembly: Màu xanh blue
  } else if (model.type === "Machining") {
    TypeIcon = Cpu;
    typeColors = "bg-orange-500/20 text-orange-300 border-orange-500/30"; // Machining: Màu cam
  }

  return (
    <div className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-slate-700/60 hover:border-slate-500 transition-all shadow-md group gap-4">
      
      {/* KHU VỰC THÔNG TIN MODEL */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-slate-900/50 flex items-center justify-center text-slate-400 group-hover:text-blue-400 transition-colors shadow-inner">
          <FolderOpen size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-100 tracking-wide">{model.modelNo}</h3>
          <div className="flex items-center gap-2 mt-1">
            {/* Render Tag phân loại với màu và Icon tương ứng */}
            <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border font-semibold ${typeColors}`}>
              <TypeIcon size={12} />
              {model.type}
            </span>
          </div>
        </div>
      </div>

      {/* KHU VỰC NÚT BẤM ACTIONS */}
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <ActionButton 
          label="Config" 
          color="blue" 
          icon={<Settings2 size={16} />} 
          onClick={() => onModify(model)} 
          className="flex-1 sm:flex-none" 
        />
        <ActionButton 
          label="Delete" 
          color="red" 
          icon={<Trash2 size={16} />} 
          onClick={() => onDelete(model)} 
          className="flex-1 sm:flex-none" 
        />
      </div>

    </div>
  );
};


const ModelSearchFilter = ({ search, setSearch, filterType, setFilterType }) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-800/40 p-3 rounded-lg border border-slate-700/50 mb-4">
      
      {/* Ô tìm kiếm theo tên Model */}
      <div className="flex items-center w-full sm:w-2/3 bg-slate-900/50 rounded-md px-3 py-2 border border-slate-700 focus-within:border-blue-500 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input 
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm kiếm ModelNO..."
          className="bg-transparent border-none text-white outline-none w-full text-sm placeholder:text-slate-500"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-slate-500 hover:text-slate-300">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Dropdown Lọc theo Type */}
      <div className="w-full sm:w-1/3 flex items-center bg-slate-900/50 rounded-md px-3 py-2 border border-slate-700 focus-within:border-blue-500 transition-colors">
        <span className="text-slate-400 text-sm mr-2 whitespace-nowrap">Lọc:</span>
        <select 
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-transparent border-none text-white outline-none w-full text-sm cursor-pointer appearance-none"
        >
          <option value="All" className="bg-slate-800">Tất cả (All)</option>
          <option value="Assembly" className="bg-slate-800">Assembly</option>
          <option value="Machining" className="bg-slate-800">Machining</option>
          <option value="Packing" className="bg-slate-800">Packing</option>
        </select>
      </div>

    </div>
  );
};

// ==========================================
// SUB-COMPONENTS CHO CONFIG TABLE
// ==========================================
const BoxRule = ({ data, updateData }) => (
  <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
    <h4 className="text-purple-400 font-bold mb-3 border-b border-purple-500/30 pb-2">📦 Box Rule</h4>
    <div className="grid grid-cols-2 gap-4">
      <div><label className="text-xs text-slate-400">Part Number</label><input type="text" value={data?.partNumber || ''} onChange={e => updateData('boxRule', 'partNumber', e.target.value)} className="w-full bg-slate-700 text-white px-3 py-1.5 rounded mt-1 outline-none focus:border-blue-500 border border-slate-600" /></div>
      <div><label className="text-xs text-slate-400">Fixed String</label><input type="text" value={data?.fixedString || ''} onChange={e => updateData('boxRule', 'fixedString', e.target.value)} className="w-full bg-slate-700 text-white px-3 py-1.5 rounded mt-1 outline-none focus:border-blue-500 border border-slate-600" /></div>
      <div><label className="text-xs text-slate-400">Box QTY</label><input type="number" value={data?.boxQTY || ''} onChange={e => updateData('boxRule', 'boxQTY', e.target.value)} className="w-full bg-slate-700 text-white px-3 py-1.5 rounded mt-1 outline-none focus:border-blue-500 border border-slate-600" /></div>
    </div>
  </div>
);

const OutputMain = ({ data, updateData }) => (
  <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-lg mt-4">
    <h4 className="text-emerald-400 font-bold mb-3 border-b border-emerald-500/30 pb-2">🟢 Output Main</h4>
    <div className="grid grid-cols-2 gap-4">
      <div><label className="text-xs text-slate-400">Part Number</label><input type="text" value={data?.partNumber || ''} onChange={e => updateData('outputMain', 'partNumber', e.target.value)} className="w-full bg-slate-700 text-white px-3 py-1.5 rounded mt-1 outline-none focus:border-blue-500 border border-slate-600" /></div>
      <div><label className="text-xs text-slate-400">Fixed String</label><input type="text" value={data?.fixedString || ''} onChange={e => updateData('outputMain', 'fixedString', e.target.value)} className="w-full bg-slate-700 text-white px-3 py-1.5 rounded mt-1 outline-none focus:border-blue-500 border border-slate-600" /></div>
    </div>
  </div>
);

// XÓA BỎ Component InputMain cũ, thay bằng MainInputRow
const MainInputRow = ({ data, index, updateMainInput, removeMainInput }) => (
  <div className="flex gap-4 items-end mb-3">
    <div className="flex-1">
      <label className="text-xs text-slate-400">Main PN #{index + 1}</label>
      <input type="text" value={data.partNumber || ''} onChange={e => updateMainInput(index, 'partNumber', e.target.value)} className="w-full bg-slate-700 text-white px-3 py-1.5 rounded mt-1 outline-none focus:border-blue-500 border border-slate-600" />
    </div>
    <div className="flex-1">
      <label className="text-xs text-slate-400">Fixed String</label>
      <input type="text" value={data.fixedString || ''} onChange={e => updateMainInput(index, 'fixedString', e.target.value)} className="w-full bg-slate-700 text-white px-3 py-1.5 rounded mt-1 outline-none focus:border-blue-500 border border-slate-600" />
    </div>
    {/* Nút xóa dòng */}
    <button onClick={() => removeMainInput(index)} className="p-2 mb-0.5 bg-red-500/10 text-red-400 hover:bg-red-500/30 rounded transition-colors" title="Xóa Input này">
      <Trash2 size={18}/>
    </button>
  </div>
);

// Cập nhật lại RawMaterial để có thêm nút XÓA
const RawMaterialRow = ({ data, index, updateMaterial, removeMaterial }) => (
  <div className="flex gap-4 items-end mb-3">
    <div className="flex-1">
      <label className="text-xs text-slate-400">Raw PN #{index + 1}</label>
      <input type="text" value={data.partNumber} onChange={e => updateMaterial(index, 'partNumber', e.target.value)} className="w-full bg-slate-700 text-white px-3 py-1.5 rounded mt-1 outline-none focus:border-emerald-500 border border-slate-600" />
    </div>
    <div className="flex-1">
      <label className="text-xs text-slate-400">Fixed String</label>
      <input type="text" value={data.fixedString} onChange={e => updateMaterial(index, 'fixedString', e.target.value)} className="w-full bg-slate-700 text-white px-3 py-1.5 rounded mt-1 outline-none focus:border-emerald-500 border border-slate-600" />
    </div>
    <button onClick={() => removeMaterial(index)} className="p-2 mb-0.5 bg-red-500/10 text-red-400 hover:bg-red-500/30 rounded transition-colors" title="Xóa Phụ liệu này">
      <Trash2 size={18}/>
    </button>
  </div>
);

// ==========================================
// COMPONENT 2: CONFIG TABLE (Modal)
// ==========================================
const ConfigTable = ({ modelData, onClose, onSave }) => {
  
  // TỰ ĐỘNG CHUYỂN ĐỔI (BACKWARD COMPATIBILITY)
  // Nếu dữ liệu cũ có inputMain (Object) thì ép nó vào mảng mainInputs
  const getInitialJson = () => {
    let json = modelData.jsonData || {};
    if (json.inputMain && !json.mainInputs) {
      json.mainInputs = [json.inputMain]; // Đưa vào mảng
      delete json.inputMain; // Dọn rác
    }
    if (!json.mainInputs) json.mainInputs = [];
    if (!json.rawMaterials) json.rawMaterials = [];
    return json;
  };

  const [localJson, setLocalJson] = useState(getInitialJson());

  const updateData = (blockName, field, value) => {
    setLocalJson(prev => ({ ...prev, [blockName]: { ...prev[blockName], [field]: value } }));
  };

  // --- CÁC HÀM XỬ LÝ RAW MATERIAL ---
  const updateMaterial = (index, field, value) => {
    const updatedMaterials = [...(localJson.rawMaterials || [])];
    updatedMaterials[index] = { ...updatedMaterials[index], [field]: value };
    setLocalJson(prev => ({ ...prev, rawMaterials: updatedMaterials }));
  };

  const handleAddMaterial = () => {
    setLocalJson(prev => ({ ...prev, rawMaterials: [...(prev.rawMaterials || []), { partNumber: "", fixedString: "" }] }));
  };

  const handleRemoveMaterial = (index) => {
    const updatedMaterials = [...(localJson.rawMaterials || [])];
    updatedMaterials.splice(index, 1);
    setLocalJson(prev => ({ ...prev, rawMaterials: updatedMaterials }));
  };

  // --- CÁC HÀM XỬ LÝ MAIN INPUT (MỚI) ---
  const updateMainInput = (index, field, value) => {
    const updatedInputs = [...(localJson.mainInputs || [])];
    updatedInputs[index] = { ...updatedInputs[index], [field]: value };
    setLocalJson(prev => ({ ...prev, mainInputs: updatedInputs }));
  };

  const handleAddMainInput = () => {
    setLocalJson(prev => ({ ...prev, mainInputs: [...(prev.mainInputs || []), { partNumber: "", fixedString: "" }] }));
  };

  const handleRemoveMainInput = (index) => {
    const updatedInputs = [...(localJson.mainInputs || [])];
    updatedInputs.splice(index, 1);
    setLocalJson(prev => ({ ...prev, mainInputs: updatedInputs }));
  };

  const HandleSaveConfig = () => {
    onSave(modelData.modelNo, localJson);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Settings2 className="text-blue-400"/> {modelData.modelNo} Config</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          
          {/* CÁC RULE CHỈ CÓ Ở ASSEMBLY */}
          {modelData.type === "Packing" && (
            <>
              <BoxRule data={localJson.boxRule} updateData={updateData} />
              <OutputMain data={localJson.outputMain} updateData={updateData} />
            </>
          )}

          {/* BLOCK: MAIN INPUTS (Thay thế cho InputMain cũ) */}
          <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg mt-4 shadow-inner">
            <h4 className="text-blue-400 font-bold mb-3 border-b border-blue-500/30 pb-2">🔵 Main Inputs</h4>
            
            {localJson.mainInputs?.map((mat, idx) => (
              <MainInputRow 
                key={`main-${idx}`} 
                index={idx} 
                data={mat} 
                updateMainInput={updateMainInput} 
                removeMainInput={handleRemoveMainInput} 
              />
            ))}
            
            <button onClick={handleAddMainInput} className="mt-2 flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-bold px-3 py-2 rounded bg-blue-500/10 hover:bg-blue-500/20 transition-colors">
              <Plus size={16} /> Add Main Input
            </button>
          </div>
          
          {/* BLOCK: RAW MATERIALS (Đã cập nhật tên Component và truyền hàm Remove) */}
          <div className="p-4 bg-slate-700/30 border border-slate-600 rounded-lg mt-4 shadow-inner">
            <h4 className="text-slate-300 font-bold mb-3 border-b border-slate-600 pb-2">🔩 Raw Materials</h4>
            
            {localJson.rawMaterials?.map((mat, idx) => (
              <RawMaterialRow 
                key={`raw-${idx}`} 
                index={idx} 
                data={mat} 
                updateMaterial={updateMaterial} 
                removeMaterial={handleRemoveMaterial} 
              />
            ))}
            
            <button onClick={handleAddMaterial} className="mt-2 flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 font-bold px-3 py-2 rounded bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors">
              <Plus size={16} /> Add Raw Material
            </button>
          </div>

        </div>

        <div className="p-6 border-t border-slate-700 bg-slate-800/50 flex justify-end gap-3 rounded-b-2xl">
          <ActionButton label="Back" color="default" onClick={onClose} />
          <ActionButton label="Save Configuration" color="emerald" onClick={HandleSaveConfig} />
        </div>
      </div>
    </div>
  );
};

// ==========================================
// COMPONENT CHÍNH: MODEL CONFIG
// ==========================================
const ModelConfig = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [newModelNO, setNewModelNO] = useState("");
  const [newModelType, setNewModelType] = useState("Assembly");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("All");

  const [models, setModels] = useState([]);

  const [isLoading, setIsLoading] = useState(false);

  const [configTable, setConfigTable] = useState(null); 


  // ==========================================
  // TÍCH HỢP API: LOAD DATA LẦN ĐẦU TIÊN
  // ==========================================
  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    setIsLoading(true);
    try {
      // Gọi API lấy danh sách
      const data = await modelConfigAPI.getAllModels();
      setModels(data);
    } catch (error) {
      console.error("Lỗi khi tải danh sách models:", error);
      alert("Không thể kết nối đến máy chủ để tải dữ liệu!");
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // TÍCH HỢP API: CÁC HÀM XỬ LÝ (CRUD)
  // ==========================================

  // 1. TẠO MỚI (CREATE)
  const HandleAddModel = async () => {
    if (!newModelNO.trim()) return alert("Vui lòng nhập ModelNO!");
    if (models.find(m => m.modelNo === newModelNO)) return alert("ModelNO đã tồn tại!");
    
    const payload = {
      modelNo: newModelNO,
      type: newModelType,
      jsonData: { rawMaterials: [] } 
    };
    
    try {
      const createdModel = await modelConfigAPI.createModel(payload);
      
      setModels([createdModel, ...models]);
      setNewModelNO(""); 
    } catch (error) {
      console.error("Lỗi khi tạo model:", error);
      alert("Tạo Model thất bại. Vui lòng thử lại!");
    }
  };

  // 2. LẤY CHI TIẾT (READ LATEST)
  const HandleModify = async (model) => {
    try {
      // Gọi API GET để lấy cục JsonData mới nhất từ Server
      const latestModelData = await modelConfigAPI.getModelByNo(model.modelNo);
      
      // Mở Modal và đổ dữ liệu mới nhất vào
      setConfigTable(latestModelData);
    } catch (error) {
      console.error("Lỗi khi tải chi tiết model:", error);
      alert("Không thể tải cấu hình mới nhất của Model này!");
    }
  };

  // 3. XÓA (DELETE)
  const HandleDelete = async (modelToDelete) => {
    if(window.confirm(`Xóa cấu hình ${modelToDelete.modelNo}?`)) {
      try {
        // Gọi API DELETE
        await modelConfigAPI.deleteModel(modelToDelete.modelNo);
        
        // Thành công -> Cập nhật UI xóa dòng đó đi
        setModels(models.filter(m => m.modelNo !== modelToDelete.modelNo));
      } catch (error) {
        console.error("Lỗi khi xóa model:", error);
        alert("Xóa thất bại!");
      }
    }
  };

  // 4. CẬP NHẬT (UPDATE)
  const handleSaveJson = async (modelNo, updatedJson) => {
    try {
      // Gọi API PUT/PATCH để cập nhật cục Json
      await modelConfigAPI.updateModelJson(modelNo, updatedJson);
      
      // Thành công -> Cập nhật lại list ở UI và đóng Modal
      setModels(models.map(m => m.modelNo === modelNo ? { ...m, jsonData: updatedJson } : m));
      setConfigTable(null); 
      alert("Lưu cấu hình thành công!");
    } catch (error) {
      console.error("Lỗi khi lưu json:", error);
      alert("Lưu thất bại. Kiểm tra lại kết nối!");
    }
  };

  // Logic lọc dữ liệu
  const filteredModels = models.filter(model => {
    const matchesSearch = model.modelNo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "All" || model.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="flex h-screen bg-slate-900 text-white font-sans overflow-hidden">
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      <main className="flex-1 flex flex-col min-w-0 bg-slate-900 relative">
        <TopSystemBar />

        <div className="flex-1 p-6 overflow-auto relative">
          <div className="relative z-10 max-w-5xl mx-auto space-y-8 mt-4">
            
            {/* TOP CONTROL */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 shadow-lg">
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <div className="flex items-center bg-slate-700/50 rounded-lg overflow-hidden border border-slate-600 focus-within:border-emerald-500 w-full sm:w-auto">
                  <span className="px-3 py-2 text-sm text-emerald-400 font-medium whitespace-nowrap">New ModelNO:</span>
                  <input 
                    type="text" 
                    value={newModelNO}
                    onChange={(e) => setNewModelNO(e.target.value)}
                    className="bg-transparent border-none text-white py-2 pr-3 outline-none w-full sm:w-48 text-sm flex-1 placeholder:text-slate-500"
                    placeholder="e.g. NVI123..."
                  />
                </div>
                <div className="flex items-center bg-slate-700/50 rounded-lg overflow-hidden border border-slate-600 focus-within:border-emerald-500 w-full sm:w-auto">
                  <span className="px-3 py-2 text-sm text-emerald-400 font-medium whitespace-nowrap">Type:</span>
                  <select 
                    value={newModelType}
                    onChange={(e) => setNewModelType(e.target.value)}
                    className="bg-transparent border-none text-white py-2 pr-8 outline-none text-sm cursor-pointer flex-1 w-full"
                    style={{ WebkitAppearance: 'none' }}
                  >
                    <option value="Assembly" className="bg-slate-800">Assembly</option>
                    <option value="Machining" className="bg-slate-800">Machining</option>
                    <option value="Packing" className="bg-slate-800">Packing</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <ActionButton label="+ Add New" color="emerald" onClick={HandleAddModel} className="flex-1 md:flex-none justify-center"/>
                <ActionButton label="Back" color="default" onClick={() => navigate(-1)} className="flex-1 md:flex-none justify-center"/>
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-light text-center tracking-wide text-slate-100">Scanlist Master Registry</h1>

            <ModelSearchFilter 
              search={searchQuery} 
              setSearch={setSearchQuery} 
              filterType={filterType} 
              setFilterType={setFilterType} 
            />

            <div className="space-y-3">
              {/* VÁ LỖI SỐ 2: Dùng filteredModels thay vì models */}
              {filteredModels.length > 0 ? (
                filteredModels.map((model) => (
                  <ModelCard key={model.id} model={model} onModify={HandleModify} onDelete={HandleDelete} />
                ))
              ) : (
                <div className="text-center py-10 text-slate-500 bg-slate-800/30 rounded-lg border border-slate-700/50">
                  Không tìm thấy Model nào.
                </div>
              )}
            </div>
          </div>
        </div>

        {configTable && (
          <ConfigTable modelData={configTable} onClose={() => setConfigTable(null)} onSave={handleSaveJson} />
        )}
      </main>
    </div>
  );
};

export default ModelConfig;