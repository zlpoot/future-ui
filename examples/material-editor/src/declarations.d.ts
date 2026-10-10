// Vite side-effect imports (CSS) — type declarations for the strict program.
declare module '*.css';

// import.meta.env (vite/client 最小声明；保持仓库既有 strict 程序不引入额外全局类型)
interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

