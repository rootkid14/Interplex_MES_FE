import { create } from 'zustand';
import { dbEngineAPI } from '../api/dbEngineApi';

// Các hàm Helpers duyệt cây đệ quy
const findAndModify = (node, targetId, callback) => {
    if (node.id === targetId) return callback(node);
    if (node.rules) return { ...node, rules: node.rules.map(r => findAndModify(r, targetId, callback)) };
    return node;
};

const findAndRemove = (node, targetId) => {
    if (node.rules) return { ...node, rules: node.rules.filter(r => r.id !== targetId).map(r => findAndRemove(r, targetId)) };
    return node;
};

export const useDBEngineStore = create((set, get) => ({
    // ==========================================
    // 1. DATA EXPLORER STATE (BẢNG DỮ LIỆU)
    // ==========================================
    allowedTables: [],
    selectedTable: null,
    schema: [],       
    filterTree: { id: 'root', logic: 'AND', rules: [] },
    
    results: [],
    totalRows: 0,
    page: 1,
    pageSize: 25,
    isLoading: false,
    isExporting: false,

    fetchTables: async () => {
        try {
            const tables = await dbEngineAPI.getTables();
            set({ allowedTables: tables });
        } catch (e) { console.error("Lỗi lấy danh sách bảng:", e); }
    },

    // ĐÃ CẬP NHẬT: Tự động tải Presets khi đổi bảng
    selectTable: async (tableName) => {
        set({ 
            selectedTable: tableName, 
            isLoading: true, 
            filterTree: { id: 'root', logic: 'AND', rules: [] }, 
            page: 1, 
            results: [], 
            totalRows: 0,
            // Reset Plot Config
            plotConfig: { chartType: 'bar', xAxis: '', yAxis: '', aggregation: 'SUM', breakdown: '', timeGrain: 'day' },
            plotData: [],
            plotKeys: ['value']
        });
        try {
            const schemaData = await dbEngineAPI.getTableSchema(tableName);
            const enrichedSchema = schemaData.map(col => ({ ...col, isVisible: true }));
            set({ schema: enrichedSchema });
            
            // Chạy song song 2 việc: Load Data Bảng và Load Tool Presets
            await Promise.all([
                get().executeQuery(),
                get().loadPresets(tableName)
            ]);
        } catch (e) { console.error("Lỗi lấy schema:", e); }
        set({ isLoading: false });
    },

    toggleColumnVisibility: (colName) => set(state => ({
        schema: state.schema.map(c => c.name === colName ? { ...c, isVisible: !c.isVisible } : c)
    })),
    
    // --- QUẢN LÝ CÂY FILTER ---
    addRule: (targetGroupId) => set(state => ({
        filterTree: findAndModify(state.filterTree, targetGroupId, (group) => ({
            ...group,
            rules: [...group.rules, { id: Date.now().toString(), column: state.schema[0]?.name || '', operator: '==', value: '' }]
        }))
    })),

    addGroup: (targetGroupId) => set(state => ({
        filterTree: findAndModify(state.filterTree, targetGroupId, (group) => ({
            ...group,
            rules: [...group.rules, { id: Date.now().toString(), logic: 'AND', rules: [] }]
        }))
    })),

    updateNode: (id, patch) => set(state => ({
        filterTree: findAndModify(state.filterTree, id, (node) => ({ ...node, ...patch }))
    })),

    removeNode: (id) => set(state => ({
        filterTree: findAndRemove(state.filterTree, id)
    })),

    // --- THỰC THI BẢNG DỮ LIỆU ---
    setPage: async (newPage) => { set({ page: newPage }); await get().executeQuery(); },
    setPageSize: async (newSize) => { set({ pageSize: newSize, page: 1 }); await get().executeQuery(); },

    executeQuery: async () => {
        const { selectedTable, filterTree, page, pageSize } = get();
        if (!selectedTable) return;
        set({ isLoading: true });
        try {
            const res = await dbEngineAPI.queryData(selectedTable, filterTree, page, pageSize);
            set({ results: res.data, totalRows: res.total });
        } catch (e) { console.error("Lỗi query:", e); }
        set({ isLoading: false });
    },

    deleteRecord: async (pkColumn, pkValue) => {
        try {
            await dbEngineAPI.deleteRow(get().selectedTable, pkColumn, pkValue);
            await get().executeQuery(); 
        } catch (e) { alert("Lỗi xóa: " + e.message); }
    },

    updateRecord: async (pkColumn, pkValue, newData) => {
        try {
            await dbEngineAPI.updateRow(get().selectedTable, pkColumn, pkValue, newData);
            await get().executeQuery(); 
        } catch (e) { alert("Lỗi cập nhật: " + e.message); }
    },

    exportFullCSV: async () => {
        const { selectedTable, filterTree, totalRows, schema } = get();
        if (!selectedTable || totalRows === 0) return;

        set({ isExporting: true });
        try {
            const res = await dbEngineAPI.queryData(selectedTable, filterTree, 1, totalRows);
            const fullData = res.data;
            if (!fullData || fullData.length === 0) return;

            const visibleCols = schema.filter(c => c.isVisible).map(c => c.name);
            const headers = visibleCols.join(',');
            const rows = fullData.map(row => 
                visibleCols.map(col => `"${(row[col] !== null && row[col] !== undefined ? row[col] : '').toString().replace(/"/g, '""')}"`).join(',')
            );
            
            const csvContent = [headers, ...rows].join('\n');
            const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Export_${selectedTable}_Full.csv`;
            link.click();
        } catch (e) {
            console.error("Lỗi Export CSV:", e);
            alert("Có lỗi xảy ra khi xuất dữ liệu.");
        } finally {
            set({ isExporting: false });
        }
    },


    // ==========================================
    // 2. PLOT ENGINE STATE (BIỂU ĐỒ & DASHBOARD)
    // ==========================================
    viewMode: 'table', // 'table' | 'visualize'
    
    plotConfig: {
        chartType: 'bar',
        xAxis: '',
        yAxis: '',
        aggregation: 'SUM',
        breakdown: '',
        timeGrain: 'day'
    },
    
    plotData: [],
    plotKeys: ['value'], // Mảng chứa các nhánh của Legend. Mặc định là ['value']
    isPlotLoading: false,
    
    // Quản lý lưu/tải Presets
    savedPresets: [],
    isSavingPreset: false,

    setViewMode: (mode) => set({ viewMode: mode }),

    updatePlotConfig: (patch) => set(state => ({ 
        plotConfig: { ...state.plotConfig, ...patch } 
    })),

    // Lấy danh sách Tools đã lưu từ Database
    loadPresets: async (tableName) => {
        try {
            const data = await dbEngineAPI.getPresets(tableName);
            set({ savedPresets: data });
        } catch (e) { 
            console.error("Lỗi lấy presets:", e); 
        }
    },

    // Lưu Tool hiện tại thành Preset mới
    saveNewPreset: async (presetMeta) => {
        const { selectedTable, plotConfig } = get();
        set({ isSavingPreset: true });
        try {
            const payload = {
                TableName: selectedTable,
                PresetName: presetMeta.name,
                Description: presetMeta.description,
                ChartType: plotConfig.chartType,
                XAxis: plotConfig.xAxis,
                YAxis: plotConfig.yAxis,
                Aggregation: plotConfig.aggregation,
                TimeGrain: plotConfig.timeGrain,
                BreakdownColumn: plotConfig.breakdown
            };
            
            await dbEngineAPI.savePreset(payload);
            await get().loadPresets(selectedTable); // Refresh lại danh sách Tools
        } catch (e) { 
            alert("Lỗi khi lưu Tool phân tích!"); 
        }
        set({ isSavingPreset: false });
    },

    // Thực thi query vẽ biểu đồ (Có thuật toán Pivot dữ liệu)
    executePlotQuery: async () => {
        const { selectedTable, filterTree, plotConfig } = get();
        if (!selectedTable || !plotConfig.xAxis) return;
        
        set({ isPlotLoading: true });
        try {
            // Gọi API
            const rawData = await dbEngineAPI.queryAggregate(
                selectedTable, 
                filterTree, 
                plotConfig.xAxis, 
                plotConfig.yAxis, 
                plotConfig.aggregation, 
                plotConfig.breakdown,
                plotConfig.timeGrain
            );
            
            // --- THUẬT TOÁN PIVOT DATA (Dành cho Breakdown/Legend) ---
            if (plotConfig.breakdown) {
                const pivot = {};
                const keys = new Set();
                
                rawData.forEach(row => {
                    // Nếu chưa có nhóm X này, tạo mới
                    if (!pivot[row.name]) {
                        pivot[row.name] = { name: row.name };
                    }
                    // Gắn giá trị vào đúng cột breakdown
                    // VD: { name: "ST-01", "ERR-SCRATCH": 50, "ERR-MISSING": 10 }
                    pivot[row.name][row.breakdown_val] = row.value;
                    keys.add(row.breakdown_val);
                });
                
                set({ 
                    plotData: Object.values(pivot), 
                    plotKeys: Array.from(keys) 
                });
            } else {
                // Nếu không chia Legend, dùng luôn rawData
                set({ 
                    plotData: rawData, 
                    plotKeys: ['value'] 
                });
            }
        } catch (e) { 
            console.error("Lỗi vẽ biểu đồ:", e); 
        } finally { 
            set({ isPlotLoading: false }); 
        }
    }
}));