// Grid utilities for custom pieces with cell-based colors
// Each piece is divided into cells based on a 3-inch base size

export const CELL_BASE_SIZE = 3; // 3 inches is the base cell size

/**
 * Calculate grid dimensions for a piece
 * @param width - Piece width in inches
 * @param height - Piece height in inches
 * @returns { cols, rows } - Number of columns and rows in the grid
 */
export function getGridDimensions(width: number, height: number): { cols: number; rows: number } {
  return {
    cols: Math.max(1, Math.round(width / CELL_BASE_SIZE)),
    rows: Math.max(1, Math.round(height / CELL_BASE_SIZE)),
  };
}

/**
 * Create a default grid filled with a single terrain ID
 * @param width - Piece width in inches
 * @param height - Piece height in inches
 * @param defaultTerrainId - UUID of the default terrain type
 * @returns 2D array of terrain IDs
 */
export function createDefaultGrid(
  width: number,
  height: number,
  defaultTerrainId: string
): string[][] {
  const { rows, cols } = getGridDimensions(width, height);
  return Array(rows)
    .fill(null)
    .map(() => Array(cols).fill(defaultTerrainId));
}

/**
 * Check if all cells in a grid have the same color
 * @param cellColors - 2D array of terrain IDs
 * @returns true if all cells have the same terrain ID
 */
export function isUniformColor(cellColors: string[][]): boolean {
  if (!cellColors.length || !cellColors[0]?.length) return true;
  const first = cellColors[0][0];
  return cellColors.every((row) => row.every((cell) => cell === first));
}

/**
 * Get unique terrain IDs used in a grid
 * @param cellColors - 2D array of terrain IDs
 * @returns Array of unique terrain IDs
 */
export function getUniqueTerrainIds(cellColors: string[][]): string[] {
  const ids = new Set<string>();
  cellColors.forEach((row) => row.forEach((id) => ids.add(id)));
  return Array.from(ids);
}

/**
 * Resize a grid, preserving existing colors where possible
 * @param oldGrid - Existing cell colors
 * @param newWidth - New piece width
 * @param newHeight - New piece height
 * @param defaultTerrainId - Default terrain for new cells
 * @returns Resized 2D array of terrain IDs
 */
export function resizeGrid(
  oldGrid: string[][],
  newWidth: number,
  newHeight: number,
  defaultTerrainId: string
): string[][] {
  const { rows: newRows, cols: newCols } = getGridDimensions(newWidth, newHeight);
  const newGrid: string[][] = [];

  for (let r = 0; r < newRows; r++) {
    const row: string[] = [];
    for (let c = 0; c < newCols; c++) {
      // Try to preserve existing color, otherwise use default
      if (oldGrid[r] && oldGrid[r][c]) {
        row.push(oldGrid[r][c]);
      } else {
        row.push(defaultTerrainId);
      }
    }
    newGrid.push(row);
  }

  return newGrid;
}

/**
 * Set a cell's terrain ID in a grid (immutable)
 * @param cellColors - Current grid
 * @param row - Row index
 * @param col - Column index
 * @param terrainId - New terrain ID
 * @returns New grid with updated cell
 */
export function setCellColor(
  cellColors: string[][],
  row: number,
  col: number,
  terrainId: string
): string[][] {
  return cellColors.map((r, rowIdx) =>
    rowIdx === row
      ? r.map((c, colIdx) => (colIdx === col ? terrainId : c))
      : [...r]
  );
}

/**
 * Fill all cells with a single terrain ID
 * @param cellColors - Current grid
 * @param terrainId - Terrain ID to fill with
 * @returns New grid with all cells set to the terrain ID
 */
export function fillAllCells(cellColors: string[][], terrainId: string): string[][] {
  return cellColors.map((row) => row.map(() => terrainId));
}

/**
 * Get the actual cell dimensions in inches for a piece
 * @param pieceWidth - Piece width in inches
 * @param pieceHeight - Piece height in inches
 * @returns { cellWidth, cellHeight } - Actual cell dimensions
 */
export function getCellDimensions(
  pieceWidth: number,
  pieceHeight: number
): { cellWidth: number; cellHeight: number } {
  const { cols, rows } = getGridDimensions(pieceWidth, pieceHeight);
  return {
    cellWidth: pieceWidth / cols,
    cellHeight: pieceHeight / rows,
  };
}
