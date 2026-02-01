import { fal } from '@fal-ai/client';

// Configure FAL.ai client with API key
export function configureFal(apiKeyOverride?: string) {
  const apiKey = apiKeyOverride || process.env.FAL_KEY;
  if (!apiKey) {
    throw new FalAIError(
      'FAL_KEY is not configured. Please add it to your .env.local file or configure it in Settings.',
      'MISSING_API_KEY'
    );
  }
  fal.config({ credentials: apiKey });
  return apiKey;
}

// Error class for FAL.ai errors
export class FalAIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number
  ) {
    super(message);
    this.name = 'FalAIError';
  }
}

// Style presets for image generation
export interface StylePreset {
  id: string;
  name: string;
  description: string;
  promptSuffix: string;
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'fantasy',
    name: 'Fantasy Battle Map',
    description: 'Vibrant colors, detailed textures, D&D aesthetic',
    promptSuffix: 'fantasy art style, vibrant colors, detailed textures, D&D battle map aesthetic, high detail, professional tabletop RPG illustration',
  },
  {
    id: 'realistic',
    name: 'Realistic Top-Down',
    description: 'Photorealistic satellite/drone view',
    promptSuffix: 'photorealistic, satellite view, drone photography, realistic textures, natural lighting, high resolution aerial photograph',
  },
  {
    id: 'sketch',
    name: 'Sketch / Blueprint',
    description: 'Hand-drawn, parchment texture, ink lines',
    promptSuffix: 'hand-drawn sketch style, parchment paper texture, ink lines, blueprint aesthetic, vintage map illustration, sepia tones',
  },
  {
    id: 'dark-fantasy',
    name: 'Dark Fantasy',
    description: 'Moody lighting, darker palette, gothic feel',
    promptSuffix: 'dark fantasy style, moody atmospheric lighting, darker color palette, gothic aesthetic, ominous shadows, dramatic contrast',
  },
];

// Detailed terrain info for prompt building
export interface TerrainDetail {
  name: string;
  color: string;
  description: string;
  percentage: number; // Percentage of the map covered by this terrain
  pieceCount: number;
}

// Input for image generation
export interface GenerateImageInput {
  imageBase64: string; // Base64 encoded source image (map snapshot)
  prompt: string; // User's custom prompt/description
  style: string; // Style preset ID
  mapWidth: number; // Map dimensions for context
  mapHeight: number;
  terrainDetails?: TerrainDetail[]; // Detailed terrain breakdown with descriptions
  propsSummary?: string; // Optional props/features summary
  // Model parameters
  aspectRatio?: string;
  resolution?: string;
  outputFormat?: string;
}

// Output from image generation
export interface GenerateImageOutput {
  imageUrl: string;
  seed?: number;
}

// Model parameters for nano-banana-pro/edit
export interface ModelParameters {
  aspectRatio?: string; // auto, 21:9, 16:9, 3:2, 4:3, 5:4, 1:1, 4:5, 3:4, 2:3, 9:16
  resolution?: string;  // 1K, 2K, 4K
  outputFormat?: string; // jpeg, png, webp
}

export const ASPECT_RATIOS = [
  { id: 'auto', label: 'Auto' },
  { id: '16:9', label: '16:9 (Landscape)' },
  { id: '3:2', label: '3:2' },
  { id: '4:3', label: '4:3' },
  { id: '1:1', label: '1:1 (Square)' },
  { id: '3:4', label: '3:4' },
  { id: '2:3', label: '2:3' },
  { id: '9:16', label: '9:16 (Portrait)' },
];

export const RESOLUTIONS = [
  { id: '1K', label: '1K (Standard)' },
  { id: '2K', label: '2K (High)' },
  { id: '4K', label: '4K (Ultra) - 2x cost' },
];

export const OUTPUT_FORMATS = [
  { id: 'png', label: 'PNG' },
  { id: 'jpeg', label: 'JPEG' },
  { id: 'webp', label: 'WebP' },
];

/**
 * System prompt - kept for backwards compatibility but no longer used
 * We now generate prompts directly without LLM
 */
export const IMAGE_PROMPT_SYSTEM = ``;

/**
 * Get a human-readable color name from hex color
 * Uses a combination of predefined colors and HSL-based detection for any hex color
 */
function getColorName(hex: string): string {
  // Known color mappings (exact matches)
  const colorMap: Record<string, string> = {
    '#98c379': 'green',
    '#e5c07b': 'yellow/golden',
    '#d19a66': 'orange/brown',
    '#61afef': 'blue',
    '#56b6c2': 'teal/cyan',
    '#e06c75': 'red',
    '#c678dd': 'purple',
    '#abb2bf': 'gray',
    '#282c34': 'dark gray',
    '#5c6370': 'gray',
    '#228b22': 'green',
    '#4169e1': 'blue',
    '#8b4513': 'brown',
    '#f0e68c': 'yellow',
    '#87ceeb': 'light blue',
    '#ffffff': 'white',
    '#000000': 'black',
  };

  const normalized = hex.toLowerCase();
  if (colorMap[normalized]) {
    return colorMap[normalized];
  }

  // Parse hex to RGB
  const hexClean = normalized.replace('#', '');
  if (hexClean.length !== 6) return hex;

  const r = parseInt(hexClean.substring(0, 2), 16);
  const g = parseInt(hexClean.substring(2, 4), 16);
  const b = parseInt(hexClean.substring(4, 6), 16);

  // Convert to HSL for better color naming
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const l = (max + min) / 2;

  // Check for grayscale
  if (max - min < 0.1) {
    if (l < 0.2) return 'black';
    if (l < 0.4) return 'dark gray';
    if (l < 0.6) return 'gray';
    if (l < 0.8) return 'light gray';
    return 'white';
  }

  // Calculate hue
  let h = 0;
  const d = max - min;
  if (max === rNorm) {
    h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) * 60;
  } else if (max === gNorm) {
    h = ((bNorm - rNorm) / d + 2) * 60;
  } else {
    h = ((rNorm - gNorm) / d + 4) * 60;
  }

  // Map hue to color name
  if (h < 15 || h >= 345) return 'red';
  if (h < 45) return 'orange';
  if (h < 75) return 'yellow';
  if (h < 150) return 'green';
  if (h < 195) return 'cyan';
  if (h < 255) return 'blue';
  if (h < 285) return 'purple';
  if (h < 345) return 'pink';
  return 'red';
}

/**
 * Build the user message for the LLM - kept for backwards compatibility
 */
export function buildLLMImageRequest(input: GenerateImageInput): string {
  return buildDirectImagePrompt(input);
}

/**
 * Build a direct, simple prompt for image editing
 * This is the main prompt builder - no LLM needed
 * Uses a simple, effective format: "Top down view battle map for D&D. Replace [color] with [texture]..."
 */
export function buildDirectImagePrompt(input: GenerateImageInput): string {
  const style = STYLE_PRESETS.find((s) => s.id === input.style) || STYLE_PRESETS[0];

  const parts: string[] = [];

  // Main instruction - simple and direct
  parts.push('Edit this image to be a top down view battle map for D&D. Remove text from the photo.');

  // Color replacement instructions for each terrain - simple format
  if (input.terrainDetails && input.terrainDetails.length > 0) {
    const sortedTerrains = input.terrainDetails
      .filter(t => t.percentage > 3)
      .sort((a, b) => b.percentage - a.percentage);

    for (const terrain of sortedTerrains) {
      const colorName = getColorName(terrain.color);
      // Simple format: "Replace green color with realistic dense forest."
      const desc = terrain.description
        ? `realistic ${terrain.description.toLowerCase()}`
        : `realistic ${terrain.name.toLowerCase()}`;
      parts.push(`Replace ${colorName} color with ${desc}.`);
    }
  }

  // Style keywords based on preset
  parts.push(style.promptSuffix);

  return parts.join(' ');
}

/**
 * Fallback: Build a basic prompt if needed
 */
export function buildFallbackImagePrompt(input: GenerateImageInput): string {
  return buildDirectImagePrompt(input);
}

// Generate image using FAL.ai nano-banana-pro/edit model (Google's image editing model)
export async function generateImage(input: GenerateImageInput, apiKeyOverride?: string): Promise<GenerateImageOutput> {
  configureFal(apiKeyOverride);

  // Build the prompt directly - no LLM needed
  const prompt = input.prompt || buildDirectImagePrompt(input);

  console.log('Generated prompt:', prompt);

  // Prepare image URL - nano-banana-pro/edit accepts image_urls array
  let imageUrl = input.imageBase64;
  if (!imageUrl.startsWith('data:')) {
    imageUrl = `data:image/png;base64,${imageUrl}`;
  }

  try {
    // Use nano-banana-pro/edit (Google's Gemini-based image editor)
    const result = await fal.subscribe('fal-ai/nano-banana-pro/edit', {
      input: {
        prompt,
        image_urls: [imageUrl], // Array of image URLs
        num_images: 1,
        aspect_ratio: input.aspectRatio || '16:9',
        output_format: input.outputFormat || 'png',
        resolution: input.resolution || '1K',
      } as Record<string, unknown>,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          console.log('FAL.ai nano-banana-pro editing in progress...');
        }
      },
    });

    // Extract image URL from result
    const data = result.data as { images?: Array<{ url: string }>; image?: { url: string }; seed?: number };
    const resultImageUrl = data.images?.[0]?.url || data.image?.url;

    if (!resultImageUrl) {
      throw new FalAIError('No image generated', 'NO_OUTPUT');
    }

    return {
      imageUrl: resultImageUrl,
      seed: data.seed,
    };
  } catch (error) {
    if (error instanceof FalAIError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('FAL.ai generation error:', error);
    throw new FalAIError(`Image generation failed: ${message}`, 'GENERATION_FAILED');
  }
}
