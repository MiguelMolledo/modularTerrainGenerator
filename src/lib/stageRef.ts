import Konva from 'konva';

// Shared reference to the Konva Stage for thumbnail generation
let stageInstance: Konva.Stage | null = null;

export function setStageInstance(stage: Konva.Stage | null) {
  stageInstance = stage;
}

export function getStageInstance(): Konva.Stage | null {
  return stageInstance;
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
