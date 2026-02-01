import Konva from 'konva';
import { BASE_PIXELS_PER_INCH } from '@/config/terrain';

// Shared reference to the Konva Stage for thumbnail generation
let stageInstance: Konva.Stage | null = null;

// Store map dimensions for full map capture
let mapDimensions: { width: number; height: number } = { width: 60, height: 60 };

// Store the current zoom level
let currentZoom: number = 1;

export function setStageInstance(stage: Konva.Stage | null) {
  stageInstance = stage;
}

export function getStageInstance(): Konva.Stage | null {
  return stageInstance;
}

export function setMapDimensions(width: number, height: number) {
  mapDimensions = { width, height };
}

export function setCurrentZoom(zoom: number) {
  currentZoom = zoom;
}

export function generateThumbnail(maxWidth = 400, maxHeight = 300): string | null {
  if (!stageInstance) return null;

  try {
    // Get the stage dimensions
    const stageWidth = stageInstance.width();
    const stageHeight = stageInstance.height();

    // Calculate scale to fit within max dimensions
    const scale = Math.min(maxWidth / stageWidth, maxHeight / stageHeight, 1);

    // Generate the data URL
    const dataUrl = stageInstance.toDataURL({
      pixelRatio: scale,
      mimeType: 'image/jpeg',
      quality: 0.8,
    });

    return dataUrl;
  } catch (error) {
    console.error('Failed to generate thumbnail:', error);
    return null;
  }
}

/**
 * Generate a snapshot of the full map area, regardless of current zoom/pan.
 * This captures the entire map from (0,0) to (mapWidth, mapHeight) in inches.
 * The map will be centered in the output with no black margins.
 */
export function generateFullMapSnapshot(maxWidth = 1200, maxHeight = 900): string | null {
  if (!stageInstance) return null;

  try {
    // The actual rendered canvas size depends on the current zoom level
    // Content is rendered at: mapDimensions * BASE_PIXELS_PER_INCH * currentZoom
    const renderedWidthPx = mapDimensions.width * BASE_PIXELS_PER_INCH * currentZoom;
    const renderedHeightPx = mapDimensions.height * BASE_PIXELS_PER_INCH * currentZoom;

    // Get the content layers
    const layers = stageInstance.getLayers();
    if (layers.length === 0) return null;

    // Save current stage transform and size
    const savedX = stageInstance.x();
    const savedY = stageInstance.y();
    const savedWidth = stageInstance.width();
    const savedHeight = stageInstance.height();

    // Calculate the scale to fit map within max dimensions while maintaining aspect ratio
    const scaleX = maxWidth / renderedWidthPx;
    const scaleY = maxHeight / renderedHeightPx;
    const pixelRatio = Math.min(scaleX, scaleY, 2); // Cap at 2x for quality

    // Reset stage position to origin (content starts at 0,0)
    stageInstance.position({ x: 0, y: 0 });

    // Temporarily set stage size to exactly match rendered content dimensions
    stageInstance.width(renderedWidthPx);
    stageInstance.height(renderedHeightPx);
    stageInstance.batchDraw();

    // Generate the data URL - capture exactly the map area at current zoom
    const dataUrl = stageInstance.toDataURL({
      x: 0,
      y: 0,
      width: renderedWidthPx,
      height: renderedHeightPx,
      pixelRatio: pixelRatio,
      mimeType: 'image/jpeg',
      quality: 0.9,
    });

    // Restore original transform and size
    stageInstance.width(savedWidth);
    stageInstance.height(savedHeight);
    stageInstance.position({ x: savedX, y: savedY });
    stageInstance.batchDraw();

    console.log(`Map snapshot: ${mapDimensions.width}x${mapDimensions.height}" at zoom ${currentZoom} -> ${Math.round(renderedWidthPx * pixelRatio)}x${Math.round(renderedHeightPx * pixelRatio)}px`);

    return dataUrl;
  } catch (error) {
    console.error('Failed to generate full map snapshot:', error);
    return null;
  }
}
