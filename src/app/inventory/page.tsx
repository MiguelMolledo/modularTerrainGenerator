'use client';

import React, { useEffect, useState } from 'react';
import { useInventoryStore } from '@/store/inventoryStore';
import { TerrainTypeList } from '@/components/inventory/TerrainTypeList';
import { TerrainEditor } from '@/components/inventory/TerrainEditor';
import { ShapesOverview } from '@/components/inventory/ShapesOverview';
import { CustomPiecesList } from '@/components/inventory/CustomPiecesList';
import { TemplatesList } from '@/components/inventory/TemplatesList';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ViewMode = 'overview' | 'terrain' | 'custom' | 'templates';

export default function InventoryPage() {
  const { fetchShapes, fetchTerrainTypes, fetchCustomPieces, fetchPieceTemplates, isLoading, error, clearError } = useInventoryStore();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedTerrainId, setSelectedTerrainId] = useState<string | null>(null);

  useEffect(() => {
    fetchShapes();
    fetchTerrainTypes();
    fetchCustomPieces();
    fetchPieceTemplates();
  }, [fetchShapes, fetchTerrainTypes, fetchCustomPieces, fetchPieceTemplates]);

  const handleSelectTerrain = (id: string | null) => {
    setSelectedTerrainId(id);
    setViewMode(id ? 'terrain' : 'overview');
  };

  const handleSelectCustom = () => {
    setSelectedTerrainId(null);
    setViewMode('custom');
  };

  const handleSelectTemplates = () => {
    setSelectedTerrainId(null);
    setViewMode('templates');
  };

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 py-4 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Terrain Inventory</h1>
              <p className="text-sm text-gray-400 mt-1">
                Manage your terrain types, modular pieces, and 3D objects
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchShapes();
                fetchTerrainTypes();
              }}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
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
        {isLoading && !selectedTerrainId ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto" />
              <p className="text-gray-400 mt-4">Loading inventory...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6">
            {/* Left sidebar - terrain type list */}
            <div className="col-span-12 md:col-span-3">
              <TerrainTypeList
                selectedId={selectedTerrainId}
                onSelect={handleSelectTerrain}
                isCustomSelected={viewMode === 'custom'}
                onSelectCustom={handleSelectCustom}
                isTemplatesSelected={viewMode === 'templates'}
                onSelectTemplates={handleSelectTemplates}
              />
            </div>

            {/* Main content - terrain editor, shapes overview, custom pieces, or templates */}
            <div className="col-span-12 md:col-span-9">
              {viewMode === 'terrain' && selectedTerrainId ? (
                <TerrainEditor terrainTypeId={selectedTerrainId} />
              ) : viewMode === 'custom' ? (
                <CustomPiecesList />
              ) : viewMode === 'templates' ? (
                <TemplatesList />
              ) : (
                <ShapesOverview />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
