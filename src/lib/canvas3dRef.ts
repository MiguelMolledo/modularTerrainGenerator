// Shared reference to the Three.js Canvas for 3D snapshot generation

let canvas3dInstance: HTMLCanvasElement | null = null;

export function setCanvas3dInstance(canvas: HTMLCanvasElement | null) {
  canvas3dInstance = canvas;
}

export function getCanvas3dInstance(): HTMLCanvasElement | null {
  return canvas3dInstance;
}

/**
 * Generate a snapshot of the 3D view.
 * The canvas must have preserveDrawingBuffer: true enabled.
 */
export function generate3DSnapshot(maxWidth = 1200, maxHeight = 900): string | null {
  if (!canvas3dInstance) {
    console.warn('No 3D canvas instance available for snapshot');
    return null;
  }

  try {
    // Get the current canvas dimensions
    const canvasWidth = canvas3dInstance.width;
    const canvasHeight = canvas3dInstance.height;

    if (canvasWidth === 0 || canvasHeight === 0) {
      console.warn('3D canvas has zero dimensions');
      return null;
    }

    // If the canvas is within our max dimensions, capture directly
    if (canvasWidth <= maxWidth && canvasHeight <= maxHeight) {
      const dataUrl = canvas3dInstance.toDataURL('image/jpeg', 0.9);
      console.log(`3D snapshot: ${canvasWidth}x${canvasHeight}px (direct)`);
      return dataUrl;
    }

    // Otherwise, scale down using an offscreen canvas
    const scale = Math.min(maxWidth / canvasWidth, maxHeight / canvasHeight);
    const targetWidth = Math.round(canvasWidth * scale);
    const targetHeight = Math.round(canvasHeight * scale);

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = targetWidth;
    offscreenCanvas.height = targetHeight;

    const ctx = offscreenCanvas.getContext('2d');
    if (!ctx) {
      console.warn('Could not get 2D context for scaling');
      return canvas3dInstance.toDataURL('image/jpeg', 0.9);
    }

    // Draw scaled
    ctx.drawImage(canvas3dInstance, 0, 0, targetWidth, targetHeight);
    const dataUrl = offscreenCanvas.toDataURL('image/jpeg', 0.9);

    console.log(`3D snapshot: ${canvasWidth}x${canvasHeight}px -> ${targetWidth}x${targetHeight}px`);
    return dataUrl;
  } catch (error) {
    console.error('Failed to generate 3D snapshot:', error);
    return null;
  }
}
