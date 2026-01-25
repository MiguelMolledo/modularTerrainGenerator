'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMapInventoryStore } from '@/store/mapInventoryStore';
import { useMapStore } from '@/store/mapStore';
import { MapCard } from '@/components/maps/MapCard';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { SavedMap } from '@/types';
import { Plus, RefreshCw, Search, ArrowUpDown, Loader2 } from 'lucide-react';
import { DEFAULT_MAP_WIDTH, DEFAULT_MAP_HEIGHT, DEFAULT_LEVELS } from '@/config/terrain';

type SortOption = 'updated' | 'name' | 'created';

export default function MapsPage() {
  const router = useRouter();
  const { savedMaps, isLoading, error, fetchMaps, clearError, saveMap } = useMapInventoryStore();
  const { loadMapData } = useMapStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [showNewMapDialog, setShowNewMapDialog] = useState(false);
  const [newMapName, setNewMapName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchMaps();
  }, [fetchMaps]);

  const handleNewMapClick = () => {
    setNewMapName('');
    setShowNewMapDialog(true);
  };

  const handleCreateMap = async () => {
    if (!newMapName.trim()) return;

    setIsCreating(true);
    try {
      // Create empty map with the given name
      const mapData = {
        name: newMapName.trim(),
        mapWidth: DEFAULT_MAP_WIDTH,
        mapHeight: DEFAULT_MAP_HEIGHT,
        levels: DEFAULT_LEVELS,
        placedPieces: [],
      };

      const savedMap = await saveMap(mapData);
      if (savedMap) {
        // Load the map into the store and navigate
        loadMapData(savedMap, savedMap.id);
        router.push(`/designer?mapId=${savedMap.id}`);
      }
    } finally {
      setIsCreating(false);
      setShowNewMapDialog(false);
    }
  };

  const handleExport = (map: SavedMap) => {
    const exportData = {
      name: map.name,
      description: map.description,
      mapWidth: map.mapWidth,
      mapHeight: map.mapHeight,
      levels: map.levels,
      placedPieces: map.placedPieces,
      gridConfig: map.gridConfig,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${map.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filter and sort maps
  const filteredMaps = savedMaps
    .filter((map) =>
      map.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'updated':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Map Inventory</h1>
              <p className="text-sm text-gray-400 mt-1">
                {savedMaps.length} map{savedMaps.length !== 1 ? 's' : ''} saved
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchMaps()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={handleNewMapClick}>
                <Plus className="h-4 w-4 mr-2" />
                New Map
              </Button>
            </div>
          </div>

          {/* Search and Sort */}
          <div className="mt-4 flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search maps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="updated">Last Updated</option>
                <option value="created">Date Created</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Error message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 flex justify-between items-center">
            <span className="text-red-200">{error}</span>
            <Button variant="ghost" size="sm" onClick={clearError}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {isLoading && savedMaps.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto" />
              <p className="text-gray-400 mt-4">Loading maps...</p>
            </div>
          </div>
        ) : filteredMaps.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              {searchQuery ? (
                <>
                  <Search className="h-12 w-12 text-gray-600 mx-auto" />
                  <h3 className="text-xl text-gray-400 mt-4">No maps found</h3>
                  <p className="text-gray-500 mt-2">
                    No maps match &quot;{searchQuery}&quot;
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear search
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-4">🗺️</div>
                  <h3 className="text-xl text-gray-400">No maps yet</h3>
                  <p className="text-gray-500 mt-2">
                    Create your first map to get started
                  </p>
                  <Button className="mt-4" onClick={handleNewMapClick}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Map
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredMaps.map((map) => (
              <MapCard key={map.id} map={map} onExport={handleExport} />
            ))}
          </div>
        )}
      </main>

      {/* New Map Dialog */}
      <Dialog open={showNewMapDialog} onOpenChange={setShowNewMapDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Map</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-gray-300 block mb-2">
              Map Name
            </label>
            <input
              type="text"
              value={newMapName}
              onChange={(e) => setNewMapName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newMapName.trim()) {
                  handleCreateMap();
                }
              }}
              placeholder="Enter map name..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewMapDialog(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateMap}
              disabled={isCreating || !newMapName.trim()}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create & Open
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
