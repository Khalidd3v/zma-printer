import type { ZmaApi } from "./index";

declare global {
  interface Window {
    zmaApi: ZmaApi;
  }
}

export {};
