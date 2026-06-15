/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Override opzionali della config Firebase (di default usa quella pubblica hardcoded).
  readonly VITE_FB_APIKEY?: string;
  readonly VITE_FB_DB?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
