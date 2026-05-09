declare global {
   interface Window {
      __BACKEND_URL__: string;
      __PROTOCOL: string;
      __PORT__: string;
   }
}

export { };
