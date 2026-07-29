import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // Las tablas de esta app viven en el schema `terrain`
    // (proyecto Supabase compartido con otras apps).
    { db: { schema: 'terrain' } }
  );
}
