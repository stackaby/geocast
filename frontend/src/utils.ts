
export function resolveHostname() {
   const configHostname = window.__BACKEND_SERVER_PATH__;
   const viteHostname = import.meta.env.VITE_BACKEND_SERVER_PATH;
   const configPort = window.__PORT__;
   const vitePort = import.meta.env.VITE_PORT;
   
   // Use config.js if it exists and has real value (Docker after sed)
   const hostname = (configHostname && !configHostname.includes('{{')) 
      ? configHostname 
      : (viteHostname || 'localhost');
   
   const port = (configPort && !configPort.includes('{{')) 
      ? configPort 
      : (vitePort || '3000');
   
   return `${hostname}:${port}`;
}

export function resolveProtocol(isWebsocket: boolean): string {
   const configProtocol = window.__PROTOCOL__;
   const viteProtocol = import.meta.env.VITE_PROTOCOL;
   
   const protocol = (configProtocol && !configProtocol.includes('{{')) 
      ? configProtocol 
      : (viteProtocol || 'http');
   
   if (isWebsocket) {
      return protocol === 'http' ? 'ws' : 'wss';
   }
   return protocol;
}

