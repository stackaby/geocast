
export function resolveHostname() {
   const hostname = window.__BACKEND_URL__.includes("{{") ? window.location.hostname : window.__BACKEND_URL__.trim();
   const port = window.__PORT__.includes("{{") ? "3000" : window.__PORT__;
   return `${hostname}:${port}`;
}

export function resolveProtocol(isWebsocket: boolean): string {
   const protocol = window.__PROTOCOL__.includes("{{") ? "http" : window.__PROTOCOL__.trim();
   if (isWebsocket) {
      return protocol === "http" ? "ws" : "wss";
   }
   return protocol;
}

