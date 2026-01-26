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
import { Save, Loader2, FilePlus, Download, ChevronDown, Search, FolderOpen, FileText, Box, Grid2X2, Eye, Settings2, Trash2, ZoomIn, ZoomOut, RotateCcw, Grid3X3, Magnet, Lock, Unlock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { generateThumbnail } from '@/lib/stageRef';
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

export function Toolbar() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [showExportReportDialog, setShowExportReportDialog] = useState(false);
  const mapSelectorRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    mapName,
    setMapName,
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
  } = useMapStore();

  const { saveMap, savedMaps, fetchMaps, loadMap } = useMapInventoryStore();
  const { terrainTypes, fetchTerrainTypes, getModularPieces } = useInventoryStore();

  // Fetch maps and terrain types on mount
  useEffect(() => {
    fetchMaps();
    fetchTerrainTypes();
  }, [fetchMaps, fetchTerrainTypes]);

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
    if (placedPieces.length > 0 && currentMapId !== mapId) {
      if (!confirm('Load this map? Unsaved changes will be lost.')) {
        return;
      }
    }
    const map = await loadMap(mapId);
    if (map) {
      loadMapData(map, map.id);
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

      // Generate snapshot from canvas (always saved separately from custom thumbnail)
      const snapshot = generateThumbnail();

      const mapData = getMapDataForSave();
      const mapDataWithSnapshot = {
        ...mapData,
        snapshot: snapshot || undefined,
      };

      const savedMap = await saveMap(mapDataWithSnapshot, currentMapId || undefined);
      if (savedMap && !currentMapId) {
        setCurrentMapId(savedMap.id);
      }
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

  // Build current map data for the export report dialog
  const currentMapData: SavedMap = useMemo(() => {
    const mapData = getMapDataForSave();
    const snapshot = generateThumbnail();
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
    if (placedPieces.length > 0) {
      if (!confirm('Start a new map? Unsaved changes will be lost.')) {
        return;
      }
    }
    resetToNewMap();
    router.push('/designer');
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
              className="gap-1"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {currentMapId ? 'Save' : 'Save'}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {currentMapId ? 'Save changes' : 'Save as new map'}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
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
          <DialogFooter className="flex gap-2 sm:gap-0">
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
      />
    </TooltipProvider>
  );
}
