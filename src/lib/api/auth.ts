import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export type AuthResult =
  | { ok: true; user: User }
  | { ok: false; response: NextResponse<{ error: string }> };

/**
 * Verify the request comes from an authenticated Supabase user.
 *
 * Use at the top of every API route that calls a paid external service, so
 * unauthenticated callers can't consume API credits. Returns the user on
 * success, or a ready-to-return 401 response on failure:
 *
 *   const auth = await requireUser();
 *   if (!auth.ok) return auth.response;
 *   // ...use auth.user
 */
export async function requireUser(): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { ok: true, user };
}
