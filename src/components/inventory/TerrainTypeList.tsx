'use client';

import React, { useState } from 'react';
import { useInventoryStore } from '@/store/inventoryStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, Puzzle, LayoutTemplate, Shapes } from 'lucide-react';
import { TerrainFormDialog } from './TerrainFormDialog';

interface TerrainTypeListProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  isCustomSelected?: boolean;
  onSelectCustom?: () => void;
  isTemplatesSelected?: boolean;
  onSelectTemplates?: () => void;
  isPieceTypesSelected?: boolean;
  onSelectPieceTypes?: () => void;
}

export function TerrainTypeList({
  selectedId,
  onSelect,
  isCustomSelected,
  onSelectCustom,
  isTemplatesSelected,
  onSelectTemplates,
  isPieceTypesSelected,
  onSelectPieceTypes,
}: TerrainTypeListProps) {
  const { terrainTypes, customPieces, pieceTemplates, shapes, deleteTerrainType } = useInventoryStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (deletingId === id) {
      await deleteTerrainType(id);
      if (selectedId === id) {
        onSelect(null);
      }
      setDeletingId(null);
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Piece Types Section */}
      {onSelectPieceTypes && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Piece Catalog</h2>
          <Card
            className={`p-3 cursor-pointer transition-all ${
              isPieceTypesSelected
                ? 'ring-2 ring-green-500 bg-card'
                : 'hover:bg-card/50'
            }`}
            onClick={onSelectPieceTypes}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center">
                <Shapes className="h-5 w-5 text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground">Piece Types</h3>
                <p className="text-xs text-muted-foreground">
                  {shapes.length} available {shapes.length === 1 ? 'shape' : 'shapes'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Custom Pieces Section */}
      {onSelectCustom && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Custom Pieces</h2>
          <Card
            className={`p-3 cursor-pointer transition-all ${
              isCustomSelected
                ? 'ring-2 ring-purple-500 bg-card'
                : 'hover:bg-card/50'
            }`}
            onClick={onSelectCustom}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                <Puzzle className="h-5 w-5 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground">Custom Pieces</h3>
                <p className="text-xs text-muted-foreground">
                  {customPieces.length} custom {customPieces.length === 1 ? 'piece' : 'pieces'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Templates Section */}
      {onSelectTemplates && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Templates</h2>
          <Card
            className={`p-3 cursor-pointer transition-all ${
              isTemplatesSelected
                ? 'ring-2 ring-amber-500 bg-card'
                : 'hover:bg-card/50'
            }`}
            onClick={onSelectTemplates}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-600/20 flex items-center justify-center">
                <LayoutTemplate className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground">Piece Templates</h3>
                <p className="text-xs text-muted-foreground">
                  {pieceTemplates.filter(t => !t.isDefault).length} custom, {pieceTemplates.filter(t => t.isDefault).length} default
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Terrain Types Section */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Terrain Types</h2>
        <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      <div className="space-y-2">
        {terrainTypes.map((terrain) => (
          <Card
            key={terrain.id}
            className={`p-3 cursor-pointer transition-all ${
              selectedId === terrain.id
                ? 'ring-2 ring-primary bg-card'
                : 'hover:bg-card/50'
            }`}
            onClick={() => onSelect(terrain.id)}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{terrain.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-foreground truncate">
                    {terrain.name}
                  </h3>
                  {terrain.isDefault && (
                    <span className="text-xs bg-secondary text-muted-foreground px-1.5 py-0.5 rounded">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {terrain.pieces.filter((p) => p.quantity > 0).length} pieces
                  {terrain.objects.length > 0 && ` • ${terrain.objects.length} objects`}
                </p>
              </div>
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: terrain.color }}
              />
              {!terrain.isDefault && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(terrain.id);
                  }}
                >
                  <Trash2
                    className={`h-4 w-4 ${
                      deletingId === terrain.id ? 'text-destructive' : 'text-muted-foreground'
                    }`}
                  />
                </Button>
              )}
            </div>
            {deletingId === terrain.id && (
              <p className="text-xs text-destructive mt-2">
                Click again to confirm delete
              </p>
            )}
          </Card>
        ))}

        {terrainTypes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No terrain types found</p>
            <p className="text-sm mt-1">Add one to get started</p>
          </div>
        )}
      </div>

      <TerrainFormDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
    </div>
  );
}
