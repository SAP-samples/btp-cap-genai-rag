import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import zipPack from "vite-plugin-zip-pack";

// https://vitejs.dev/config/
export default defineConfig({
    base: "/",
    plugins: [react(), zipPack()],
    server: {
        hmr: {
            port: 5174
        }
    },
    build: {
        outDir: "./dist",
        emptyOutDir: true,
        chunkSizeWarningLimit: 1600
    }
});
