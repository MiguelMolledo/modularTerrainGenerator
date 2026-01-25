'use client';

import React, { useState } from 'react';
import { useInventoryStore } from '@/store/inventoryStore';
import { Button } from '@/components/ui/button';
import { CustomPiece } from '@/types';
import { CustomPiecePreview } from './CustomPiecePreview';
import { CustomPieceFormDialog } from './CustomPieceFormDialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';

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
        <h3 className="text-lg font-semibold text-white">Custom Pieces</h3>
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
          <p className="text-gray-400 text-sm mb-4">
            No custom pieces yet. Create your first custom piece with any size and dual colors!
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
            const primaryTerrain = getTerrainById(piece.primaryTerrainTypeId);
            const secondaryTerrain = piece.secondaryTerrainTypeId
              ? getTerrainById(piece.secondaryTerrainTypeId)
              : undefined;

            return (
              <div
                key={piece.id}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
              >
                {/* Preview */}
                <div className="flex items-center justify-center mb-3 py-2">
                  <CustomPiecePreview
                    width={piece.width}
                    height={piece.height}
                    isSplit={piece.isSplit}
                    splitDirection={piece.splitDirection}
                    primaryColor={primaryTerrain?.color || '#666'}
                    secondaryColor={secondaryTerrain?.color}
                    scale={6}
                  />
                </div>

                {/* Info */}
                <div className="space-y-1">
                  <h4 className="font-medium text-white truncate" title={piece.name}>
                    {piece.name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{piece.width}" x {piece.height}"</span>
                    {piece.isSplit && (
                      <span className="bg-blue-600/30 text-blue-400 px-1.5 py-0.5 rounded">
                        {piece.splitDirection === 'horizontal' ? 'H-Split' : 'V-Split'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: primaryTerrain?.color }}
                      />
                      <span className="text-gray-400">{primaryTerrain?.name}</span>
                    </div>
                    {piece.isSplit && secondaryTerrain && (
                      <>
                        <span className="text-gray-600">+</span>
                        <div className="flex items-center gap-1">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: secondaryTerrain.color }}
                          />
                          <span className="text-gray-400">{secondaryTerrain.name}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    Quantity: {piece.quantity}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-700">
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
                        ? 'text-red-400 bg-red-950 hover:bg-red-900'
                        : 'text-red-400 hover:text-red-300'
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
