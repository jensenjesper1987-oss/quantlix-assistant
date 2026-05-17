import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        assistant: resolve(__dirname, "index.html"),
        chat: resolve(__dirname, "chat.html"),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === "chat") {
            return "chat/v1.js";
          }
          return "quantlix-assistant.js";
        },
        chunkFileNames: (chunk) => {
          if (chunk.facadeModuleId?.includes("/src/chat/")) {
            return "chat/v1-[name]-[hash].js";
          }
          return "quantlix-assistant-[name]-[hash].js";
        },
        assetFileNames: (asset) => {
          if (asset.name?.includes("chat")) {
            return "chat/v1-[name]-[hash][extname]";
          }
          return "quantlix-assistant-[name]-[hash][extname]";
        },
      },
    },
  },
});
