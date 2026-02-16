'use client';

import React, { useState, useEffect } from 'react';
import { useInventoryStore } from '@/store/inventoryStore';
import { useElevationStore, createElevationKey } from '@/store/elevationStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Save, Minus, Plus, Layers, Pencil, Trash2, Mountain, Eye, EyeOff } from 'lucide-react';
import { PieceVariantFormDialog } from './PieceVariantFormDialog';
import { CustomPiecePreview } from './CustomPiecePreview';
import { ElevationEditor } from './ElevationEditor';
import { PieceShape, PieceVariant, CornerElevations } from '@/types';

interface PiecesGridProps {
  terrainTypeId: string;
}

export function PiecesGrid({ terrainTypeId }: PiecesGridProps) {
  const { shapes, terrainTypes, updateTerrainPieces, deletePieceVariant, toggleTerrainPieceEnabled, isLoading } = useInventoryStore();
  const { elevations, setElevation, getElevation } = useElevationStore();
  const terrain = terrainTypes.find((t) => t.id === terrainTypeId);

  // Local state for quantities
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Helper to get enabled status directly from terrain pieces
  const isShapeEnabled = (shapeId: string): boolean => {
    if (!terrain) return true;
    const piece = terrain.pieces.find(p => p.shapeId === shapeId);
    return piece?.enabled !== false; // Default to true if no piece or enabled is undefined
  };

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

  const handleToggleEnabled = async (shapeId: string) => {
    const currentEnabled = isShapeEnabled(shapeId);
    const newEnabled = !currentEnabled;
    await toggleTerrainPieceEnabled(terrainTypeId, shapeId, newEnabled);
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
        <p className="text-sm text-muted-foreground">
          Set the quantity of each piece shape for this terrain
        </p>
        {hasChanges && (
          <Button size="sm" onClick={handleSave} disabled={isLoading}>
            <Save className="h-4 w-4 mr-1" />
            Save Changes
          </Button>
        )}
      </div>

      {(() => {
        const enabledShapes = shapes.filter((s) => isShapeEnabled(s.id));
        const disabledShapes = shapes.filter((s) => !isShapeEnabled(s.id));

        const renderShapeCard = (shape: PieceShape, isEnabled: boolean) => {
          const quantity = quantities[shape.id] || 0;
          return (
            <Card key={shape.id} className={`p-4 relative transition-all duration-150 hover:shadow-md hover:scale-[1.02] ${!isEnabled ? 'opacity-50' : ''}`}>
              {/* Enable/Disable toggle */}
              <button
                onClick={() => handleToggleEnabled(shape.id)}
                className={`absolute top-2 right-2 p-1.5 rounded-lg transition-colors ${
                  isEnabled
                    ? 'text-green-400 hover:bg-green-900/30'
                    : 'text-muted-foreground hover:bg-secondary/50'
                }`}
                title={isEnabled ? 'Visible in designer (click to hide)' : 'Hidden from designer (click to show)'}
              >
                {isEnabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>

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
                    className="border-2 border-border"
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
                <span className="text-sm font-medium text-foreground">
                  {shape.name}
                </span>
                <p className="text-xs text-muted-foreground">
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

                <span className="w-10 text-center text-foreground font-medium tabular-nums">
                  {quantity}
                </span>

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
                      ? 'text-primary hover:text-primary hover:bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
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
        };

        return (
          <>
            {/* Active pieces */}
            {enabledShapes.length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="h-4 w-4 text-green-400" />
                  <span className="text-sm font-medium text-muted-foreground">Active ({enabledShapes.length})</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {enabledShapes.map((shape) => renderShapeCard(shape, true))}
                </div>
              </>
            )}

            {/* Separator between active and inactive */}
            {enabledShapes.length > 0 && disabledShapes.length > 0 && (
              <Separator className="my-6" />
            )}

            {/* Inactive pieces */}
            {disabledShapes.length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Inactive ({disabledShapes.length})</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {disabledShapes.map((shape) => renderShapeCard(shape, false))}
                </div>
              </>
            )}

            {shapes.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No shapes available. Please check your database configuration.
              </div>
            )}
          </>
        );
      })()}

      {/* Variants section */}
      {terrain.variants && terrain.variants.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
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
                      <h4 className="text-foreground font-medium truncate">{variant.name}</h4>
                      <p className="text-muted-foreground text-xs">{shape.name}</p>

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
                      <p className="text-muted-foreground text-sm mt-2">Qty: {variant.quantity}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-border">
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
                      className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
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
