import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter, OPENROUTER_MODELS } from '@/lib/openrouter';

// System prompt for campaign analysis
const CAMPAIGN_ANALYSIS_SYSTEM = `You are a D&D/tabletop RPG assistant that analyzes campaign text to extract entities for a virtual tabletop map creator.

Given campaign text (encounter descriptions, adventure modules, session notes), extract:
- NPCs: Named characters, shopkeepers, quest givers, etc.
- Creatures: Monsters, enemies, animals
- Items: Important objects, treasures, interactable items
- Furniture: Tables, chairs, beds, environmental objects

For each entity, provide:
- name: Short, descriptive name (2-4 words)
- emoji: Single emoji that best represents it
- category: One of: npc, creature, boss, hero, item, furniture
- size: One of: tiny, small, medium, large, huge, gargantuan
- tags: 3-5 searchable keywords
- context: Brief note about where/how it appears in the text

Size guidelines (D&D 5e):
- tiny: insects, keys, coins (0.5")
- small: goblins, halflings, small items (1")
- medium: humans, elves, chairs (1")
- large: horses, ogres, tables (2")
- huge: giants, dragons, large furniture (3")
- gargantuan: ancient dragons, buildings (6")

Respond ONLY with valid JSON. No explanations or markdown.
Format:
{
  "entities": [
    {"name": "...", "emoji": "...", "category": "...", "size": "...", "tags": [...], "context": "..."}
  ],
  "summary": "Brief 1-2 sentence summary of the scene/encounter"
}`;

interface AnalyzeCampaignRequest {
  text: string;
  maxEntities?: number;
}

interface ExtractedEntity {
  name: string;
  emoji: string;
  category: 'npc' | 'creature' | 'boss' | 'hero' | 'item' | 'furniture';
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';
  tags: string[];
  context: string;
}

interface AnalysisResult {
  entities: ExtractedEntity[];
  summary: string;
}

interface SuccessResponse {
  entities: ExtractedEntity[];
  summary: string;
}

interface ErrorResponse {
  error: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    // Get API key from header or env
    const openRouterKey = request.headers.get('X-OpenRouter-Key');

    // Parse request body
    let body: AnalyzeCampaignRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate text
    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json(
        { error: 'text is required and must be a string' },
        { status: 400 }
      );
    }

    if (body.text.length < 20) {
      return NextResponse.json(
        { error: 'Text is too short. Please provide more campaign content.' },
        { status: 400 }
      );
    }

    if (body.text.length > 15000) {
      return NextResponse.json(
        { error: 'Text is too long. Maximum 15000 characters.' },
        { status: 400 }
      );
    }

    const maxEntities = body.maxEntities || 20;

    // Build user prompt
    const userPrompt = `Analyze this campaign text and extract up to ${maxEntities} entities (NPCs, creatures, items, furniture):

---
${body.text}
---

Return JSON with entities array and summary.`;

    // Call OpenRouter with a capable model for analysis
    const response = await callOpenRouter(
      [
        { role: 'system', content: CAMPAIGN_ANALYSIS_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      OPENROUTER_MODELS.quality, // Use quality model for better extraction
      2000,
      openRouterKey || undefined
    );

    // Parse the response
    let result: AnalysisResult;
    try {
      // Clean up response - remove markdown code blocks if present
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.slice(7);
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.slice(3);
      }
      if (cleanResponse.endsWith('```')) {
        cleanResponse = cleanResponse.slice(0, -3);
      }
      cleanResponse = cleanResponse.trim();

      result = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Failed to parse LLM response:', response);
      return NextResponse.json(
        { error: 'Failed to parse analysis results. Please try again.' },
        { status: 500 }
      );
    }

    // Validate and sanitize entities
    const validCategories = ['npc', 'creature', 'boss', 'hero', 'item', 'furniture'];
    const validSizes = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'];

    const sanitizedEntities: ExtractedEntity[] = (result.entities || [])
      .slice(0, maxEntities)
      .filter((e): e is ExtractedEntity => {
        return (
          typeof e === 'object' &&
          typeof e.name === 'string' &&
          typeof e.emoji === 'string' &&
          validCategories.includes(e.category) &&
          validSizes.includes(e.size)
        );
      })
      .map((e) => ({
        name: e.name.slice(0, 50),
        emoji: e.emoji.slice(0, 4), // Emoji can be multi-char
        category: e.category,
        size: e.size,
        tags: Array.isArray(e.tags) ? e.tags.slice(0, 5).map((t) => String(t).slice(0, 30)) : [],
        context: typeof e.context === 'string' ? e.context.slice(0, 200) : '',
      }));

    return NextResponse.json({
      entities: sanitizedEntities,
      summary: typeof result.summary === 'string' ? result.summary.slice(0, 500) : '',
    });
  } catch (error) {
    console.error('Campaign analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred during analysis' },
      { status: 500 }
    );
  }
}
