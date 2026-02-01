import type {
  ToolCall,
  ToolResult,
  CreateShapeParams,
  CreateTerrainTypeParams,
  ListParams,
  GenerateLayoutParams,
  GeneratePropsParams,
  AddGeneratedPropsParams,
  DescribeSceneParams,
  SetupTerrainParams,
  ConfirmTerrainSetupParams,
  AssignPiecesToTerrainParams,
  CreateCustomPieceParams,
  PendingTerrainConfig,
  ListMapsParams,
  GetMapDetailsParams,
} from './types';
import { terrainSuggestions } from './tools';
import { useInventoryStore } from '@/store/inventoryStore';
import { useMapStore } from '@/store/mapStore';
import { useMapInventoryStore } from '@/store/mapInventoryStore';
import { useAPIKeysStore } from '@/store/apiKeysStore';
import { useChatStore } from '@/store/chatStore';
import { generatedPropToModularPiece } from '@/store/aiStore';
import type { GeneratedProp } from '@/lib/openrouter';

// Generate a shape key from dimensions following existing naming convention
function generateShapeKey(width: number, height: number, isDiagonal: boolean = false): string {
  const suffix = isDiagonal ? '-corner' : '-flat';
  return `${width}x${height}${suffix}`;
}

// Generate a default name from dimensions following existing naming convention
function generateShapeName(width: number, height: number, isDiagonal: boolean = false): string {
  const suffix = isDiagonal ? 'Corner' : 'Flat';
  return `${width}x${height} ${suffix}`;
}

// Find a shape by key, trying various suffixes for flexibility
function findShapeByKey(shapes: { shapeKey: string; id: string }[], key: string): { shapeKey: string; id: string } | undefined {
  // Try exact match first
  let shape = shapes.find(s => s.shapeKey === key);
  if (shape) return shape;

  // If key doesn't have a suffix, try with common suffixes
  if (!key.includes('-')) {
    // Try -flat first (most common)
    shape = shapes.find(s => s.shapeKey === `${key}-flat`);
    if (shape) return shape;

    // Try -corner
    shape = shapes.find(s => s.shapeKey === `${key}-corner`);
    if (shape) return shape;

    // Try -elev
    shape = shapes.find(s => s.shapeKey === `${key}-elev`);
    if (shape) return shape;
  }

  return undefined;
}

// Generate a slug from a terrain name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// Get color/icon suggestions for a terrain name
function getTerrainSuggestions(name: string): { color: string; icon: string } {
  const lowerName = name.toLowerCase();

  // Try exact match first
  if (terrainSuggestions[lowerName]) {
    return terrainSuggestions[lowerName];
  }

  // Try partial matches
  for (const [key, value] of Object.entries(terrainSuggestions)) {
    if (lowerName.includes(key) || key.includes(lowerName)) {
      return value;
    }
  }

  // Default fallback
  return { color: '#888888', icon: '🟫' };
}

// Execute a single tool call
export async function executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
  const { id, function: fn } = toolCall;
  const { name, arguments: argsString } = fn;

  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(argsString);
  } catch {
    return {
      toolCallId: id,
      name,
      result: null,
      success: false,
      error: 'Failed to parse tool arguments',
    };
  }

  try {
    switch (name) {
      case 'create_shape':
        return await executeCreateShape(id, args as unknown as CreateShapeParams);

      case 'create_terrain_type':
        return await executeCreateTerrainType(id, args as unknown as CreateTerrainTypeParams);

      case 'list_shapes':
        return await executeListShapes(id, args as unknown as ListParams);

      case 'list_terrain_types':
        return await executeListTerrainTypes(id, args as unknown as ListParams);

      case 'list_templates':
        return await executeListTemplates(id, args as unknown as ListParams);

      case 'get_map_info':
        return await executeGetMapInfo(id);

      case 'generate_layout':
        return await executeGenerateLayout(id, args as unknown as GenerateLayoutParams);

      case 'generate_props':
        return await executeGenerateProps(id, args as unknown as GeneratePropsParams);

      case 'add_generated_props':
        return await executeAddGeneratedProps(id, args as unknown as AddGeneratedPropsParams);

      case 'describe_scene':
        return await executeDescribeScene(id, args as unknown as DescribeSceneParams);

      case 'setup_terrain':
        return await executeSetupTerrain(id, args as unknown as SetupTerrainParams);

      case 'confirm_terrain_setup':
        return await executeConfirmTerrainSetup(id, args as unknown as ConfirmTerrainSetupParams);

      case 'assign_pieces_to_terrain':
        return await executeAssignPiecesToTerrain(id, args as unknown as AssignPiecesToTerrainParams);

      case 'create_custom_piece':
        return await executeCreateCustomPiece(id, args as unknown as CreateCustomPieceParams);

      case 'list_maps':
        return await executeListMaps(id, args as unknown as ListMapsParams);

      case 'get_map_details':
        return await executeGetMapDetails(id, args as unknown as GetMapDetailsParams);

      default:
        return {
          toolCallId: id,
          name,
          result: null,
          success: false,
          error: `Unknown tool: ${name}`,
        };
    }
  } catch (error) {
    return {
      toolCallId: id,
      name,
      result: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error executing tool',
    };
  }
}

// Execute multiple tool calls
export async function executeToolCalls(toolCalls: ToolCall[]): Promise<ToolResult[]> {
  const results: ToolResult[] = [];

  for (const toolCall of toolCalls) {
    const result = await executeToolCall(toolCall);
    results.push(result);
  }

  return results;
}

// Create a new shape
async function executeCreateShape(toolCallId: string, params: CreateShapeParams): Promise<ToolResult> {
  const { width, height, name, baseHeight, isDiagonal = false, magnets, elevation } = params;

  // Validate dimensions
  if (width < 0.5 || width > 12 || height < 0.5 || height > 12) {
    return {
      toolCallId,
      name: 'create_shape',
      result: null,
      success: false,
      error: 'Width and height must be between 0.5 and 12 inches',
    };
  }

  // Validate baseHeight if provided
  const validBaseHeights = [0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3];
  if (baseHeight !== undefined && !validBaseHeights.includes(baseHeight)) {
    return {
      toolCallId,
      name: 'create_shape',
      result: null,
      success: false,
      error: `Base height must be one of: ${validBaseHeights.join(', ')}`,
    };
  }

  // Determine suffix based on elevation
  let suffix = '-flat';
  if (isDiagonal) {
    suffix = '-corner';
  } else if (elevation && (elevation.nw || elevation.ne || elevation.sw || elevation.se)) {
    suffix = '-elev';
  }

  const shapeKey = `${width}x${height}${suffix}`;
  const shapeName = name || `${width}x${height} ${suffix === '-corner' ? 'Corner' : suffix === '-elev' ? 'Elevated' : 'Flat'}`;

  const store = useInventoryStore.getState();
  const shape = await store.createShape({
    shapeKey,
    name: shapeName,
    width,
    height,
    isDiagonal,
    defaultRotation: isDiagonal ? 0 : 0,
    baseHeight: baseHeight || 0.5,
    magnets: magnets || undefined,
  });

  if (!shape) {
    const error = store.error || 'Failed to create shape';
    store.clearError();
    return {
      toolCallId,
      name: 'create_shape',
      result: null,
      success: false,
      error,
    };
  }

  // Refresh map store to show new piece
  await useMapStore.getState().refreshFromInventory();

  // Build result message with details
  const magnetInfo = magnets && magnets.length > 0
    ? magnets.map(m => `${m.quantity}x ${m.size}`).join(', ')
    : 'none';

  const elevationInfo = elevation && (elevation.nw || elevation.ne || elevation.sw || elevation.se)
    ? `NW:${elevation.nw || 0}", NE:${elevation.ne || 0}", SW:${elevation.sw || 0}", SE:${elevation.se || 0}"`
    : 'flat';

  return {
    toolCallId,
    name: 'create_shape',
    result: {
      id: shape.id,
      shapeKey: shape.shapeKey,
      name: shape.name,
      width: shape.width,
      height: shape.height,
      isDiagonal: shape.isDiagonal,
      baseHeight: shape.baseHeight,
      magnets: magnetInfo,
      elevation: elevationInfo,
    },
    success: true,
  };
}

// Create a new terrain type
async function executeCreateTerrainType(toolCallId: string, params: CreateTerrainTypeParams): Promise<ToolResult> {
  const { name, color, icon, description } = params;

  if (!name || name.trim().length === 0) {
    return {
      toolCallId,
      name: 'create_terrain_type',
      result: null,
      success: false,
      error: 'Terrain name is required',
    };
  }

  const suggestions = getTerrainSuggestions(name);
  const slug = generateSlug(name);

  const store = useInventoryStore.getState();
  const terrainType = await store.createTerrainType({
    slug,
    name: name.trim(),
    color: color || suggestions.color,
    icon: icon || suggestions.icon,
    description: description || `${name} terrain for tabletop gaming`,
  });

  if (!terrainType) {
    const error = store.error || 'Failed to create terrain type';
    store.clearError();
    return {
      toolCallId,
      name: 'create_terrain_type',
      result: null,
      success: false,
      error,
    };
  }

  // Refresh map store to show new terrain
  await useMapStore.getState().refreshFromInventory();

  return {
    toolCallId,
    name: 'create_terrain_type',
    result: {
      id: terrainType.id,
      slug: terrainType.slug,
      name: terrainType.name,
      color: terrainType.color,
      icon: terrainType.icon,
      description: terrainType.description,
    },
    success: true,
  };
}

// List shapes
async function executeListShapes(toolCallId: string, params: ListParams): Promise<ToolResult> {
  const { limit = 20 } = params;

  const store = useInventoryStore.getState();

  // Ensure shapes are loaded
  if (store.shapes.length === 0) {
    await store.fetchShapes();
  }

  const shapes = store.shapes.slice(0, limit).map(s => ({
    id: s.id,
    name: s.name,
    dimensions: `${s.width}" x ${s.height}"`,
    baseHeight: s.baseHeight,
    isDiagonal: s.isDiagonal,
  }));

  return {
    toolCallId,
    name: 'list_shapes',
    result: {
      count: shapes.length,
      total: store.shapes.length,
      shapes,
    },
    success: true,
  };
}

// List terrain types
async function executeListTerrainTypes(toolCallId: string, params: ListParams): Promise<ToolResult> {
  const { limit = 20 } = params;

  const store = useInventoryStore.getState();

  // Ensure terrain types are loaded
  if (store.terrainTypes.length === 0) {
    await store.fetchTerrainTypes();
  }

  const terrainTypes = store.terrainTypes.slice(0, limit).map(t => ({
    id: t.id,
    name: t.name,
    icon: t.icon,
    color: t.color,
    piecesCount: t.pieces.length,
  }));

  return {
    toolCallId,
    name: 'list_terrain_types',
    result: {
      count: terrainTypes.length,
      total: store.terrainTypes.length,
      terrainTypes,
    },
    success: true,
  };
}

// List templates
async function executeListTemplates(toolCallId: string, params: ListParams): Promise<ToolResult> {
  const { limit = 20 } = params;

  const store = useInventoryStore.getState();

  // Ensure templates are loaded
  if (store.pieceTemplates.length === 0) {
    await store.fetchPieceTemplates();
  }

  const templates = store.pieceTemplates.slice(0, limit).map(t => ({
    id: t.id,
    name: t.name,
    icon: t.icon,
    itemsCount: t.items.length,
    description: t.description,
  }));

  return {
    toolCallId,
    name: 'list_templates',
    result: {
      count: templates.length,
      total: store.pieceTemplates.length,
      templates,
    },
    success: true,
  };
}

// Get map info
async function executeGetMapInfo(toolCallId: string): Promise<ToolResult> {
  const mapStore = useMapStore.getState();
  const { mapWidth, mapHeight, placedPieces, availablePieces, terrainTypes, customProps } = mapStore;

  const totalMapArea = mapWidth * mapHeight;

  // Calculate terrain coverage
  const terrainAreas = new Map<string, { area: number; name: string }>();
  const propCounts = new Map<string, { name: string; emoji: string; count: number }>();

  const allPieces = [...availablePieces, ...customProps];

  placedPieces.forEach((placed) => {
    const piece = allPieces.find((p) => p.id === placed.pieceId);
    if (!piece) return;

    if (piece.pieceType === 'prop') {
      const key = piece.name;
      const existing = propCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        propCounts.set(key, {
          name: piece.name,
          emoji: piece.propEmoji || '?',
          count: 1,
        });
      }
    } else {
      const terrain = terrainTypes.find((t) => t.id === piece.terrainTypeId || t.slug === piece.terrainTypeId);
      if (terrain) {
        const pieceArea = piece.size.width * piece.size.height * (piece.isDiagonal ? 0.5 : 1);
        const existing = terrainAreas.get(terrain.id);
        if (existing) {
          existing.area += pieceArea;
        } else {
          terrainAreas.set(terrain.id, {
            area: pieceArea,
            name: terrain.name,
          });
        }
      }
    }
  });

  const terrainInfo = Array.from(terrainAreas.values())
    .map((t) => ({
      name: t.name,
      percentage: Math.round((t.area / totalMapArea) * 100),
    }))
    .filter((t) => t.percentage > 0)
    .sort((a, b) => b.percentage - a.percentage);

  const propsInfo = Array.from(propCounts.values())
    .sort((a, b) => b.count - a.count);

  return {
    toolCallId,
    name: 'get_map_info',
    result: {
      mapWidth,
      mapHeight,
      mapSizeInFeet: `${Math.round(mapWidth / 12)}ft x ${Math.round(mapHeight / 12)}ft`,
      totalPlacedPieces: placedPieces.length,
      terrainCoverage: terrainInfo,
      props: propsInfo,
      availableTerrainTypes: terrainTypes.map(t => ({ name: t.name, icon: t.icon })),
    },
    success: true,
  };
}

// Generate layout
async function executeGenerateLayout(toolCallId: string, params: GenerateLayoutParams): Promise<ToolResult> {
  const { sceneDescription } = params;

  if (!sceneDescription || sceneDescription.trim().length < 10) {
    return {
      toolCallId,
      name: 'generate_layout',
      result: null,
      success: false,
      error: 'Please provide a more detailed scene description (at least 10 characters)',
    };
  }

  const mapStore = useMapStore.getState();
  const { mapWidth, mapHeight, availablePieces, currentLevel, addPlacedPiece } = mapStore;

  // Get all terrain pieces (no stock limit - AI can use any piece)
  const availablePiecesWithQuantity = availablePieces
    .filter((p) => p.pieceType !== 'prop')
    .map((piece) => ({
      id: piece.id,
      name: piece.name,
      terrainType: piece.terrainTypeId,
      width: piece.size.width,
      height: piece.size.height,
      isDiagonal: piece.isDiagonal,
      available: piece.quantity, // Report total quantity, but don't limit
    }));

  if (availablePiecesWithQuantity.length === 0) {
    return {
      toolCallId,
      name: 'generate_layout',
      result: null,
      success: false,
      error: 'No terrain pieces in inventory. Add pieces to your inventory first.',
    };
  }

  try {
    const { openRouterKey } = useAPIKeysStore.getState();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (openRouterKey) {
      headers['X-OpenRouter-Key'] = openRouterKey;
    }

    const response = await fetch('/api/llm/suggest-layout', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sceneDescription: sceneDescription.trim(),
        mapWidth,
        mapHeight,
        availablePieces: availablePiecesWithQuantity,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate layout');
    }

    const placements = data.placements || [];

    // Apply placements to the map
    let placedCount = 0;
    for (const placement of placements) {
      const piece = availablePieces.find((p) => p.id === placement.pieceId);
      if (piece) {
        addPlacedPiece({
          id: `placed-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          pieceId: placement.pieceId,
          x: placement.x,
          y: placement.y,
          rotation: placement.rotation,
          level: currentLevel,
        });
        placedCount++;
      }
    }

    return {
      toolCallId,
      name: 'generate_layout',
      result: {
        placedCount,
        description: data.description || 'Layout generated successfully',
      },
      success: true,
    };
  } catch (error) {
    return {
      toolCallId,
      name: 'generate_layout',
      result: null,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate layout',
    };
  }
}

// Generate props (stores them for user confirmation)
async function executeGenerateProps(toolCallId: string, params: GeneratePropsParams): Promise<ToolResult> {
  const { prompt, count = 5 } = params;

  if (!prompt || prompt.trim().length < 3) {
    return {
      toolCallId,
      name: 'generate_props',
      result: null,
      success: false,
      error: 'Please provide a description of the props to generate',
    };
  }

  try {
    const { openRouterKey } = useAPIKeysStore.getState();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (openRouterKey) {
      headers['X-OpenRouter-Key'] = openRouterKey;
    }

    const response = await fetch('/api/llm/generate-props', {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt: prompt.trim(), count: Math.min(20, Math.max(1, count)) }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate props');
    }

    const generatedProps: GeneratedProp[] = data.props || [];

    // Store props in chat store for user confirmation
    useChatStore.getState().setPendingProps(generatedProps);

    // Format props for display
    const propsList = generatedProps.map((prop, index) => ({
      index,
      emoji: prop.emoji,
      name: prop.name,
      category: prop.category,
      size: prop.size,
    }));

    return {
      toolCallId,
      name: 'generate_props',
      result: {
        count: generatedProps.length,
        props: propsList,
        message: 'Props generated. Ask the user which ones to add.',
      },
      success: true,
    };
  } catch (error) {
    return {
      toolCallId,
      name: 'generate_props',
      result: null,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate props',
    };
  }
}

// Add generated props to the map
async function executeAddGeneratedProps(toolCallId: string, params: AddGeneratedPropsParams): Promise<ToolResult> {
  const { addAll, indices } = params;

  const chatStore = useChatStore.getState();
  const pendingProps = chatStore.pendingProps;

  if (pendingProps.length === 0) {
    return {
      toolCallId,
      name: 'add_generated_props',
      result: null,
      success: false,
      error: 'No pending props to add. Generate props first.',
    };
  }

  const mapStore = useMapStore.getState();
  const addedProps: string[] = [];

  if (addAll) {
    // Add all props
    for (const prop of pendingProps) {
      const modularPiece = generatedPropToModularPiece(prop);
      mapStore.addCustomProp(modularPiece);
      addedProps.push(`${prop.emoji} ${prop.name}`);
    }
  } else if (indices && indices.length > 0) {
    // Add only selected props
    for (const index of indices) {
      if (index >= 0 && index < pendingProps.length) {
        const prop = pendingProps[index];
        const modularPiece = generatedPropToModularPiece(prop);
        mapStore.addCustomProp(modularPiece);
        addedProps.push(`${prop.emoji} ${prop.name}`);
      }
    }
  }

  // Clear pending props
  chatStore.clearPendingProps();

  return {
    toolCallId,
    name: 'add_generated_props',
    result: {
      addedCount: addedProps.length,
      props: addedProps,
    },
    success: true,
  };
}

// Describe scene
async function executeDescribeScene(toolCallId: string, params: DescribeSceneParams): Promise<ToolResult> {
  const { context } = params;

  const mapStore = useMapStore.getState();
  const { mapWidth, mapHeight, placedPieces, availablePieces, terrainTypes, customProps } = mapStore;

  const totalMapArea = mapWidth * mapHeight;

  // Calculate terrain and props info
  const terrainAreas = new Map<string, { area: number; name: string; description?: string }>();
  const propCounts = new Map<string, { name: string; emoji: string; count: number }>();

  const allPieces = [...availablePieces, ...customProps];

  placedPieces.forEach((placed) => {
    const piece = allPieces.find((p) => p.id === placed.pieceId);
    if (!piece) return;

    if (piece.pieceType === 'prop') {
      const key = piece.name;
      const existing = propCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        propCounts.set(key, {
          name: piece.name,
          emoji: piece.propEmoji || '?',
          count: 1,
        });
      }
    } else {
      const terrain = terrainTypes.find((t) => t.id === piece.terrainTypeId || t.slug === piece.terrainTypeId);
      if (terrain) {
        const pieceArea = piece.size.width * piece.size.height * (piece.isDiagonal ? 0.5 : 1);
        const existing = terrainAreas.get(terrain.id);
        if (existing) {
          existing.area += pieceArea;
        } else {
          terrainAreas.set(terrain.id, {
            area: pieceArea,
            name: terrain.name,
            description: terrain.description,
          });
        }
      }
    }
  });

  const terrainInfo = Array.from(terrainAreas.values())
    .map((t) => ({
      name: t.name,
      percentage: (t.area / totalMapArea) * 100,
      description: t.description,
    }))
    .filter((t) => t.percentage > 0)
    .sort((a, b) => b.percentage - a.percentage);

  const propsInfo = Array.from(propCounts.values())
    .sort((a, b) => b.count - a.count);

  try {
    const { openRouterKey } = useAPIKeysStore.getState();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (openRouterKey) {
      headers['X-OpenRouter-Key'] = openRouterKey;
    }

    const response = await fetch('/api/llm/describe-scene', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        mapWidth,
        mapHeight,
        terrains: terrainInfo,
        props: propsInfo,
        context: context?.trim() || undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate description');
    }

    return {
      toolCallId,
      name: 'describe_scene',
      result: {
        readAloud: data.readAloud || '',
        dmNotes: data.dmNotes || '',
      },
      success: true,
    };
  } catch (error) {
    return {
      toolCallId,
      name: 'describe_scene',
      result: null,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate description',
    };
  }
}

// Setup terrain (creates pending config for user confirmation)
async function executeSetupTerrain(toolCallId: string, params: SetupTerrainParams): Promise<ToolResult> {
  const { name, pieces = [], color, icon, description } = params;

  if (!name || name.trim().length === 0) {
    return {
      toolCallId,
      name: 'setup_terrain',
      result: null,
      success: false,
      error: 'Terrain name is required',
    };
  }

  const store = useInventoryStore.getState();
  const chatStore = useChatStore.getState();

  // Ensure shapes are loaded
  if (store.shapes.length === 0) {
    await store.fetchShapes();
  }

  // Get terrain suggestions for color/icon
  const suggestions = getTerrainSuggestions(name);
  const slug = generateSlug(name);

  // Validate and resolve piece shapes
  const resolvedPieces: { shapeKey: string; shapeName: string; quantity: number }[] = [];
  for (const piece of pieces) {
    const shape = findShapeByKey(store.shapes, piece.shapeKey);
    if (shape) {
      resolvedPieces.push({
        shapeKey: shape.shapeKey, // Use actual shapeKey (with suffix)
        shapeName: store.shapes.find(s => s.id === shape.id)?.name || shape.shapeKey,
        quantity: piece.quantity,
      });
    } else {
      // Shape doesn't exist - report it (will be created with -flat suffix)
      const newShapeKey = piece.shapeKey.includes('-') ? piece.shapeKey : `${piece.shapeKey}-flat`;
      resolvedPieces.push({
        shapeKey: newShapeKey,
        shapeName: `(nuevo: ${newShapeKey})`,
        quantity: piece.quantity,
      });
    }
  }

  // Store pending terrain config
  const pendingConfig: PendingTerrainConfig = {
    name: name.trim(),
    slug,
    color: color || suggestions.color,
    icon: icon || suggestions.icon,
    description: description || `${name} terrain for tabletop gaming`,
    pieces: resolvedPieces,
  };

  chatStore.setPendingTerrain(pendingConfig);

  return {
    toolCallId,
    name: 'setup_terrain',
    result: {
      pending: true,
      terrain: pendingConfig,
      message: 'Terrain configuration ready for review.',
    },
    success: true,
  };
}

// Confirm terrain setup
async function executeConfirmTerrainSetup(toolCallId: string, params: ConfirmTerrainSetupParams): Promise<ToolResult> {
  const { confirm } = params;
  const chatStore = useChatStore.getState();
  const pendingTerrain = chatStore.pendingTerrain;

  if (!pendingTerrain) {
    return {
      toolCallId,
      name: 'confirm_terrain_setup',
      result: null,
      success: false,
      error: 'No pending terrain configuration. Use setup_terrain first.',
    };
  }

  if (!confirm) {
    chatStore.clearPendingTerrain();
    return {
      toolCallId,
      name: 'confirm_terrain_setup',
      result: { cancelled: true },
      success: true,
    };
  }

  const store = useInventoryStore.getState();

  // First, create any missing shapes
  const createdShapes: string[] = [];
  for (const piece of pendingTerrain.pieces) {
    const existingShape = findShapeByKey(store.shapes, piece.shapeKey);
    if (!existingShape) {
      // Parse dimensions from shapeKey (e.g., "6x6-flat" or "6x6" -> width=6, height=6)
      const keyWithoutSuffix = piece.shapeKey.replace(/-(?:flat|corner|elev)$/, '');
      const [widthStr, heightStr] = keyWithoutSuffix.split('x');
      const width = parseFloat(widthStr);
      const height = parseFloat(heightStr);
      const isDiagonal = piece.shapeKey.includes('-corner');

      if (!isNaN(width) && !isNaN(height)) {
        const newShapeKey = generateShapeKey(width, height, isDiagonal);
        const newShapeName = generateShapeName(width, height, isDiagonal);
        await store.createShape({
          shapeKey: newShapeKey,
          name: newShapeName,
          width,
          height,
          isDiagonal,
          defaultRotation: 0,
          baseHeight: 0.5,
        });
        createdShapes.push(newShapeKey);
      }
    }
  }

  // Refetch shapes after creating new ones
  if (createdShapes.length > 0) {
    await store.fetchShapes();
  }

  // Create the terrain type
  const terrain = await store.createTerrainType({
    slug: pendingTerrain.slug,
    name: pendingTerrain.name,
    color: pendingTerrain.color,
    icon: pendingTerrain.icon,
    description: pendingTerrain.description,
  });

  if (!terrain) {
    const error = store.error || 'Failed to create terrain type';
    store.clearError();
    chatStore.clearPendingTerrain();
    return {
      toolCallId,
      name: 'confirm_terrain_setup',
      result: null,
      success: false,
      error,
    };
  }

  // Assign pieces to the terrain
  const piecesToAssign: { shapeId: string; quantity: number }[] = [];
  for (const piece of pendingTerrain.pieces) {
    const shape = findShapeByKey(store.shapes, piece.shapeKey);
    if (shape && piece.quantity > 0) {
      piecesToAssign.push({
        shapeId: shape.id,
        quantity: piece.quantity,
      });
    }
  }

  if (piecesToAssign.length > 0) {
    await store.updateTerrainPieces(terrain.id, piecesToAssign);
  }

  chatStore.clearPendingTerrain();

  // Refresh map store to show new terrain and pieces
  await useMapStore.getState().refreshFromInventory();

  return {
    toolCallId,
    name: 'confirm_terrain_setup',
    result: {
      terrain: {
        id: terrain.id,
        name: terrain.name,
        slug: terrain.slug,
        color: terrain.color,
        icon: terrain.icon,
      },
      piecesAssigned: piecesToAssign.length,
      shapesCreated: createdShapes,
    },
    success: true,
  };
}

// Assign pieces to existing terrain
async function executeAssignPiecesToTerrain(toolCallId: string, params: AssignPiecesToTerrainParams): Promise<ToolResult> {
  const { terrainName, pieces } = params;

  const store = useInventoryStore.getState();

  // Ensure data is loaded
  if (store.terrainTypes.length === 0) {
    await store.fetchTerrainTypes();
  }
  if (store.shapes.length === 0) {
    await store.fetchShapes();
  }

  // Find terrain by name or slug
  const terrain = store.terrainTypes.find(
    t => t.name.toLowerCase() === terrainName.toLowerCase() ||
         t.slug.toLowerCase() === terrainName.toLowerCase()
  );

  if (!terrain) {
    return {
      toolCallId,
      name: 'assign_pieces_to_terrain',
      result: null,
      success: false,
      error: `Terrain "${terrainName}" not found. Use list_terrain_types to see available terrains.`,
    };
  }

  // Resolve and assign pieces
  const assignedPieces: { shape: string; quantity: number }[] = [];
  const missingShapes: string[] = [];

  for (const piece of pieces) {
    const shape = findShapeByKey(store.shapes, piece.shapeKey);
    if (shape) {
      const fullShape = store.shapes.find(s => s.id === shape.id);
      await store.updateTerrainPieceQuantity(terrain.id, shape.id, piece.quantity);
      assignedPieces.push({ shape: fullShape?.name || shape.shapeKey, quantity: piece.quantity });
    } else {
      missingShapes.push(piece.shapeKey);
    }
  }

  // Refresh map store to show updated pieces
  await useMapStore.getState().refreshFromInventory();

  return {
    toolCallId,
    name: 'assign_pieces_to_terrain',
    result: {
      terrain: terrain.name,
      assignedPieces,
      missingShapes: missingShapes.length > 0 ? missingShapes : undefined,
      message: missingShapes.length > 0
        ? `Some shapes not found: ${missingShapes.join(', ')}. Create them first with create_shape.`
        : 'Pieces assigned successfully.',
    },
    success: true,
  };
}

// Create custom multi-terrain piece
async function executeCreateCustomPiece(toolCallId: string, params: CreateCustomPieceParams): Promise<ToolResult> {
  const { name, width, height, terrainPattern, quantity = 1 } = params;

  // Validate dimensions
  if (width < 0.5 || width > 12 || height < 0.5 || height > 12) {
    return {
      toolCallId,
      name: 'create_custom_piece',
      result: null,
      success: false,
      error: 'Width and height must be between 0.5 and 12 inches',
    };
  }

  // Validate pattern dimensions
  if (!terrainPattern || terrainPattern.length === 0) {
    return {
      toolCallId,
      name: 'create_custom_piece',
      result: null,
      success: false,
      error: 'terrainPattern is required and must not be empty',
    };
  }

  const store = useInventoryStore.getState();

  // Ensure terrain types are loaded
  if (store.terrainTypes.length === 0) {
    await store.fetchTerrainTypes();
  }

  // Convert terrain names/slugs to IDs
  const cellColors: string[][] = [];
  const missingTerrains: string[] = [];

  for (const row of terrainPattern) {
    const colorRow: string[] = [];
    for (const terrainName of row) {
      const terrain = store.terrainTypes.find(
        t => t.name.toLowerCase() === terrainName.toLowerCase() ||
             t.slug.toLowerCase() === terrainName.toLowerCase()
      );
      if (terrain) {
        colorRow.push(terrain.id);
      } else {
        if (!missingTerrains.includes(terrainName)) {
          missingTerrains.push(terrainName);
        }
        colorRow.push(''); // placeholder
      }
    }
    cellColors.push(colorRow);
  }

  if (missingTerrains.length > 0) {
    return {
      toolCallId,
      name: 'create_custom_piece',
      result: null,
      success: false,
      error: `Unknown terrain types: ${missingTerrains.join(', ')}. Use list_terrain_types to see available terrains.`,
    };
  }

  // Create the custom piece
  const customPiece = await store.createCustomPiece({
    name,
    width,
    height,
    cellColors,
    quantity,
  });

  if (!customPiece) {
    const error = store.error || 'Failed to create custom piece';
    store.clearError();
    return {
      toolCallId,
      name: 'create_custom_piece',
      result: null,
      success: false,
      error,
    };
  }

  // Refresh map store to show new custom piece
  await useMapStore.getState().refreshFromInventory();

  return {
    toolCallId,
    name: 'create_custom_piece',
    result: {
      id: customPiece.id,
      name: customPiece.name,
      dimensions: `${width}" x ${height}"`,
      quantity: customPiece.quantity,
      pattern: terrainPattern,
    },
    success: true,
  };
}

// List saved maps
async function executeListMaps(toolCallId: string, params: ListMapsParams): Promise<ToolResult> {
  const { limit = 20 } = params;

  const mapStore = useMapInventoryStore.getState();

  // Ensure maps are loaded
  if (mapStore.savedMaps.length === 0) {
    await mapStore.fetchMaps();
  }

  const maps = mapStore.savedMaps.slice(0, limit).map(m => ({
    id: m.id,
    name: m.name,
    description: m.description || '',
    dimensions: `${m.mapWidth}" x ${m.mapHeight}"`,
    piecesCount: m.placedPieces.length,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }));

  return {
    toolCallId,
    name: 'list_maps',
    result: {
      count: maps.length,
      total: mapStore.savedMaps.length,
      maps,
    },
    success: true,
  };
}

// Get detailed map info
async function executeGetMapDetails(toolCallId: string, params: GetMapDetailsParams): Promise<ToolResult> {
  const { mapName } = params;

  const mapStore = useMapInventoryStore.getState();
  const inventoryStore = useInventoryStore.getState();

  // Ensure maps are loaded
  if (mapStore.savedMaps.length === 0) {
    await mapStore.fetchMaps();
  }

  // Ensure inventory is loaded for piece names
  if (inventoryStore.terrainTypes.length === 0) {
    await inventoryStore.fetchTerrainTypes();
  }

  // Find map by name (partial match)
  const map = mapStore.savedMaps.find(
    m => m.name.toLowerCase().includes(mapName.toLowerCase())
  );

  if (!map) {
    return {
      toolCallId,
      name: 'get_map_details',
      result: null,
      success: false,
      error: `Map "${mapName}" not found. Use list_maps to see available maps.`,
    };
  }

  // Get pieces from inventory to understand what's placed
  const modularPieces = inventoryStore.getModularPieces();

  // Analyze placed pieces
  const terrainCounts = new Map<string, { name: string; icon: string; count: number; area: number }>();
  const propCounts = new Map<string, { name: string; emoji: string; count: number }>();

  for (const placed of map.placedPieces) {
    const piece = modularPieces.find(p => p.id === placed.pieceId);
    if (!piece) continue;

    if (piece.pieceType === 'prop') {
      const key = piece.name;
      const existing = propCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        propCounts.set(key, {
          name: piece.name,
          emoji: piece.propEmoji || '?',
          count: 1,
        });
      }
    } else {
      const terrain = inventoryStore.terrainTypes.find(
        t => t.id === piece.terrainTypeId || t.slug === piece.terrainTypeId
      );
      if (terrain) {
        const area = piece.size.width * piece.size.height * (piece.isDiagonal ? 0.5 : 1);
        const existing = terrainCounts.get(terrain.id);
        if (existing) {
          existing.count++;
          existing.area += area;
        } else {
          terrainCounts.set(terrain.id, {
            name: terrain.name,
            icon: terrain.icon,
            count: 1,
            area,
          });
        }
      }
    }
  }

  const terrains = Array.from(terrainCounts.values()).sort((a, b) => b.count - a.count);
  const props = Array.from(propCounts.values()).sort((a, b) => b.count - a.count);

  return {
    toolCallId,
    name: 'get_map_details',
    result: {
      id: map.id,
      name: map.name,
      description: map.description || '',
      dimensions: `${map.mapWidth}" x ${map.mapHeight}"`,
      dimensionsFeet: `${Math.round(map.mapWidth / 12)}ft x ${Math.round(map.mapHeight / 12)}ft`,
      levels: map.levels,
      totalPieces: map.placedPieces.length,
      terrains: terrains.map(t => ({
        name: t.name,
        icon: t.icon,
        pieces: t.count,
        area: `${t.area} sq in`,
      })),
      props: props.map(p => ({
        name: p.name,
        emoji: p.emoji,
        count: p.count,
      })),
      createdAt: map.createdAt,
      updatedAt: map.updatedAt,
    },
    success: true,
  };
}
