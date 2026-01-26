'use client';

import React, { useState, useEffect } from 'react';
import { useInventoryStore } from '@/store/inventoryStore';
import { useElevationStore, createElevationKey } from '@/store/elevationStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, Minus, Plus, Layers, Pencil, Trash2, Mountain } from 'lucide-react';
import { PieceVariantFormDialog } from './PieceVariantFormDialog';
import { CustomPiecePreview } from './CustomPiecePreview';
import { ElevationEditor } from './ElevationEditor';
import { PieceShape, PieceVariant, CornerElevations } from '@/types';

interface PiecesGridProps {
  terrainTypeId: string;
}

export function PiecesGrid({ terrainTypeId }: PiecesGridProps) {
  const { shapes, terrainTypes, updateTerrainPieces, deletePieceVariant, isLoading } = useInventoryStore();
  const { elevations, setElevation, getElevation } = useElevationStore();
  const terrain = terrainTypes.find((t) => t.id === terrainTypeId);

  // Local state for quantities
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Variant dialog state
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [selectedShape, setSelectedShape] = useState<PieceShape | null>(null);
  const [editingVariant, setEditingVariant] = useState<PieceVariant | undefined>(undefined);

  // Elevation editor state
  const [elevationDialogOpen, setElevationDialogOpen] = useState(false);
  const [elevationShape, setElevationShape] = useState<PieceShape | null>(null);

  // Initialize quantities from terrain pieces
  useEffect(() => {
    if (terrain) {
      const initialQuantities: Record<string, number> = {};
      for (const piece of terrain.pieces) {
        initialQuantities[piece.shapeId] = piece.quantity;
      }
      setQuantities(initialQuantities);
      setHasChanges(false);
    }
  }, [terrain]);

  const handleQuantityChange = (shapeId: string, value: number) => {
    const newValue = Math.max(0, value);
    setQuantities((prev) => ({ ...prev, [shapeId]: newValue }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    const pieces = shapes.map((shape) => ({
      shapeId: shape.id,
      quantity: quantities[shape.id] || 0,
    }));
    await updateTerrainPieces(terrainTypeId, pieces);
    setHasChanges(false);
  };

  const handleCreateVariant = (shape: PieceShape) => {
    setSelectedShape(shape);
    setEditingVariant(undefined);
    setVariantDialogOpen(true);
  };

  const handleEditElevation = (shape: PieceShape) => {
    setElevationShape(shape);
    setElevationDialogOpen(true);
  };

  const handleSaveElevation = (pieceId: string, elevation: CornerElevations) => {
    if (terrain) {
      const key = createElevationKey(terrain.slug, pieceId);
      setElevation(key, elevation);
    }
  };

  const getShapeElevation = (shapeKey: string): CornerElevations | undefined => {
    if (!terrain) return undefined;
    const key = createElevationKey(terrain.slug, shapeKey);
    return getElevation(key);
  };

  const handleEditVariant = (variant: PieceVariant) => {
    const shape = shapes.find((s) => s.id === variant.shapeId);
    if (shape) {
      setSelectedShape(shape);
      setEditingVariant(variant);
      setVariantDialogOpen(true);
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (confirm('Are you sure you want to delete this variant?')) {
      await deletePieceVariant(variantId);
    }
  };

  if (!terrain) return null;

  return (
    <div className="p-4">
      {/* Header with save button */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">
          Set the quantity of each piece shape for this terrain
        </p>
        {hasChanges && (
          <Button size="sm" onClick={handleSave} disabled={isLoading}>
            <Save className="h-4 w-4 mr-1" />
            Save Changes
          </Button>
        )}
      </div>

      {/* Grid of shapes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {shapes.map((shape) => {
          const quantity = quantities[shape.id] || 0;

          return (
            <Card key={shape.id} className="p-4">
              {/* Visual representation */}
              <div className="h-20 flex items-center justify-center mb-3">
                {shape.isDiagonal ? (
                  <svg
                    width="60"
                    height="60"
                    viewBox="0 0 60 60"
                    className="transform"
                    style={{
                      transform: `rotate(${shape.defaultRotation}deg)`,
                    }}
                  >
                    <polygon
                      points="0,60 60,60 60,0"
                      fill={terrain.color}
                      stroke="#666"
                      strokeWidth="2"
                    />
                  </svg>
                ) : (
                  <div
                    className="border-2 border-gray-600"
                    style={{
                      width: `${Math.min(60, shape.width * 15)}px`,
                      height: `${Math.min(60, shape.height * 15)}px`,
                      backgroundColor: terrain.color,
                    }}
                  />
                )}
              </div>

              {/* Shape name */}
              <div className="text-center mb-3">
                <span className="text-sm font-medium text-white">
                  {shape.name}
                </span>
                <p className="text-xs text-gray-500">
                  {shape.width}&quot; x {shape.height}&quot;
                </p>
              </div>

              {/* Quantity controls */}
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleQuantityChange(shape.id, quantity - 1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>

                <input
                  type="number"
                  value={quantity}
                  onChange={(e) =>
                    handleQuantityChange(shape.id, parseInt(e.target.value) || 0)
                  }
                  className="w-16 text-center bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
                  min="0"
                />

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleQuantityChange(shape.id, quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-purple-400 hover:text-purple-300 hover:bg-purple-900/30"
                  onClick={() => handleCreateVariant(shape)}
                >
                  <Layers className="h-3 w-3 mr-1" />
                  Variant
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`flex-1 ${
                    getShapeElevation(shape.shapeKey)
                      ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-900/30'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/30'
                  }`}
                  onClick={() => handleEditElevation(shape)}
                  disabled={shape.isDiagonal}
                  title={shape.isDiagonal ? 'Elevation not available for diagonal pieces' : 'Edit 3D elevation'}
                >
                  <Mountain className="h-3 w-3 mr-1" />
                  {getShapeElevation(shape.shapeKey) ? '3D' : 'Flat'}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {shapes.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No shapes available. Please check your database configuration.
        </div>
      )}

      {/* Variants section */}
      {terrain.variants && terrain.variants.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <Layers className="h-5 w-5 text-purple-400" />
            Variants
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {terrain.variants.map((variant) => {
              const shape = shapes.find((s) => s.id === variant.shapeId);
              if (!shape) return null;

              return (
                <Card key={variant.id} className="p-4">
                  <div className="flex gap-4">
                    {/* Preview */}
                    <div className="shrink-0">
                      <CustomPiecePreview
                        width={shape.width}
                        height={shape.height}
                        cellColors={variant.cellColors}
                        terrainTypes={terrainTypes}
                        scale={6}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium truncate">{variant.name}</h4>
                      <p className="text-gray-500 text-xs">{shape.name}</p>

                      {/* Tags */}
                      {variant.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {variant.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 bg-purple-600/30 text-purple-300 rounded text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Quantity */}
                      <p className="text-gray-400 text-sm mt-2">Qty: {variant.quantity}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-700">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditVariant(variant)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                      onClick={() => handleDeleteVariant(variant.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Variant form dialog */}
      {selectedShape && terrain && (
        <PieceVariantFormDialog
          open={variantDialogOpen}
          onOpenChange={setVariantDialogOpen}
          terrainType={terrain}
          shape={selectedShape}
          editingVariant={editingVariant}
        />
      )}

      {/* Elevation editor dialog */}
      {elevationShape && terrain && (
        <ElevationEditor
          open={elevationDialogOpen}
          onOpenChange={setElevationDialogOpen}
          pieceId={elevationShape.shapeKey}
          pieceName={`${terrain.name} ${elevationShape.name}`}
          pieceWidth={elevationShape.width}
          pieceHeight={elevationShape.height}
          terrainColor={terrain.color}
          currentElevation={getShapeElevation(elevationShape.shapeKey)}
          onSave={handleSaveElevation}
        />
      )}
    </div>
  );
}
