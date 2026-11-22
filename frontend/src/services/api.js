import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  headers: { Accept: "application/json" }
});

api.interceptors.request.use((config) => {
  try {
    const token = JSON.parse(localStorage.getItem("dtc-admin-session") || "null")?.token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch (error) {
    localStorage.removeItem("dtc-admin-session");
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const errMsg = error.response?.data?.error || "";
      if (errMsg.includes("Invalid or expired") || errMsg.includes("Authentication required") || errMsg.includes("no longer exists")) {
        localStorage.removeItem("dtc-admin-session");
        window.dispatchEvent(new Event("dtc-session-expired"));
      }
    }
    if (error.response?.data?.error) error.message = error.response.data.error;
    return Promise.reject(error);
  }
);

export default api;
