import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter, OPENROUTER_MODELS } from '@/lib/openrouter';

// System prompt for scene description
const SCENE_DESCRIPTION_SYSTEM = `You are a skilled Dungeon Master narrator. Given information about a tactical battle map, generate evocative descriptions for tabletop RPG sessions.

You will receive:
- Map dimensions
- Terrain types and their coverage
- Props and NPCs on the map
- Optional context about the scene

Generate TWO descriptions:

1. **Read-Aloud Text**: A dramatic, immersive description to read to players as they enter the area. Use second person ("You see..."). Focus on what the characters would perceive: sights, sounds, smells, atmosphere. 2-4 paragraphs.

2. **DM Notes**: Brief tactical notes for the DM including:
   - Key terrain features and their tactical implications
   - Suggested creature positions or ambush points
   - Environmental hazards or interactive elements
   - Possible skill checks (perception, nature, etc.)

Respond ONLY with valid JSON. No markdown.
Format:
{
  "readAloud": "The description to read to players...",
  "dmNotes": "Notes for the DM..."
}`;

interface TerrainInfo {
  name: string;
  percentage: number;
  description?: string;
}

interface PropInfo {
  name: string;
  emoji: string;
  count: number;
}

interface DescribeSceneRequest {
  mapWidth: number;
  mapHeight: number;
  terrains: TerrainInfo[];
  props: PropInfo[];
  context?: string; // Optional additional context
}

interface DescriptionResult {
  readAloud: string;
  dmNotes: string;
}

interface SuccessResponse {
  readAloud: string;
  dmNotes: string;
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
    let body: DescribeSceneRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate inputs
    if (!body.mapWidth || !body.mapHeight) {
      return NextResponse.json(
        { error: 'mapWidth and mapHeight are required' },
        { status: 400 }
      );
    }

    // Build terrain summary
    const terrainSummary = (body.terrains || [])
      .filter((t) => t.percentage > 0)
      .sort((a, b) => b.percentage - a.percentage)
      .map((t) => {
        const desc = t.description ? ` - ${t.description}` : '';
        return `- ${t.name} (${Math.round(t.percentage)}% of map)${desc}`;
      })
      .join('\n');

    // Build props summary
    const propsSummary = (body.props || [])
      .map((p) => `- ${p.emoji} ${p.name}${p.count > 1 ? ` (x${p.count})` : ''}`)
      .join('\n');

    // Build user prompt
    const userPrompt = `Generate descriptions for this tactical battle map:

Map Size: ${body.mapWidth}" x ${body.mapHeight}" (${Math.round(body.mapWidth / 12)}ft x ${Math.round(body.mapHeight / 12)}ft in-game)

Terrain:
${terrainSummary || '- No terrain placed yet'}

Props & NPCs:
${propsSummary || '- None'}

${body.context ? `Additional Context: ${body.context}` : ''}

Generate immersive read-aloud text and tactical DM notes.`;

    // Call OpenRouter
    const response = await callOpenRouter(
      [
        { role: 'system', content: SCENE_DESCRIPTION_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      OPENROUTER_MODELS.quality, // Use quality model for creative writing
      1500,
      openRouterKey || undefined
    );

    // Parse the response
    let result: DescriptionResult;
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
        { error: 'Failed to parse description. Please try again.' },
        { status: 500 }
      );
    }

    // Validate and sanitize
    const readAloud = typeof result.readAloud === 'string'
      ? result.readAloud.trim()
      : 'No description generated.';

    const dmNotes = typeof result.dmNotes === 'string'
      ? result.dmNotes.trim()
      : 'No notes generated.';

    return NextResponse.json({
      readAloud,
      dmNotes,
    });
  } catch (error) {
    console.error('Scene description error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}
