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
// - 6x6-flat: 6x6 Flat piece
// - 6x6-elev: 6x6 Elevated piece
// - 3x3-flat: 3x3 Flat piece
// - 3x3-corner: 3x3 Corner (diagonal) piece
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
    description: 'Basic pieces to get started',
    icon: '🎯',
    pieces: [
      { shapeKey: '6x6-flat', quantity: 2 },
      { shapeKey: '6x6-elev', quantity: 2 },
      { shapeKey: '3x3-flat', quantity: 4 },
      { shapeKey: '3x3-corner', quantity: 2 },
    ],
  },
  {
    id: 'standard',
    name: 'Standard Set',
    description: 'Common pieces for most terrain builds',
    icon: '📦',
    pieces: [
      { shapeKey: '6x6-flat', quantity: 4 },
      { shapeKey: '6x6-elev', quantity: 4 },
      { shapeKey: '3x3-flat', quantity: 4 },
      { shapeKey: '3x3-corner', quantity: 4 },
    ],
  },
  {
    id: 'full',
    name: 'Full Set',
    description: 'All piece shapes with generous quantities',
    icon: '🎁',
    pieces: [
      { shapeKey: '6x6-flat', quantity: 6 },
      { shapeKey: '6x6-elev', quantity: 6 },
      { shapeKey: '3x3-flat', quantity: 8 },
      { shapeKey: '3x3-corner', quantity: 8 },
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
    ],
  },
  {
    id: 'elevated-only',
    name: 'Elevated Only',
    description: 'Just elevated pieces for hills and platforms',
    icon: '⬆️',
    pieces: [
      { shapeKey: '6x6-elev', quantity: 6 },
    ],
  },
  {
    id: 'corners-only',
    name: 'Corners Only',
    description: 'Just corner pieces for transitions',
    icon: '📐',
    pieces: [
      { shapeKey: '3x3-corner', quantity: 8 },
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
