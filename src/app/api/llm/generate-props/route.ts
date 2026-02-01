import { NextRequest, NextResponse } from 'next/server';
import {
  generateProps,
  OpenRouterError,
  OPENROUTER_MODELS,
  type GeneratedProp,
} from '@/lib/openrouter';

// Request body type
interface GeneratePropsRequest {
  prompt: string;
  count?: number;
  model?: keyof typeof OPENROUTER_MODELS;
}

// Response type
interface GeneratePropsResponse {
  props: GeneratedProp[];
}

interface ErrorResponse {
  error: string;
  code?: string;
}

// Validate the request body
function validateRequest(body: unknown): GeneratePropsRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object');
  }

  const { prompt, count, model } = body as Record<string, unknown>;

  if (!prompt || typeof prompt !== 'string') {
    throw new Error('prompt is required and must be a string');
  }

  if (prompt.trim().length < 3) {
    throw new Error('prompt must be at least 3 characters');
  }

  if (prompt.length > 5000) {
    throw new Error('prompt must be less than 5000 characters');
  }

  let validatedCount = 5;
  if (count !== undefined) {
    if (typeof count !== 'number' || !Number.isInteger(count)) {
      throw new Error('count must be an integer');
    }
    if (count < 1 || count > 20) {
      throw new Error('count must be between 1 and 20');
    }
    validatedCount = count;
  }

  let validatedModel: keyof typeof OPENROUTER_MODELS = 'fast';
  if (model !== undefined) {
    if (typeof model !== 'string' || !(model in OPENROUTER_MODELS)) {
      throw new Error('model must be one of: fast, balanced, quality');
    }
    validatedModel = model as keyof typeof OPENROUTER_MODELS;
  }

  return {
    prompt: prompt.trim(),
    count: validatedCount,
    model: validatedModel,
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<GeneratePropsResponse | ErrorResponse>> {
  try {
    // Get API key from header (client-side key) or fall back to env
    const headerKey = request.headers.get('X-OpenRouter-Key');

    // Parse the request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate request
    let validatedRequest: GeneratePropsRequest;
    try {
      validatedRequest = validateRequest(body);
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 400 }
      );
    }

    // Generate props using OpenRouter
    const props = await generateProps(
      validatedRequest.prompt,
      validatedRequest.count,
      OPENROUTER_MODELS[validatedRequest.model || 'fast'],
      headerKey || undefined
    );

    return NextResponse.json({ props });
  } catch (error) {
    console.error('Error generating props:', error);

    if (error instanceof OpenRouterError) {
      const status = error.status || 500;
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: status >= 400 && status < 600 ? status : 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred while generating props' },
      { status: 500 }
    );
  }
}
