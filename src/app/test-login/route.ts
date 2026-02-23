import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  // Only works in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const cookieStore = await cookies();
  const response = NextResponse.redirect(new URL('/', 'http://localhost:4200'));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  try {
    // Sign in with the test user
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@local.dev',
      password: 'test-password-dev-only',
    });

    if (error) {
      return NextResponse.json(
        {
          error: 'Failed to authenticate test user',
          details: error.message,
          hint: 'Make sure you ran: supabase db reset'
        },
        { status: 401 }
      );
    }

    console.log('✅ Test user authenticated:', data.user?.email);

    // Redirect to home
    return response;
  } catch (error) {
    console.error('Test login error:', error);
    return NextResponse.json(
      { error: 'Failed to create test session', details: error },
      { status: 500 }
    );
  }
}
