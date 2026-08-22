import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Static Direct Environment Variable Resolution
// Vite requires direct static member access (e.g. import.meta.env.VITE_...)
// Dynamic lookup import.meta.env[key] is NOT supported by Vite's static compiler!
// ---------------------------------------------------------------------------
// Placeholder fallbacks used only when environment variables are not supplied
const PLACEHOLDER_SUPABASE_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_SUPABASE_ANON_KEY = 'placeholder-anon-key';

/**
 * Sanitizes Supabase Project URL to ensure it is the root origin without /rest/v1 or trailing slashes.
 * e.g. "https://your-project.supabase.co/rest/v1/" -> "https://your-project.supabase.co"
 */
export const sanitizeSupabaseUrl = (url?: string): string => {
  let cleaned = (url || '').trim();
  cleaned = cleaned.replace(/\/rest\/v1\/?$/i, '');
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned || PLACEHOLDER_SUPABASE_URL;
};

// Direct static access for Vite and Node/Next.js
const resolveUrl = (): string => {
  try {
    if (import.meta.env.VITE_SUPABASE_URL) return import.meta.env.VITE_SUPABASE_URL;
    if (import.meta.env.NEXT_PUBLIC_SUPABASE_URL) return import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
  } catch {}
  try {
    if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) return process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) return process.env.VITE_SUPABASE_URL;
    if (typeof process !== 'undefined' && process.env?.SUPABASE_URL) return process.env.SUPABASE_URL;
  } catch {}
  return PLACEHOLDER_SUPABASE_URL;
};

const resolveAnonKey = (): string => {
  try {
    if (import.meta.env.VITE_SUPABASE_ANON_KEY) return import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  } catch {}
  try {
    if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) return process.env.VITE_SUPABASE_ANON_KEY;
    if (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) return process.env.SUPABASE_ANON_KEY;
  } catch {}
  return PLACEHOLDER_SUPABASE_ANON_KEY;
};

export const supabaseUrl = sanitizeSupabaseUrl(resolveUrl());
export const supabaseAnonKey = resolveAnonKey().trim() || PLACEHOLDER_SUPABASE_ANON_KEY;

/**
 * Returns true only when a valid Supabase project URL and anon key are configured.
 */
export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(supabaseUrl) &&
    supabaseUrl.includes('.supabase.co') &&
    !supabaseUrl.includes('placeholder') &&
    Boolean(supabaseAnonKey) &&
    supabaseAnonKey.length > 30 &&
    !supabaseAnonKey.includes('placeholder')
  );
};

// ---------------------------------------------------------------------------
// Startup Diagnostics & Logger
// ---------------------------------------------------------------------------
console.info(`[CosmoCnergy SupabaseClient] 🚀 Connected to Supabase Project: ${supabaseUrl}`);

// ---------------------------------------------------------------------------
// Supabase Client Instantiation
// ---------------------------------------------------------------------------
export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

// ---------------------------------------------------------------------------
// Safe Supabase Execution Wrapper
// ---------------------------------------------------------------------------
export async function safeSupabaseQuery<T>(
  queryName: string,
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  try {
    const result = await queryFn();
    if (result.error) {
      console.error(`[SupabaseClient Error: ${queryName}]`, {
        code: result.error.code,
        message: result.error.message,
        details: result.error.details,
        hint: result.error.hint
      });
    }
    return result;
  } catch (err: any) {
    console.error(`[SupabaseClient Network Exception: ${queryName}]`, err?.message || err);
    return {
      data: null,
      error: {
        message: err?.message || 'Network fetch failure',
        code: 'FETCH_ERROR',
        details: err
      }
    };
  }
}
