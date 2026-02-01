'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMapStore } from '@/store/mapStore';
import { useMapInventoryStore } from '@/store/mapInventoryStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ExportReportDialog } from '@/components/maps/ExportReportDialog';
import { GenerateArtDialog } from './GenerateArtDialog';
import { AILayoutDialog } from './AILayoutDialog';
import { Save, Loader2, FilePlus, Download, ChevronDown, Search, FolderOpen, FileText, Box, Grid2X2, Grid3X3, Eye, EyeOff, Settings2, Trash2, ZoomIn, ZoomOut, RotateCcw, Magnet, Lock, Unlock, Ruler, Layers, Mountain, Users, Wand2, Undo2, Redo2, Sparkles } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useRouter } from 'next/navigation';
import { generateThumbnail, generateFullMapSnapshot } from '@/lib/stageRef';
import { clearLastMapId } from './UnsavedChangesGuard';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import type { ModularPiece, SavedMap } from '@/types';

// Dropdown menu component
function DropdownMenu({
  trigger,
  children,
  align = 'left'
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div
          className={`absolute top-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 min-w-[180px] py-1 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          onClick={() => setIsOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  active,
  shortcut,
  danger
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  active?: boolean;
  shortcut?: string;
  danger?: boolean;
}) {
  return (
    <button
      className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
        danger
          ? 'text-red-400 hover:bg-red-950'
          : active
            ? 'text-blue-400 bg-blue-950/50'
            : 'text-white hover:bg-gray-700'
      }`}
      onClick={onClick}
    >
      {Icon && <Icon className="h-4 w-4" />}
      <span className="flex-1">{label}</span>
      {shortcut && <span className="text-xs text-gray-500">{shortcut}</span>}
      {active && <span className="text-xs text-blue-400">✓</span>}
    </button>
  );
}

function MenuDivider() {
  return <hr className="my-1 border-gray-700" />;
}

// Detect Mac platform for keyboard shortcut display
const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const modKey = isMac ? '⌘' : 'Ctrl';

export function Toolbar() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [showExportReportDialog, setShowExportReportDialog] = useState(false);
  const [showGenerateArtDialog, setShowGenerateArtDialog] = useState(false);
  const [showAILayoutDialog, setShowAILayoutDialog] = useState(false);
  const [showMapSizeDialog, setShowMapSizeDialog] = useState(false);
  const [showNewMapDialog, setShowNewMapDialog] = useState(false);
  const [newMapName, setNewMapName] = useState('');
  const [tempMapWidth, setTempMapWidth] = useState(60);
  const [tempMapHeight, setTempMapHeight] = useState(60);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const mapSelectorRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    mapName,
    setMapName,
    mapWidth,
    mapHeight,
    setMapDimensions,
    levels,
    currentLevel,
    setCurrentLevel,
    zoom,
    setZoom,
    gridConfig,
    toggleGrid,
    toggleSnapToGrid,
    toggleViewLock,
    isViewLocked,
    clearMap,
    setPan,
    currentRotation,
    currentMapId,
    getMapDataForSave,
    setCurrentMapId,
    placedPieces,
    resetToNewMap,
    loadMapData,
    is3DMode,
    toggle3DMode,
    markAsSaved,
    hasUnsavedChanges,
    showReferenceLevels,
    referenceLevelOpacity,
    setShowReferenceLevels,
    setReferenceLevelOpacity,
    editMode,
    setEditMode,
    showTerrain,
    showProps,
    setShowTerrain,
    setShowProps,
  } = useMapStore();

  const { saveMap, savedMaps, fetchMaps, loadMap, deleteMap } = useMapInventoryStore();
  const { terrainTypes, shapes, fetchTerrainTypes, fetchShapes, getModularPieces } = useInventoryStore();
  const { undo, redo, canUndo, canRedo, undoDescription, redoDescription } = useUndoRedo();

  // Fetch maps, terrain types, and shapes on mount
  useEffect(() => {
    fetchMaps();
    fetchTerrainTypes();
    fetchShapes();
  }, [fetchMaps, fetchTerrainTypes, fetchShapes]);

  // Get available pieces from inventory for report
  const availablePieces: ModularPiece[] = useMemo(() => {
    return getModularPieces();
  }, [getModularPieces]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (showMapSelector && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showMapSelector]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mapSelectorRef.current && !mapSelectorRef.current.contains(e.target as Node)) {
        setShowMapSelector(false);
        setMapSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter maps by search query
  const filteredMaps = savedMaps.filter((map) =>
    map.name.toLowerCase().includes(mapSearchQuery.toLowerCase())
  );

  const handleSelectMap = async (mapId: string) => {
    if (hasUnsavedChanges && currentMapId !== mapId) {
      if (!confirm('Load this map? You have unsaved changes that will be lost.')) {
        return;
      }
    }
    const map = await loadMap(mapId);
    if (map) {
      loadMapData(map, map.id);
      // Update URL to match the selected map
      router.replace(`/designer?mapId=${mapId}`);
    }
    setShowMapSelector(false);
    setMapSearchQuery('');
  };

  const handleZoomIn = () => setZoom(zoom + 0.1);
  const handleZoomOut = () => setZoom(zoom - 0.1);
  const handleResetView = () => {
    setZoom(1);
    setPan(20, 20);
  };

  const handleSaveClick = () => {
    if (currentMapId) {
      // Existing map - save directly
      handleSave();
    } else {
      // New map - show dialog
      setSaveName(mapName);
      setShowSaveDialog(true);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update map name if changed in dialog
      if (saveName && saveName !== mapName) {
        setMapName(saveName);
      }

      // Generate snapshot of the FULL map (not just visible area)
      const snapshot = generateFullMapSnapshot();

      const mapData = getMapDataForSave();
      const mapDataWithSnapshot = {
        ...mapData,
        snapshot: snapshot || undefined,
      };

      const savedMap = await saveMap(mapDataWithSnapshot, currentMapId || undefined);
      if (savedMap && !currentMapId) {
        setCurrentMapId(savedMap.id);
      }
      // Mark map as saved (no unsaved changes)
      markAsSaved();
      setShowSaveDialog(false);
    } catch (error) {
      console.error('Failed to save map:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    const mapData = getMapDataForSave();
    const exportData = {
      ...mapData,
      name: saveName || mapName,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(saveName || mapName).replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportReport = () => {
    setShowExportReportDialog(true);
  };

  const handleDeleteMap = async () => {
    if (!currentMapId) return;

    setIsDeleting(true);
    try {
      const success = await deleteMap(currentMapId);
      if (success) {
        // Clear the lastMapId so UnsavedChangesGuard doesn't try to load it
        clearLastMapId();
        // Reset to a new empty map
        resetToNewMap();
        // Navigate to designer without mapId
        router.replace('/designer');
        setShowDeleteConfirm(false);
        setShowSaveDialog(false);
      }
    } catch (error) {
      console.error('Failed to delete map:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Build current map data for the export report dialog
  const currentMapData: SavedMap = useMemo(() => {
    const mapData = getMapDataForSave();
    const snapshot = generateFullMapSnapshot();
    return {
      id: currentMapId || 'current',
      name: mapName,
      description: mapData.description,
      mapWidth: mapData.mapWidth,
      mapHeight: mapData.mapHeight,
      levels: mapData.levels,
      placedPieces: mapData.placedPieces,
      gridConfig: mapData.gridConfig,
      snapshot: snapshot || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [currentMapId, mapName, getMapDataForSave]);

  const handleNewMap = () => {
    if (hasUnsavedChanges) {
      if (!confirm('Start a new map? You have unsaved changes that will be lost.')) {
        return;
      }
    }
    setNewMapName('');
    setShowNewMapDialog(true);
  };

  const handleCreateNewMap = () => {
    clearLastMapId();
    resetToNewMap();
    if (newMapName.trim()) {
      setMapName(newMapName.trim());
    }
    setShowNewMapDialog(false);
    router.push('/designer');
  };

  const handleOpenMapSizeDialog = () => {
    setTempMapWidth(mapWidth);
    setTempMapHeight(mapHeight);
    setShowMapSizeDialog(true);
  };

  const handleSaveMapSize = () => {
    setMapDimensions(tempMapWidth, tempMapHeight);
    setShowMapSizeDialog(false);
  };

  return (
    <TooltipProvider>
      <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center px-3 gap-2">
        {/* Map name */}
        <input
          type="text"
          value={mapName}
          onChange={(e) => setMapName(e.target.value)}
          className="bg-transparent border-b border-transparent hover:border-gray-600 focus:border-blue-500 outline-none text-white font-semibold text-base px-1 min-w-0 max-w-[150px]"
        />

        <Separator orientation="vertical" className="h-8" />

        {/* Undo/Redo Buttons */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={undo}
                disabled={!canUndo}
                className="h-7 px-2"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {canUndo ? `Undo: ${undoDescription}` : 'Nothing to undo'} ({modKey}+Z)
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={redo}
                disabled={!canRedo}
                className="h-7 px-2"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {canRedo ? `Redo: ${redoDescription}` : 'Nothing to redo'} ({modKey}+Shift+Z)
            </TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Edit Mode Toggle (Terrain vs Props) */}
        <div className="flex items-center gap-0.5 bg-gray-700 rounded-md p-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={editMode === 'terrain' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setEditMode('terrain')}
                className={`px-2 h-7 ${editMode === 'terrain' ? '' : 'text-gray-400 hover:text-white'}`}
              >
                <Mountain className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Terrain mode - Edit terrain pieces</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={editMode === 'props' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setEditMode('props')}
                className={`px-2 h-7 ${editMode === 'props' ? '' : 'text-gray-400 hover:text-white'}`}
              >
                <Users className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Props mode - Edit NPCs, furniture, items</TooltipContent>
          </Tooltip>
        </div>

        {/* Visibility Toggles */}
        <div className="flex items-center gap-0.5 bg-gray-700 rounded-md p-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showTerrain ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setShowTerrain(!showTerrain)}
                className={`px-2 h-7 relative ${showTerrain ? '' : 'text-gray-400 hover:text-white'}`}
              >
                <Mountain className="h-4 w-4" />
                {!showTerrain && <EyeOff className="h-3 w-3 absolute -right-0.5 -bottom-0.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{showTerrain ? 'Hide terrain' : 'Show terrain'}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showProps ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setShowProps(!showProps)}
                className={`px-2 h-7 relative ${showProps ? '' : 'text-gray-400 hover:text-white'}`}
              >
                <Users className="h-4 w-4" />
                {!showProps && <EyeOff className="h-3 w-3 absolute -right-0.5 -bottom-0.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{showProps ? 'Hide props' : 'Show props'}</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Level selector - compact */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400 hidden sm:inline">Level:</span>
          <div className="flex gap-0.5">
            {levels.map((level) => (
              <Button
                key={level}
                variant={currentLevel === level ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentLevel(level)}
                className="w-7 h-7 p-0 text-xs"
                title={level === 0 ? 'Ground floor' : level > 0 ? `Floor ${level}` : `Basement ${Math.abs(level)}`}
              >
                {level === 0 ? 'G' : level > 0 ? level : `B${Math.abs(level)}`}
              </Button>
            ))}
          </div>
        </div>

        {/* Reference Levels Toggle + Opacity */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showReferenceLevels ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setShowReferenceLevels(!showReferenceLevels)}
                className="h-7 px-2"
                title={showReferenceLevels ? 'Hide other levels' : 'Show other levels as reference'}
              >
                <Layers className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {showReferenceLevels ? 'Hide' : 'Show'} other levels as reference
            </TooltipContent>
          </Tooltip>

          {showReferenceLevels && (
            <div className="flex items-center gap-2">
              <Slider
                value={[referenceLevelOpacity * 100]}
                onValueChange={([v]) => setReferenceLevelOpacity(v / 100)}
                min={5}
                max={80}
                step={5}
                className="w-16"
              />
              <span className="text-xs text-gray-400 w-6">
                {Math.round(referenceLevelOpacity * 100)}%
              </span>
            </div>
          )}
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* View Dropdown */}
        <DropdownMenu
          trigger={
            <Button variant="outline" size="sm" className="gap-1">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">View</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          }
        >
          <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-700">
            Zoom: {Math.round(zoom * 100)}%
          </div>
          <MenuItem icon={ZoomIn} label="Zoom In" onClick={handleZoomIn} shortcut="+" />
          <MenuItem icon={ZoomOut} label="Zoom Out" onClick={handleZoomOut} shortcut="-" />
          <MenuItem icon={RotateCcw} label="Reset View" onClick={handleResetView} />
          <MenuDivider />
          <MenuItem
            icon={isViewLocked ? Lock : Unlock}
            label={isViewLocked ? 'Unlock View' : 'Lock View'}
            onClick={toggleViewLock}
            active={isViewLocked}
          />
        </DropdownMenu>

        {/* Grid Dropdown */}
        <DropdownMenu
          trigger={
            <Button variant="outline" size="sm" className="gap-1">
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Grid</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          }
        >
          <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-700">
            Map: {mapWidth}" × {mapHeight}"
          </div>
          <MenuItem
            icon={Ruler}
            label="Map Size..."
            onClick={handleOpenMapSizeDialog}
          />
          <MenuDivider />
          <MenuItem
            icon={Grid3X3}
            label="Show Grid"
            onClick={toggleGrid}
            active={gridConfig.showGrid}
          />
          <MenuItem
            icon={Magnet}
            label="Snap to Grid"
            onClick={toggleSnapToGrid}
            active={gridConfig.snapToGrid}
          />
          <MenuDivider />
          <MenuItem
            icon={Trash2}
            label="Clear All Pieces"
            onClick={clearMap}
            danger
          />
        </DropdownMenu>

        <Separator orientation="vertical" className="h-8" />

        {/* 2D/3D Toggle - compact */}
        <div className="flex items-center gap-0.5 bg-gray-700 rounded-md p-0.5">
          <Button
            variant={!is3DMode ? 'default' : 'ghost'}
            size="sm"
            onClick={() => is3DMode && toggle3DMode()}
            className={`px-2 h-7 ${!is3DMode ? '' : 'text-gray-400 hover:text-white'}`}
            title="Edit mode (2D)"
          >
            <Grid2X2 className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline text-xs">2D</span>
          </Button>
          <Button
            variant={is3DMode ? 'default' : 'ghost'}
            size="sm"
            onClick={() => !is3DMode && toggle3DMode()}
            className={`px-2 h-7 ${is3DMode ? '' : 'text-gray-400 hover:text-white'}`}
            title="Preview mode (3D)"
          >
            <Box className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline text-xs">3D</span>
          </Button>
        </div>

        {/* Rotation indicator - only on larger screens and 2D mode */}
        {!is3DMode && (
          <div className="hidden md:flex items-center gap-1">
            <span className="text-xs text-gray-500">R:</span>
            <span className="text-xs text-white bg-gray-700 px-1.5 py-0.5 rounded">
              {currentRotation}°
            </span>
          </div>
        )}

        <Separator orientation="vertical" className="h-8" />

        {/* AI Layout button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAILayoutDialog(true)}
              className="gap-1 text-green-400 border-green-600/50 hover:bg-green-900/30"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Layout</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Generate terrain layout with AI</TooltipContent>
        </Tooltip>

        {/* Generate Art button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGenerateArtDialog(true)}
              className="gap-1 text-amber-400 border-amber-600/50 hover:bg-amber-900/30"
            >
              <Wand2 className="h-4 w-4" />
              <span className="hidden sm:inline">Art</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Generate artistic battle map from current layout</TooltipContent>
        </Tooltip>

        <div className="flex-1" />

        {/* Map Selector Dropdown */}
        <div className="relative" ref={mapSelectorRef}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMapSelector(!showMapSelector)}
            className="gap-1"
          >
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline truncate max-w-[80px]">
              {savedMaps.length} Maps
            </span>
            <ChevronDown className={`h-3 w-3 transition-transform ${showMapSelector ? 'rotate-180' : ''}`} />
          </Button>

          {showMapSelector && (
            <div className="absolute right-0 top-full mt-1 w-72 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 overflow-hidden">
              {/* Search input */}
              <div className="p-2 border-b border-gray-700">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={mapSearchQuery}
                    onChange={(e) => setMapSearchQuery(e.target.value)}
                    placeholder="Search maps..."
                    className="w-full bg-gray-700 border border-gray-600 rounded pl-8 pr-3 py-1.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Maps list */}
              <div className="max-h-64 overflow-y-auto">
                {filteredMaps.length === 0 ? (
                  <div className="p-4 text-center text-gray-400 text-sm">
                    {mapSearchQuery ? 'No maps found' : 'No saved maps'}
                  </div>
                ) : (
                  filteredMaps.map((map) => (
                    <button
                      key={map.id}
                      onClick={() => handleSelectMap(map.id)}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-700 transition-colors flex items-center justify-between ${
                        currentMapId === map.id ? 'bg-blue-600/20 border-l-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-white truncate">{map.name}</div>
                        <div className="text-xs text-gray-400">
                          {map.placedPieces.length} pieces
                        </div>
                      </div>
                      {currentMapId === map.id && (
                        <span className="text-xs text-blue-400 ml-2 shrink-0">Active</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* New Map button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" onClick={handleNewMap} className="gap-1">
              <FilePlus className="h-4 w-4" />
              <span className="hidden sm:inline">New</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Start a new map</TooltipContent>
        </Tooltip>

        {/* Save button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveClick}
              disabled={isSaving}
              className={`gap-1 ${hasUnsavedChanges ? 'ring-2 ring-yellow-500' : ''}`}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {currentMapId ? 'Save' : 'Save'}
              </span>
              {hasUnsavedChanges && (
                <span className="w-2 h-2 bg-yellow-500 rounded-full" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {hasUnsavedChanges
              ? 'You have unsaved changes'
              : currentMapId
                ? 'Save changes'
                : 'Save as new map'}
          </TooltipContent>
        </Tooltip>

        {/* Delete Map button - only visible when a map is loaded */}
        {currentMapId && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                className="gap-1 text-red-400 hover:text-red-300 hover:bg-red-950/50 border-red-800"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Delete</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete this map permanently</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={(open) => {
        setShowSaveDialog(open);
        if (!open) setShowDeleteConfirm(false);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Map</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">
                Map Name
              </label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Enter map name..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-sm text-gray-400">
              {placedPieces.length} pieces will be saved
            </p>
          </div>
          {/* Delete confirmation */}
          {showDeleteConfirm && currentMapId && (
            <div className="bg-red-950/50 border border-red-700 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-300 mb-3">
                Are you sure you want to delete this map? This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteMap}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
                  Delete Map
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-wrap gap-2 sm:gap-0">
            {/* Delete button - only for saved maps */}
            {currentMapId && !showDeleteConfirm && (
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 sm:flex-none text-red-400 hover:text-red-300 hover:bg-red-950/50"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleExport}
              className="flex-1 sm:flex-none"
            >
              <Download className="h-4 w-4 mr-1" />
              Export JSON
            </Button>
            <Button
              variant="outline"
              onClick={handleExportReport}
              className="flex-1 sm:flex-none"
            >
              <FileText className="h-4 w-4 mr-1" />
              Export Report
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !saveName.trim()}
              className="flex-1 sm:flex-none"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Report Dialog */}
      <ExportReportDialog
        open={showExportReportDialog}
        onOpenChange={setShowExportReportDialog}
        map={currentMapData}
        availablePieces={availablePieces}
        terrainTypes={terrainTypes}
        shapes={shapes}
      />

      {/* Map Size Dialog */}
      <Dialog open={showMapSizeDialog} onOpenChange={setShowMapSizeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Map Size</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">
                  Width (inches)
                </label>
                <input
                  type="number"
                  value={tempMapWidth}
                  onChange={(e) => setTempMapWidth(Math.max(12, Number(e.target.value)))}
                  min={12}
                  max={200}
                  step={6}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">
                  Height (inches)
                </label>
                <input
                  type="number"
                  value={tempMapHeight}
                  onChange={(e) => setTempMapHeight(Math.max(12, Number(e.target.value)))}
                  min={12}
                  max={200}
                  step={6}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <p className="text-sm text-gray-400">
              Common sizes: 36×36, 48×48, 60×60, 72×48
            </p>
            <div className="flex gap-2 flex-wrap">
              {[
                { w: 36, h: 36 },
                { w: 48, h: 48 },
                { w: 60, h: 60 },
                { w: 72, h: 48 },
                { w: 72, h: 72 },
              ].map(({ w, h }) => (
                <Button
                  key={`${w}x${h}`}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTempMapWidth(w);
                    setTempMapHeight(h);
                  }}
                  className={tempMapWidth === w && tempMapHeight === h ? 'ring-2 ring-blue-500' : ''}
                >
                  {w}×{h}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMapSizeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveMapSize}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Map Dialog */}
      <Dialog open={showNewMapDialog} onOpenChange={setShowNewMapDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Map</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">
                Map Name
              </label>
              <input
                type="text"
                value={newMapName}
                onChange={(e) => setNewMapName(e.target.value)}
                placeholder="Enter map name..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newMapName.trim()) {
                    handleCreateNewMap();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewMapDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateNewMap} disabled={!newMapName.trim()}>
              <FilePlus className="h-4 w-4 mr-1" />
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Art Dialog */}
      <GenerateArtDialog
        open={showGenerateArtDialog}
        onOpenChange={setShowGenerateArtDialog}
      />

      <AILayoutDialog
        open={showAILayoutDialog}
        onOpenChange={setShowAILayoutDialog}
      />

      {/* Delete Map Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="h-5 w-5" />
              Delete Map
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-300">
              Are you sure you want to delete <span className="font-semibold text-white">&quot;{mapName}&quot;</span>?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This action cannot be undone. The map and all its pieces will be permanently deleted.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteMap}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Map
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
