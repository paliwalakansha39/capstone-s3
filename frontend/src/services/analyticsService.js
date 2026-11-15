import api from "./api";

/**
 * Frontend Analytics & Reporting API Client Service.
 * Subject: ISD (Information Systems Design)
 */

export async function getOverviewKPIs(params = {}) {
  const filters = Object.fromEntries(
    Object.entries(params).filter(([, val]) => val && val !== "ALL")
  );
  const response = await api.get("/analytics/overview", { params: filters });
  return response.data.data;
}

export async function getFullAnalytics(params = {}) {
  const filters = Object.fromEntries(
    Object.entries(params).filter(([, val]) => val && val !== "ALL")
  );
  const response = await api.get("/analytics/full", { params: filters });
  return response.data.data;
}

export async function getFleetAnalytics(params = {}) {
  const filters = Object.fromEntries(
    Object.entries(params).filter(([, val]) => val && val !== "ALL")
  );
  const response = await api.get("/analytics/fleet", { params: filters });
  return response.data.data;
}

export async function getCrewAnalytics(params = {}) {
  const filters = Object.fromEntries(
    Object.entries(params).filter(([, val]) => val && val !== "ALL")
  );
  const response = await api.get("/analytics/crew", { params: filters });
  return response.data.data;
}

export async function getTripAnalytics(params = {}) {
  const filters = Object.fromEntries(
    Object.entries(params).filter(([, val]) => val && val !== "ALL")
  );
  const response = await api.get("/analytics/trips", { params: filters });
  return response.data.data;
}

export async function getNetworkAnalytics() {
  const response = await api.get("/analytics/network");
  return response.data.data;
}

export async function getSystemValidation() {
  const response = await api.get("/analytics/validation");
  return response.data.data;
}

export async function getReportMetadata() {
  const response = await api.get("/analytics/reports/metadata");
  return response.data.data;
}

/**
 * Triggers a browser download of the operational report (CSV or JSON).
 */
export async function downloadReport({ type = "summary", format = "csv", ...filters } = {}) {
  const params = { type, format, ...filters };
  const response = await api.get("/analytics/export", {
    params,
    responseType: "blob"
  });

  const disposition = response.headers["content-disposition"] || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : `dtc-${type}-report.${format}`;

  const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);

  return filename;
}
