export default {
   // config options
   cacheDir: ".vite",
   server: {
      allowedHosts: ["geocast.up.railway.app"],
      proxy: {
         "/api": "http://localhost:3000",
         "/ws": { target: "ws://localhost:3000", ws: true },
      }
   }
}
