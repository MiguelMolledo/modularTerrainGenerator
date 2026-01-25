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
import { TerrainTypeWithInventory, PieceShape, PieceVariant, CellColors } from '@/types';
import { CustomPiecePreview } from './CustomPiecePreview';
import { GridColorPicker } from './GridColorPicker';
import { TagInput } from './TagInput';
import { Minus, Plus } from 'lucide-react';
import { createDefaultGrid, getGridDimensions } from '@/lib/gridUtils';

interface PieceVariantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  terrainType: TerrainTypeWithInventory;
  shape: PieceShape;
  editingVariant?: PieceVariant;
}

export function PieceVariantFormDialog({
  open,
  onOpenChange,
  terrainType,
  shape,
  editingVariant,
}: PieceVariantFormDialogProps) {
  const { terrainTypes, createPieceVariant, updatePieceVariant, isLoading } = useInventoryStore();

  const [name, setName] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [cellColors, setCellColors] = useState<CellColors>([]);
  const [quantity, setQuantity] = useState(1);

  const { rows, cols } = getGridDimensions(shape.width, shape.height);

  // Initialize or reset form when opening/closing or when editingVariant changes
  useEffect(() => {
    if (open) {
      if (editingVariant) {
        setName(editingVariant.name);
        setTags(editingVariant.tags);
        setCellColors(editingVariant.cellColors);
        setQuantity(editingVariant.quantity);
      } else {
        // Initialize with terrain type color for all cells
        setName('');
        setTags([]);
        setCellColors(createDefaultGrid(shape.width, shape.height, terrainType.id));
        setQuantity(1);
      }
    }
  }, [open, editingVariant, shape.width, shape.height, terrainType.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || cellColors.length === 0) return;

    let success = false;
    if (editingVariant) {
      success = await updatePieceVariant(editingVariant.id, {
        name: name.trim(),
        tags,
        cellColors,
        quantity,
      });
    } else {
      const result = await createPieceVariant({
        terrainTypeId: terrainType.id,
        shapeId: shape.id,
        name: name.trim(),
        tags,
        cellColors,
        quantity,
      });
      success = result !== null;
    }

    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingVariant ? 'Edit Variant' : `Create ${terrainType.name} ${shape.name} Variant`}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Piece info banner */}
          <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
            <div
              className="w-10 h-10 rounded flex items-center justify-center text-2xl"
              style={{ backgroundColor: terrainType.color }}
            >
              {terrainType.icon}
            </div>
            <div>
              <p className="text-white font-medium">{terrainType.name} {shape.name}</p>
              <p className="text-gray-400 text-sm">
                {shape.width}&quot; x {shape.height}&quot; ({cols}x{rows} grid)
              </p>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-1">
              Variant Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., River Corner, Beach Edge"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-1">
              Tags (for identification)
            </label>
            <TagInput
              tags={tags}
              onChange={setTags}
              placeholder="e.g., river, corner, bottom-left"
            />
          </div>

          {/* Grid Color Picker */}
          {cellColors.length > 0 && (
            <GridColorPicker
              width={shape.width}
              height={shape.height}
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
                className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                  width={shape.width}
                  height={shape.height}
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
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? 'Saving...' : editingVariant ? 'Save Changes' : 'Create Variant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
