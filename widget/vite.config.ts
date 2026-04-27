import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Stable primary bundle name for CDN embeds (see docs/DEPLOY.md).
        entryFileNames: "quantlix-assistant.js",
        chunkFileNames: "quantlix-assistant-[name]-[hash].js",
        assetFileNames: "quantlix-assistant-[name]-[hash][extname]",
      },
    },
  },
});
