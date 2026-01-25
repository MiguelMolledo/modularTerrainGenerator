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

// Predefined templates
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
    description: 'Basic pieces to get started (squares and rectangles)',
    icon: '🎯',
    pieces: [
      { shapeKey: '3x3', quantity: 4 },
      { shapeKey: '6x6', quantity: 2 },
      { shapeKey: '3x6', quantity: 2 },
      { shapeKey: '6x3', quantity: 2 },
    ],
  },
  {
    id: 'standard',
    name: 'Standard Set',
    description: 'Common pieces for most terrain builds',
    icon: '📦',
    pieces: [
      { shapeKey: '3x3', quantity: 6 },
      { shapeKey: '6x6', quantity: 4 },
      { shapeKey: '3x6', quantity: 4 },
      { shapeKey: '6x3', quantity: 4 },
      { shapeKey: '3x1.5', quantity: 4 },
      { shapeKey: '1.5x3', quantity: 4 },
    ],
  },
  {
    id: 'full',
    name: 'Full Set',
    description: 'All piece shapes with generous quantities',
    icon: '🎁',
    pieces: [
      { shapeKey: '3x3', quantity: 10 },
      { shapeKey: '6x6', quantity: 4 },
      { shapeKey: '3x6', quantity: 5 },
      { shapeKey: '6x3', quantity: 5 },
      { shapeKey: '3x1.5', quantity: 8 },
      { shapeKey: '1.5x3', quantity: 8 },
      { shapeKey: '6x1.5', quantity: 4 },
      { shapeKey: '1.5x6', quantity: 4 },
      { shapeKey: 'diagonal-tl', quantity: 4 },
      { shapeKey: 'diagonal-tr', quantity: 4 },
      { shapeKey: 'diagonal-br', quantity: 4 },
      { shapeKey: 'diagonal-bl', quantity: 4 },
    ],
  },
  {
    id: 'diagonal-only',
    name: 'Diagonals Only',
    description: 'Just triangular pieces for transitions',
    icon: '📐',
    pieces: [
      { shapeKey: 'diagonal-tl', quantity: 6 },
      { shapeKey: 'diagonal-tr', quantity: 6 },
      { shapeKey: 'diagonal-br', quantity: 6 },
      { shapeKey: 'diagonal-bl', quantity: 6 },
    ],
  },
  {
    id: 'strips',
    name: 'Strip Pieces',
    description: 'Thin pieces for borders and paths',
    icon: '📏',
    pieces: [
      { shapeKey: '3x1.5', quantity: 8 },
      { shapeKey: '1.5x3', quantity: 8 },
      { shapeKey: '6x1.5', quantity: 6 },
      { shapeKey: '1.5x6', quantity: 6 },
    ],
  },
  {
    id: 'squares',
    name: 'Squares Only',
    description: 'Just square pieces (3x3 and 6x6)',
    icon: '⬛',
    pieces: [
      { shapeKey: '3x3', quantity: 12 },
      { shapeKey: '6x6', quantity: 6 },
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
