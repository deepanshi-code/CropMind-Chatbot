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

/** The server's error message, or a fallback. */
export const errorMessage = (err, fallback) => err?.response?.data?.message || fallback;

export const googleLoginUrl = () => `${API_BASE_URL}/auth/google`;

// --- Auth ---
export const getCurrentUser = async () => (await api.get("/auth/me")).data.user;
export const registerUser = async (email, password, acceptPrivacy) =>
  (await api.post("/auth/register", { email, password, acceptPrivacy })).data;
export const loginUser = async (email, password) => (await api.post("/auth/login", { email, password })).data;
export const logoutUser = async () => { await api.post("/auth/logout"); };

// --- Profile / account ---
export const getProfile = async () => (await api.get("/profile")).data;
export const updateProfile = async (patch) => (await api.put("/profile", patch)).data;
export const saveSoilTest = async (soilTest) => (await api.put("/profile/soil-test", soilTest)).data;
export const clearSoilTest = async () => (await api.delete("/profile/soil-test")).data;
export const changePassword = async (currentPassword, newPassword) =>
  (await api.post("/profile/password", { currentPassword, newPassword })).data;
export const exportMyData = async () => (await api.get("/profile/export")).data;
export const deleteAccount = async (confirmation) => (await api.delete("/profile", { data: { confirmation } })).data;

// --- Sensor devices ---
export const listDevices = async () => (await api.get("/devices")).data;
export const createDevice = async (name) => (await api.post("/devices", { name })).data;
export const deleteDevice = async (id) => { await api.delete(`/devices/${id}`); };

// --- Crops ---
export const getCrops = async () => (await api.get("/crops")).data;
export const createCrop = async (cropData) => (await api.post("/crops", cropData)).data;
export const deleteCrop = async (id) => { await api.delete(`/crops/${id}`); };
export const updateCrop = async (id, cropData) => (await api.put(`/crops/${id}`, cropData)).data;
export const searchCrops = async (name) => (await api.get(`/crops/search/${encodeURIComponent(name)}`)).data;

// --- AI ---
export const sendMessageToAI = async (message, language = "en") =>
  (await api.post("/ai/chat", { message, language })).data;
export const getChatHistory = async () => (await api.get("/ai/chat/history")).data;
export const clearChatHistory = async () => { await api.delete("/ai/chat/history"); };
export const diagnoseCrop = async (diagnosticData) =>
  (await api.post("/ai/diagnose", diagnosticData, { timeout: 60000 })).data;
export const getDiagnoses = async () => (await api.get("/ai/diagnoses")).data;
export const deleteDiagnosis = async (id) => { await api.delete(`/ai/diagnoses/${id}`); };

// --- Telemetry ---
export const getTelemetryLogs = async () => (await api.get("/telemetry")).data;

// --- Field insights ---
export const getWeatherInsight = async (lat, lon) => (await api.get("/insights/weather", { params: { lat, lon } })).data;
export const getMandiInsight = async (commodity = "Wheat", state) =>
  (await api.get("/insights/mandi", { params: { commodity, state } })).data;
export const searchPlaces = async (q, lang = "en") => (await api.get("/insights/places", { params: { q, lang } })).data;

export default api;
