/// <reference types="vite/client" />

interface ImportMetaEnv {
   readonly VITE_BACKEND_SERVER_PATH: string;
   readonly VITE_PORT: string;
   readonly VITE_PROTOCOL: string;
}

interface ImportMeta {
   readonly env: ImportMetaEnv;
}