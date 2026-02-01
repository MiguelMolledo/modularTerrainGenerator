import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

interface TestResponse {
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<TestResponse>> {
  try {
    // Get API key from header or env
    const headerKey = request.headers.get('X-Fal-Key');
    const apiKey = headerKey || process.env.FAL_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'No API key provided' },
        { status: 401 }
      );
    }

    // Configure FAL client with the key
    fal.config({ credentials: apiKey });

    // Make a minimal request to FAL.ai to verify the key
    // We'll check the queue status endpoint which doesn't consume credits
    const response = await fetch('https://queue.fal.run/fal-ai/flux-pro/v1.1/requests', {
      method: 'GET',
      headers: {
        Authorization: `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    // A 401 means invalid key, anything else (including 404 for no requests) means key is valid
    if (response.status === 401 || response.status === 403) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Key is valid
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('FAL.ai test error:', error);
    const message = error instanceof Error ? error.message : 'Connection failed';

    // Check if it's an auth error
    if (message.includes('401') || message.includes('403') || message.includes('unauthorized')) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
