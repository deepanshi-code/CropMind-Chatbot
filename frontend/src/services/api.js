import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

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

export const searchCrops = async (name) => {
  const response = await api.get(`/crops/search/${name}`);
  return response.data;
};

export const sendMessageToAI = async (message) => {
  const response = await api.post("/chat", { message });
  return response.data;
};

export default api;
