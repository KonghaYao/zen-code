/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  // 添加其他环境变量类型
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
