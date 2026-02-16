# Implementation Plan: 3D Editor

Sistema de edición interactiva en el visor 3D con gizmos de transformación estilo Unity/Unreal.

## Summary

Añadir capacidad de edición directa en el visor 3D usando TransformControls de three-stdlib. Los usuarios podrán seleccionar, mover (W) y rotar (E) piezas y props directamente en 3D, con sincronización en tiempo real con la vista 2D, snap a grid, límites de altura por layer, y detección visual de colisiones.

## Context

**Spec principal**: [3D Editor](../specs/3d-editor.md)

**Specs relacionados**:
- [3D Viewer](../specs/3d-viewer.md) - Sistema base de renderizado 3D con Three.js
- [Map Designer](../specs/map-designer.md) - Edición 2D y gestión de estado
- [Collision Detection](../specs/collision-detection.md) - Lógica de detección de solapamiento
- [Grid System](../specs/grid-system.md) - Snap a grid y alineación
- [Undo/Redo](../specs/undo-redo.md) - Sistema de historial de acciones
- [Elevation System](../specs/elevation.md) - Alturas por esquina y niveles

**Archivos clave existentes**:
- `src/components/map-designer/three/Map3DViewer.tsx` - Contenedor del visor 3D
- `src/components/map-designer/three/Scene3D.tsx` - Escena con piezas y controles de cámara
- `src/components/map-designer/three/PlacedPiece3D.tsx` - Renderizado de piezas de terreno
- `src/components/map-designer/three/Prop3D.tsx` - Renderizado de props/objetos
- `src/store/mapStore.ts` - Estado global del mapa (selección, piezas, niveles)
- `src/lib/collisionUtils.ts` - Funciones de detección de colisiones
- `src/lib/gridUtils.ts` - Funciones de snap a grid
- `src/config/terrain.ts` - Constantes (GRID_CELL_SIZE=1.5", LEVEL_HEIGHT_INCHES=3")

**Nuevos archivos a crear**:
- `src/components/map-designer/three/TransformGizmo3D.tsx`
- `src/components/map-designer/three/SelectionOutline3D.tsx`
- `src/components/map-designer/three/SelectionGroup3D.tsx`
- `src/hooks/use3DTransform.ts`

---

## Tasks

- [x] Instalar `three-stdlib` como dependencia (`npm install three-stdlib`)
- [x] Añadir constantes `LAYER_HEIGHT_INCHES = 3` y `LAYER_LIMITS` en `src/config/terrain.ts` ([spec: Snap y Límites](../specs/3d-editor.md#snap-y-límites))
- [x] Añadir estado `transform3DMode: 'translate' | 'rotate'` al mapStore ([spec: Transformación](../specs/3d-editor.md#transformación---mover))
- [x] Añadir estado `colliding3DPieceIds: string[]` al mapStore para tracking de colisiones
- [x] Crear `SelectionOutline3D.tsx` con outline brillante usando @react-three/postprocessing ([spec: Selección](../specs/3d-editor.md#selección))
- [x] Modificar `PlacedPiece3D.tsx` para Shift+click multi-selección usando `toggleSelection()` ([spec: Selección](../specs/3d-editor.md#selección))
- [x] Modificar `Prop3D.tsx` igual para Shift+click multi-selección
- [x] Añadir handler de click en espacio vacío en Scene3D para `clearSelection()`
- [x] Integrar outline en Scene3D para piezas seleccionadas
- [x] Crear `TransformGizmo3D.tsx` usando `TransformControls` de three-stdlib ([spec: Transformación](../specs/3d-editor.md#transformación---mover))
- [x] Crear hook `use3DTransform.ts` con listeners para teclas W (translate) y E (rotate)
- [x] Integrar TransformGizmo3D en Scene3D attachado a pieza seleccionada
- [x] Deshabilitar OrbitControls durante drag del gizmo (evitar conflicto de eventos)
- [x] Implementar snap a grid (0.5") en transformaciones usando `GRID_CELL_SIZE` de `src/config/terrain.ts` ([spec: Grid System](../specs/grid-system.md))
- [x] Implementar límites de altura por layer (basement 0-3", ground 3-6", level1 6-9", level2 9-12") ([spec: Snap y Límites](../specs/3d-editor.md#snap-y-límites))
- [x] Implementar rotación restringida a 90° (snap a 0, 90, 180, 270)
- [x] Añadir acción `updatePlacedPiecePosition3D` en mapStore (convierte coords 3D→2D)
- [x] Crear `SelectionGroup3D.tsx` para multi-selección con gizmo en centro del grupo
- [x] Implementar movimiento en grupo: calcular delta y aplicar a todas las piezas con `updatePlacedPieces`
- [x] Implementar rotación en grupo: rotar posiciones alrededor del centro
- [x] Crear función `check3DCollisions` en `src/lib/collisionUtils.ts` ([spec: Collision Detection](../specs/collision-detection.md))
- [x] Modificar material de piezas en colisión (tinte rojo) como warning visual ([spec: Feedback Visual](../specs/3d-editor.md#feedback-visual))
- [x] Actualizar estado de colisión durante drag en callback onTransform
- [x] Verificar integración con undo/redo existente en `src/store/historyStore.ts` ([spec: Undo/Redo](../specs/undo-redo.md))
- [x] Agrupar transformaciones de drag como una sola acción en historial
- [x] Actualizar leyenda de controles en Map3DViewer.tsx (W, E, Click, Shift+Click)
- [x] Mostrar indicador de modo actual (translate/rotate) en UI
- [x] Añadir cursor pointer al hover sobre piezas seleccionables

---

## Verification

- [x] Piezas se pueden seleccionar con click en 3D
- [x] Multi-selección funciona con Shift+click
- [x] Outline brillante visible en piezas seleccionadas
- [x] Tecla W activa modo mover, tecla E activa modo rotar
- [x] Gizmo de ejes X/Y/Z visible al seleccionar
- [x] Arrastrar eje mueve pieza en esa dirección
- [x] Posición hace snap a grid (1.5")
- [x] Altura limitada por layer actual (3" por layer)
- [x] Rotación en incrementos de 90°
- [x] Múltiples piezas se mueven/rotan juntas
- [x] Colisiones muestran warning visual (no bloquean)
- [x] Cambios se reflejan inmediatamente en vista 2D
- [x] Undo/Redo funciona para transformaciones 3D
- [x] OrbitControls no interfiere con drag del gizmo
