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
import { TerrainObject } from '@/types';

const OBJECT_EMOJIS = [
  '🌲', '🌳', '🌴', '🪨', '🏠', '🏛️', '🗼', '⛺', '🏰', '🏯',
  '📦', '🪵', '🌵', '🍄', '💎', '🔮', '⚱️', '🪦', '🗿', '⛩️',
];

interface ObjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  terrainTypeId: string;
  editObject?: TerrainObject;
}

export function ObjectFormDialog({
  open,
  onOpenChange,
  terrainTypeId,
  editObject,
}: ObjectFormDialogProps) {
  const { createTerrainObject, updateTerrainObject, isLoading } = useInventoryStore();

  const [name, setName] = useState('');
  const [width, setWidth] = useState(1);
  const [height, setHeight] = useState(1);
  const [depth, setDepth] = useState(1);
  const [emoji, setEmoji] = useState('📦');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Populate form when editing
  useEffect(() => {
    if (editObject) {
      setName(editObject.name);
      setWidth(editObject.width);
      setHeight(editObject.height);
      setDepth(editObject.depth);
      setEmoji(editObject.emoji);
      setDescription(editObject.description || '');
      setQuantity(editObject.quantity);
    } else {
      // Reset form
      setName('');
      setWidth(1);
      setHeight(1);
      setDepth(1);
      setEmoji('📦');
      setDescription('');
      setQuantity(1);
    }
  }, [editObject, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editObject) {
      // Update existing
      await updateTerrainObject(editObject.id, {
        name: name.trim(),
        width,
        height,
        depth,
        emoji,
        description: description.trim() || undefined,
        quantity,
      });
    } else {
      // Create new
      await createTerrainObject({
        terrainTypeId,
        name: name.trim(),
        width,
        height,
        depth,
        emoji,
        description: description.trim() || undefined,
        quantity,
      });
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editObject ? 'Edit 3D Object' : 'Add 3D Object'}
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
              placeholder="e.g., Pine Tree"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Dimensions */}
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-1">
              Dimensions (inches)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-gray-500">Width</label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                  step="0.5"
                  min="0.5"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Height</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
                  step="0.5"
                  min="0.5"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Depth</label>
                <input
                  type="number"
                  value={depth}
                  onChange={(e) => setDepth(parseFloat(e.target.value) || 0)}
                  step="0.5"
                  min="0.5"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Emoji */}
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-1">
              Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {OBJECT_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`w-10 h-10 text-xl rounded-lg transition-all ${
                    emoji === e
                      ? 'bg-blue-600 ring-2 ring-blue-400'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-1">
              Quantity
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              min="1"
              className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? 'Saving...' : editObject ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
