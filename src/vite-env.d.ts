/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_COMPANY_NAME: string;
  readonly VITE_COMPANY_EMAIL: string;
  readonly VITE_COMPANY_PHONE: string;
  readonly VITE_COMPANY_ADDRESS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'html2pdf.js';
