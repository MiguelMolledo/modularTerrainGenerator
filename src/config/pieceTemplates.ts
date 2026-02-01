// Piece templates for quickly setting up terrain types with predefined pieces
// Each template defines which shape_keys to include and their default quantities

export interface PieceTemplateItem {
  shapeKey: string;  // matches piece_shapes.shape_key
  quantity: number;
}

export interface PieceTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  pieces: PieceTemplateItem[];
}

// Predefined templates using the standard shape keys:
// Core flat pieces: 6x6-flat, 3x3-flat, 3x6, 3x1.5
// Corner/diagonal: 3x3-corner, 6x3-diagonal-tl
// Elevated blocks: 6x6-e2.5-2.5-2.5-2.5 (flat block), 6x6-e2.5-0-0-0 (single), 6x6-e2.5-2.5-0-0 (double), 6x6-e2-2-0-2 (triple)
// Special: 3x3 (wall), 0.5x0.5 (column), 3x2-e1.5-1.5-0-0 (stairs)
export const PIECE_TEMPLATES: PieceTemplate[] = [
  {
    id: 'empty',
    name: 'Empty',
    description: 'No pieces - add them manually',
    icon: '📭',
    pieces: [],
  },
  {
    id: 'starter',
    name: 'Starter Set',
    description: 'Basic flat pieces to get started',
    icon: '🎯',
    pieces: [
      { shapeKey: '6x6-flat', quantity: 4 },
      { shapeKey: '3x3-flat', quantity: 4 },
      { shapeKey: '3x3-corner', quantity: 4 },
      { shapeKey: '3x6', quantity: 2 },
    ],
  },
  {
    id: 'standard',
    name: 'Standard Set',
    description: 'Common pieces for most terrain builds',
    icon: '📦',
    pieces: [
      { shapeKey: '6x6-flat', quantity: 4 },
      { shapeKey: '3x3-flat', quantity: 4 },
      { shapeKey: '3x3-corner', quantity: 4 },
      { shapeKey: '3x6', quantity: 2 },
      { shapeKey: '6x6-e2.5-2.5-2.5-2.5', quantity: 2 },
      { shapeKey: '6x6-e2.5-0-0-0', quantity: 1 },
    ],
  },
  {
    id: 'full',
    name: 'Full Set',
    description: 'All piece shapes with generous quantities',
    icon: '🎁',
    pieces: [
      { shapeKey: '6x6-flat', quantity: 6 },
      { shapeKey: '3x3-flat', quantity: 6 },
      { shapeKey: '3x3-corner', quantity: 6 },
      { shapeKey: '3x6', quantity: 4 },
      { shapeKey: '3x1.5', quantity: 4 },
      { shapeKey: '6x6-e2.5-2.5-2.5-2.5', quantity: 2 },
      { shapeKey: '6x6-e2.5-0-0-0', quantity: 2 },
      { shapeKey: '6x6-e2.5-2.5-0-0', quantity: 2 },
      { shapeKey: '6x3-diagonal-tl', quantity: 4 },
    ],
  },
  {
    id: 'flat-only',
    name: 'Flat Only',
    description: 'Just flat pieces without elevation',
    icon: '⬜',
    pieces: [
      { shapeKey: '6x6-flat', quantity: 6 },
      { shapeKey: '3x3-flat', quantity: 8 },
      { shapeKey: '3x6', quantity: 4 },
      { shapeKey: '3x1.5', quantity: 4 },
    ],
  },
  {
    id: 'elevated',
    name: 'Elevated Blocks',
    description: 'Elevated block pieces for hills and platforms',
    icon: '⬆️',
    pieces: [
      { shapeKey: '6x6-e2.5-2.5-2.5-2.5', quantity: 4 },
      { shapeKey: '6x6-e2.5-0-0-0', quantity: 2 },
      { shapeKey: '6x6-e2.5-2.5-0-0', quantity: 2 },
      { shapeKey: '6x6-e2-2-0-2', quantity: 2 },
    ],
  },
  {
    id: 'corners-only',
    name: 'Corners & Diagonals',
    description: 'Corner and diagonal pieces for transitions',
    icon: '📐',
    pieces: [
      { shapeKey: '3x3-corner', quantity: 8 },
      { shapeKey: '6x3-diagonal-tl', quantity: 4 },
    ],
  },
  {
    id: 'dungeon',
    name: 'Dungeon Set',
    description: 'Walls, columns and stairs for dungeon builds',
    icon: '🏰',
    pieces: [
      { shapeKey: '6x6-flat', quantity: 4 },
      { shapeKey: '3x3-flat', quantity: 4 },
      { shapeKey: '3x3', quantity: 8 },
      { shapeKey: '0.5x0.5', quantity: 8 },
      { shapeKey: '3x2-e1.5-1.5-0-0', quantity: 4 },
    ],
  },
];

// Get a template by ID
export function getTemplateById(id: string): PieceTemplate | undefined {
  return PIECE_TEMPLATES.find(t => t.id === id);
}

// Calculate total pieces in a template
export function getTemplatePieceCount(template: PieceTemplate): number {
  return template.pieces.reduce((sum, p) => sum + p.quantity, 0);
}
