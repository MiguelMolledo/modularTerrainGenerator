'use client';

import React, { useState } from 'react';
import { useInventoryStore } from '@/store/inventoryStore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const TERRAIN_EMOJIS = ['🏜️', '🌲', '🏔️', '🌊', '🐊', '🌋', '❄️', '🌾', '🏛️', '🌙', '☀️', '🌸'];
const TERRAIN_COLORS = [
  '#E5C07B', '#98C379', '#D19A66', '#61AFEF', '#56B6C2', '#E06C75',
  '#C678DD', '#ABB2BF', '#282C34', '#5C6370', '#BE5046', '#E5C07B',
];

interface TerrainFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TerrainFormDialog({ open, onOpenChange }: TerrainFormDialogProps) {
  const { createTerrainType, isLoading } = useInventoryStore();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [icon, setIcon] = useState('🗺️');
  const [color, setColor] = useState('#888888');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    const result = await createTerrainType({
      name: name.trim(),
      slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      icon,
      color,
      description: description.trim() || undefined,
    });

    if (result) {
      setName('');
      setSlug('');
      setIcon('🗺️');
      setColor('#888888');
      setDescription('');
      onOpenChange(false);
    }
  };

  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-generate slug from name
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]/g, '-')) {
      setSlug(value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Terrain Type</DialogTitle>
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
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Snow"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Slug */}
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-1">
              Slug (ID)
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g., snow"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Used as identifier. Only lowercase letters, numbers, and hyphens.
            </p>
          </div>

          {/* Icon */}
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-1">
              Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {TERRAIN_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`w-10 h-10 text-xl rounded-lg transition-all ${
                    icon === emoji
                      ? 'bg-blue-600 ring-2 ring-blue-400'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-1">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {TERRAIN_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
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
            <Button type="submit" disabled={isLoading || !name.trim() || !slug.trim()}>
              {isLoading ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
