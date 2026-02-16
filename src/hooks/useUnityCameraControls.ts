'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface UnityCameraControlsOptions {
  /** Base movement speed in units per second */
  baseSpeed?: number;
  /** Look sensitivity (mouse rotation) */
  lookSensitivity?: number;
  /** Minimum camera Y position */
  minY?: number;
  /** Maximum camera Y position */
  maxY?: number;
  /** Whether controls are enabled */
  enabled?: boolean;
}

/**
 * Unity-style camera controls for 3D scene navigation.
 *
 * Controls:
 * - WASD: Move forward/left/backward/right
 * - Q/E: Move down/up
 * - Right-click + drag: Look around (rotate camera)
 * - Scroll wheel: Adjust movement speed
 * - Shift: Move faster (2x speed)
 */
export function useUnityCameraControls(options: UnityCameraControlsOptions = {}) {
  const {
    baseSpeed = 15,
    lookSensitivity = 0.002,
    minY = 1,
    maxY = 100,
    enabled = true,
  } = options;

  const { camera, gl } = useThree();

  // Movement state
  const keysPressed = useRef<Set<string>>(new Set());
  const isRightMouseDown = useRef(false);
  const lastMousePosition = useRef({ x: 0, y: 0 });
  const speedMultiplier = useRef(1);
  const currentSpeed = useRef(baseSpeed);

  // Camera rotation state (Euler angles)
  const cameraRotation = useRef({
    yaw: 0,   // Horizontal rotation (around Y axis)
    pitch: 0, // Vertical rotation (around X axis)
  });

  // Initialize camera rotation from current camera state
  useEffect(() => {
    if (!enabled) return;

    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    cameraRotation.current.yaw = euler.y;
    cameraRotation.current.pitch = euler.x;
  }, [camera, enabled]);

  // Handle keyboard events
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in input fields
      const activeElement = document.activeElement;
      const isTyping = activeElement instanceof HTMLInputElement ||
                       activeElement instanceof HTMLTextAreaElement ||
                       activeElement?.getAttribute('contenteditable') === 'true';
      if (isTyping) return;

      const key = e.key.toLowerCase();

      // Movement keys
      if (['w', 'a', 's', 'd', 'q', 'e'].includes(key)) {
        keysPressed.current.add(key);
      }

      // Shift for speed boost
      if (e.shiftKey) {
        speedMultiplier.current = 2;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current.delete(key);

      if (!e.shiftKey) {
        speedMultiplier.current = 1;
      }
    };

    // Clear keys when window loses focus
    const handleBlur = () => {
      keysPressed.current.clear();
      speedMultiplier.current = 1;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [enabled]);

  // Handle mouse events for look-around
  useEffect(() => {
    if (!enabled) return;

    const canvas = gl.domElement;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) { // Right mouse button
        isRightMouseDown.current = true;
        lastMousePosition.current = { x: e.clientX, y: e.clientY };
        canvas.style.cursor = 'grabbing';
        e.preventDefault();
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        isRightMouseDown.current = false;
        canvas.style.cursor = 'grab';
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isRightMouseDown.current) return;

      const deltaX = e.clientX - lastMousePosition.current.x;
      const deltaY = e.clientY - lastMousePosition.current.y;

      // Update camera rotation
      cameraRotation.current.yaw -= deltaX * lookSensitivity;
      cameraRotation.current.pitch -= deltaY * lookSensitivity;

      // Clamp pitch to prevent flipping
      cameraRotation.current.pitch = Math.max(
        -Math.PI / 2 + 0.1,
        Math.min(Math.PI / 2 - 0.1, cameraRotation.current.pitch)
      );

      lastMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const handleWheel = (e: WheelEvent) => {
      // Adjust movement speed with scroll wheel
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      currentSpeed.current = Math.max(5, Math.min(50, currentSpeed.current * delta));
      e.preventDefault();
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // Prevent context menu on right-click
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('contextmenu', handleContextMenu);

    // Set initial cursor
    canvas.style.cursor = 'grab';

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      canvas.style.cursor = 'auto';
    };
  }, [gl, lookSensitivity, enabled]);

  // Update camera position and rotation each frame
  useFrame((_, delta) => {
    if (!enabled) return;

    // Apply rotation
    const quaternion = new THREE.Quaternion();
    quaternion.setFromEuler(
      new THREE.Euler(cameraRotation.current.pitch, cameraRotation.current.yaw, 0, 'YXZ')
    );
    camera.quaternion.copy(quaternion);

    // Calculate movement direction based on camera orientation
    const moveSpeed = currentSpeed.current * speedMultiplier.current * delta;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0);

    // Remove Y component from forward/right for horizontal movement
    forward.y = 0;
    forward.normalize();
    right.y = 0;
    right.normalize();

    const movement = new THREE.Vector3();

    // WASD movement
    if (keysPressed.current.has('w')) {
      movement.add(forward.clone().multiplyScalar(moveSpeed));
    }
    if (keysPressed.current.has('s')) {
      movement.add(forward.clone().multiplyScalar(-moveSpeed));
    }
    if (keysPressed.current.has('a')) {
      movement.add(right.clone().multiplyScalar(-moveSpeed));
    }
    if (keysPressed.current.has('d')) {
      movement.add(right.clone().multiplyScalar(moveSpeed));
    }

    // Q/E for vertical movement
    if (keysPressed.current.has('e')) {
      movement.add(up.clone().multiplyScalar(moveSpeed));
    }
    if (keysPressed.current.has('q')) {
      movement.add(up.clone().multiplyScalar(-moveSpeed));
    }

    // Apply movement
    camera.position.add(movement);

    // Clamp Y position
    camera.position.y = Math.max(minY, Math.min(maxY, camera.position.y));
  });

  // Return current speed for UI display
  return {
    currentSpeed: currentSpeed.current,
    isMoving: keysPressed.current.size > 0,
    isLooking: isRightMouseDown.current,
  };
}
