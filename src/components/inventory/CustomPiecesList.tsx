'use client';

import React, { useState } from 'react';
import { useInventoryStore } from '@/store/inventoryStore';
import { Button } from '@/components/ui/button';
import { CustomPiece } from '@/types';
import { CustomPiecePreview } from './CustomPiecePreview';
import { CustomPieceFormDialog } from './CustomPieceFormDialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { getGridDimensions, getUniqueTerrainIds } from '@/lib/gridUtils';

export function CustomPiecesList() {
  const { customPieces, terrainTypes, deleteCustomPiece, isLoading } = useInventoryStore();
  const [showForm, setShowForm] = useState(false);
  const [editingPiece, setEditingPiece] = useState<CustomPiece | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleEdit = (piece: CustomPiece) => {
    setEditingPiece(piece);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (deletingId === id) {
      await deleteCustomPiece(id);
      setDeletingId(null);
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
    }
  };

  const handleFormClose = (open: boolean) => {
    setShowForm(open);
    if (!open) {
      setEditingPiece(undefined);
    }
  };

  const getTerrainById = (id: string) => terrainTypes.find((t) => t.id === id);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Custom Pieces</h3>
        <Button
          size="sm"
          onClick={() => {
            setEditingPiece(undefined);
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Custom
        </Button>
      </div>

      {customPieces.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🧩</div>
          <p className="text-muted-foreground text-sm mb-4">
            No custom pieces yet. Create your first custom piece with any size and multiple terrain colors!
          </p>
          <Button
            variant="outline"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Create Custom Piece
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {customPieces.map((piece) => {
            const { rows, cols } = getGridDimensions(piece.width, piece.height);
            const uniqueTerrainIds = getUniqueTerrainIds(piece.cellColors);
            const terrains = uniqueTerrainIds.map(id => getTerrainById(id)).filter(Boolean);

            return (
              <div
                key={piece.id}
                className="bg-card rounded-lg p-4 border border-border hover:border-border transition-colors"
              >
                {/* Preview */}
                <div className="flex items-center justify-center mb-3 py-2">
                  <CustomPiecePreview
                    width={piece.width}
                    height={piece.height}
                    cellColors={piece.cellColors}
                    terrainTypes={terrainTypes}
                    scale={6}
                  />
                </div>

                {/* Info */}
                <div className="space-y-1">
                  <h4 className="font-medium text-foreground truncate" title={piece.name}>
                    {piece.name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{piece.width}&quot; x {piece.height}&quot;</span>
                    <span className="bg-secondary text-muted-foreground px-1.5 py-0.5 rounded">
                      {cols}x{rows} grid
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap text-xs">
                    {terrains.map((terrain, idx) => (
                      <React.Fragment key={terrain!.id}>
                        {idx > 0 && <span className="text-muted-foreground">+</span>}
                        <div className="flex items-center gap-1">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: terrain!.color }}
                          />
                          <span className="text-muted-foreground">{terrain!.name}</span>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Quantity: {piece.quantity}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(piece)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`flex-1 ${
                      deletingId === piece.id
                        ? 'text-destructive bg-destructive/20 hover:bg-destructive/30'
                        : 'text-destructive hover:text-destructive/80'
                    }`}
                    onClick={() => handleDelete(piece.id)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {deletingId === piece.id ? 'Confirm?' : 'Delete'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CustomPieceFormDialog
        open={showForm}
        onOpenChange={handleFormClose}
        editingPiece={editingPiece}
      />
    </div>
  );
}
