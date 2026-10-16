import axios from "axios";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000") + "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

// Attach Authorization Bearer token dynamically if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("cropmind_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Catch 401 response and redirect to login page
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("cropmind_token");
      window.dispatchEvent(new Event("auth-change"));
      // Redirect to login page only if not already there to prevent redirect loop
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login?error=SessionExpired";
      }
    }
    return Promise.reject(error);
  }
);

export const registerUser = async (email, password) => {
  const response = await api.post("/auth/register", { email, password });
  return response.data;
};

export const loginUser = async (email, password) => {
  const response = await api.post("/auth/login", { email, password });
  return response.data;
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
  const response = await api.get(`/crops/search/${name}`);
  return response.data;
};

export const sendMessageToAI = async (message) => {
  const response = await api.post("/chat", { message });
  return response.data;
};

export const diagnoseCrop = async (diagnosticData) => {
  const response = await api.post("/ai/diagnose", diagnosticData);
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

export default api;

