import axios from "axios";

const BASE_URL = "/api/v1/smart-repair";

const getErrorMessage = (error, fallback) => {
    return (
        error?.response?.data?.detail
        || error?.response?.data?.message
        || error?.message
        || fallback
    );
};

export const smartRepairAPI = {
    inspectAssyPacking: async (assyWO) => {
        try {
            const response = await axios.get(
                `${BASE_URL}/assy-packing/${encodeURIComponent(assyWO)}`
            );
            return response.data;
        } catch (error) {
            throw new Error(
                getErrorMessage(
                    error,
                    "Không thể kiểm tra Assy/Packing linkage."
                )
            );
        }
    },

    undoAssyPacking: async ({ AssyWO, PackingWO }) => {
        try {
            const response = await axios.post(
                `${BASE_URL}/assy-packing/undo`,
                {
                    AssyWO: Number(AssyWO),
                    PackingWO: Number(PackingWO),
                }
            );
            return response.data;
        } catch (error) {
            throw new Error(
                getErrorMessage(
                    error,
                    "Không thể Undo Assy/Packing linkage."
                )
            );
        }
    },

    inspectOutsource: async (originalWO) => {
        try {
            const response = await axios.get(
                `${BASE_URL}/outsource/${encodeURIComponent(originalWO)}`
            );
            return response.data;
        } catch (error) {
            throw new Error(
                getErrorMessage(
                    error,
                    "Không thể kiểm tra Outsource allocation."
                )
            );
        }
    },

    undoOutsource: async ({ OriginalWO }) => {
        try {
            const response = await axios.post(
                `${BASE_URL}/outsource/undo`,
                {
                    OriginalWO: Number(OriginalWO),
                }
            );
            return response.data;
        } catch (error) {
            throw new Error(
                getErrorMessage(
                    error,
                    "Không thể Undo Outsource allocation."
                )
            );
        }
    },
};

export default smartRepairAPI;