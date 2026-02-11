import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [react()],
  assetsInclude: ["**/*.dotp"],
  build: {
    rollupOptions: {
      input: {
        studio: fileURLToPath(new URL("./index.html", import.meta.url)),
        playerDemo: fileURLToPath(new URL("./player-demo.html", import.meta.url)),
      },
    },
  },
});
