// Template system for AI-assisted map generation

// A piece position relative to template origin (0,0)
export interface TemplatePiece {
  pieceType: string;        // e.g., "3x3", "3x6", "3x1.5", "diagonal"
  terrainType: string;      // e.g., "desert", "forest", "water"
  offsetX: number;          // relative X in inches from template origin
  offsetY: number;          // relative Y in inches from template origin
  rotation: number;         // 0, 90, 180, 270
}

// A template is a reusable pattern of pieces
export interface MapTemplate {
  id: string;
  name: string;
  description: string;
  category: 'structure' | 'terrain' | 'path' | 'water' | 'decoration';
  tags: string[];

  // Template dimensions (bounding box)
  width: number;            // in inches
  height: number;           // in inches

  // Pieces that make up this template
  pieces: TemplatePiece[];

  // Constraints
  allowedTerrains?: string[];   // If set, only these terrains can be used
  minMapSize?: { width: number; height: number };
}

// A feature detected or placed on a map
export interface MapFeature {
  id: string;
  templateId: string;       // Which template this came from
  name: string;             // User-friendly name
  x: number;                // Position on map
  y: number;
  rotation: number;
  placedPieceIds: string[]; // IDs of actual placed pieces
}

// Request for AI to generate a map
export interface MapGenerationRequest {
  description: string;      // Natural language description
  features: string[];       // Extracted features: ["cabin", "lake", "path"]
  terrainPreference?: string;
  mapSize?: { width: number; height: number };
}

// Result of AI map generation
export interface MapGenerationResult {
  success: boolean;
  features: MapFeature[];
  warnings?: string[];      // e.g., "Could not fit lake, map too small"
}
