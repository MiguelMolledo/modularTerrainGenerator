'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMapInventoryStore } from '@/store/mapInventoryStore';
import { useMapStore } from '@/store/mapStore';
import { Map, FolderOpen, Plus, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { DEFAULT_MAP_WIDTH, DEFAULT_MAP_HEIGHT, DEFAULT_LEVELS } from '@/config/terrain';

export default function Home() {
  const router = useRouter();
  const { savedMaps, fetchMaps, isLoading, saveMap } = useMapInventoryStore();
  const { loadMapData } = useMapStore();
  const [hasFetched, setHasFetched] = useState(false);
  const [showNewMapDialog, setShowNewMapDialog] = useState(false);
  const [newMapName, setNewMapName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!hasFetched) {
      fetchMaps();
      setHasFetched(true);
    }
  }, [fetchMaps, hasFetched]);

  const handleNewMapClick = () => {
    setNewMapName('');
    setShowNewMapDialog(true);
  };

  const handleCreateMap = async () => {
    if (!newMapName.trim()) return;

    setIsCreating(true);
    try {
      const mapData = {
        name: newMapName.trim(),
        mapWidth: DEFAULT_MAP_WIDTH,
        mapHeight: DEFAULT_MAP_HEIGHT,
        levels: DEFAULT_LEVELS,
        placedPieces: [],
      };

      const savedMap = await saveMap(mapData);
      if (savedMap) {
        loadMapData(savedMap, savedMap.id);
        router.push(`/designer?mapId=${savedMap.id}`);
      }
    } finally {
      setIsCreating(false);
      setShowNewMapDialog(false);
    }
  };

  const recentMaps = savedMaps.slice(0, 4);

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-gray-900">
      {/* Hero section */}
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Modular Terrain Creator
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            Design and manage your tabletop terrain layouts with ease
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="w-full sm:w-auto" onClick={handleNewMapClick}>
              <Plus className="h-5 w-5 mr-2" />
              New Map
            </Button>
            <Link href="/maps">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                <FolderOpen className="h-5 w-5 mr-2" />
                My Maps
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent maps section */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-400" />
            Recent Maps
          </h2>
          {savedMaps.length > 4 && (
            <Link href="/maps" className="text-sm text-blue-400 hover:text-blue-300">
              View all ({savedMaps.length})
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : recentMaps.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentMaps.map((map) => (
              <Link key={map.id} href={`/designer?mapId=${map.id}`}>
                <Card className="hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer h-full">
                  <div className="h-24 bg-gray-800 flex items-center justify-center">
                    {map.thumbnail ? (
                      <img
                        src={map.thumbnail}
                        alt={map.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Map className="h-8 w-8 text-gray-600" />
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium text-white text-sm truncate">
                      {map.name}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {map.placedPieces.length} pieces
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="bg-gray-800/50 border-dashed">
            <CardContent className="py-12 text-center">
              <Map className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg text-gray-400 mb-2">No maps yet</h3>
              <p className="text-gray-500 mb-4">
                Create your first terrain map to get started
              </p>
              <Button onClick={handleNewMapClick}>
                <Plus className="h-4 w-4 mr-2" />
                Create Map
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

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

      {/* Features section */}
      <div className="max-w-6xl mx-auto px-4 py-12 border-t border-gray-800">
        <h2 className="text-xl font-semibold text-white mb-6 text-center">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gray-800/50">
            <CardContent className="p-6 text-center">
              <div className="text-3xl mb-3">🎨</div>
              <h3 className="font-medium text-white mb-2">Visual Designer</h3>
              <p className="text-sm text-gray-400">
                Drag and drop terrain pieces with real-time preview
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gray-800/50">
            <CardContent className="p-6 text-center">
              <div className="text-3xl mb-3">📐</div>
              <h3 className="font-medium text-white mb-2">Snap to Grid</h3>
              <p className="text-sm text-gray-400">
                Precise placement with magnetic snapping
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gray-800/50">
            <CardContent className="p-6 text-center">
              <div className="text-3xl mb-3">☁️</div>
              <h3 className="font-medium text-white mb-2">Cloud Storage</h3>
              <p className="text-sm text-gray-400">
                Save your maps to the cloud with Supabase
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
