'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useMapStore } from '@/store/mapStore';
import { useMapInventoryStore } from '@/store/mapInventoryStore';
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
import { Save, Loader2, FilePlus, Download, ChevronDown, Search, FolderOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { generateThumbnail } from '@/lib/stageRef';

export function Toolbar() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
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
  } = useMapStore();

  const { saveMap, savedMaps, fetchMaps, loadMap } = useMapInventoryStore();

  // Fetch maps on mount
  useEffect(() => {
    fetchMaps();
  }, [fetchMaps]);

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
      <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center px-4 gap-4">
        {/* Map name */}
        <input
          type="text"
          value={mapName}
          onChange={(e) => setMapName(e.target.value)}
          className="bg-transparent border-b border-transparent hover:border-gray-600 focus:border-blue-500 outline-none text-white font-semibold text-lg px-1"
        />

        <Separator orientation="vertical" className="h-8" />

        {/* Level selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Level:</span>
          <div className="flex gap-1">
            {levels.map((level) => (
              <Tooltip key={level}>
                <TooltipTrigger asChild>
                  <Button
                    variant={currentLevel === level ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentLevel(level)}
                    className="w-8 h-8 p-0"
                  >
                    {level === 0 ? 'G' : level > 0 ? level : `B${Math.abs(level)}`}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {level === 0
                    ? 'Ground floor'
                    : level > 0
                    ? `Floor ${level}`
                    : `Basement ${Math.abs(level)}`}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                −
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom out</TooltipContent>
          </Tooltip>

          <span className="text-sm text-gray-400 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                +
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom in</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleResetView}>
                ⟲
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset view</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Grid controls */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={gridConfig.showGrid ? 'default' : 'outline'}
                size="sm"
                onClick={toggleGrid}
              >
                Grid
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle grid visibility</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={gridConfig.snapToGrid ? 'default' : 'outline'}
                size="sm"
                onClick={toggleSnapToGrid}
              >
                Snap
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle snap to grid</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isViewLocked ? 'default' : 'outline'}
                size="sm"
                onClick={toggleViewLock}
              >
                {isViewLocked ? '🔒' : '🔓'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isViewLocked ? 'Unlock view (allow pan)' : 'Lock view (prevent pan)'}
            </TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Rotation indicator */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            R to rotate
          </span>
          <span className="text-xs text-white bg-gray-700 px-2 py-1 rounded">
            {currentRotation}°
          </span>
        </div>

        <div className="flex-1" />

        {/* Map Selector Dropdown */}
        <div className="relative" ref={mapSelectorRef}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMapSelector(!showMapSelector)}
            className="min-w-[140px] justify-between"
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            <span className="truncate max-w-[100px]">
              {savedMaps.length} Maps
            </span>
            <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showMapSelector ? 'rotate-180' : ''}`} />
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
            <Button variant="outline" size="sm" onClick={handleNewMap}>
              <FilePlus className="h-4 w-4 mr-1" />
              New
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
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              {currentMapId ? 'Save' : 'Save New'}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {currentMapId ? 'Save changes' : 'Save as new map'}
          </TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-8" />

        {/* Danger zone */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="destructive" size="sm" onClick={clearMap}>
              Clear Map
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remove all pieces from the map</TooltipContent>
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
    </TooltipProvider>
  );
}
