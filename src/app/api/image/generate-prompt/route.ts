import { NextRequest, NextResponse } from 'next/server';
import type { TerrainDetail } from '@/lib/falai';

// System prompt for generating image prompts using the JSON template
// Optimized for shorter, more effective prompts
const IMAGE_PROMPT_SYSTEM = `Eres un generador de prompts para battlemaps de D&D.

GENERA ÚNICAMENTE un JSON válido con esta estructura SIMPLE:

{
  "terrain_replacements": [
    { "color": "[color name: green/blue/brown/etc]", "description": "[texture description - MAX 40 chars]" }
  ],
  "atmosphere": {
    "mood": "[2-3 word mood description]"
  },
  "style_keywords": "[5-7 style keywords separated by commas]"
}

EJEMPLOS de descripciones de terreno CORRECTAS (cortas y directas):
- "dense forest with tall trees"
- "crystal clear water with rocks"
- "sandy desert with dunes"
- "volcanic rocks with lava cracks"
- "snowy tundra with ice patches"

INSTRUCCIONES:
- Responde ÚNICAMENTE con el JSON, sin markdown
- Descripciones de terreno MÁXIMO 40 caracteres
- Solo incluye los terrenos que se te proporcionan
- mood debe ser 2-3 palabras máximo
- style_keywords debe ser 5-7 palabras clave`;

// Convert JSON template to actual prompt for image generation (max 1900 chars)
// Uses simple, effective format: "Top down view battle map for D&D. Replace [color] with [texture]..."
function jsonToPrompt(json: Record<string, unknown>): string {
  const parts: string[] = [];

  // Core instruction - simple and direct
  parts.push('Edit this image to be a top down view battle map for D&D. Remove text from the photo.');

  // Terrain replacements - simple format: "Replace green color with realistic forest."
  const terrains = json.terrain_replacements as Array<Record<string, string>> | undefined;
  if (terrains && Array.isArray(terrains)) {
    for (const t of terrains) {
      if (t.color && t.description) {
        // Limit description to 60 chars for conciseness
        const desc = t.description.substring(0, 60).toLowerCase();
        parts.push(`Replace ${t.color} color with realistic ${desc}.`);
      }
    }
  }

  // Style keywords at the end
  const keywords = json.style_keywords as string | undefined;
  const atm = json.atmosphere as Record<string, string> | undefined;

  // Build style suffix
  const styleParts: string[] = [];
  if (atm?.mood) styleParts.push(atm.mood.toLowerCase());
  if (keywords) styleParts.push(keywords);

  // Add common style keywords
  styleParts.push('High definition, photorealistic style, tabletop RPG map, fantasy landscape.');

  parts.push(styleParts.join(', '));

  // Join and limit total length
  let result = parts.join(' ');
  if (result.length > 1900) {
    result = result.substring(0, 1900);
  }

  return result;
}

interface GeneratePromptRequest {
  style: string;
  styleName: string;
  terrainDetails: TerrainDetail[];
  propsSummary?: string;
  mapWidth: number;
  mapHeight: number;
}

// Map hex color to readable color name
function getColorName(hex: string): string {
  const hexClean = hex.toLowerCase().replace('#', '');
  if (hexClean.length !== 6) return hex;

  const r = parseInt(hexClean.substring(0, 2), 16);
  const g = parseInt(hexClean.substring(2, 4), 16);
  const b = parseInt(hexClean.substring(4, 6), 16);

  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const l = (max + min) / 2;

  if (max - min < 0.1) {
    if (l < 0.2) return 'black';
    if (l < 0.4) return 'dark gray';
    if (l < 0.6) return 'gray';
    if (l < 0.8) return 'light gray';
    return 'white';
  }

  let h = 0;
  const d = max - min;
  if (max === rNorm) {
    h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) * 60;
  } else if (max === gNorm) {
    h = ((bNorm - rNorm) / d + 2) * 60;
  } else {
    h = ((rNorm - gNorm) / d + 4) * 60;
  }

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

// Use Google Gemini Flash via OpenRouter for better prompt generation
async function callGemini(systemPrompt: string, userMessage: string, apiKey?: string): Promise<string> {
  const key = apiKey || process.env.OPENROUTER_API_KEY;

  if (!key) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'Modular Terrain Creator',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-001', // Gemini 2.0 Flash - fast and capable
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const openRouterKey = request.headers.get('X-OpenRouter-Key');

    const body: GeneratePromptRequest = await request.json();
    const { style, styleName, terrainDetails, propsSummary, mapWidth, mapHeight } = body;

    // Build terrain info for the user message
    const terrainList: Array<{ color: string; name: string; description: string; percentage: number }> = [];

    if (terrainDetails && terrainDetails.length > 0) {
      const sortedTerrains = terrainDetails
        .filter(t => t.percentage > 3)
        .sort((a, b) => b.percentage - a.percentage);

      for (const terrain of sortedTerrains) {
        terrainList.push({
          color: getColorName(terrain.color),
          name: terrain.name,
          description: terrain.description || terrain.name,
          percentage: Math.round(terrain.percentage),
        });
      }
    }

    // Build the user message
    const userMessage = `Genera un JSON para transformar este mapa táctico en un battlemap artístico.

Estilo deseado: ${styleName} (${style})
Dimensiones del mapa: ${mapWidth}" x ${mapHeight}" (aproximadamente ${Math.round(mapWidth * 2.54)}x${Math.round(mapHeight * 2.54)} cm)

Terrenos detectados en el mapa:
${terrainList.length > 0
  ? terrainList.map(t => `- Áreas ${t.color} = ${t.name} (${t.percentage}% del mapa): ${t.description}`).join('\n')
  : '- No se detectaron terrenos específicos'}

${propsSummary ? `Props/elementos en el mapa: ${propsSummary}` : ''}

Genera el JSON completo siguiendo la estructura del template. Sé creativo con las descripciones artísticas pero MANTÉN la disposición original del mapa.`;

    // Call Gemini to generate the JSON
    const jsonResponse = await callGemini(
      IMAGE_PROMPT_SYSTEM,
      userMessage,
      openRouterKey || undefined
    );

    console.log('Gemini response:', jsonResponse);

    // Try to parse as JSON and convert to prompt
    let finalPrompt: string;

    try {
      // Clean the response - remove markdown code blocks if present
      let cleanJson = jsonResponse.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.slice(7);
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.slice(3);
      }
      if (cleanJson.endsWith('```')) {
        cleanJson = cleanJson.slice(0, -3);
      }
      cleanJson = cleanJson.trim();

      const parsed = JSON.parse(cleanJson);
      finalPrompt = jsonToPrompt(parsed);

      // Return both the JSON and the converted prompt
      return NextResponse.json({
        prompt: finalPrompt,
        json: parsed,
      });
    } catch {
      // If JSON parsing fails, use the response directly as prompt
      console.log('Could not parse as JSON, using raw response');
      finalPrompt = jsonResponse.trim();

      // Remove any markdown formatting
      if (finalPrompt.startsWith('```')) {
        finalPrompt = finalPrompt.replace(/```[\w]*\n?/g, '').trim();
      }

      // Limit to 1900 characters
      if (finalPrompt.length > 1900) {
        finalPrompt = finalPrompt.substring(0, 1900);
      }
    }

    return NextResponse.json({ prompt: finalPrompt });
  } catch (error) {
    console.error('Error generating prompt:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate prompt';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
