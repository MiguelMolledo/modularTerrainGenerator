import { NextRequest, NextResponse } from 'next/server';
import type { OpenRouterChatMessage, OpenRouterChatResponse, ChatResponse } from '@/lib/chat/types';
import { chatTools } from '@/lib/chat/tools';
import { OPENROUTER_MODELS } from '@/lib/openrouter';

interface ChatRequestBody {
  messages: OpenRouterChatMessage[];
  model?: string;
}

interface ErrorResponse {
  error: string;
  code?: string;
}

// Validate request body
function validateRequest(body: unknown): ChatRequestBody {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object');
  }

  const { messages, model } = body as Record<string, unknown>;

  if (!messages || !Array.isArray(messages)) {
    throw new Error('messages is required and must be an array');
  }

  if (messages.length === 0) {
    throw new Error('messages array cannot be empty');
  }

  // Validate each message
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i] as Record<string, unknown>;
    if (!msg.role || typeof msg.role !== 'string') {
      throw new Error(`Message at index ${i} must have a valid role`);
    }
    if (!['system', 'user', 'assistant', 'tool'].includes(msg.role)) {
      throw new Error(`Message at index ${i} has invalid role: ${msg.role}`);
    }
  }

  return {
    messages: messages as OpenRouterChatMessage[],
    model: typeof model === 'string' ? model : undefined,
  };
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ChatResponse | ErrorResponse>> {
  try {
    // Get API key from header
    const headerKey = request.headers.get('X-OpenRouter-Key');
    const apiKey = headerKey || process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 401 }
      );
    }

    // Parse and validate request
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    let validatedRequest: ChatRequestBody;
    try {
      validatedRequest = validateRequest(body);
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 400 }
      );
    }

    // Use balanced model for chat (better at following instructions)
    const model = validatedRequest.model || OPENROUTER_MODELS.balanced;

    // Make the request to OpenRouter
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Modular Terrain Creator',
      },
      body: JSON.stringify({
        model,
        messages: validatedRequest.messages,
        tools: chatTools,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      let errorMessage = `OpenRouter API error: ${openRouterResponse.status}`;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {
        // Use default message
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: openRouterResponse.status >= 400 && openRouterResponse.status < 600 ? openRouterResponse.status : 500 }
      );
    }

    const data: OpenRouterChatResponse = await openRouterResponse.json();

    if (!data.choices || data.choices.length === 0) {
      return NextResponse.json(
        { error: 'No response from OpenRouter' },
        { status: 500 }
      );
    }

    const choice = data.choices[0];

    return NextResponse.json({
      message: {
        role: choice.message.role,
        content: choice.message.content,
        tool_calls: choice.message.tool_calls,
      },
      finish_reason: choice.finish_reason,
    });
  } catch (error) {
    console.error('Error in chat API:', error);

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
