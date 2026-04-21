declare global {
   interface Document {
      webkitFullscreenElement?: Element;
      webkitExitFullscreen?: () => Promise<void>;
   }
   interface HTMLElement {
      webkitRequestFullscreen?: () => Promise<void>;
   }
}

export { };
