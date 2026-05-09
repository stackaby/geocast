import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {

   const env = loadEnv(mode, process.cwd());
   const protocol = env.PROTOCOL || "http";
   const port = Number(env.PORT) || 3000;
   const backend_path = `${env.BACKEND_PATH || "localhost"}:${port}`;

   return {
      // config options
      cacheDir: ".vite",
      server: {
         proxy: {
            "/health": `${protocol}://${backend_path}`,
            "/api": `${protocol}://${backend_path}`,
            "/ws": { target: `${protocol === "http" ? "ws" : "wss"}://${backend_path}`, ws: true },
         }
      },
      build: {
         outDir: "../dist",
         assetsDir: "frontend"
      }
   }
})
