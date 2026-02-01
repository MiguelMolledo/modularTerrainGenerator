import { NextRequest, NextResponse } from 'next/server';

interface TestResponse {
  success: boolean;
  error?: string;
  model?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<TestResponse>> {
  try {
    // Get API key from header or env
    const headerKey = request.headers.get('X-OpenRouter-Key');
    const apiKey = headerKey || process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'No API key provided' },
        { status: 401 }
      );
    }

    // Make a minimal request to OpenRouter to verify the key
    // Using the models endpoint which is lightweight
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Modular Terrain Creator',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Invalid API key or connection failed';

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {
        // Use default error message
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: response.status }
      );
    }

    // Key is valid
    return NextResponse.json({
      success: true,
      model: 'OpenRouter API',
    });
  } catch (error) {
    console.error('OpenRouter test error:', error);
    const message = error instanceof Error ? error.message : 'Connection failed';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
