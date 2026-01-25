'use client';

import React from 'react';
import { useInventoryStore } from '@/store/inventoryStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ShapesOverview() {
  const { shapes, terrainTypes } = useInventoryStore();

  // Calculate total pieces across all terrains
  const totalPieces = terrainTypes.reduce(
    (sum, terrain) =>
      sum + terrain.pieces.reduce((pSum, p) => pSum + p.quantity, 0),
    0
  );

  const totalObjects = terrainTypes.reduce(
    (sum, terrain) =>
      sum + terrain.objects.reduce((oSum, o) => oSum + o.quantity, 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-white">{terrainTypes.length}</p>
            <p className="text-sm text-gray-400">Terrain Types</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-white">{shapes.length}</p>
            <p className="text-sm text-gray-400">Base Shapes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-white">{totalPieces}</p>
            <p className="text-sm text-gray-400">Total Pieces</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-white">{totalObjects}</p>
            <p className="text-sm text-gray-400">3D Objects</p>
          </CardContent>
        </Card>
      </div>

      {/* Available shapes */}
      <Card>
        <CardHeader>
          <CardTitle>Available Base Shapes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 mb-4">
            These are the base shapes available for all terrain types. Select a terrain type
            on the left to configure quantities.
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {shapes.map((shape) => (
              <div key={shape.id} className="text-center">
                <div className="h-16 flex items-center justify-center mb-2">
                  {shape.isDiagonal ? (
                    <svg
                      width="50"
                      height="50"
                      viewBox="0 0 50 50"
                      style={{ transform: `rotate(${shape.defaultRotation}deg)` }}
                    >
                      <polygon
                        points="0,50 50,50 50,0"
                        fill="#666"
                        stroke="#888"
                        strokeWidth="1"
                      />
                    </svg>
                  ) : (
                    <div
                      className="border border-gray-600 bg-gray-700"
                      style={{
                        width: `${Math.min(50, shape.width * 12)}px`,
                        height: `${Math.min(50, shape.height * 12)}px`,
                      }}
                    />
                  )}
                </div>
                <p className="text-xs text-white font-medium">{shape.name}</p>
                <p className="text-xs text-gray-500">
                  {shape.width}&quot; x {shape.height}&quot;
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-400 space-y-2">
          <p>1. Select a terrain type from the left sidebar to configure its pieces.</p>
          <p>2. Set the quantity of each shape you own for that terrain.</p>
          <p>3. Add 3D objects like trees, rocks, or buildings to track your collection.</p>
          <p>4. Create new terrain types to organize custom terrain sets.</p>
        </CardContent>
      </Card>
    </div>
  );
}
