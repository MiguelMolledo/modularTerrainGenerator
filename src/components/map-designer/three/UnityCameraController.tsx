'use client';

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface UnityCameraControllerRef {
  enabled: boolean;
  isMoving: boolean;
}

interface UnityCameraControllerProps {
  /** Base movement speed in units per second */
  baseSpeed?: number;
  /** Look sensitivity (mouse rotation) */
  lookSensitivity?: number;
  /** Minimum camera Y position */
  minY?: number;
  /** Maximum camera Y position */
  maxY?: number;
  /** Initial camera target to look at */
  initialTarget?: [number, number, number];
  /** Callback when camera starts moving/looking */
  onStart?: () => void;
  /** Callback when camera stops moving/looking */
  onEnd?: () => void;
}

/**
 * Unity-style camera controls for 3D scene navigation.
 *
 * Controls:
 * - WASD: Move forward/left/backward/right (horizontal plane)
 * - Q/E: Move down/up
 * - Right-click + drag: Look around (rotate camera)
 * - Scroll wheel: Zoom in/out (move forward/backward)
 * - Shift: Move faster (2x speed)
 *
 * Note: Left-click is reserved for selection, not camera control.
 */
export const UnityCameraController = forwardRef<UnityCameraControllerRef, UnityCameraControllerProps>(
  function UnityCameraController(
    {
      baseSpeed = 20,
      lookSensitivity = 0.003,
      minY = 1,
      maxY = 150,
      initialTarget,
      onStart,
      onEnd,
    },
    ref
  ) {
    const { camera, gl } = useThree();

    // Control state
    const enabledRef = useRef(true);
    const keysPressed = useRef<Set<string>>(new Set());
    const isRightMouseDown = useRef(false);
    const lastMousePosition = useRef({ x: 0, y: 0 });
    const speedMultiplier = useRef(1);
    const currentSpeed = useRef(baseSpeed);
    const wasActiveRef = useRef(false);

    // Camera rotation state (Euler angles)
    const cameraRotation = useRef({
      yaw: 0,   // Horizontal rotation (around Y axis)
      pitch: 0, // Vertical rotation (around X axis)
    });

    // Expose controls ref
    useImperativeHandle(ref, () => ({
      get enabled() {
        return enabledRef.current;
      },
      set enabled(value: boolean) {
        enabledRef.current = value;
        // If disabled, clear pressed keys
        if (!value) {
          keysPressed.current.clear();
          isRightMouseDown.current = false;
        }
      },
      get isMoving() {
        return keysPressed.current.size > 0 || isRightMouseDown.current;
      },
    }));

    // Initialize camera rotation from current camera state and look at target
    useEffect(() => {
      if (initialTarget) {
        const target = new THREE.Vector3(...initialTarget);
        camera.lookAt(target);
      }

      const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
      cameraRotation.current.yaw = euler.y;
      cameraRotation.current.pitch = euler.x;
    }, [camera, initialTarget]);

    // Handle keyboard events - WASD+QE only work in fly mode (right-click held)
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!enabledRef.current) return;

        // Ignore when typing in input fields
        const activeElement = document.activeElement;
        const isTyping = activeElement instanceof HTMLInputElement ||
                         activeElement instanceof HTMLTextAreaElement ||
                         activeElement?.getAttribute('contenteditable') === 'true';
        if (isTyping) return;

        const key = e.key.toLowerCase();

        // WASD + Q/E only work when right mouse button is held (fly mode)
        // This avoids conflict with W/E for transform mode switching
        if (['w', 'a', 's', 'd', 'q', 'e'].includes(key)) {
          if (isRightMouseDown.current) {
            keysPressed.current.add(key);
            e.preventDefault(); // Prevent W/E from switching transform modes
          }
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

      // Clear keys when window loses focus or right mouse released
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
    }, []);

    // Handle mouse events for look-around
    useEffect(() => {
      const canvas = gl.domElement;

      const handleMouseDown = (e: MouseEvent) => {
        if (!enabledRef.current) return;

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
          // Clear movement keys when exiting fly mode
          keysPressed.current.clear();
          canvas.style.cursor = 'default';
        }
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!enabledRef.current || !isRightMouseDown.current) return;

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
        if (!enabledRef.current) return;

        // Zoom: move camera forward/backward along view direction
        const zoomSpeed = currentSpeed.current * 0.1;
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const zoomAmount = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
        camera.position.add(forward.multiplyScalar(zoomAmount));

        // Clamp Y position
        camera.position.y = Math.max(minY, Math.min(maxY, camera.position.y));

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

      return () => {
        canvas.removeEventListener('mousedown', handleMouseDown);
        canvas.removeEventListener('mouseup', handleMouseUp);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('wheel', handleWheel);
        canvas.removeEventListener('contextmenu', handleContextMenu);
        canvas.style.cursor = 'default';
      };
    }, [gl, camera, lookSensitivity, minY, maxY]);

    // Update camera position and rotation each frame
    useFrame((_, delta) => {
      if (!enabledRef.current) return;

      const isActive = keysPressed.current.size > 0 || isRightMouseDown.current;

      // Trigger callbacks on state change
      if (isActive && !wasActiveRef.current) {
        onStart?.();
      } else if (!isActive && wasActiveRef.current) {
        onEnd?.();
      }
      wasActiveRef.current = isActive;

      // Apply rotation (always, to keep camera orientation)
      const quaternion = new THREE.Quaternion();
      quaternion.setFromEuler(
        new THREE.Euler(cameraRotation.current.pitch, cameraRotation.current.yaw, 0, 'YXZ')
      );
      camera.quaternion.copy(quaternion);

      // Only apply movement if keys are pressed
      if (keysPressed.current.size === 0) return;

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

    return null; // This is a logic-only component
  }
);
