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
    // Use the existing test user email
    const testEmail = 'miguel.molledo.alvarez@gmail.com';

    // Get the user from the database
    const { data: users, error: listError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', testEmail)
      .limit(1);

    if (listError || !users || users.length === 0) {
      return NextResponse.json(
        {
          error: 'Test user not found. Please login with Google first to create the profile.',
          details: listError
        },
        { status: 404 }
      );
    }

    // For test purposes, show instructions
    return new NextResponse(
      `
      <html>
        <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
          <h1>🧪 Test Login</h1>
          <p>Test user profile found: <strong>${testEmail}</strong></p>

          <h2>For Playwright Testing:</h2>
          <p>To bypass Google OAuth in tests, you have two options:</p>

          <h3>Option A: Save Authentication State (Recommended)</h3>
          <ol>
            <li>Login manually with Google once</li>
            <li>In your Playwright test, save the storage state:
              <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px;">await page.context().storageState({ path: 'auth.json' });</pre>
            </li>
            <li>Reuse in future tests:
              <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px;">const context = await browser.newContext({
  storageState: 'auth.json'
});</pre>
            </li>
          </ol>

          <h3>Option B: Mock the Session</h3>
          <p>Set cookies manually in Playwright before visiting the app.</p>

          <hr style="margin: 30px 0;">
          <p><a href="/">← Back to App</a></p>
          <p><small>This route only works in development mode.</small></p>
        </body>
      </html>
      `,
      {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  } catch (error) {
    console.error('Test login error:', error);
    return NextResponse.json(
      { error: 'Failed to process test login', details: error },
      { status: 500 }
    );
  }
}
