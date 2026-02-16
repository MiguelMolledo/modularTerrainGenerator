'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useInventoryStore } from '@/store/inventoryStore';
import { useAIStore } from '@/store/aiStore';
import { useMapStore } from '@/store/mapStore';
import { TerrainTypeList } from '@/components/inventory/TerrainTypeList';
import { TerrainEditor } from '@/components/inventory/TerrainEditor';
import { ShapesOverview } from '@/components/inventory/ShapesOverview';
import { CustomPiecesList } from '@/components/inventory/CustomPiecesList';
import { TemplatesList } from '@/components/inventory/TemplatesList';
import { PieceTypesManager } from '@/components/inventory/PieceTypesManager';
import { PropsInventory } from '@/components/inventory/PropsInventory';
import { AIPropsDialog } from '@/components/map-designer/AIPropsDialog';
import { RefreshCw, Mountain, Boxes } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ModularPiece } from '@/types';

type InventoryTab = 'terrain' | 'props';
type ViewMode = 'overview' | 'terrain' | 'custom' | 'templates' | 'pieceTypes';

export default function InventoryPage() {
  const { fetchShapes, fetchTerrainTypes, fetchCustomPieces, fetchPieceTemplates, isLoading, error, clearError } = useInventoryStore();
  const { setDialogOpen } = useAIStore();
  const { customProps, addCustomProp, updateCustomProp, removeCustomProp } = useMapStore();
  const [activeTab, setActiveTab] = useState<InventoryTab>('terrain');
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedTerrainId, setSelectedTerrainId] = useState<string | null>(null);

  // Custom props handlers - use mapStore actions
  const handleCreateProp = useCallback((prop: ModularPiece) => {
    addCustomProp(prop);
  }, [addCustomProp]);

  const handleUpdateProp = useCallback((updatedProp: ModularPiece) => {
    updateCustomProp(updatedProp.id, updatedProp);
  }, [updateCustomProp]);

  const handleDeleteProp = useCallback((propId: string) => {
    removeCustomProp(propId);
  }, [removeCustomProp]);

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

  const handleSelectPieceTypes = () => {
    setSelectedTerrainId(null);
    setViewMode('pieceTypes');
  };

  const handleTabChange = (tab: InventoryTab) => {
    setActiveTab(tab);
    // Reset view mode when switching tabs
    if (tab === 'terrain') {
      setViewMode('overview');
      setSelectedTerrainId(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border py-4 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {activeTab === 'terrain'
                  ? 'Manage your terrain types, modular pieces, and 3D objects'
                  : 'Manage your props, NPCs, creatures, and items'}
              </p>
            </div>
            {activeTab === 'terrain' && (
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
            )}
          </div>

          {/* Tab Navigation */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => handleTabChange('terrain')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'terrain'
                  ? 'bg-amber-600 text-white'
                  : 'bg-secondary text-muted-foreground hover:bg-accent'
              }`}
            >
              <Mountain className="h-4 w-4" />
              Terrain
            </button>
            <button
              onClick={() => handleTabChange('props')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'props'
                  ? 'bg-purple-600 text-white'
                  : 'bg-secondary text-muted-foreground hover:bg-accent'
              }`}
            >
              <Boxes className="h-4 w-4" />
              Props
            </button>
          </div>
        </div>
      </header>

      {/* Error message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-4 flex justify-between items-center">
            <span className="text-destructive">{error}</span>
            <Button variant="ghost" size="sm" onClick={clearError}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'terrain' ? (
          // Terrain Inventory
          isLoading && !selectedTerrainId ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin mx-auto" />
                <p className="text-muted-foreground mt-4">Loading inventory...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-6">
              {/* Left sidebar - terrain type list */}
              <div className="col-span-12 md:col-span-3">
                <TerrainTypeList
                  selectedId={selectedTerrainId}
                  onSelect={handleSelectTerrain}
                  isPieceTypesSelected={viewMode === 'pieceTypes'}
                  onSelectPieceTypes={handleSelectPieceTypes}
                  isCustomSelected={viewMode === 'custom'}
                  onSelectCustom={handleSelectCustom}
                  isTemplatesSelected={viewMode === 'templates'}
                  onSelectTemplates={handleSelectTemplates}
                />
              </div>

              {/* Main content - terrain editor, shapes overview, custom pieces, templates, or piece types */}
              <div className="col-span-12 md:col-span-9">
                {viewMode === 'terrain' && selectedTerrainId ? (
                  <TerrainEditor terrainTypeId={selectedTerrainId} />
                ) : viewMode === 'custom' ? (
                  <CustomPiecesList />
                ) : viewMode === 'templates' ? (
                  <TemplatesList />
                ) : viewMode === 'pieceTypes' ? (
                  <PieceTypesManager />
                ) : (
                  <ShapesOverview />
                )}
              </div>
            </div>
          )
        ) : (
          // Props Inventory
          <PropsInventory
            onOpenAIDialog={() => setDialogOpen(true)}
            customProps={customProps}
            onCreateProp={handleCreateProp}
            onUpdateProp={handleUpdateProp}
            onDeleteProp={handleDeleteProp}
          />
        )}
      </main>

      {/* AI Props Dialog */}
      <AIPropsDialog />
    </div>
  );
}
