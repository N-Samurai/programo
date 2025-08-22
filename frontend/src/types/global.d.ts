// src/types/global.d.ts
export {};

declare global {
  interface Window {
    appApi: {
      exportJson: (payload: unknown) => Promise<{ ok: boolean; path?: string }>;
      importJson: () => Promise<{ ok: boolean; data?: any }>;
    };
  }
}
