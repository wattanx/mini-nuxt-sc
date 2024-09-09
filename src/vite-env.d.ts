/// <reference types="vite/client" />

interface ImportMetaEnv {}

interface ImportMeta {
  readonly env: ImportMetaEnv;
  server: boolean;
  client: boolean;
  dev: boolean;
}
