import { useRef, useEffect, useCallback, useState } from 'react';
import { useMapStore } from '@/store/mapStore';
import { BASE_PIXELS_PER_INCH } from '@/config/terrain';

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 4.0;

function clampZoom(z: number): number {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
}

interface UseMapNavigationOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  containerSize: { width: number; height: number };
}

export function useMapNavigation({ containerRef, containerSize }: UseMapNavigationOptions) {
  const { zoom, panX, panY, setPan, setZoomAndPan, isViewLocked } = useMapStore();

  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const [isNavPanning, setIsNavPanning] = useState(false);

  // Refs for panning state (avoid stale closures)
  const panStartRef = useRef<{ mouseX: number; mouseY: number; panX: number; panY: number } | null>(null);
  const isSpaceHeldRef = useRef(false);
  const isNavPanningRef = useRef(false);

  // Ref for animated focus
  const animationRef = useRef<number | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    isSpaceHeldRef.current = isSpaceHeld;
  }, [isSpaceHeld]);

  useEffect(() => {
    isNavPanningRef.current = isNavPanning;
  }, [isNavPanning]);

  // --- Wheel handler (pan + zoom-to-cursor) ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isViewLocked) return;

      if (e.ctrlKey || e.metaKey) {
        // Zoom toward cursor
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const currentZoom = useMapStore.getState().zoom;
        const currentPanX = useMapStore.getState().panX;
        const currentPanY = useMapStore.getState().panY;
        const currentPPI = BASE_PIXELS_PER_INCH * currentZoom;

        // World position under cursor
        const worldX = (mouseX - currentPanX) / currentPPI;
        const worldY = (mouseY - currentPanY) / currentPPI;

        // Multiplicative zoom factor
        const factor = 1 - e.deltaY * 0.01;
        const newZoom = clampZoom(currentZoom * factor);
        const newPPI = BASE_PIXELS_PER_INCH * newZoom;

        // Adjust pan to keep same world point under cursor
        const newPanX = mouseX - worldX * newPPI;
        const newPanY = mouseY - worldY * newPPI;

        setZoomAndPan(newZoom, newPanX, newPanY);
      } else {
        // Pan using deltaX/deltaY
        const currentPanX = useMapStore.getState().panX;
        const currentPanY = useMapStore.getState().panY;
        setPan(currentPanX - e.deltaX, currentPanY - e.deltaY);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [containerRef, isViewLocked, setPan, setZoomAndPan]);

  // --- Space key tracking ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        // Don't hijack space if user is typing in an input/textarea
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        e.preventDefault();
        setIsSpaceHeld(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpaceHeld(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // --- Mouse handlers for panning (space+drag and right-click drag) ---

  /** Returns true if this mousedown was consumed by navigation (pan start) */
  const handleNavigationMouseDown = useCallback(
    (e: React.MouseEvent | MouseEvent): boolean => {
      if (isViewLocked) return false;

      const button = 'button' in e ? e.button : 0;
      const clientX = e.clientX;
      const clientY = e.clientY;
      const currentState = useMapStore.getState();

      // Space + any mouse button → start pan
      if (isSpaceHeldRef.current && button === 0) {
        e.preventDefault();
        panStartRef.current = {
          mouseX: clientX,
          mouseY: clientY,
          panX: currentState.panX,
          panY: currentState.panY,
        };
        setIsNavPanning(true);
        return true;
      }

      // Right-click → start pan
      if (button === 2) {
        e.preventDefault();
        panStartRef.current = {
          mouseX: clientX,
          mouseY: clientY,
          panX: currentState.panX,
          panY: currentState.panY,
        };
        setIsNavPanning(true);
        return true;
      }

      return false;
    },
    [isViewLocked]
  );

  /** Returns true if this mousemove was consumed by navigation (active pan) */
  const handleNavigationMouseMove = useCallback(
    (e: React.MouseEvent | MouseEvent): boolean => {
      if (!isNavPanningRef.current || !panStartRef.current) return false;

      const deltaX = e.clientX - panStartRef.current.mouseX;
      const deltaY = e.clientY - panStartRef.current.mouseY;
      setPan(panStartRef.current.panX + deltaX, panStartRef.current.panY + deltaY);
      return true;
    },
    [setPan]
  );

  /** Returns true if this mouseup was consumed by navigation (pan end) */
  const handleNavigationMouseUp = useCallback((): boolean => {
    if (!isNavPanningRef.current) return false;

    setIsNavPanning(false);
    panStartRef.current = null;
    return true;
  }, []);

  /** Handle mouse leave - stop panning */
  const handleNavigationMouseLeave = useCallback((): void => {
    if (isNavPanningRef.current) {
      setIsNavPanning(false);
      panStartRef.current = null;
    }
  }, []);

  // --- Animated focus ---

  const focusOnPoint = useCallback(
    (worldX: number, worldY: number, targetZoom?: number) => {
      // Cancel any ongoing animation
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }

      const currentState = useMapStore.getState();
      const zoomToUse = targetZoom ?? currentState.zoom;
      const ppi = BASE_PIXELS_PER_INCH * zoomToUse;

      const targetPanX = containerSize.width / 2 - worldX * ppi;
      const targetPanY = containerSize.height / 2 - worldY * ppi;

      const startPanX = currentState.panX;
      const startPanY = currentState.panY;
      const startZoom = currentState.zoom;
      const startTime = performance.now();
      const duration = 200; // ms

      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutCubic(progress);

        const currentPanX = startPanX + (targetPanX - startPanX) * eased;
        const currentPanY = startPanY + (targetPanY - startPanY) * eased;

        if (targetZoom !== undefined) {
          const currentZoom = startZoom + (zoomToUse - startZoom) * eased;
          setZoomAndPan(currentZoom, currentPanX, currentPanY);
        } else {
          setPan(currentPanX, currentPanY);
        }

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          animationRef.current = null;
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    },
    [containerSize.width, containerSize.height, setPan, setZoomAndPan]
  );

  const focusOnBounds = useCallback(
    (minX: number, minY: number, maxX: number, maxY: number) => {
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      focusOnPoint(centerX, centerY);
    },
    [focusOnPoint]
  );

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // --- Cursor class ---
  const cursorClass = isNavPanning
    ? 'cursor-grabbing'
    : isSpaceHeld
      ? 'cursor-grab'
      : '';

  return {
    isPanning: isNavPanning,
    isSpaceHeld,
    cursorClass,
    handleNavigationMouseDown,
    handleNavigationMouseMove,
    handleNavigationMouseUp,
    handleNavigationMouseLeave,
    focusOnPoint,
    focusOnBounds,
  };
}
