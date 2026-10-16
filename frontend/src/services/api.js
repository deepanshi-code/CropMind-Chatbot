import axios from "axios";

// Always same-origin (Vite dev proxy / Vercel rewrite) so the httpOnly session cookie is first-party.
// A cross-site API URL would make browsers drop the cookie, so VITE_API_URL is intentionally not used.
const API_BASE_URL = "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    // Required by the backend on state-changing requests (CSRF protection).
    "X-Requested-With": "CropMind"
  }
});

// On an expired or revoked session, tell the app and send the user to the login page.
// /auth/me is excluded: a 401 there just means "not logged in" (e.g. on the Home page).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    if (error.response?.status === 401 && !url.startsWith("/auth/")) {
      window.dispatchEvent(new Event("auth-change"));
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login?error=SessionExpired";
      }
    }
    return Promise.reject(error);
  }
);

export const googleLoginUrl = () => `${API_BASE_URL}/auth/google`;

export const getCurrentUser = async () => {
  const response = await api.get("/auth/me");
  return response.data.user;
};

export const registerUser = async (email, password) => {
  const response = await api.post("/auth/register", { email, password });
  return response.data;
};

export const loginUser = async (email, password) => {
  const response = await api.post("/auth/login", { email, password });
  return response.data;
};

export const logoutUser = async () => {
  await api.post("/auth/logout");
};

export const getCrops = async () => {
  const response = await api.get("/crops");
  return response.data;
};

export const createCrop = async (cropData) => {
  const response = await api.post("/crops", cropData);
  return response.data;
};

export const deleteCrop = async (id) => {
  await api.delete(`/crops/${id}`);
};

export const updateCrop = async (id, cropData) => {
  const response = await api.put(`/crops/${id}`, cropData);
  return response.data;
};

export const searchCrops = async (name) => {
  const response = await api.get(`/crops/search/${encodeURIComponent(name)}`);
  return response.data;
};

/**
 * @param {string} message
 * @param {Array<{role: "user"|"assistant", text: string}>} history earlier turns, oldest first
 * @param {"en"|"hi"} language reply language
 */
export const sendMessageToAI = async (message, history = [], language = "en") => {
  const response = await api.post("/ai/chat", { message, history, language });
  return response.data;
};

export const diagnoseCrop = async (diagnosticData) => {
  const response = await api.post("/ai/diagnose", diagnosticData, { timeout: 60000 });
  return response.data;
};

export const getTelemetryLogs = async () => {
  const response = await api.get("/telemetry");
  return response.data;
};

export const createTelemetryLog = async (logData) => {
  const response = await api.post("/telemetry", logData);
  return response.data;
};

export const getWeatherInsight = async (lat, lon) => {
  const response = await api.get("/insights/weather", { params: { lat, lon } });
  return response.data;
};

export const getMandiInsight = async (commodity = "Wheat", state) => {
  const response = await api.get("/insights/mandi", { params: { commodity, state } });
  return response.data;
};

export default api;
