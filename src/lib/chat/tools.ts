import type { OpenRouterTool } from './types';

// Tool definitions for the chat AI

export const createShapeTool: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'create_shape',
    description: 'Creates a new modular terrain piece type (shape) that can be used in maps. The shape defines the dimensions and characteristics of terrain pieces. IMPORTANT: Only call this after gathering all necessary information from the user through guided questions.',
    parameters: {
      type: 'object',
      properties: {
        width: {
          type: 'number',
          description: 'Width of the piece in inches (0.5 to 12). Common sizes: 6, 4, 3, 2, 1.5, 1',
        },
        height: {
          type: 'number',
          description: 'Height of the piece in inches (0.5 to 12). Common sizes: 6, 4, 3, 2, 1.5, 1',
        },
        name: {
          type: 'string',
          description: 'Optional display name for the piece. If not provided, a name will be generated based on dimensions.',
        },
        baseHeight: {
          type: 'number',
          description: 'Base height in inches. Must be one of: 0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3. Default is 0.5.',
        },
        isDiagonal: {
          type: 'boolean',
          description: 'Whether this is a diagonal/corner piece (triangular). Default is false.',
        },
        magnets: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              size: {
                type: 'string',
                description: 'Magnet size (e.g., "3x2", "5x2", "6x3" in mm format)',
              },
              quantity: {
                type: 'number',
                description: 'Number of magnets of this size per piece',
              },
            },
            required: ['size', 'quantity'],
          },
          description: 'Array of magnet configurations. Each entry specifies a magnet size and how many of that size per piece.',
        },
        elevation: {
          type: 'object',
          properties: {
            nw: { type: 'number', description: 'Northwest corner elevation in inches (0-2.5)' },
            ne: { type: 'number', description: 'Northeast corner elevation in inches (0-2.5)' },
            sw: { type: 'number', description: 'Southwest corner elevation in inches (0-2.5)' },
            se: { type: 'number', description: 'Southeast corner elevation in inches (0-2.5)' },
          },
          description: 'Elevation at each corner for slopes/ramps. All 0 = flat piece. Example ramp north: {nw: 2, ne: 2, sw: 0, se: 0}',
        },
      },
      required: ['width', 'height'],
    },
  },
};

export const createTerrainTypeTool: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'create_terrain_type',
    description: 'Creates a new terrain type (like forest, desert, snow, stone, etc.) that can be used for piece colors.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the terrain type (e.g., "Snow", "Lava", "Swamp")',
        },
        color: {
          type: 'string',
          description: 'Hex color for the terrain (e.g., "#FFFFFF" for snow). If not provided, a color will be suggested based on the name.',
        },
        icon: {
          type: 'string',
          description: 'Emoji icon for the terrain (e.g., "❄️" for snow). If not provided, an icon will be suggested based on the name.',
        },
        description: {
          type: 'string',
          description: 'Description of the terrain for AI image generation.',
        },
      },
      required: ['name'],
    },
  },
};

export const listShapesTool: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'list_shapes',
    description: 'Lists all available piece shapes/types in the inventory.',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of shapes to return. Default is 20.',
        },
      },
    },
  },
};

export const listTerrainTypesTool: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'list_terrain_types',
    description: 'Lists all available terrain types (forest, desert, stone, etc.).',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of terrain types to return. Default is 20.',
        },
      },
    },
  },
};

export const listTemplatesTool: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'list_templates',
    description: 'Lists all available piece templates (pre-defined sets of pieces).',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of templates to return. Default is 20.',
        },
      },
    },
  },
};

export const getMapInfoTool: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'get_map_info',
    description: 'Gets information about the current map including dimensions, placed pieces, terrain coverage, and props.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
};

export const generateLayoutTool: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'generate_layout',
    description: 'Generates a terrain layout suggestion based on a scene description. The AI will suggest where to place terrain pieces on the map.',
    parameters: {
      type: 'object',
      properties: {
        sceneDescription: {
          type: 'string',
          description: 'Description of the scene to create (e.g., "A forest clearing with a stream", "A rocky canyon with elevated terrain")',
        },
      },
      required: ['sceneDescription'],
    },
  },
};

export const generatePropsTool: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'generate_props',
    description: 'Generates props (NPCs, furniture, items, creatures) based on a scene description. Returns a list of props for the user to review before adding.',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Description of the scene or what props to generate (e.g., "medieval tavern with patrons", "dungeon room with traps")',
        },
        count: {
          type: 'number',
          description: 'Number of props to generate (1-20). Default is 5.',
        },
      },
      required: ['prompt'],
    },
  },
};

export const addGeneratedPropsTool: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'add_generated_props',
    description: 'Adds previously generated props to the map. Use this after showing generated props to the user and they confirm which ones to add.',
    parameters: {
      type: 'object',
      properties: {
        addAll: {
          type: 'boolean',
          description: 'If true, adds all pending generated props. If false, uses the indices parameter.',
        },
        indices: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array of prop indices to add (0-based). Only used if addAll is false.',
        },
      },
      required: ['addAll'],
    },
  },
};

export const describeSceneTool: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'describe_scene',
    description: 'Generates narrative descriptions of the current map for players (read-aloud text) and DM notes with tactical suggestions.',
    parameters: {
      type: 'object',
      properties: {
        context: {
          type: 'string',
          description: 'Optional additional context about the scene (e.g., "This is where the bandits have made camp", "An ancient elven ruin")',
        },
      },
    },
  },
};

export const setupTerrainTool: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'setup_terrain',
    description: 'Creates a new terrain type with optional piece configuration. Shows a preview for user confirmation before creating. Use this when the user wants to create a new terrain type with pieces.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the terrain type (e.g., "Snow", "Lava", "Swamp")',
        },
        pieces: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              shapeKey: {
                type: 'string',
                description: 'Shape key in format "WxH" (e.g., "6x6", "3x3", "2x3")',
              },
              quantity: {
                type: 'number',
                description: 'Number of pieces of this shape',
              },
            },
            required: ['shapeKey', 'quantity'],
          },
          description: 'Array of piece shapes and quantities to assign to this terrain',
        },
        color: {
          type: 'string',
          description: 'Hex color for the terrain (e.g., "#FFFFFF"). If not provided, will be suggested based on name.',
        },
        icon: {
          type: 'string',
          description: 'Emoji icon for the terrain (e.g., "❄️"). If not provided, will be suggested based on name.',
        },
        description: {
          type: 'string',
          description: 'Description of the terrain for AI image generation.',
        },
      },
      required: ['name'],
    },
  },
};

export const confirmTerrainSetupTool: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'confirm_terrain_setup',
    description: 'Confirms or cancels the pending terrain setup. Use this after showing the terrain preview to the user.',
    parameters: {
      type: 'object',
      properties: {
        confirm: {
          type: 'boolean',
          description: 'True to confirm and create the terrain, false to cancel.',
        },
      },
      required: ['confirm'],
    },
  },
};

export const assignPiecesToTerrainTool: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'assign_pieces_to_terrain',
    description: 'Assigns piece shapes and quantities to an existing terrain type. Updates the terrain inventory.',
    parameters: {
      type: 'object',
      properties: {
        terrainName: {
          type: 'string',
          description: 'Name or slug of the existing terrain type (e.g., "Forest", "desert")',
        },
        pieces: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              shapeKey: {
                type: 'string',
                description: 'Shape key in format "WxH" (e.g., "6x6", "3x3", "2x3")',
              },
              quantity: {
                type: 'number',
                description: 'Number of pieces of this shape (0 to remove)',
              },
            },
            required: ['shapeKey', 'quantity'],
          },
          description: 'Array of piece shapes and quantities to assign',
        },
      },
      required: ['terrainName', 'pieces'],
    },
  },
};

export const createCustomPieceTool: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'create_custom_piece',
    description: 'Creates a custom multi-terrain piece with a grid pattern of different terrains. Use this for pieces that have multiple terrain types.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name for the custom piece (e.g., "Forest-River Edge")',
        },
        width: {
          type: 'number',
          description: 'Width in inches (must be multiple of 0.5, e.g., 3, 4.5, 6)',
        },
        height: {
          type: 'number',
          description: 'Height in inches (must be multiple of 0.5, e.g., 3, 4.5, 6)',
        },
        terrainPattern: {
          type: 'array',
          items: {
            type: 'array',
            items: { type: 'string' },
          },
          description: 'A 2D grid of terrain names/slugs. Each row is an array of terrain names. Example for 3x3: [["forest","forest","river"],["forest","river","river"],["river","river","river"]]',
        },
        quantity: {
          type: 'number',
          description: 'Number of these pieces (default 1)',
        },
      },
      required: ['name', 'width', 'height', 'terrainPattern'],
    },
  },
};

export const listMapsTool: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'list_maps',
    description: 'Lists all saved maps in the inventory with their basic information.',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of maps to return. Default is 20.',
        },
      },
    },
  },
};

export const getMapDetailsTool: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'get_map_details',
    description: 'Gets detailed information about a specific saved map, including its placed pieces and terrain coverage.',
    parameters: {
      type: 'object',
      properties: {
        mapName: {
          type: 'string',
          description: 'Name of the map to get details for (partial match supported)',
        },
      },
      required: ['mapName'],
    },
  },
};

// All tools array for the API
export const chatTools: OpenRouterTool[] = [
  createShapeTool,
  createTerrainTypeTool,
  listShapesTool,
  listTerrainTypesTool,
  listTemplatesTool,
  getMapInfoTool,
  generateLayoutTool,
  generatePropsTool,
  addGeneratedPropsTool,
  describeSceneTool,
  setupTerrainTool,
  confirmTerrainSetupTool,
  assignPiecesToTerrainTool,
  createCustomPieceTool,
  listMapsTool,
  getMapDetailsTool,
];

// Helper to get terrain color and icon suggestions
export const terrainSuggestions: Record<string, { color: string; icon: string }> = {
  snow: { color: '#E8F4F8', icon: '❄️' },
  ice: { color: '#B3E5FC', icon: '🧊' },
  lava: { color: '#FF5722', icon: '🌋' },
  fire: { color: '#FF9800', icon: '🔥' },
  water: { color: '#2196F3', icon: '💧' },
  ocean: { color: '#0D47A1', icon: '🌊' },
  swamp: { color: '#4E6E4E', icon: '🐸' },
  marsh: { color: '#556B2F', icon: '🌿' },
  desert: { color: '#EDC9AF', icon: '🏜️' },
  sand: { color: '#F4D03F', icon: '⏳' },
  forest: { color: '#228B22', icon: '🌲' },
  jungle: { color: '#006400', icon: '🌴' },
  grass: { color: '#7CFC00', icon: '🌱' },
  meadow: { color: '#90EE90', icon: '🌼' },
  stone: { color: '#808080', icon: '🪨' },
  rock: { color: '#696969', icon: '⛰️' },
  mountain: { color: '#8B4513', icon: '🏔️' },
  cave: { color: '#2F2F2F', icon: '🕳️' },
  dungeon: { color: '#3C3C3C', icon: '🏰' },
  castle: { color: '#696969', icon: '🏰' },
  wood: { color: '#8B4513', icon: '🪵' },
  road: { color: '#8B7355', icon: '🛤️' },
  path: { color: '#C4A882', icon: '👣' },
  bridge: { color: '#A0522D', icon: '🌉' },
  ruins: { color: '#6B6B6B', icon: '🏛️' },
  crystal: { color: '#E0B0FF', icon: '💎' },
  magic: { color: '#9B59B6', icon: '✨' },
  void: { color: '#1A1A2E', icon: '🌑' },
  shadow: { color: '#2C2C2C', icon: '👤' },
  blood: { color: '#8B0000', icon: '🩸' },
  bone: { color: '#F5F5DC', icon: '🦴' },
  graveyard: { color: '#4A4A4A', icon: '🪦' },
  mushroom: { color: '#8B008B', icon: '🍄' },
  coral: { color: '#FF7F50', icon: '🪸' },
};
