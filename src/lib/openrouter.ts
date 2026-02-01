import type { PropCategory } from '@/types';

// Types for OpenRouter API
export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
}

export interface OpenRouterResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Generated prop type from LLM
export interface GeneratedProp {
  name: string;
  emoji: string;
  category: PropCategory;
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';
  tags: string[];
}

// Error types
export class OpenRouterError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

// Model options - using fast/cheap models for prop generation
export const OPENROUTER_MODELS = {
  fast: 'anthropic/claude-3-haiku', // Fast and cheap
  balanced: 'openai/gpt-4o-mini', // Good balance
  quality: 'anthropic/claude-3.5-sonnet', // Best quality
} as const;

// System prompt for prop generation
export const PROP_GENERATION_SYSTEM_PROMPT = `You are a D&D/tabletop RPG assistant that generates props for a virtual tabletop map creator.

Given a description, generate props with:
- name: Short, descriptive name (2-4 words)
- emoji: Single emoji that best represents the prop
- category: One of: furniture, npc, creature, hero, boss, item, custom
- size: One of: tiny (0.5"), small (1"), medium (1"), large (2"), huge (3"), gargantuan (6")
- tags: 3-5 searchable keywords

Size guidelines for D&D 5e:
- tiny: Small objects, potions, keys, gems, coins
- small/medium: Humanoids, small furniture, medium creatures (1" = 5ft square)
- large: Large furniture (tables, beds), large creatures (horses, bears, ogres)
- huge: Very large creatures (giants, treants), massive furniture
- gargantuan: Dragons, ancient creatures, massive objects

Category guidelines:
- furniture: Tables, chairs, beds, barrels, shelves, doors, walls
- npc: Non-player characters (merchants, guards, villagers, innkeepers)
- creature: Monsters and animals (wolves, spiders, zombies, skeletons)
- hero: Player characters and important allies
- boss: Major enemies, powerful monsters, boss encounters
- item: Loot, quest items, environmental props (trees, rocks, fires)
- custom: Anything that doesn't fit the above categories

Respond ONLY with a valid JSON object containing a "props" array. No explanations, no markdown.`;

// User prompt template
export function buildUserPrompt(userInput: string, count: number): string {
  return `Generate ${count} unique props for: ${userInput}

Return a JSON object with this exact structure:
{"props": [{"name": "...", "emoji": "...", "category": "...", "size": "...", "tags": [...]}]}

Requirements:
- Generate exactly ${count} props
- Each prop must have all fields
- Use diverse emojis (don't repeat)
- Tags should be lowercase
- Make props relevant to the description`;
}

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Main API call function
export async function callOpenRouter(
  messages: OpenRouterMessage[],
  model: string = OPENROUTER_MODELS.fast,
  maxTokens: number = 2000,
  apiKeyOverride?: string
): Promise<string> {
  const apiKey = apiKeyOverride || process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new OpenRouterError(
      'OPENROUTER_API_KEY is not configured. Please add it to your .env.local file or configure it in Settings.',
      401,
      'MISSING_API_KEY'
    );
  }

  const request: OpenRouterRequest = {
    model,
    messages,
    temperature: 0.7,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
  };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'Modular Terrain Creator',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `OpenRouter API error: ${response.status}`;

        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error?.message || errorMessage;
        } catch {
          // Use default message
        }

        // Don't retry on auth errors or bad requests
        if (response.status === 401 || response.status === 400) {
          throw new OpenRouterError(errorMessage, response.status);
        }

        throw new OpenRouterError(errorMessage, response.status);
      }

      const data: OpenRouterResponse = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new OpenRouterError('Empty response from OpenRouter');
      }

      return content;
    } catch (error) {
      lastError = error as Error;

      // Don't retry on certain errors
      if (error instanceof OpenRouterError) {
        if (error.status === 401 || error.status === 400) {
          throw error;
        }
      }

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY * attempt);
      }
    }
  }

  throw lastError || new OpenRouterError('Failed to call OpenRouter after retries');
}

// Parse and validate generated props
export function parseGeneratedProps(content: string): GeneratedProp[] {
  let parsed: { props?: GeneratedProp[] };

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new OpenRouterError('Failed to parse LLM response as JSON');
  }

  if (!parsed.props || !Array.isArray(parsed.props)) {
    throw new OpenRouterError('Invalid response format: missing props array');
  }

  const validCategories: PropCategory[] = [
    'furniture',
    'npc',
    'creature',
    'hero',
    'boss',
    'item',
    'custom',
  ];
  const validSizes = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'];

  // Validate and clean each prop
  const validatedProps: GeneratedProp[] = [];

  for (const prop of parsed.props) {
    // Validate required fields
    if (!prop.name || typeof prop.name !== 'string') continue;
    if (!prop.emoji || typeof prop.emoji !== 'string') continue;

    // Normalize category
    let category = prop.category?.toLowerCase() as PropCategory;
    if (!validCategories.includes(category)) {
      category = 'custom';
    }

    // Normalize size - map 'small' to 'medium' (they're the same in our system)
    let size = prop.size?.toLowerCase() as GeneratedProp['size'];
    if (size === 'small') {
      size = 'medium';
    }
    if (!validSizes.includes(size)) {
      size = 'medium';
    }

    // Ensure tags is an array of strings
    let tags: string[] = [];
    if (Array.isArray(prop.tags)) {
      tags = prop.tags
        .filter((t): t is string => typeof t === 'string')
        .map((t) => t.toLowerCase());
    }

    validatedProps.push({
      name: prop.name.trim(),
      emoji: prop.emoji.trim(),
      category,
      size,
      tags,
    });
  }

  return validatedProps;
}

// High-level function to generate props
export async function generateProps(
  prompt: string,
  count: number = 5,
  model: string = OPENROUTER_MODELS.fast,
  apiKeyOverride?: string
): Promise<GeneratedProp[]> {
  const messages: OpenRouterMessage[] = [
    { role: 'system', content: PROP_GENERATION_SYSTEM_PROMPT },
    { role: 'user', content: buildUserPrompt(prompt, count) },
  ];

  const content = await callOpenRouter(messages, model, 2000, apiKeyOverride);
  return parseGeneratedProps(content);
}
