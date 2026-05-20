declare global {
   interface Window {
      __BACKEND_SERVER_PATH__: string;
      __PROTOCOL__: string;
      __PORT__: string;
   }
}

export { };
