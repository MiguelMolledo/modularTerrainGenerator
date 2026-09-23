'use server';

import { createClient } from '@supabase/supabase-js';

// El proyecto de Supabase se comparte con otras apps (rolApp, FamilyExpenses,
// GymStats) y tiene el registro público desactivado, así que el alta se hace
// aquí con la service role y marcada con app_metadata.app = 'terrain': el
// trigger de terrain.profiles solo actúa sobre esos usuarios y las otras apps
// los ignoran. Después el cliente inicia sesión con email y contraseña.
export async function createAccount(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<{ error: string | null }> {
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes('@')) return { error: 'Invalid email' };
  if (input.password.length < 8) {
    return { error: 'Password must be at least 8 characters' };
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    // `app` en los dos: el trigger AFTER INSERT solo ve user_metadata
    // (app_metadata lo escribe Auth en un UPDATE posterior).
    app_metadata: { app: 'terrain' },
    user_metadata: {
      app: 'terrain',
      ...(input.displayName ? { full_name: input.displayName } : {}),
    },
  });
  if (error) {
    return {
      error:
        error.code === 'email_exists'
          ? 'An account with this email already exists'
          : error.message || 'Failed to create account',
    };
  }
  return { error: null };
}
