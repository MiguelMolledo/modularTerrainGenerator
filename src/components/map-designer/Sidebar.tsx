'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useMapStore } from '@/store/mapStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Puzzle, Plus, Trash2, Sparkles, Search, X, FileText, Upload, Image as ImageIcon, Pencil, Layers, List } from 'lucide-react';
import { getGridDimensions } from '@/lib/gridUtils';
import { PROP_CATEGORIES, PROP_SIZES, COMMON_PROP_EMOJIS, DEFAULT_PROPS } from '@/config/props';
import type { ModularPiece, PropCategory, CellColors } from '@/types';
import { useAIStore } from '@/store/aiStore';
import { AIPropsDialog } from './AIPropsDialog';
import { CampaignAnalyzerDialog } from './CampaignAnalyzerDialog';

// Visual preview component for terrain pieces
interface PiecePreviewProps {
  piece: ModularPiece;
  terrainColor: string;
  terrainTypes: { id: string; slug?: string; color: string }[];
}

function PiecePreview({ piece, terrainColor, terrainTypes }: PiecePreviewProps) {
  const width = piece.size.width;
  const height = piece.size.height;

  // Scale to fit in a small preview area (max 40px wide, maintain aspect ratio)
  const maxSize = 36;
  const scale = Math.min(maxSize / width, maxSize / height, 8); // 8px per inch max
  const previewWidth = width * scale;
  const previewHeight = height * scale;

  // Helper to get color for a terrain ID (checks both id and slug)
  const getTerrainColor = (terrainId: string): string => {
    const terrain = terrainTypes.find(t => t.id === terrainId || t.slug === terrainId);
    return terrain?.color || terrainColor;
  };

  // Check if piece has cellColors (multi-terrain)
  const hasCellColors = piece.cellColors && piece.cellColors.length > 0;

  // For diagonal pieces, render a triangle
  if (piece.isDiagonal) {
    return (
      <svg width={previewWidth} height={previewHeight} className="flex-shrink-0">
        <polygon
          points={`0,${previewHeight} ${previewWidth},${previewHeight} ${previewWidth},0`}
          fill={terrainColor}
          stroke="#374151"
          strokeWidth="1"
        />
      </svg>
    );
  }

  // For multi-terrain pieces with cellColors, render a grid
  if (hasCellColors && piece.cellColors) {
    const rows = piece.cellColors.length;
    const cols = piece.cellColors[0]?.length || 1;
    const cellWidth = previewWidth / cols;
    const cellHeight = previewHeight / rows;

    return (
      <svg width={previewWidth} height={previewHeight} className="flex-shrink-0">
        {piece.cellColors.map((row, rowIndex) =>
          row.map((cellTerrainId, colIndex) => (
            <rect
              key={`${rowIndex}-${colIndex}`}
              x={colIndex * cellWidth}
              y={rowIndex * cellHeight}
              width={cellWidth}
              height={cellHeight}
              fill={getTerrainColor(cellTerrainId)}
              stroke="#374151"
              strokeWidth="0.5"
            />
          ))
        )}
        <rect
          x="0"
          y="0"
          width={previewWidth}
          height={previewHeight}
          fill="none"
          stroke="#374151"
          strokeWidth="1"
        />
      </svg>
    );
  }

  // Regular rectangular piece
  return (
    <svg width={previewWidth} height={previewHeight} className="flex-shrink-0">
      <rect
        x="0"
        y="0"
        width={previewWidth}
        height={previewHeight}
        fill={terrainColor}
        stroke="#374151"
        strokeWidth="1"
        rx="2"
      />
    </svg>
  );
}

// Terrain piece tag categories
type TerrainTagCategory = 'core' | 'elevation' | 'corners' | 'multi' | 'custom';

const TERRAIN_TAG_CATEGORIES: { id: TerrainTagCategory; name: string; icon: string }[] = [
  { id: 'core', name: 'Core', icon: '🧱' },
  { id: 'elevation', name: 'Elevation', icon: '📐' },
  { id: 'corners', name: 'Corners', icon: '📏' },
  { id: 'multi', name: 'Multi-Terrain', icon: '🎨' },
  { id: 'custom', name: 'Custom', icon: '✨' },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [showCreatePropDialog, setShowCreatePropDialog] = useState(false);
  const [showCampaignAnalyzer, setShowCampaignAnalyzer] = useState(false);
  const [newPropName, setNewPropName] = useState('');
  const [newPropEmoji, setNewPropEmoji] = useState('👤');
  const [newPropImage, setNewPropImage] = useState<string | null>(null);
  const [newPropCategory, setNewPropCategory] = useState<PropCategory>('custom');
  const [newPropSize, setNewPropSize] = useState('medium');
  // Edit prop state
  const [editingProp, setEditingProp] = useState<ModularPiece | null>(null);
  const [showEditPropDialog, setShowEditPropDialog] = useState(false);
  // Search/filter state
  const [searchQuery, setSearchQuery] = useState('');
  // Track which prop categories are expanded (all collapsed by default)
  const [expandedPropCategories, setExpandedPropCategories] = useState<Set<PropCategory>>(
    new Set()
  );
  // Track which terrain types are expanded (all collapsed by default)
  const [expandedTerrainTypes, setExpandedTerrainTypes] = useState<Set<string>>(
    new Set()
  );
  // Track which terrain tag categories are expanded within each terrain type
  // Key format: "terrainId:tagCategory"
  const [expandedTerrainSubCategories, setExpandedTerrainSubCategories] = useState<Set<string>>(
    new Set()
  );
  // Toggle between grouped view (with tags) and flat view (without tags)
  const [showTagGroups, setShowTagGroups] = useState(false);

  const togglePropCategory = (categoryId: PropCategory) => {
    setExpandedPropCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const toggleTerrainType = (terrainId: string) => {
    setExpandedTerrainTypes(prev => {
      const next = new Set(prev);
      if (next.has(terrainId)) {
        next.delete(terrainId);
      } else {
        next.add(terrainId);
      }
      return next;
    });
  };

  const toggleTerrainSubCategory = (terrainId: string, categoryId: TerrainTagCategory) => {
    const key = `${terrainId}:${categoryId}`;
    setExpandedTerrainSubCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Auto-expand categories when searching
  const isSearching = searchQuery.trim().length > 0;

  const {
    terrainTypes,
    availablePieces,
    placedPieces,
    selectedPieceId,
    currentLevel,
    isSidebarDragging,
    startSidebarDrag,
    endSidebarDrag,
    selectedTerrainTab,
    setSelectedTerrainTab,
    editMode,
    customProps,
    addCustomProp,
    removeCustomProp,
    updateCustomProp,
  } = useMapStore();

  const { setDialogOpen: setAIDialogOpen } = useAIStore();

  // Get first terrain tab as default
  const defaultTab = terrainTypes[0]?.slug || terrainTypes[0]?.id || '';
  const activeTab = selectedTerrainTab || defaultTab;

  // Get all terrain pieces (not props)
  const allTerrainPieces = useMemo(() => {
    return availablePieces.filter((p) => p.pieceType !== 'prop');
  }, [availablePieces]);

  // Filter terrain pieces by search query
  const filteredTerrainPieces = useMemo(() => {
    if (!searchQuery.trim()) return allTerrainPieces;
    const query = searchQuery.toLowerCase();
    return allTerrainPieces.filter((piece) => {
      // Search in name
      if (piece.name.toLowerCase().includes(query)) return true;
      // Search in tags
      if (piece.tags?.some((tag) => tag.toLowerCase().includes(query))) return true;
      // Search in terrain type
      const terrain = terrainTypes.find((t) => t.id === piece.terrainTypeId);
      if (terrain?.name.toLowerCase().includes(query)) return true;
      // Search in size
      if (piece.size.label.toLowerCase().includes(query)) return true;
      return false;
    });
  }, [allTerrainPieces, searchQuery, terrainTypes]);

  // Group terrain pieces by terrain type, then by tag category
  const terrainByTypeAndTag = useMemo(() => {
    // Map: terrainId -> { tagCategory -> pieces[] }
    const grouped = new Map<string, Record<TerrainTagCategory, ModularPiece[]>>();

    for (const piece of filteredTerrainPieces) {
      // Get terrain ID (use slug or id)
      const terrainId = piece.terrainTypeId;

      // Initialize terrain group if not exists
      if (!grouped.has(terrainId)) {
        grouped.set(terrainId, {
          core: [],
          elevation: [],
          corners: [],
          multi: [],
          custom: [],
        });
      }

      const terrainGroup = grouped.get(terrainId)!;

      // Determine primary category from tags
      if (piece.tags?.includes('custom')) {
        terrainGroup.custom.push(piece);
      } else if (piece.tags?.includes('multi')) {
        terrainGroup.multi.push(piece);
      } else if (piece.tags?.includes('corners')) {
        terrainGroup.corners.push(piece);
      } else if (piece.tags?.includes('elevation')) {
        terrainGroup.elevation.push(piece);
      } else {
        terrainGroup.core.push(piece);
      }
    }

    return grouped;
  }, [filteredTerrainPieces]);

  // Get all terrain types for display (show all, even without pieces)
  const terrainTypesForDisplay = useMemo(() => {
    // If searching, only show terrain types that have matching pieces
    if (searchQuery.trim()) {
      return terrainTypes.filter(t =>
        (t.slug && terrainByTypeAndTag.has(t.slug)) || terrainByTypeAndTag.has(t.id)
      );
    }
    // Otherwise show all terrain types
    return terrainTypes;
  }, [terrainTypes, terrainByTypeAndTag, searchQuery]);

  // Separate custom pieces, variants, regular pieces, and props (keeping for backwards compatibility)
  const regularPieces = availablePieces.filter((p) => !p.isCustom && !p.isVariant && p.pieceType !== 'prop');
  const variantPieces = availablePieces.filter((p) => p.isVariant && p.pieceType !== 'prop');
  const customPieces = availablePieces.filter((p) => p.isCustom && p.pieceType !== 'prop');

  // Get all props (built-in + custom)
  const allProps = useMemo(() => {
    return [...DEFAULT_PROPS, ...customProps];
  }, [customProps]);

  // Filter props by search query
  const filteredProps = useMemo(() => {
    if (!searchQuery.trim()) return allProps;
    const query = searchQuery.toLowerCase();
    return allProps.filter((prop) => {
      // Search in name
      if (prop.name.toLowerCase().includes(query)) return true;
      // Search in category
      if (prop.propCategory?.toLowerCase().includes(query)) return true;
      // Search in emoji (for fun)
      if (prop.propEmoji?.includes(query)) return true;
      // Search in tags
      if (prop.tags?.some((tag) => tag.toLowerCase().includes(query))) return true;
      return false;
    });
  }, [allProps, searchQuery]);

  // Group props by category
  const propsByCategory = useMemo(() => {
    const grouped: Record<PropCategory, ModularPiece[]> = {
      furniture: [],
      npc: [],
      creature: [],
      hero: [],
      boss: [],
      item: [],
      custom: [],
    };
    for (const prop of filteredProps) {
      const category = prop.propCategory || 'custom';
      if (grouped[category]) {
        grouped[category].push(prop);
      }
    }
    return grouped;
  }, [filteredProps]);

  // Handle creating a new custom prop
  const handleCreateProp = () => {
    if (!newPropName.trim()) return;

    const newProp: ModularPiece = {
      id: `custom-prop-${Date.now()}`,
      name: newPropName.trim(),
      pieceType: 'prop',
      propEmoji: newPropImage ? undefined : newPropEmoji, // Use emoji only if no image
      propImage: newPropImage || undefined,
      propCategory: newPropCategory,
      terrainTypeId: 'props',
      size: PROP_SIZES[newPropSize],
      isDiagonal: false,
      quantity: 99,
    };

    addCustomProp(newProp);
    setShowCreatePropDialog(false);
    setNewPropName('');
    setNewPropEmoji('👤');
    setNewPropImage(null);
    setNewPropCategory('custom');
    setNewPropSize('medium');
  };

  // Open edit dialog for a prop
  const handleEditProp = (prop: ModularPiece) => {
    setEditingProp(prop);
    setNewPropName(prop.name);
    setNewPropEmoji(prop.propEmoji || '👤');
    setNewPropImage(prop.propImage || null);
    setNewPropCategory(prop.propCategory || 'custom');
    // Find the size key from PROP_SIZES
    const sizeKey = Object.entries(PROP_SIZES).find(
      ([, size]) => size.width === prop.size.width && size.height === prop.size.height
    )?.[0] || 'medium';
    setNewPropSize(sizeKey);
    setShowEditPropDialog(true);
  };

  // Save edited prop
  const handleSaveEditedProp = () => {
    if (!editingProp || !newPropName.trim()) return;

    updateCustomProp(editingProp.id, {
      name: newPropName.trim(),
      propEmoji: newPropImage ? undefined : newPropEmoji,
      propImage: newPropImage || undefined,
      propCategory: newPropCategory,
      size: PROP_SIZES[newPropSize],
    });

    setShowEditPropDialog(false);
    setEditingProp(null);
    setNewPropName('');
    setNewPropEmoji('👤');
    setNewPropImage(null);
    setNewPropCategory('custom');
    setNewPropSize('medium');
  };

  // Optimize image for web (resize and compress)
  // Optimize image - uses PNG to preserve transparency
  const optimizeImage = (file: File, maxSize: number = 256): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Clear canvas for transparency support
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to PNG to preserve transparency
        const optimizedDataUrl = canvas.toDataURL('image/png');
        resolve(optimizedDataUrl);
      };

      img.onerror = () => reject(new Error('Failed to load image'));

      // Load image from file
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  // Handle image upload for custom prop
  const handlePropImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB before optimization)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB');
      return;
    }

    try {
      // Optimize: resize to max 256px (PNG preserves transparency)
      const optimizedImage = await optimizeImage(file, 256);
      setNewPropImage(optimizedImage);
    } catch (error) {
      console.error('Failed to optimize image:', error);
      alert('Failed to process image. Please try another file.');
    }
  };

  // End drag on mouseup anywhere (cleanup)
  useEffect(() => {
    const handleMouseUp = () => {
      if (isSidebarDragging) {
        endSidebarDrag();
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [isSidebarDragging, endSidebarDrag]);

  // Get total used across all levels
  const getTotalUsed = (pieceId: string) => {
    return placedPieces.filter((p) => p.pieceId === pieceId).length;
  };

  const handleMouseDown = (e: React.MouseEvent, pieceId: string) => {
    e.preventDefault();
    startSidebarDrag(pieceId);
  };

  return (
    <div
      className={`relative flex transition-all duration-300 ease-in-out ${
        isOpen ? 'w-72' : 'w-0'
      }`}
    >
      {/* Sidebar content */}
      <div
        className={`w-72 bg-gray-800 border-r border-gray-700 flex flex-col absolute left-0 top-0 h-full transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mode indicator header */}
        <div className="px-3 py-2 bg-gray-900 border-b border-gray-700 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-400">
            {editMode === 'terrain' ? 'Terrain Pieces' : 'Props & NPCs'}
          </span>
          {editMode === 'terrain' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
              onClick={() => setShowTagGroups(!showTagGroups)}
              title={showTagGroups ? 'Show flat list' : 'Show grouped by tags'}
            >
              {showTagGroups ? (
                <>
                  <List className="h-3 w-3 mr-1" />
                  Flat
                </>
              ) : (
                <>
                  <Layers className="h-3 w-3 mr-1" />
                  Tags
                </>
              )}
            </Button>
          )}
          {editMode === 'props' && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-900/30"
                onClick={() => setAIDialogOpen(true)}
                title="Generate props with AI"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                AI
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-900/30"
                onClick={() => setShowCampaignAnalyzer(true)}
                title="Analyze campaign text"
              >
                <FileText className="h-3 w-3 mr-1" />
                Doc
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setShowCreatePropDialog(true)}
                title="Create custom prop"
              >
                <Plus className="h-3 w-3 mr-1" />
                New
              </Button>
            </div>
          )}
        </div>

        {/* Search/Filter */}
        <div className="px-2 py-2 border-b border-gray-700">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={editMode === 'terrain' ? 'Search terrain...' : 'Search props...'}
              className="w-full bg-gray-700 border border-gray-600 rounded-md pl-8 pr-8 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="text-xs text-gray-500 mt-1">
              {editMode === 'terrain'
                ? `${filteredTerrainPieces.length} pieces found`
                : `${filteredProps.length} props found`}
            </div>
          )}
        </div>

        {/* TERRAIN MODE CONTENT */}
        {editMode === 'terrain' && (
          <ScrollArea className="flex-1 min-h-0 custom-scrollbar">
            <div className="p-2 space-y-1">
              {terrainTypesForDisplay.map((terrain) => {
                const terrainId = terrain.slug || terrain.id;
                const terrainPieces = (terrain.slug && terrainByTypeAndTag.get(terrain.slug)) || terrainByTypeAndTag.get(terrain.id);

                // Count total pieces for this terrain
                const totalPieces = terrainPieces
                  ? Object.values(terrainPieces).reduce((sum, arr) => sum + arr.length, 0)
                  : 0;

                const isTerrainExpanded = isSearching || expandedTerrainTypes.has(terrainId);

                return (
                  <div key={terrainId} className="border border-gray-700 rounded-lg overflow-hidden">
                    {/* Terrain Type Header */}
                    <button
                      onClick={() => toggleTerrainType(terrainId)}
                      className="w-full flex items-center gap-2 px-2 py-2 hover:bg-gray-700/50 transition-colors"
                      style={{ backgroundColor: `${terrain.color}15` }}
                    >
                      {isTerrainExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-lg">{terrain.icon}</span>
                      <span className="text-sm font-medium text-white">{terrain.name}</span>
                      <span className="text-xs text-gray-400 ml-auto">({totalPieces})</span>
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: terrain.color }}
                      />
                    </button>

                    {/* Tag Categories within Terrain (Grouped View) */}
                    {isTerrainExpanded && showTagGroups && (
                      <div className="border-t border-gray-700 bg-gray-800/50">
                        {totalPieces === 0 && (
                          <div className="text-center py-4 px-3 text-gray-500 text-xs">
                            No pieces for this terrain yet.
                            <br />
                            Go to Settings → Inventory to add pieces.
                          </div>
                        )}
                        {terrainPieces && TERRAIN_TAG_CATEGORIES.map((category) => {
                          const categoryPieces = terrainPieces[category.id] || [];
                          if (categoryPieces.length === 0) return null;

                          const subCategoryKey = `${terrainId}:${category.id}`;
                          const isSubCategoryExpanded = isSearching || expandedTerrainSubCategories.has(subCategoryKey);

                          return (
                            <div key={category.id} className="border-b border-gray-700/50 last:border-b-0">
                              <button
                                onClick={() => toggleTerrainSubCategory(terrainId, category.id)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-700/30 transition-colors"
                              >
                                {isSubCategoryExpanded ? (
                                  <ChevronDown className="h-3 w-3 text-gray-500" />
                                ) : (
                                  <ChevronRight className="h-3 w-3 text-gray-500" />
                                )}
                                <span className="text-sm">{category.icon}</span>
                                <span className="text-xs text-gray-400">{category.name}</span>
                                <span className="text-xs text-gray-500">({categoryPieces.length})</span>
                              </button>

                              {isSubCategoryExpanded && (
                                <div className="space-y-1 px-2 pb-2">
                                  {categoryPieces.map((piece) => {
                                    const totalUsed = getTotalUsed(piece.id);
                                    const available = piece.quantity - totalUsed;
                                    const isSelected = selectedPieceId === piece.id;
                                    const isOverused = available < 0;

                                    return (
                                      <Card
                                        key={piece.id}
                                        onMouseDown={(e) => handleMouseDown(e, piece.id)}
                                        className={`cursor-grab active:cursor-grabbing transition-all select-none ${
                                          isSelected ? 'ring-2 ring-blue-500' : ''
                                        } ${isOverused ? 'border-red-500 bg-red-950/30' : 'hover:bg-gray-700'}`}
                                        style={{
                                          borderLeft: `4px solid ${isOverused ? '#ef4444' : terrain.color}`,
                                        }}
                                      >
                                        <CardContent className="p-2">
                                          <div className="flex items-center gap-2">
                                            {/* Visual preview */}
                                            <PiecePreview
                                              piece={piece}
                                              terrainColor={terrain.color}
                                              terrainTypes={terrainTypes}
                                            />
                                            <div className="flex-1 min-w-0">
                                              <h3 className={`font-medium text-sm truncate ${isOverused ? 'text-red-300' : 'text-white'}`}>
                                                {piece.size.label}
                                                {piece.isDiagonal && ' △'}
                                              </h3>
                                              <p className="text-xs text-gray-500">
                                                {piece.elevation && (piece.elevation.nw !== 0 || piece.elevation.ne !== 0 || piece.elevation.sw !== 0 || piece.elevation.se !== 0)
                                                  ? `↗ ${Math.max(piece.elevation.nw, piece.elevation.ne, piece.elevation.sw, piece.elevation.se)}"`
                                                  : ''}
                                              </p>
                                            </div>
                                            <div className="text-right ml-2">
                                              <span className={`text-sm font-bold ${available > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {available}
                                              </span>
                                              <span className="text-xs text-gray-500">/{piece.quantity}</span>
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Flat View (without tag groups) */}
                    {isTerrainExpanded && !showTagGroups && (
                      <div className="border-t border-gray-700 bg-gray-800/50 space-y-1 p-2">
                        {totalPieces === 0 && (
                          <div className="text-center py-4 px-3 text-gray-500 text-xs">
                            No pieces for this terrain yet.
                            <br />
                            Go to Settings → Inventory to add pieces.
                          </div>
                        )}
                        {/* Get all pieces for this terrain, flattened */}
                        {terrainPieces && Object.values(terrainPieces).flat().map((piece) => {
                          const totalUsed = getTotalUsed(piece.id);
                          const available = piece.quantity - totalUsed;
                          const isSelected = selectedPieceId === piece.id;
                          const isOverused = available < 0;

                          return (
                            <Card
                              key={piece.id}
                              onMouseDown={(e) => handleMouseDown(e, piece.id)}
                              className={`cursor-grab active:cursor-grabbing transition-all select-none ${
                                isSelected ? 'ring-2 ring-blue-500' : ''
                              } ${isOverused ? 'border-red-500 bg-red-950/30' : 'hover:bg-gray-700'}`}
                              style={{
                                borderLeft: `4px solid ${isOverused ? '#ef4444' : terrain.color}`,
                              }}
                            >
                              <CardContent className="p-2">
                                <div className="flex items-center gap-2">
                                  {/* Visual preview */}
                                  <PiecePreview
                                    piece={piece}
                                    terrainColor={terrain.color}
                                    terrainTypes={terrainTypes}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <h3 className={`font-medium text-sm truncate ${isOverused ? 'text-red-300' : 'text-white'}`}>
                                      {piece.size.label}
                                      {piece.isDiagonal && ' △'}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                      {piece.elevation && (piece.elevation.nw !== 0 || piece.elevation.ne !== 0 || piece.elevation.sw !== 0 || piece.elevation.se !== 0)
                                        ? `↗ ${Math.max(piece.elevation.nw, piece.elevation.ne, piece.elevation.sw, piece.elevation.se)}"`
                                        : ''}
                                    </p>
                                  </div>
                                  <div className="text-right ml-2">
                                    <span className={`text-sm font-bold ${available > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {available}
                                    </span>
                                    <span className="text-xs text-gray-500">/{piece.quantity}</span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* PROPS MODE CONTENT */}
        {editMode === 'props' && (
          <ScrollArea className="flex-1 min-h-0 custom-scrollbar">
            <div className="p-2 space-y-4">
              {PROP_CATEGORIES.map((category) => {
                const categoryProps = propsByCategory[category.id] || [];
                if (categoryProps.length === 0 && category.id !== 'custom') return null;

                const isExpanded = isSearching || expandedPropCategories.has(category.id);

                return (
                  <div key={category.id}>
                    <button
                      onClick={() => togglePropCategory(category.id)}
                      className="w-full flex items-center gap-2 mb-1 px-1 py-1 rounded hover:bg-gray-700/50 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                      <span className="text-lg">{category.icon}</span>
                      <span className="text-xs font-medium text-gray-400">{category.name}</span>
                      <span className="text-xs text-gray-500">({categoryProps.length})</span>
                    </button>
                    {isExpanded && (
                      <div className="space-y-1 ml-2">
                        {categoryProps.map((prop) => {
                          const isSelected = selectedPieceId === prop.id;
                          const isCustom = customProps.some((p) => p.id === prop.id);

                          return (
                            <Card
                              key={prop.id}
                              onMouseDown={(e) => handleMouseDown(e, prop.id)}
                              className={`cursor-grab active:cursor-grabbing transition-all select-none ${
                                isSelected ? 'ring-2 ring-blue-500' : 'hover:bg-gray-700'
                              }`}
                              style={{
                                borderLeft: '4px solid #6366f1',
                              }}
                            >
                              <CardContent className="p-2">
                                <div className="flex items-center gap-2">
                                  {prop.propImage ? (
                                    <img
                                      src={prop.propImage}
                                      alt={prop.name}
                                      className="w-8 h-8 object-cover rounded"
                                    />
                                  ) : (
                                    <span className="text-2xl">{prop.propEmoji}</span>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-sm text-white truncate">
                                      {prop.name}
                                    </h3>
                                    <p className="text-xs text-gray-400">
                                      {prop.size.label}
                                    </p>
                                  </div>
                                  {isCustom && (
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-gray-500 hover:text-blue-400"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditProp(prop);
                                        }}
                                        title="Edit prop"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-gray-500 hover:text-red-400"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeCustomProp(prop.id);
                                        }}
                                        title="Delete prop"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                        {category.id === 'custom' && categoryProps.length === 0 && (
                          <div className="text-center py-4 text-gray-500 text-xs">
                            No custom props yet.
                            <br />
                            Click &quot;New&quot; to create one.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <Separator />

        {/* Stats footer */}
        <div className="p-3 bg-gray-900">
          <div className="text-xs text-gray-400">
            <div className="flex justify-between">
              <span>Pieces on map:</span>
              <span className="text-white">{placedPieces.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Current level:</span>
              <span className="text-white">
                {currentLevel === 0
                  ? 'Ground'
                  : currentLevel > 0
                  ? `Floor ${currentLevel}`
                  : `Basement ${Math.abs(currentLevel)}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Mode:</span>
              <span className="text-white capitalize">{editMode}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`absolute top-1/2 -translate-y-1/2 w-6 h-16 bg-gray-800 hover:bg-gray-700 border border-gray-600 border-l-0 rounded-r-lg flex items-center justify-center transition-all duration-300 z-10 ${
          isOpen ? 'left-72' : 'left-0'
        }`}
        title={isOpen ? 'Hide sidebar' : 'Show sidebar'}
      >
        {isOpen ? (
          <ChevronLeft className="w-4 h-4 text-gray-300" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-300" />
        )}
      </button>

      {/* Create Custom Prop Dialog */}
      <Dialog open={showCreatePropDialog} onOpenChange={setShowCreatePropDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Custom Prop</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Name */}
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">Name</label>
              <input
                type="text"
                value={newPropName}
                onChange={(e) => setNewPropName(e.target.value)}
                placeholder="Enter prop name..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Image or Emoji */}
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">
                Image or Emoji
              </label>

              {/* Custom Image Upload */}
              <div className="mb-3">
                <div className="flex items-center gap-3">
                  {newPropImage ? (
                    <div className="relative">
                      <img
                        src={newPropImage}
                        alt="Prop preview"
                        className="w-16 h-16 object-cover rounded-lg border border-gray-600"
                      />
                      <button
                        type="button"
                        onClick={() => setNewPropImage(null)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-pointer transition-colors">
                      <Upload className="h-4 w-4" />
                      <span className="text-sm">Upload Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePropImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                  {!newPropImage && (
                    <span className="text-gray-500 text-sm">or select an emoji below</span>
                  )}
                </div>
              </div>

              {/* Emoji selector (only shown if no custom image) */}
              {!newPropImage && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-400">Selected:</span>
                    <span className="text-2xl">{newPropEmoji}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto bg-gray-900 p-2 rounded-lg">
                    {COMMON_PROP_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewPropEmoji(emoji)}
                        className={`text-xl p-1 rounded hover:bg-gray-700 ${
                          newPropEmoji === emoji ? 'bg-blue-600' : ''
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">Category</label>
              <div className="flex flex-wrap gap-2">
                {PROP_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setNewPropCategory(cat.id)}
                    className={`px-3 py-1 rounded text-sm ${
                      newPropCategory === cat.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Size */}
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">Size (D&D)</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(PROP_SIZES).map(([key, size]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setNewPropSize(key)}
                    className={`px-3 py-1 rounded text-sm ${
                      newPropSize === key
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreatePropDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProp} disabled={!newPropName.trim()}>
              Create Prop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Custom Prop Dialog */}
      <Dialog open={showEditPropDialog} onOpenChange={(open) => {
        setShowEditPropDialog(open);
        if (!open) {
          setEditingProp(null);
          setNewPropName('');
          setNewPropEmoji('👤');
          setNewPropImage(null);
          setNewPropCategory('custom');
          setNewPropSize('medium');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Prop</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Name */}
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">Name</label>
              <input
                type="text"
                value={newPropName}
                onChange={(e) => setNewPropName(e.target.value)}
                placeholder="Enter prop name..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Image or Emoji */}
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">
                Image or Emoji
              </label>

              {/* Custom Image Upload */}
              <div className="mb-3">
                <div className="flex items-center gap-3">
                  {newPropImage ? (
                    <div className="relative">
                      <img
                        src={newPropImage}
                        alt="Prop preview"
                        className="w-16 h-16 object-cover rounded-lg border border-gray-600"
                      />
                      <button
                        type="button"
                        onClick={() => setNewPropImage(null)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-pointer transition-colors">
                      <Upload className="h-4 w-4" />
                      <span className="text-sm">Upload Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePropImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                  {!newPropImage && (
                    <span className="text-gray-500 text-sm">or select an emoji below</span>
                  )}
                </div>
              </div>

              {/* Emoji selector (only shown if no custom image) */}
              {!newPropImage && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-400">Selected:</span>
                    <span className="text-2xl">{newPropEmoji}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto bg-gray-900 p-2 rounded-lg">
                    {COMMON_PROP_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewPropEmoji(emoji)}
                        className={`text-xl p-1 rounded hover:bg-gray-700 ${
                          newPropEmoji === emoji ? 'bg-blue-600' : ''
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">Category</label>
              <div className="flex flex-wrap gap-2">
                {PROP_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setNewPropCategory(cat.id)}
                    className={`px-3 py-1 rounded text-sm ${
                      newPropCategory === cat.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Size */}
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">Size (D&D)</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(PROP_SIZES).map(([key, size]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setNewPropSize(key)}
                    className={`px-3 py-1 rounded text-sm ${
                      newPropSize === key
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditPropDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditedProp} disabled={!newPropName.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Props Dialog */}
      <AIPropsDialog />

      {/* Campaign Analyzer Dialog */}
      <CampaignAnalyzerDialog
        open={showCampaignAnalyzer}
        onOpenChange={setShowCampaignAnalyzer}
      />
    </div>
  );
}
