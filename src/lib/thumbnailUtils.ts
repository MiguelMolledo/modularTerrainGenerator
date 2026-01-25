import Konva from 'konva';

/**
 * Generate a thumbnail from a Konva stage
 * @param stage The Konva stage to capture
 * @param maxWidth Maximum width of the thumbnail
 * @param maxHeight Maximum height of the thumbnail
 * @returns Base64 encoded image string
 */
export function generateThumbnail(
  stage: Konva.Stage,
  maxWidth: number = 400,
  maxHeight: number = 250
): string {
  // Get the current stage dimensions
  const stageWidth = stage.width();
  const stageHeight = stage.height();

  // Calculate scale to fit within max dimensions
  const scaleX = maxWidth / stageWidth;
  const scaleY = maxHeight / stageHeight;
  const scale = Math.min(scaleX, scaleY, 1); // Don't upscale

  // Generate the data URL
  const dataURL = stage.toDataURL({
    pixelRatio: scale,
    mimeType: 'image/jpeg',
    quality: 0.7,
  });

  return dataURL;
}

/**
 * Create a simple placeholder thumbnail when no stage is available
 */
export function createPlaceholderThumbnail(
  mapWidth: number,
  mapHeight: number,
  pieceCount: number
): string {
  // Create a canvas element
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 250;
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Border
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

  // Text
  ctx.fillStyle = '#9ca3af';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${mapWidth}" x ${mapHeight}"`, canvas.width / 2, canvas.height / 2 - 10);
  ctx.fillText(`${pieceCount} pieces`, canvas.width / 2, canvas.height / 2 + 15);

  return canvas.toDataURL('image/jpeg', 0.7);
}
