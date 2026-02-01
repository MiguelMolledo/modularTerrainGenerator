import { NextRequest, NextResponse } from 'next/server';
import {
  generateImage,
  FalAIError,
  STYLE_PRESETS,
  buildDirectImagePrompt,
  type GenerateImageInput,
  type GenerateImageOutput,
  type TerrainDetail,
} from '@/lib/falai';

// Request body type
interface GenerateImageRequest {
  imageBase64: string;
  prompt?: string;
  style?: string;
  mapWidth?: number;
  mapHeight?: number;
  terrainDetails?: TerrainDetail[];
  propsSummary?: string;
  // Model parameters
  aspectRatio?: string;
  resolution?: string;
  outputFormat?: string;
}

// Response types
interface SuccessResponse {
  imageUrl: string;
  seed?: number;
  prompt?: string; // Return the prompt used for debugging
}

interface ErrorResponse {
  error: string;
  code?: string;
}

// Validate the request body
function validateRequest(body: unknown): GenerateImageInput {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object');
  }

  const {
    imageBase64,
    prompt,
    style,
    mapWidth,
    mapHeight,
    terrainDetails,
    propsSummary,
    aspectRatio,
    resolution,
    outputFormat,
  } = body as Record<string, unknown>;

  // Validate imageBase64 (required)
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    throw new Error('imageBase64 is required and must be a string');
  }

  // Check if it's a valid base64 image
  const base64Pattern = /^(data:image\/[a-z]+;base64,)?[A-Za-z0-9+/]+=*$/;
  const cleanBase64 = imageBase64.startsWith('data:')
    ? imageBase64.split(',')[1]
    : imageBase64;

  if (!base64Pattern.test(cleanBase64.slice(0, 100))) {
    throw new Error('imageBase64 does not appear to be valid base64 encoded data');
  }

  // Check image size (rough estimate - 10MB max for base64)
  if (cleanBase64.length > 10 * 1024 * 1024) {
    throw new Error('Image is too large. Maximum size is approximately 7.5MB');
  }

  // Validate prompt (optional)
  let validatedPrompt = '';
  if (prompt !== undefined) {
    if (typeof prompt !== 'string') {
      throw new Error('prompt must be a string');
    }
    if (prompt.length > 2000) {
      throw new Error('prompt must be less than 2000 characters');
    }
    validatedPrompt = prompt.trim();
  }

  // Validate style (optional, defaults to 'fantasy')
  let validatedStyle = 'fantasy';
  if (style !== undefined) {
    if (typeof style !== 'string') {
      throw new Error('style must be a string');
    }
    const validStyles = STYLE_PRESETS.map((s) => s.id);
    if (!validStyles.includes(style)) {
      throw new Error(`style must be one of: ${validStyles.join(', ')}`);
    }
    validatedStyle = style;
  }

  // Validate dimensions (optional)
  let validatedMapWidth = 60;
  let validatedMapHeight = 60;

  if (mapWidth !== undefined) {
    if (typeof mapWidth !== 'number' || mapWidth < 12 || mapWidth > 200) {
      throw new Error('mapWidth must be a number between 12 and 200');
    }
    validatedMapWidth = mapWidth;
  }

  if (mapHeight !== undefined) {
    if (typeof mapHeight !== 'number' || mapHeight < 12 || mapHeight > 200) {
      throw new Error('mapHeight must be a number between 12 and 200');
    }
    validatedMapHeight = mapHeight;
  }

  // Validate terrain details (optional)
  let validatedTerrainDetails: TerrainDetail[] | undefined;
  if (terrainDetails !== undefined) {
    if (!Array.isArray(terrainDetails)) {
      throw new Error('terrainDetails must be an array');
    }
    // Validate each terrain detail
    validatedTerrainDetails = terrainDetails.map((td: unknown) => {
      if (!td || typeof td !== 'object') {
        throw new Error('Each terrain detail must be an object');
      }
      const detail = td as Record<string, unknown>;
      if (typeof detail.name !== 'string' || typeof detail.color !== 'string') {
        throw new Error('Terrain detail must have name and color strings');
      }
      return {
        name: detail.name,
        color: detail.color,
        description: typeof detail.description === 'string' ? detail.description : '',
        percentage: typeof detail.percentage === 'number' ? detail.percentage : 0,
        pieceCount: typeof detail.pieceCount === 'number' ? detail.pieceCount : 0,
      };
    });
  }

  let validatedPropsSummary: string | undefined;
  if (propsSummary !== undefined) {
    if (typeof propsSummary !== 'string') {
      throw new Error('propsSummary must be a string');
    }
    if (propsSummary.length > 500) {
      throw new Error('propsSummary must be less than 500 characters');
    }
    validatedPropsSummary = propsSummary.trim() || undefined;
  }

  // Validate model parameters (optional, pass through as-is)
  const validatedAspectRatio = typeof aspectRatio === 'string' ? aspectRatio : undefined;
  const validatedResolution = typeof resolution === 'string' ? resolution : undefined;
  const validatedOutputFormat = typeof outputFormat === 'string' ? outputFormat : undefined;

  return {
    imageBase64,
    prompt: validatedPrompt,
    style: validatedStyle,
    mapWidth: validatedMapWidth,
    mapHeight: validatedMapHeight,
    terrainDetails: validatedTerrainDetails,
    propsSummary: validatedPropsSummary,
    aspectRatio: validatedAspectRatio,
    resolution: validatedResolution,
    outputFormat: validatedOutputFormat,
  };
}


export async function POST(
  request: NextRequest
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    // Get API key from headers (client-side key) or fall back to env
    const falKey = request.headers.get('X-Fal-Key');

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
    let validatedRequest: GenerateImageInput;
    try {
      validatedRequest = validateRequest(body);
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 400 }
      );
    }

    // Use the provided prompt if it exists, otherwise build it
    const prompt = validatedRequest.prompt && validatedRequest.prompt.trim()
      ? validatedRequest.prompt
      : buildDirectImagePrompt(validatedRequest);

    console.log('Using prompt:', prompt);

    // Override the prompt with the final one
    const requestWithPrompt: GenerateImageInput = {
      ...validatedRequest,
      prompt,
      // Clear terrain details since they're now embedded in the prompt
      terrainDetails: undefined,
      propsSummary: undefined,
    };

    // Generate image using FAL.ai
    const result: GenerateImageOutput = await generateImage(
      requestWithPrompt,
      falKey || undefined
    );

    return NextResponse.json({
      imageUrl: result.imageUrl,
      seed: result.seed,
      prompt, // Return the prompt so user can see it
    });
  } catch (error) {
    console.error('Error generating image:', error);

    if (error instanceof FalAIError) {
      const status = error.status || (error.code === 'MISSING_API_KEY' ? 401 : 500);
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred while generating the image' },
      { status: 500 }
    );
  }
}
