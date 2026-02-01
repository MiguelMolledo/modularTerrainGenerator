import { create } from 'zustand';
import { PlacedPiece, ModularPiece, TerrainType, GridConfig, SavedMapData, EditMode } from '@/types';
import { MapTemplate, MapFeature } from '@/types/templates';
import { DEFAULT_TERRAIN_TYPES, DEFAULT_MAP_WIDTH, DEFAULT_MAP_HEIGHT, GRID_CELL_SIZE, DEFAULT_LEVELS } from '@/config/terrain';
import { DEFAULT_PROPS } from '@/config/props';
import { placeTemplate, PlaceTemplateResult } from '@/lib/templateEngine';
import { useInventoryStore } from './inventoryStore';

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

  // Selected placed pieces on the map (supports multi-selection)
  selectedPlacedPieceIds: string[];

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

  // Reference levels (for viewing other levels as guides)
  showReferenceLevels: boolean;
  referenceLevelOpacity: number; // 0-1 range

  // Visibility toggles for terrain and props
  showTerrain: boolean;
  showProps: boolean;

  // Sidebar state
  selectedTerrainTab: string | null;

  // Edit mode (terrain vs props)
  editMode: EditMode;

  // Custom props created by user
  customProps: ModularPiece[];

  // Prop search dialog state
  isPropSearchOpen: boolean;
  propSearchPosition: { x: number; y: number };

  // Unsaved changes tracking
  hasUnsavedChanges: boolean;
  lastSavedSnapshot: string | null;

  // Actions
  setMapName: (name: string) => void;
  setMapDescription: (description: string) => void;
  setCurrentLevel: (level: number) => void;
  addPlacedPiece: (piece: PlacedPiece) => void;
  removePlacedPiece: (id: string) => void;
  updatePlacedPiece: (id: string, updates: Partial<PlacedPiece>) => void;
  setSelectedPieceId: (id: string | null) => void;
  // Multi-selection actions
  setSelectedPlacedPieceIds: (ids: string[]) => void;
  addToSelection: (id: string) => void;
  removeFromSelection: (id: string) => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  // Backwards compatibility
  setSelectedPlacedPieceId: (id: string | null) => void;
  // Bulk update for moving multiple pieces
  updatePlacedPieces: (updates: Array<{ id: string; updates: Partial<PlacedPiece> }>) => void;
  setAvailablePieces: (pieces: ModularPiece[]) => void;
  setTerrainTypes: (types: TerrainType[]) => void;
  refreshFromInventory: () => Promise<void>;
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

  // Reference levels actions
  setShowReferenceLevels: (show: boolean) => void;
  setReferenceLevelOpacity: (opacity: number) => void;

  // Sidebar actions
  setSelectedTerrainTab: (tab: string) => void;

  // Edit mode actions
  setEditMode: (mode: EditMode) => void;

  // Prop search dialog actions
  openPropSearch: (x: number, y: number) => void;
  closePropSearch: () => void;

  // Visibility toggles actions
  setShowTerrain: (show: boolean) => void;
  setShowProps: (show: boolean) => void;

  // Custom props actions
  addCustomProp: (prop: ModularPiece) => void;
  removeCustomProp: (id: string) => void;
  updateCustomProp: (id: string, updates: Partial<ModularPiece>) => void;

  // Unsaved changes actions
  markAsSaved: () => void;
  markAsModified: () => void;

  // Map dimensions
  setMapWidth: (width: number) => void;
  setMapHeight: (height: number) => void;
  setMapDimensions: (width: number, height: number) => void;

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
  availablePieces: [...demoPieces, ...DEFAULT_PROPS],
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
  selectedPlacedPieceIds: [],
  currentRotation: 0,
  features: [],
  isSidebarDragging: false,
  recentlyUsedPieceIds: [],
  isRadialMenuOpen: false,
  radialMenuSelectedIndex: null,
  radialMenuPosition: { x: 0, y: 0 },
  isPlacementMode: false,
  is3DMode: false,
  showReferenceLevels: false,
  referenceLevelOpacity: 0.3,
  showTerrain: true,
  showProps: true,
  selectedTerrainTab: null,
  editMode: 'terrain',
  customProps: [],
  isPropSearchOpen: false,
  propSearchPosition: { x: 0, y: 0 },
  hasUnsavedChanges: false,
  lastSavedSnapshot: null,

  // Actions
  setMapName: (name) => set({ mapName: name, hasUnsavedChanges: true }),

  setMapDescription: (description) => set({ mapDescription: description, hasUnsavedChanges: true }),

  setCurrentLevel: (level) => set({ currentLevel: level }),

  addPlacedPiece: (piece) =>
    set((state) => {
      // Prevent duplicates by id
      if (state.placedPieces.some((p) => p.id === piece.id)) {
        console.warn(`Piece with id ${piece.id} already exists, skipping`);
        return state;
      }

      // Update recently used pieces (keep last 8, most recent first)
      const newRecentlyUsed = [
        piece.pieceId,
        ...state.recentlyUsedPieceIds.filter((id) => id !== piece.pieceId),
      ].slice(0, 8);

      return {
        placedPieces: [...state.placedPieces, piece],
        recentlyUsedPieceIds: newRecentlyUsed,
        hasUnsavedChanges: true,
      };
    }),

  removePlacedPiece: (id) =>
    set((state) => ({
      placedPieces: state.placedPieces.filter((p) => p.id !== id),
      selectedPlacedPieceIds: state.selectedPlacedPieceIds.filter((pid) => pid !== id),
      hasUnsavedChanges: true,
    })),

  updatePlacedPiece: (id, updates) =>
    set((state) => ({
      placedPieces: state.placedPieces.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
      hasUnsavedChanges: true,
    })),

  setSelectedPieceId: (id) => set({ selectedPieceId: id, currentRotation: 0 }),

  // Multi-selection actions
  setSelectedPlacedPieceIds: (ids) => set({ selectedPlacedPieceIds: ids }),

  addToSelection: (id) =>
    set((state) => ({
      selectedPlacedPieceIds: state.selectedPlacedPieceIds.includes(id)
        ? state.selectedPlacedPieceIds
        : [...state.selectedPlacedPieceIds, id],
    })),

  removeFromSelection: (id) =>
    set((state) => ({
      selectedPlacedPieceIds: state.selectedPlacedPieceIds.filter((pid) => pid !== id),
    })),

  toggleSelection: (id) =>
    set((state) => ({
      selectedPlacedPieceIds: state.selectedPlacedPieceIds.includes(id)
        ? state.selectedPlacedPieceIds.filter((pid) => pid !== id)
        : [...state.selectedPlacedPieceIds, id],
    })),

  clearSelection: () => set({ selectedPlacedPieceIds: [] }),

  // Backwards compatibility - sets single selection
  setSelectedPlacedPieceId: (id) => set({ selectedPlacedPieceIds: id ? [id] : [] }),

  // Bulk update for moving multiple pieces
  updatePlacedPieces: (updates) =>
    set((state) => {
      const updateMap = new Map(updates.map((u) => [u.id, u.updates]));
      return {
        placedPieces: state.placedPieces.map((p) => {
          const pieceUpdates = updateMap.get(p.id);
          return pieceUpdates ? { ...p, ...pieceUpdates } : p;
        }),
        hasUnsavedChanges: true,
      };
    }),

  setAvailablePieces: (pieces) => set({ availablePieces: pieces }),

  setTerrainTypes: (types) => set({ terrainTypes: types }),

  refreshFromInventory: async () => {
    const inventoryStore = useInventoryStore.getState();

    // Ensure inventory is loaded
    if (inventoryStore.terrainTypes.length === 0) {
      await inventoryStore.fetchTerrainTypes();
    }
    if (inventoryStore.shapes.length === 0) {
      await inventoryStore.fetchShapes();
    }

    // Get updated pieces from inventory
    const modularPieces = inventoryStore.getModularPieces();

    // Convert terrain types to the format mapStore expects
    const terrainTypes: TerrainType[] = inventoryStore.terrainTypes.map(t => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      color: t.color,
      icon: t.icon,
      description: t.description,
    }));

    // Merge with default props
    const allPieces = [...modularPieces, ...DEFAULT_PROPS];

    set({
      availablePieces: allPieces,
      terrainTypes,
    });
  },

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

  clearMap: () =>
    set({ placedPieces: [], selectedPlacedPieceIds: [], hasUnsavedChanges: true }),

  rotateCurrentPiece: () =>
    set((state) => ({
      currentRotation: (state.currentRotation + 90) % 360,
    })),

  setCurrentRotation: (rotation) => set({ currentRotation: rotation }),

  rotateSelectedPlacedPiece: () =>
    set((state) => {
      if (state.selectedPlacedPieceIds.length === 0) return state;
      const selectedSet = new Set(state.selectedPlacedPieceIds);
      return {
        placedPieces: state.placedPieces.map((p) =>
          selectedSet.has(p.id)
            ? { ...p, rotation: (p.rotation + 90) % 360 }
            : p
        ),
        hasUnsavedChanges: true,
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
      selectedPieceId: null,
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

  // Reference levels actions
  setShowReferenceLevels: (show) => set({ showReferenceLevels: show }),
  setReferenceLevelOpacity: (opacity) => set({ referenceLevelOpacity: Math.max(0, Math.min(1, opacity)) }),

  // Sidebar actions
  setSelectedTerrainTab: (tab) => set({ selectedTerrainTab: tab }),

  // Edit mode actions
  setEditMode: (mode) => set({ editMode: mode }),

  // Visibility toggle actions
  setShowTerrain: (show) => set({ showTerrain: show }),
  setShowProps: (show) => set({ showProps: show }),

  // Prop search dialog actions
  openPropSearch: (x, y) => set({
    isPropSearchOpen: true,
    propSearchPosition: { x, y },
  }),
  closePropSearch: () => set({
    isPropSearchOpen: false,
  }),

  // Custom props actions
  addCustomProp: (prop) =>
    set((state) => ({
      customProps: [...state.customProps, prop],
      hasUnsavedChanges: true,
    })),

  removeCustomProp: (id) =>
    set((state) => ({
      customProps: state.customProps.filter((p) => p.id !== id),
      hasUnsavedChanges: true,
    })),

  updateCustomProp: (id, updates) =>
    set((state) => ({
      customProps: state.customProps.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
      hasUnsavedChanges: true,
    })),

  // Map dimensions actions
  setMapWidth: (width) => set({ mapWidth: width, hasUnsavedChanges: true }),
  setMapHeight: (height) => set({ mapHeight: height, hasUnsavedChanges: true }),
  setMapDimensions: (width, height) => set({ mapWidth: width, mapHeight: height, hasUnsavedChanges: true }),

  // Unsaved changes actions
  markAsSaved: () => {
    const state = get();
    const snapshot = JSON.stringify({
      placedPieces: state.placedPieces,
      mapName: state.mapName,
      mapDescription: state.mapDescription,
    });
    set({ hasUnsavedChanges: false, lastSavedSnapshot: snapshot });
  },

  markAsModified: () => set({ hasUnsavedChanges: true }),

  // Map persistence actions
  setCurrentMapId: (id) => set({ currentMapId: id }),

  loadMapData: (data: SavedMapData, mapId?: string) => {
    // Deduplicate placedPieces by id (keep first occurrence)
    const seen = new Set<string>();
    const uniquePieces = data.placedPieces.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    // Load custom props from saved data
    const loadedCustomProps = data.customProps || [];

    set({
      currentMapId: mapId || null,
      mapName: data.name,
      mapDescription: data.description || '',
      mapWidth: data.mapWidth,
      mapHeight: data.mapHeight,
      levels: data.levels,
      placedPieces: uniquePieces,
      customProps: loadedCustomProps,
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
      selectedPlacedPieceIds: [],
      isPlacementMode: false,
      is3DMode: false,
      editMode: 'terrain',
      features: [],
      // Mark as saved (just loaded from storage)
      hasUnsavedChanges: false,
      lastSavedSnapshot: JSON.stringify({
        placedPieces: uniquePieces,
        mapName: data.name,
        mapDescription: data.description || '',
        customProps: loadedCustomProps,
      }),
    });
  },

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
      customProps: state.customProps.length > 0 ? state.customProps : undefined,
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
      customProps: [],
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
      selectedPlacedPieceIds: [],
      isPlacementMode: false,
      editMode: 'terrain',
      features: [],
      recentlyUsedPieceIds: [],
      // New map starts with no unsaved changes
      hasUnsavedChanges: false,
      lastSavedSnapshot: null,
    }),
}));
