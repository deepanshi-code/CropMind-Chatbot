import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The app calls the API at the relative path /api, so the session cookie is first-party.
// In development Vite forwards /api to the local backend; in production vercel.json does the same.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: process.env.VITE_PROXY_TARGET || "http://localhost:5000",
        changeOrigin: false,
      },
    },
  },
});
