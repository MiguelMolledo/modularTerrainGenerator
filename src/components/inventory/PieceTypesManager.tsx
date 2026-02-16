'use client';

import React, { useState } from 'react';
import { useInventoryStore } from '@/store/inventoryStore';
import { useElevationStore, createElevationKey } from '@/store/elevationStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Mountain, Copy } from 'lucide-react';
import { PieceTypeFormDialog } from './PieceTypeFormDialog';
import { ElevationEditor } from './ElevationEditor';
import { PieceShape, CornerElevations } from '@/types';

export function PieceTypesManager() {
  const { shapes, deleteShape } = useInventoryStore();
  const { elevations, setElevation, getElevation } = useElevationStore();

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingShape, setEditingShape] = useState<PieceShape | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Elevation editor state
  const [elevationDialogOpen, setElevationDialogOpen] = useState(false);
  const [elevationShape, setElevationShape] = useState<PieceShape | null>(null);

  const handleCreate = () => {
    setEditingShape(null);
    setFormDialogOpen(true);
  };

  const handleEdit = (shape: PieceShape) => {
    setEditingShape(shape);
    setFormDialogOpen(true);
  };

  const handleDuplicate = (shape: PieceShape) => {
    // Create a copy with modified name
    setEditingShape({
      ...shape,
      id: '', // Will be generated
      name: `${shape.name} (copy)`,
    });
    setFormDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (deletingId === id) {
      await deleteShape(id);
      setDeletingId(null);
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
    }
  };

  const handleEditElevation = (shape: PieceShape) => {
    setElevationShape(shape);
    setElevationDialogOpen(true);
  };

  const handleSaveElevation = (shapeKey: string, elevation: CornerElevations) => {
    // Save elevation with a generic key (not terrain-specific)
    // This will be the default elevation for this shape
    const key = createElevationKey('_default', shapeKey);
    setElevation(key, elevation);
  };

  const getShapeElevation = (shapeKey: string): CornerElevations | undefined => {
    const key = createElevationKey('_default', shapeKey);
    return getElevation(key);
  };

  // Group shapes by type
  const squareShapes = shapes.filter(s => !s.isDiagonal && s.width === s.height);
  const rectShapes = shapes.filter(s => !s.isDiagonal && s.width !== s.height);
  const diagonalShapes = shapes.filter(s => s.isDiagonal);

  const renderShapeCard = (shape: PieceShape) => {
    const elevation = getShapeElevation(shape.shapeKey);
    const hasElevation = elevation && (elevation.nw !== 0 || elevation.ne !== 0 || elevation.sw !== 0 || elevation.se !== 0);

    return (
      <Card key={shape.id} className="p-4">
        {/* Visual representation */}
        <div className="h-20 flex items-center justify-center mb-3">
          {shape.isDiagonal ? (
            <svg
              width="60"
              height="60"
              viewBox="0 0 60 60"
              style={{ transform: `rotate(${shape.defaultRotation}deg)` }}
            >
              <polygon
                points="0,60 60,60 60,0"
                fill="#666"
                stroke="#888"
                strokeWidth="2"
              />
            </svg>
          ) : (
            <div
              className="border-2 border-border bg-secondary relative"
              style={{
                width: `${Math.min(60, shape.width * 15)}px`,
                height: `${Math.min(60, shape.height * 15)}px`,
              }}
            >
              {hasElevation && (
                <div className="absolute inset-0 bg-gradient-to-t from-transparent to-primary/30" />
              )}
            </div>
          )}
        </div>

        {/* Shape info */}
        <div className="text-center mb-3">
          <h3 className="text-sm font-medium text-foreground">{shape.name}</h3>
          <p className="text-xs text-muted-foreground">
            {shape.width}&quot; x {shape.height}&quot;
            {shape.isDiagonal && ' (diagonal)'}
          </p>
          {hasElevation && (
            <p className="text-xs text-primary mt-1">
              Has elevation
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-1 justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleEdit(shape)}
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleDuplicate(shape)}
            title="Duplicate"
          >
            <Copy className="h-4 w-4" />
          </Button>
          {!shape.isDiagonal && (
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${hasElevation ? 'text-primary' : ''}`}
              onClick={() => handleEditElevation(shape)}
              title="Edit elevation"
            >
              <Mountain className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${deletingId === shape.id ? 'text-destructive' : ''}`}
            onClick={() => handleDelete(shape.id)}
            title={deletingId === shape.id ? 'Click again to confirm' : 'Delete'}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {deletingId === shape.id && (
          <p className="text-xs text-destructive text-center mt-2">
            Click again to confirm
          </p>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Piece Types Catalog</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Define the piece shapes available for all terrain types
              </p>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              New Piece Type
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Square pieces */}
      {squareShapes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Square Pieces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {squareShapes.map(renderShapeCard)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rectangular pieces */}
      {rectShapes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rectangular Pieces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {rectShapes.map(renderShapeCard)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diagonal pieces */}
      {diagonalShapes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Diagonal Pieces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {diagonalShapes.map(renderShapeCard)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {shapes.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No piece types defined yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first piece type to get started.
            </p>
            <Button className="mt-4" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Piece Type
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Form dialog */}
      <PieceTypeFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        editingShape={editingShape}
      />

      {/* Elevation editor */}
      {elevationShape && (
        <ElevationEditor
          open={elevationDialogOpen}
          onOpenChange={setElevationDialogOpen}
          pieceId={elevationShape.shapeKey}
          pieceName={elevationShape.name}
          pieceWidth={elevationShape.width}
          pieceHeight={elevationShape.height}
          terrainColor="#666666"
          currentElevation={getShapeElevation(elevationShape.shapeKey)}
          onSave={handleSaveElevation}
        />
      )}
    </div>
  );
}
