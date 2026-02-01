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
  '#C678DD', '#ABB2BF', '#282C34', '#5C6370', '#BE5046', '#4EC9B0',
];

interface TerrainFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TerrainFormDialog({ open, onOpenChange }: TerrainFormDialogProps) {
  const { createTerrainType, pieceTemplates, isLoading } = useInventoryStore();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [icon, setIcon] = useState('🗺️');
  const [color, setColor] = useState('#888888');
  const [description, setDescription] = useState('');
  // Default to "Standard Set" template if available
  const defaultTemplate = pieceTemplates.find((t) => t.name === 'Standard Set');
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplate?.id || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim() || !description.trim()) return;

    const result = await createTerrainType({
      name: name.trim(),
      slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      icon,
      color,
      description: description.trim(),
      templateId: selectedTemplateId,
    });

    if (result) {
      setName('');
      setSlug('');
      setIcon('🗺️');
      setColor('#888888');
      setDescription('');
      setSelectedTemplateId(defaultTemplate?.id || '');
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

  const selectedTemplate = pieceTemplates.find((t) => t.id === selectedTemplateId);

  // Helper to get total pieces in a template
  const getTemplatePieceCount = (template: typeof pieceTemplates[0]) => {
    return template.items.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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

          {/* Piece Template */}
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">
              Piece Template
            </label>
            {pieceTemplates.length === 0 ? (
              <p className="text-sm text-gray-400">
                Loading templates...
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {pieceTemplates.map((template) => {
                  const pieceCount = getTemplatePieceCount(template);
                  const isSelected = selectedTemplateId === template.id;

                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500'
                          : 'bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{template.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white text-sm truncate">
                            {template.name}
                            {!template.isDefault && (
                              <span className="ml-1 text-xs text-amber-400">*</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">
                            {pieceCount === 0 ? 'No pieces' : `${pieceCount} pieces`}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Template description */}
            {selectedTemplate && (
              <p className="text-xs text-gray-400 mt-2 px-1">
                {selectedTemplate.description || 'No description'}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-1">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this terrain for AI image generation (e.g., 'Sandy desert with dunes, dry earth, and cacti')"
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Used for AI image generation. Describe the visual appearance and features.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim() || !slug.trim() || !description.trim()}>
              {isLoading ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
