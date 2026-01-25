'use client';

import React, { useState, useEffect } from 'react';
import { useInventoryStore } from '@/store/inventoryStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, Minus, Plus } from 'lucide-react';

interface PiecesGridProps {
  terrainTypeId: string;
}

export function PiecesGrid({ terrainTypeId }: PiecesGridProps) {
  const { shapes, terrainTypes, updateTerrainPieces, isLoading } = useInventoryStore();
  const terrain = terrainTypes.find((t) => t.id === terrainTypeId);

  // Local state for quantities
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [hasChanges, setHasChanges] = useState(false);

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
            </Card>
          );
        })}
      </div>

      {shapes.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No shapes available. Please check your database configuration.
        </div>
      )}
    </div>
  );
}
