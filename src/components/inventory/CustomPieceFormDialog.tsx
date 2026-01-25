'use client';

import React, { useState, useEffect } from 'react';
import { useInventoryStore } from '@/store/inventoryStore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { CustomPiece, SplitDirection } from '@/types';
import { CustomPiecePreview } from './CustomPiecePreview';
import { Minus, Plus } from 'lucide-react';

interface CustomPieceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPiece?: CustomPiece;
}

export function CustomPieceFormDialog({
  open,
  onOpenChange,
  editingPiece,
}: CustomPieceFormDialogProps) {
  const { terrainTypes, createCustomPiece, updateCustomPiece, isLoading } = useInventoryStore();

  const [name, setName] = useState('');
  const [width, setWidth] = useState(3);
  const [height, setHeight] = useState(3);
  const [isSplit, setIsSplit] = useState(false);
  const [splitDirection, setSplitDirection] = useState<SplitDirection>('horizontal');
  const [primaryTerrainId, setPrimaryTerrainId] = useState('');
  const [secondaryTerrainId, setSecondaryTerrainId] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Reset form when opening/closing or when editingPiece changes
  useEffect(() => {
    if (open) {
      if (editingPiece) {
        setName(editingPiece.name);
        setWidth(editingPiece.width);
        setHeight(editingPiece.height);
        setIsSplit(editingPiece.isSplit);
        setSplitDirection(editingPiece.splitDirection || 'horizontal');
        setPrimaryTerrainId(editingPiece.primaryTerrainTypeId);
        setSecondaryTerrainId(editingPiece.secondaryTerrainTypeId || '');
        setQuantity(editingPiece.quantity);
      } else {
        setName('');
        setWidth(3);
        setHeight(3);
        setIsSplit(false);
        setSplitDirection('horizontal');
        setPrimaryTerrainId(terrainTypes[0]?.id || '');
        setSecondaryTerrainId(terrainTypes[1]?.id || terrainTypes[0]?.id || '');
        setQuantity(1);
      }
    }
  }, [open, editingPiece, terrainTypes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !primaryTerrainId) return;

    const data = {
      name: name.trim(),
      width,
      height,
      isSplit,
      splitDirection: isSplit ? splitDirection : undefined,
      primaryTerrainTypeId: primaryTerrainId,
      secondaryTerrainTypeId: isSplit ? secondaryTerrainId : undefined,
      quantity,
    };

    let success = false;
    if (editingPiece) {
      success = await updateCustomPiece(editingPiece.id, data);
    } else {
      const result = await createCustomPiece(data);
      success = result !== null;
    }

    if (success) {
      onOpenChange(false);
    }
  };

  const adjustSize = (field: 'width' | 'height', delta: number) => {
    const setter = field === 'width' ? setWidth : setHeight;
    const current = field === 'width' ? width : height;
    const newValue = Math.max(0.5, Math.min(12, current + delta));
    setter(newValue);
  };

  const primaryTerrain = terrainTypes.find((t) => t.id === primaryTerrainId);
  const secondaryTerrain = terrainTypes.find((t) => t.id === secondaryTerrainId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingPiece ? 'Edit Custom Piece' : 'Create Custom Piece'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Large Desert/Water Split"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Size controls */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-1">
                Width (inches)
              </label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => adjustSize('width', -0.5)}
                  disabled={width <= 0.5}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(Math.max(0.5, Math.min(12, Number(e.target.value))))}
                  step={0.5}
                  min={0.5}
                  max={12}
                  className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => adjustSize('width', 0.5)}
                  disabled={width >= 12}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-1">
                Height (inches)
              </label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => adjustSize('height', -0.5)}
                  disabled={height <= 0.5}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Math.max(0.5, Math.min(12, Number(e.target.value))))}
                  step={0.5}
                  min={0.5}
                  max={12}
                  className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => adjustSize('height', 0.5)}
                  disabled={height >= 12}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Primary Terrain */}
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-1">
              Primary Terrain
            </label>
            <div className="flex flex-wrap gap-2">
              {terrainTypes.map((terrain) => (
                <button
                  key={terrain.id}
                  type="button"
                  onClick={() => setPrimaryTerrainId(terrain.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    primaryTerrainId === terrain.id
                      ? 'ring-2 ring-blue-500 bg-gray-700'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: terrain.color }}
                  />
                  <span className="text-sm text-white">{terrain.icon} {terrain.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Split Toggle */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isSplit}
                onChange={(e) => setIsSplit(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
            <span className="text-sm font-medium text-gray-300">
              Split into two colors
            </span>
          </div>

          {/* Split Options (shown when split is enabled) */}
          {isSplit && (
            <>
              {/* Split Direction */}
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-1">
                  Split Direction
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSplitDirection('horizontal')}
                    className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all ${
                      splitDirection === 'horizontal'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <div className="w-6 h-4 border border-current flex flex-col">
                      <div className="flex-1 bg-current opacity-50" />
                      <div className="flex-1" />
                    </div>
                    Horizontal
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitDirection('vertical')}
                    className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all ${
                      splitDirection === 'vertical'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <div className="w-6 h-4 border border-current flex flex-row">
                      <div className="flex-1 bg-current opacity-50" />
                      <div className="flex-1" />
                    </div>
                    Vertical
                  </button>
                </div>
              </div>

              {/* Secondary Terrain */}
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-1">
                  Secondary Terrain
                </label>
                <div className="flex flex-wrap gap-2">
                  {terrainTypes.map((terrain) => (
                    <button
                      key={terrain.id}
                      type="button"
                      onClick={() => setSecondaryTerrainId(terrain.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                        secondaryTerrainId === terrain.id
                          ? 'ring-2 ring-blue-500 bg-gray-700'
                          : 'bg-gray-800 hover:bg-gray-700'
                      }`}
                    >
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: terrain.color }}
                      />
                      <span className="text-sm text-white">{terrain.icon} {terrain.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Quantity */}
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-1">
              Quantity
            </label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setQuantity(Math.max(0, quantity - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0, Number(e.target.value)))}
                min={0}
                className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">
              Preview
            </label>
            <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-center min-h-[100px]">
              <CustomPiecePreview
                width={width}
                height={height}
                isSplit={isSplit}
                splitDirection={splitDirection}
                primaryColor={primaryTerrain?.color || '#666'}
                secondaryColor={secondaryTerrain?.color}
                scale={8}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !name.trim() || !primaryTerrainId || (isSplit && !secondaryTerrainId)}
            >
              {isLoading ? 'Saving...' : editingPiece ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
