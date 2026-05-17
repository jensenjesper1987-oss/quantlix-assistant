import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

/** ES module build for portal / monorepo imports: `quantlix-assistant-widget/chat` */
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/chat/index.ts"),
      name: "QuantlixChat",
      formats: ["es"],
      fileName: "quantlix-chat",
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
    },
    outDir: "dist/lib",
    emptyOutDir: true,
  },
});
