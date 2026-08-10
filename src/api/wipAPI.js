import apiClient from "./client";

const normalizeDepartment = (value) => String(value || "").trim();

const requireDepartment = (value) => {
  const department = normalizeDepartment(value);
  if (!department) {
    throw new Error("Responsible Department is required.");
  }
  return department;
};

export const wipAPI = {
  getList: async ({
    page = 1,
    limit = 50,
    batch = "",
    status_filter = "IN_STOCK",
    responsible_department = "",
  } = {}) => {
    const department = requireDepartment(responsible_department);

    const response = await apiClient.get("/wip/", {
      params: {
        page,
        limit,
        batch: batch || undefined,
        status_filter: status_filter || undefined,
        responsible_department: department,
      },
    });
    return response.data;
  },

  scanIn: async (batch, responsibleDepartment) => {
    const department = requireDepartment(responsibleDepartment);

    const response = await apiClient.post(
      "/wip/scan-in",
      {
        batch: String(batch || "").trim(),
        responsible_department: department,
      }
    );
    return response.data;
  },

  scanOut: async (batch, responsibleDepartment) => {
    const department = requireDepartment(responsibleDepartment);

    const response = await apiClient.post(
      "/wip/scan-out",
      {
        batch: String(batch || "").trim(),
        responsible_department: department,
      }
    );
    return response.data;
  },

  getByModel: async (
    modelNo,
    responsibleDepartment
  ) => {
    const department = requireDepartment(responsibleDepartment);

    const response = await apiClient.get(
      `/wip/by-model/${encodeURIComponent(modelNo)}`,
      {
        params: {
          responsible_department: department,
        },
      }
    );
    return response.data;
  },
};
