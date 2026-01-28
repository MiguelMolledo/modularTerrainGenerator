/**
 * Desaturate a hex color by a given amount
 * @param color - Hex color string (e.g., '#ff5500')
 * @param amount - 0 = full color, 1 = grayscale
 */
export function desaturateColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  const gray = (r + g + b) / 3;
  const newR = Math.round(r + (gray - r) * amount);
  const newG = Math.round(g + (gray - g) * amount);
  const newB = Math.round(b + (gray - b) * amount);

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}
