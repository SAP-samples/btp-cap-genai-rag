import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        hmr: {
            port: 5174
        }
    },
    build: {
        outDir: "../router/dist",
        emptyOutDir: true,
        chunkSizeWarningLimit: 1600
    }
});
