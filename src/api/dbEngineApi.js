import apiClient from "./client";

export const dbEngineAPI = {
    getTables: async () => {
        const res = await apiClient.get('/dbengine/tables');
        return res.data;
    },
    getTableSchema: async (tableName) => {
        const res = await apiClient.get(`/dbengine/schema/${tableName}`);
        return res.data;
    },
    queryData: async (tableName, filterTree, page, pageSize) => {
        const res = await apiClient.post('/dbengine/query', { tableName, filterTree, page, pageSize });
        return res.data;
    },
    updateRow: async (tableName, pkColumn, pkValue, data) => {
        const res = await apiClient.post('/dbengine/update', { tableName, pkColumn, pkValue, data });
        return res.data;
    },
    deleteRow: async (tableName, pkColumn, pkValue) => {
        const res = await apiClient.post('/dbengine/delete', { tableName, pkColumn, pkValue });
        return res.data;
    },
    queryAggregate: async (tableName, filterTree, xAxis, yAxis, aggregation) => {
        const res = await apiClient.post('/dbengine/query-aggregate', { 
            tableName, filterTree, xAxis, yAxis, aggregation 
        });
        return res.data;
    },
    getPresets: async (tableName) => {
        const res = await apiClient.get(`/dbengine/presets/${tableName}`);
        return res.data;
    },
    savePreset: async (presetData) => {
        const res = await apiClient.post('/dbengine/presets', presetData);
        return res.data;
    },
    // Chú ý: Hàm queryAggregate cũ cần nhận thêm biến `breakdown`
    queryAggregate: async (tableName, filterTree, xAxis, yAxis, aggregation, breakdown) => {
        const res = await apiClient.post('/dbengine/query-aggregate', { 
            tableName, filterTree, xAxis, yAxis, aggregation, breakdown 
        });
        return res.data;
    }
};