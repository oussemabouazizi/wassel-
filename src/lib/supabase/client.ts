'use client';

import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // During build/prerender, env vars may not be available
    // Return a dummy that won't crash — pages using this will be CSR anyway
    return new Proxy({} as any, {
      get: (_, prop) => {
        if (prop === 'auth') return { getSession: async () => ({ data: { session: null } }), getUser: async () => ({ data: { user: null } }), signOut: async () => {} };
        if (prop === 'from') return () => ({ select: () => ({ data: [], error: null }), insert: () => ({ data: null, error: null }), update: () => ({ eq: () => ({ data: null, error: null }) }), delete: () => ({ eq: () => ({ data: null, error: null }) }) });
        return () => ({ data: null, error: null });
      }
    });
  }

  client = createBrowserClient(url, key);
  return client;
}
