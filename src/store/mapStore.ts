import { create } from 'zustand';
import { PlacedPiece, ModularPiece, TerrainType, GridConfig, SavedMapData } from '@/types';
import { MapTemplate, MapFeature } from '@/types/templates';
import { DEFAULT_TERRAIN_TYPES, DEFAULT_MAP_WIDTH, DEFAULT_MAP_HEIGHT, GRID_CELL_SIZE, DEFAULT_LEVELS } from '@/config/terrain';
import { placeTemplate, PlaceTemplateResult } from '@/lib/templateEngine';

interface MapState {
  // Current map ID (null for new unsaved map)
  currentMapId: string | null;

  // Map properties
  mapName: string;
  mapDescription: string;
  mapWidth: number;
  mapHeight: number;

  // Levels
  levels: number[];
  currentLevel: number;

  // Pieces
  placedPieces: PlacedPiece[];
  availablePieces: ModularPiece[];
  terrainTypes: TerrainType[];

  // Grid settings
  gridConfig: GridConfig;

  // Zoom and pan
  zoom: number;
  panX: number;
  panY: number;

  // View lock
  isViewLocked: boolean;

  // Selected piece for placement (from sidebar)
  selectedPieceId: string | null;

  // Selected placed piece on the map
  selectedPlacedPieceId: string | null;

  // Current rotation for drag preview (0, 90, 180, 270)
  currentRotation: number;

  // Map features (from templates)
  features: MapFeature[];

  // Sidebar drag state (using mouse events instead of HTML5 drag)
  isSidebarDragging: boolean;

  // Recently used pieces for radial menu (last 8)
  recentlyUsedPieceIds: string[];

  // Radial menu state
  isRadialMenuOpen: boolean;
  radialMenuSelectedIndex: number | null;
  radialMenuPosition: { x: number; y: number };

  // Placement mode (after selecting from radial menu)
  isPlacementMode: boolean;

  // 3D View State
  is3DMode: boolean;

  // Sidebar state
  selectedTerrainTab: string | null;

  // Actions
  setMapName: (name: string) => void;
  setMapDescription: (description: string) => void;
  setCurrentLevel: (level: number) => void;
  addPlacedPiece: (piece: PlacedPiece) => void;
  removePlacedPiece: (id: string) => void;
  updatePlacedPiece: (id: string, updates: Partial<PlacedPiece>) => void;
  setSelectedPieceId: (id: string | null) => void;
  setSelectedPlacedPieceId: (id: string | null) => void;
  setAvailablePieces: (pieces: ModularPiece[]) => void;
  setTerrainTypes: (types: TerrainType[]) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;
  toggleViewLock: () => void;
  addAvailablePiece: (piece: ModularPiece) => void;
  clearMap: () => void;
  rotateCurrentPiece: () => void;
  setCurrentRotation: (rotation: number) => void;
  rotateSelectedPlacedPiece: () => void;
  placeTemplateOnMap: (
    template: MapTemplate,
    x: number,
    y: number,
    rotation: number,
    terrainOverride?: string
  ) => PlaceTemplateResult;
  addPlacedPieces: (pieces: PlacedPiece[]) => void;
  startSidebarDrag: (pieceId: string) => void;
  endSidebarDrag: () => void;
  openRadialMenu: (x: number, y: number) => void;
  closeRadialMenu: () => void;
  setRadialMenuSelectedIndex: (index: number | null) => void;
  selectPieceFromRadialMenu: () => void;
  enterPlacementMode: (pieceId: string) => void;
  exitPlacementMode: () => void;

  // 3D View Actions
  toggle3DMode: () => void;

  // Sidebar actions
  setSelectedTerrainTab: (tab: string) => void;

  // Map persistence
  setCurrentMapId: (id: string | null) => void;
  loadMapData: (data: SavedMapData, mapId?: string) => void;
  getMapDataForSave: () => SavedMapData;
  resetToNewMap: () => void;
}

// Demo pieces for testing
// All orientations are pre-defined (no rotation needed during drag)
const demoPieces: ModularPiece[] = [
  // =====================
  // DESERT PIECES
  // =====================
  // Square pieces
  {
    id: 'desert-3x3',
    name: 'Desert 3x3',
    terrainTypeId: 'desert',
    size: { width: 3, height: 3, label: '3" x 3"' },
    isDiagonal: false,
    quantity: 10,
  },
  {
    id: 'desert-6x6',
    name: 'Desert 6x6',
    terrainTypeId: 'desert',
    size: { width: 6, height: 6, label: '6" x 6"' },
    isDiagonal: false,
    quantity: 4,
  },
  // =====================
  // RAMP/SLOPE PIECES (with elevation)
  // =====================
  {
    id: 'desert-ramp-north-6x6',
    name: 'Desert Ramp N',
    terrainTypeId: 'desert',
    size: { width: 6, height: 6, label: '6" x 6" ⬆' },
    isDiagonal: false,
    quantity: 2,
    elevation: { nw: 2, ne: 2, sw: 0, se: 0 }, // Slopes up to north
  },
  {
    id: 'desert-ramp-east-6x6',
    name: 'Desert Ramp E',
    terrainTypeId: 'desert',
    size: { width: 6, height: 6, label: '6" x 6" ➡' },
    isDiagonal: false,
    quantity: 2,
    elevation: { nw: 0, ne: 2, sw: 0, se: 2 }, // Slopes up to east
  },
  {
    id: 'desert-corner-nw-6x6',
    name: 'Desert Corner NW',
    terrainTypeId: 'desert',
    size: { width: 6, height: 6, label: '6" x 6" ◤' },
    isDiagonal: false,
    quantity: 2,
    elevation: { nw: 2.5, ne: 0, sw: 0, se: 0 }, // Single corner elevated
  },
  {
    id: 'forest-ramp-south-6x6',
    name: 'Forest Ramp S',
    terrainTypeId: 'forest',
    size: { width: 6, height: 6, label: '6" x 6" ⬇' },
    isDiagonal: false,
    quantity: 2,
    elevation: { nw: 0, ne: 0, sw: 2, se: 2 }, // Slopes up to south
  },
  {
    id: 'water-ramp-west-6x3',
    name: 'Water Ramp W',
    terrainTypeId: 'water',
    size: { width: 6, height: 3, label: '6" x 3" ⬅' },
    isDiagonal: false,
    quantity: 2,
    elevation: { nw: 2, ne: 0, sw: 2, se: 0 }, // Slopes up to west
  },
  // Rectangular pieces (both orientations)
  {
    id: 'desert-3x6',
    name: 'Desert 3x6',
    terrainTypeId: 'desert',
    size: { width: 3, height: 6, label: '3" x 6"' },
    isDiagonal: false,
    quantity: 5,
  },
  {
    id: 'desert-6x3',
    name: 'Desert 6x3',
    terrainTypeId: 'desert',
    size: { width: 6, height: 3, label: '6" x 3"' },
    isDiagonal: false,
    quantity: 5,
  },
  // Strip pieces (both orientations)
  {
    id: 'desert-3x1.5',
    name: 'Desert 3x1.5',
    terrainTypeId: 'desert',
    size: { width: 3, height: 1.5, label: '3" x 1.5"' },
    isDiagonal: false,
    quantity: 8,
  },
  {
    id: 'desert-1.5x3',
    name: 'Desert 1.5x3',
    terrainTypeId: 'desert',
    size: { width: 1.5, height: 3, label: '1.5" x 3"' },
    isDiagonal: false,
    quantity: 8,
  },
  {
    id: 'desert-6x1.5',
    name: 'Desert 6x1.5',
    terrainTypeId: 'desert',
    size: { width: 6, height: 1.5, label: '6" x 1.5"' },
    isDiagonal: false,
    quantity: 4,
  },
  {
    id: 'desert-1.5x6',
    name: 'Desert 1.5x6',
    terrainTypeId: 'desert',
    size: { width: 1.5, height: 6, label: '1.5" x 6"' },
    isDiagonal: false,
    quantity: 4,
  },
  // Diagonal pieces (4 orientations: corner position)
  {
    id: 'desert-diagonal-tl',
    name: 'Desert △ TL',
    terrainTypeId: 'desert',
    size: { width: 3, height: 3, label: '3" △ ◤' },
    isDiagonal: true,
    quantity: 4,
    defaultRotation: 0,
  },
  {
    id: 'desert-diagonal-tr',
    name: 'Desert △ TR',
    terrainTypeId: 'desert',
    size: { width: 3, height: 3, label: '3" △ ◥' },
    isDiagonal: true,
    quantity: 4,
    defaultRotation: 90,
  },
  {
    id: 'desert-diagonal-br',
    name: 'Desert △ BR',
    terrainTypeId: 'desert',
    size: { width: 3, height: 3, label: '3" △ ◢' },
    isDiagonal: true,
    quantity: 4,
    defaultRotation: 180,
  },
  {
    id: 'desert-diagonal-bl',
    name: 'Desert △ BL',
    terrainTypeId: 'desert',
    size: { width: 3, height: 3, label: '3" △ ◣' },
    isDiagonal: true,
    quantity: 4,
    defaultRotation: 270,
  },

  // =====================
  // FOREST PIECES
  // =====================
  // Square pieces
  {
    id: 'forest-3x3',
    name: 'Forest 3x3',
    terrainTypeId: 'forest',
    size: { width: 3, height: 3, label: '3" x 3"' },
    isDiagonal: false,
    quantity: 8,
  },
  {
    id: 'forest-6x6',
    name: 'Forest 6x6',
    terrainTypeId: 'forest',
    size: { width: 6, height: 6, label: '6" x 6"' },
    isDiagonal: false,
    quantity: 4,
  },
  // Rectangular pieces (both orientations)
  {
    id: 'forest-3x6',
    name: 'Forest 3x6',
    terrainTypeId: 'forest',
    size: { width: 3, height: 6, label: '3" x 6"' },
    isDiagonal: false,
    quantity: 4,
  },
  {
    id: 'forest-6x3',
    name: 'Forest 6x3',
    terrainTypeId: 'forest',
    size: { width: 6, height: 3, label: '6" x 3"' },
    isDiagonal: false,
    quantity: 4,
  },
  // Strip pieces (both orientations)
  {
    id: 'forest-3x1.5',
    name: 'Forest 3x1.5',
    terrainTypeId: 'forest',
    size: { width: 3, height: 1.5, label: '3" x 1.5"' },
    isDiagonal: false,
    quantity: 6,
  },
  {
    id: 'forest-1.5x3',
    name: 'Forest 1.5x3',
    terrainTypeId: 'forest',
    size: { width: 1.5, height: 3, label: '1.5" x 3"' },
    isDiagonal: false,
    quantity: 6,
  },
  {
    id: 'forest-6x1.5',
    name: 'Forest 6x1.5',
    terrainTypeId: 'forest',
    size: { width: 6, height: 1.5, label: '6" x 1.5"' },
    isDiagonal: false,
    quantity: 4,
  },
  {
    id: 'forest-1.5x6',
    name: 'Forest 1.5x6',
    terrainTypeId: 'forest',
    size: { width: 1.5, height: 6, label: '1.5" x 6"' },
    isDiagonal: false,
    quantity: 4,
  },
  // Diagonal pieces (4 orientations)
  {
    id: 'forest-diagonal-tl',
    name: 'Forest △ TL',
    terrainTypeId: 'forest',
    size: { width: 3, height: 3, label: '3" △ ◤' },
    isDiagonal: true,
    quantity: 4,
    defaultRotation: 0,
  },
  {
    id: 'forest-diagonal-tr',
    name: 'Forest △ TR',
    terrainTypeId: 'forest',
    size: { width: 3, height: 3, label: '3" △ ◥' },
    isDiagonal: true,
    quantity: 4,
    defaultRotation: 90,
  },
  {
    id: 'forest-diagonal-br',
    name: 'Forest △ BR',
    terrainTypeId: 'forest',
    size: { width: 3, height: 3, label: '3" △ ◢' },
    isDiagonal: true,
    quantity: 4,
    defaultRotation: 180,
  },
  {
    id: 'forest-diagonal-bl',
    name: 'Forest △ BL',
    terrainTypeId: 'forest',
    size: { width: 3, height: 3, label: '3" △ ◣' },
    isDiagonal: true,
    quantity: 4,
    defaultRotation: 270,
  },

  // =====================
  // WATER PIECES
  // =====================
  // Square pieces
  {
    id: 'water-3x3',
    name: 'Water 3x3',
    terrainTypeId: 'water',
    size: { width: 3, height: 3, label: '3" x 3"' },
    isDiagonal: false,
    quantity: 6,
  },
  {
    id: 'water-6x6',
    name: 'Water 6x6',
    terrainTypeId: 'water',
    size: { width: 6, height: 6, label: '6" x 6"' },
    isDiagonal: false,
    quantity: 4,
  },
  // Rectangular pieces (both orientations)
  {
    id: 'water-3x6',
    name: 'Water 3x6',
    terrainTypeId: 'water',
    size: { width: 3, height: 6, label: '3" x 6"' },
    isDiagonal: false,
    quantity: 3,
  },
  {
    id: 'water-6x3',
    name: 'Water 6x3',
    terrainTypeId: 'water',
    size: { width: 6, height: 3, label: '6" x 3"' },
    isDiagonal: false,
    quantity: 3,
  },
  // Strip pieces (both orientations)
  {
    id: 'water-3x1.5',
    name: 'Water 3x1.5',
    terrainTypeId: 'water',
    size: { width: 3, height: 1.5, label: '3" x 1.5"' },
    isDiagonal: false,
    quantity: 6,
  },
  {
    id: 'water-1.5x3',
    name: 'Water 1.5x3',
    terrainTypeId: 'water',
    size: { width: 1.5, height: 3, label: '1.5" x 3"' },
    isDiagonal: false,
    quantity: 6,
  },
  {
    id: 'water-6x1.5',
    name: 'Water 6x1.5',
    terrainTypeId: 'water',
    size: { width: 6, height: 1.5, label: '6" x 1.5"' },
    isDiagonal: false,
    quantity: 4,
  },
  {
    id: 'water-1.5x6',
    name: 'Water 1.5x6',
    terrainTypeId: 'water',
    size: { width: 1.5, height: 6, label: '1.5" x 6"' },
    isDiagonal: false,
    quantity: 4,
  },
  // Diagonal pieces (4 orientations)
  {
    id: 'water-diagonal-tl',
    name: 'Water △ TL',
    terrainTypeId: 'water',
    size: { width: 3, height: 3, label: '3" △ ◤' },
    isDiagonal: true,
    quantity: 4,
    defaultRotation: 0,
  },
  {
    id: 'water-diagonal-tr',
    name: 'Water △ TR',
    terrainTypeId: 'water',
    size: { width: 3, height: 3, label: '3" △ ◥' },
    isDiagonal: true,
    quantity: 4,
    defaultRotation: 90,
  },
  {
    id: 'water-diagonal-br',
    name: 'Water △ BR',
    terrainTypeId: 'water',
    size: { width: 3, height: 3, label: '3" △ ◢' },
    isDiagonal: true,
    quantity: 4,
    defaultRotation: 180,
  },
  {
    id: 'water-diagonal-bl',
    name: 'Water △ BL',
    terrainTypeId: 'water',
    size: { width: 3, height: 3, label: '3" △ ◣' },
    isDiagonal: true,
    quantity: 4,
    defaultRotation: 270,
  },

  // =====================
  // LAVA PIECES
  // =====================
  // Square pieces
  {
    id: 'lava-3x3',
    name: 'Lava 3x3',
    terrainTypeId: 'lava',
    size: { width: 3, height: 3, label: '3" x 3"' },
    isDiagonal: false,
    quantity: 4,
  },
  {
    id: 'lava-6x6',
    name: 'Lava 6x6',
    terrainTypeId: 'lava',
    size: { width: 6, height: 6, label: '6" x 6"' },
    isDiagonal: false,
    quantity: 4,
  },
  // Rectangular pieces (both orientations)
  {
    id: 'lava-3x6',
    name: 'Lava 3x6',
    terrainTypeId: 'lava',
    size: { width: 3, height: 6, label: '3" x 6"' },
    isDiagonal: false,
    quantity: 3,
  },
  {
    id: 'lava-6x3',
    name: 'Lava 6x3',
    terrainTypeId: 'lava',
    size: { width: 6, height: 3, label: '6" x 3"' },
    isDiagonal: false,
    quantity: 3,
  },
  // Strip pieces (both orientations)
  {
    id: 'lava-3x1.5',
    name: 'Lava 3x1.5',
    terrainTypeId: 'lava',
    size: { width: 3, height: 1.5, label: '3" x 1.5"' },
    isDiagonal: false,
    quantity: 6,
  },
  {
    id: 'lava-1.5x3',
    name: 'Lava 1.5x3',
    terrainTypeId: 'lava',
    size: { width: 1.5, height: 3, label: '1.5" x 3"' },
    isDiagonal: false,
    quantity: 6,
  },
  {
    id: 'lava-6x1.5',
    name: 'Lava 6x1.5',
    terrainTypeId: 'lava',
    size: { width: 6, height: 1.5, label: '6" x 1.5"' },
    isDiagonal: false,
    quantity: 4,
  },
  {
    id: 'lava-1.5x6',
    name: 'Lava 1.5x6',
    terrainTypeId: 'lava',
    size: { width: 1.5, height: 6, label: '1.5" x 6"' },
    isDiagonal: false,
    quantity: 4,
  },
  // Diagonal pieces (4 orientations)
  {
    id: 'lava-diagonal-tl',
    name: 'Lava △ TL',
    terrainTypeId: 'lava',
    size: { width: 3, height: 3, label: '3" △ ◤' },
    isDiagonal: true,
    quantity: 4,
    defaultRotation: 0,
  },
  {
    id: 'lava-diagonal-tr',
    name: 'Lava △ TR',
    terrainTypeId: 'lava',
    size: { width: 3, height: 3, label: '3" △ ◥' },
    isDiagonal: true,
    quantity: 4,
    defaultRotation: 90,
  },
  {
    id: 'lava-diagonal-br',
    name: 'Lava △ BR',
    terrainTypeId: 'lava',
    size: { width: 3, height: 3, label: '3" △ ◢' },
    isDiagonal: true,
    quantity: 4,
    defaultRotation: 180,
  },
  {
    id: 'lava-diagonal-bl',
    name: 'Lava △ BL',
    terrainTypeId: 'lava',
    size: { width: 3, height: 3, label: '3" △ ◣' },
    isDiagonal: true,
    quantity: 4,
    defaultRotation: 270,
  },
];

export const useMapStore = create<MapState>((set, get) => ({
  // Initial state
  currentMapId: null,
  mapName: 'Untitled Map',
  mapDescription: '',
  mapWidth: DEFAULT_MAP_WIDTH,
  mapHeight: DEFAULT_MAP_HEIGHT,
  levels: DEFAULT_LEVELS,
  currentLevel: 0,
  placedPieces: [],
  availablePieces: demoPieces,
  terrainTypes: DEFAULT_TERRAIN_TYPES,
  gridConfig: {
    cellSize: GRID_CELL_SIZE,
    showGrid: true,
    snapToGrid: true,
    magneticSnap: true,
  },
  zoom: 1,
  panX: 0,
  panY: 0,
  isViewLocked: false,
  selectedPieceId: null,
  selectedPlacedPieceId: null,
  currentRotation: 0,
  features: [],
  isSidebarDragging: false,
  recentlyUsedPieceIds: [],
  isRadialMenuOpen: false,
  radialMenuSelectedIndex: null,
  radialMenuPosition: { x: 0, y: 0 },
  isPlacementMode: false,
  is3DMode: false,
  selectedTerrainTab: null,

  // Actions
  setMapName: (name) => set({ mapName: name }),

  setMapDescription: (description) => set({ mapDescription: description }),

  setCurrentLevel: (level) => set({ currentLevel: level }),

  addPlacedPiece: (piece) =>
    set((state) => {
      // Update recently used pieces (keep last 8, most recent first)
      const newRecentlyUsed = [
        piece.pieceId,
        ...state.recentlyUsedPieceIds.filter((id) => id !== piece.pieceId),
      ].slice(0, 8);

      return {
        placedPieces: [...state.placedPieces, piece],
        recentlyUsedPieceIds: newRecentlyUsed,
      };
    }),

  removePlacedPiece: (id) =>
    set((state) => ({
      placedPieces: state.placedPieces.filter((p) => p.id !== id),
      selectedPlacedPieceId: state.selectedPlacedPieceId === id ? null : state.selectedPlacedPieceId,
    })),

  updatePlacedPiece: (id, updates) =>
    set((state) => ({
      placedPieces: state.placedPieces.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),

  setSelectedPieceId: (id) => set({ selectedPieceId: id, currentRotation: 0 }),

  setSelectedPlacedPieceId: (id) => set({ selectedPlacedPieceId: id }),

  setAvailablePieces: (pieces) => set({ availablePieces: pieces }),

  setTerrainTypes: (types) => set({ terrainTypes: types }),

  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(2, zoom)) }),

  setPan: (x, y) => set({ panX: x, panY: y }),

  toggleGrid: () =>
    set((state) => ({
      gridConfig: { ...state.gridConfig, showGrid: !state.gridConfig.showGrid },
    })),

  toggleSnapToGrid: () =>
    set((state) => ({
      gridConfig: { ...state.gridConfig, snapToGrid: !state.gridConfig.snapToGrid },
    })),

  toggleViewLock: () =>
    set((state) => ({
      isViewLocked: !state.isViewLocked,
    })),

  addAvailablePiece: (piece) =>
    set((state) => ({
      availablePieces: [...state.availablePieces, piece],
    })),

  clearMap: () => set({ placedPieces: [], selectedPlacedPieceId: null }),

  rotateCurrentPiece: () =>
    set((state) => ({
      currentRotation: (state.currentRotation + 90) % 360,
    })),

  setCurrentRotation: (rotation) => set({ currentRotation: rotation }),

  rotateSelectedPlacedPiece: () =>
    set((state) => {
      if (!state.selectedPlacedPieceId) return state;
      return {
        placedPieces: state.placedPieces.map((p) =>
          p.id === state.selectedPlacedPieceId
            ? { ...p, rotation: (p.rotation + 90) % 360 }
            : p
        ),
      };
    }),

  placeTemplateOnMap: (template, x, y, rotation, terrainOverride) => {
    const state = get();
    const result = placeTemplate(
      template,
      x,
      y,
      rotation,
      state.currentLevel,
      state.availablePieces,
      state.placedPieces,
      state.mapWidth,
      state.mapHeight,
      terrainOverride
    );

    if (result.success && result.pieces.length > 0) {
      set((state) => ({
        placedPieces: [...state.placedPieces, ...result.pieces],
        features: result.feature
          ? [...state.features, result.feature]
          : state.features,
      }));
    }

    return result;
  },

  addPlacedPieces: (pieces) =>
    set((state) => ({
      placedPieces: [...state.placedPieces, ...pieces],
    })),

  startSidebarDrag: (pieceId) =>
    set({
      selectedPieceId: pieceId,
      isSidebarDragging: true,
      currentRotation: 0,
    }),

  endSidebarDrag: () =>
    set({
      isSidebarDragging: false,
    }),

  openRadialMenu: (x: number, y: number) =>
    set({
      isRadialMenuOpen: true,
      radialMenuSelectedIndex: null,
      radialMenuPosition: { x, y },
    }),

  closeRadialMenu: () =>
    set({
      isRadialMenuOpen: false,
      radialMenuSelectedIndex: null,
    }),

  setRadialMenuSelectedIndex: (index) =>
    set({
      radialMenuSelectedIndex: index,
    }),

  selectPieceFromRadialMenu: () => {
    const state = get();
    if (state.radialMenuSelectedIndex !== null && state.recentlyUsedPieceIds[state.radialMenuSelectedIndex]) {
      const pieceId = state.recentlyUsedPieceIds[state.radialMenuSelectedIndex];
      set({
        selectedPieceId: pieceId,
        isRadialMenuOpen: false,
        radialMenuSelectedIndex: null,
        currentRotation: 0,
        isPlacementMode: true,
      });
    } else {
      set({
        isRadialMenuOpen: false,
        radialMenuSelectedIndex: null,
      });
    }
  },

  enterPlacementMode: (pieceId: string) =>
    set({
      selectedPieceId: pieceId,
      isPlacementMode: true,
      currentRotation: 0,
    }),

  exitPlacementMode: () =>
    set({
      isPlacementMode: false,
      selectedPieceId: null,
    }),

  // 3D View Actions
  toggle3DMode: () =>
    set((state) => ({
      is3DMode: !state.is3DMode,
    })),

  // Sidebar actions
  setSelectedTerrainTab: (tab) => set({ selectedTerrainTab: tab }),

  // Map persistence actions
  setCurrentMapId: (id) => set({ currentMapId: id }),

  loadMapData: (data: SavedMapData, mapId?: string) =>
    set({
      currentMapId: mapId || null,
      mapName: data.name,
      mapDescription: data.description || '',
      mapWidth: data.mapWidth,
      mapHeight: data.mapHeight,
      levels: data.levels,
      placedPieces: data.placedPieces,
      gridConfig: data.gridConfig || {
        cellSize: GRID_CELL_SIZE,
        showGrid: true,
        snapToGrid: true,
        magneticSnap: true,
      },
      // Reset UI state
      currentLevel: 0,
      zoom: 1,
      panX: 0,
      panY: 0,
      selectedPieceId: null,
      selectedPlacedPieceId: null,
      isPlacementMode: false,
      is3DMode: false,
      features: [],
    }),

  getMapDataForSave: () => {
    const state = get();
    return {
      name: state.mapName,
      description: state.mapDescription || undefined,
      mapWidth: state.mapWidth,
      mapHeight: state.mapHeight,
      levels: state.levels,
      placedPieces: state.placedPieces,
      gridConfig: state.gridConfig,
    };
  },

  resetToNewMap: () =>
    set({
      currentMapId: null,
      mapName: 'Untitled Map',
      mapDescription: '',
      mapWidth: DEFAULT_MAP_WIDTH,
      mapHeight: DEFAULT_MAP_HEIGHT,
      levels: DEFAULT_LEVELS,
      currentLevel: 0,
      placedPieces: [],
      gridConfig: {
        cellSize: GRID_CELL_SIZE,
        showGrid: true,
        snapToGrid: true,
        magneticSnap: true,
      },
      zoom: 1,
      panX: 0,
      panY: 0,
      selectedPieceId: null,
      selectedPlacedPieceId: null,
      isPlacementMode: false,
      features: [],
      recentlyUsedPieceIds: [],
    }),
}));
