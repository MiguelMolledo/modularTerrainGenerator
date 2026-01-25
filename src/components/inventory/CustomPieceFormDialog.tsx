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
import { CustomPiece, CellColors } from '@/types';
import { CustomPiecePreview } from './CustomPiecePreview';
import { GridColorPicker } from './GridColorPicker';
import { Minus, Plus } from 'lucide-react';
import { createDefaultGrid, resizeGrid, getGridDimensions } from '@/lib/gridUtils';

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
  const [cellColors, setCellColors] = useState<CellColors>([]);
  const [quantity, setQuantity] = useState(1);

  // Initialize or reset form when opening/closing or when editingPiece changes
  useEffect(() => {
    if (open) {
      if (editingPiece) {
        setName(editingPiece.name);
        setWidth(editingPiece.width);
        setHeight(editingPiece.height);
        setCellColors(editingPiece.cellColors);
        setQuantity(editingPiece.quantity);
      } else {
        const defaultTerrainId = terrainTypes[0]?.id || '';
        setName('');
        setWidth(3);
        setHeight(3);
        setCellColors(createDefaultGrid(3, 3, defaultTerrainId));
        setQuantity(1);
      }
    }
  }, [open, editingPiece, terrainTypes]);

  // Update grid when dimensions change
  useEffect(() => {
    if (!open) return;

    const defaultTerrainId = terrainTypes[0]?.id || '';
    const { rows: newRows, cols: newCols } = getGridDimensions(width, height);

    // Use functional update to avoid stale closure and infinite loops
    setCellColors((prevColors) => {
      const currentRows = prevColors.length;
      const currentCols = prevColors[0]?.length || 0;

      // Only resize if dimensions actually changed
      if (currentRows !== newRows || currentCols !== newCols) {
        if (prevColors.length === 0) {
          return createDefaultGrid(width, height, defaultTerrainId);
        } else {
          return resizeGrid(prevColors, width, height, defaultTerrainId);
        }
      }
      return prevColors;
    });
  }, [width, height, open, terrainTypes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || cellColors.length === 0) return;

    const data = {
      name: name.trim(),
      width,
      height,
      cellColors,
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
    const newValue = Math.max(1.5, Math.min(12, current + delta));
    // Snap to 1.5 increments for consistency with grid
    const snapped = Math.round(newValue / 1.5) * 1.5;
    setter(snapped);
  };

  const { rows, cols } = getGridDimensions(width, height);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
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
              placeholder="e.g., River Bend, Coast Corner"
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
                  onClick={() => adjustSize('width', -1.5)}
                  disabled={width <= 1.5}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => {
                    const val = Math.max(1.5, Math.min(12, Number(e.target.value)));
                    setWidth(Math.round(val / 1.5) * 1.5);
                  }}
                  step={1.5}
                  min={1.5}
                  max={12}
                  className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => adjustSize('width', 1.5)}
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
                  onClick={() => adjustSize('height', -1.5)}
                  disabled={height <= 1.5}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => {
                    const val = Math.max(1.5, Math.min(12, Number(e.target.value)));
                    setHeight(Math.round(val / 1.5) * 1.5);
                  }}
                  step={1.5}
                  min={1.5}
                  max={12}
                  className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => adjustSize('height', 1.5)}
                  disabled={height >= 12}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Grid info */}
          <p className="text-sm text-gray-400">
            Piece size: {width}&quot; × {height}&quot; = {cols}×{rows} grid ({cols * rows} cells)
          </p>

          {/* Grid Color Picker */}
          {cellColors.length > 0 && (
            <GridColorPicker
              width={width}
              height={height}
              cellColors={cellColors}
              onChange={setCellColors}
              terrainTypes={terrainTypes}
            />
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
              {cellColors.length > 0 && (
                <CustomPiecePreview
                  width={width}
                  height={height}
                  cellColors={cellColors}
                  terrainTypes={terrainTypes}
                  scale={8}
                />
              )}
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
              disabled={isLoading || !name.trim() || cellColors.length === 0}
            >
              {isLoading ? 'Saving...' : editingPiece ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
