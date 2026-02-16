'use client';

import React, { useState, useEffect } from 'react';
import { useInventoryStore } from '@/store/inventoryStore';
import { PieceTemplate } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Minus } from 'lucide-react';

const TEMPLATE_ICONS = ['📦', '🎯', '🎁', '📐', '📏', '⬛', '🌊', '🏔️', '🌲', '🏜️', '🔥', '❄️'];

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTemplate?: PieceTemplate;
}

export function TemplateFormDialog({
  open,
  onOpenChange,
  editingTemplate,
}: TemplateFormDialogProps) {
  const { shapes, createPieceTemplate, updatePieceTemplate, isLoading } = useInventoryStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📦');
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Initialize form when editing or opening
  useEffect(() => {
    if (open) {
      if (editingTemplate) {
        setName(editingTemplate.name);
        setDescription(editingTemplate.description || '');
        setIcon(editingTemplate.icon);
        // Set quantities from template items
        const q: Record<string, number> = {};
        for (const item of editingTemplate.items) {
          q[item.shapeId] = item.quantity;
        }
        setQuantities(q);
      } else {
        setName('');
        setDescription('');
        setIcon('📦');
        setQuantities({});
      }
    }
  }, [open, editingTemplate]);

  const handleQuantityChange = (shapeId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[shapeId] || 0;
      const newValue = Math.max(0, current + delta);
      if (newValue === 0) {
        const { [shapeId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [shapeId]: newValue };
    });
  };

  const setQuantity = (shapeId: string, value: number) => {
    const numValue = Math.max(0, Math.floor(value));
    setQuantities((prev) => {
      if (numValue === 0) {
        const { [shapeId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [shapeId]: numValue };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const items = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([shapeId, quantity]) => ({ shapeId, quantity }));

    let success = false;
    if (editingTemplate) {
      success = await updatePieceTemplate(editingTemplate.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        icon,
        items,
      });
    } else {
      const result = await createPieceTemplate({
        name: name.trim(),
        description: description.trim() || undefined,
        icon,
        items,
      });
      success = result !== null;
    }

    if (success) {
      onOpenChange(false);
    }
  };

  const totalPieces = Object.values(quantities).reduce((sum, q) => sum + q, 0);

  // Group shapes by type
  const squareShapes = shapes.filter(
    (s) => !s.isDiagonal && s.width === s.height
  );
  const rectShapes = shapes.filter(
    (s) => !s.isDiagonal && s.width !== s.height && s.width >= 3 && s.height >= 3
  );
  const stripShapes = shapes.filter(
    (s) => !s.isDiagonal && (s.width < 3 || s.height < 3)
  );
  const diagonalShapes = shapes.filter((s) => s.isDiagonal);

  const renderShapeGroup = (title: string, shapeList: typeof shapes) => (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground uppercase">{title}</h4>
      <div className="grid grid-cols-2 gap-2">
        {shapeList.map((shape) => {
          const qty = quantities[shape.id] || 0;
          return (
            <div
              key={shape.id}
              className={`flex items-center justify-between p-2 rounded-lg border ${
                qty > 0
                  ? 'bg-primary/10 border-primary'
                  : 'bg-card border-border'
              }`}
            >
              <span className="text-sm text-foreground truncate flex-1 mr-2">
                {shape.name}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(shape.id, -1)}
                  className="w-6 h-6 flex items-center justify-center rounded bg-secondary hover:bg-accent text-muted-foreground"
                  disabled={qty === 0}
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) => setQuantity(shape.id, parseInt(e.target.value) || 0)}
                  className="w-10 h-6 text-center text-sm bg-background border border-border rounded text-foreground"
                  min="0"
                />
                <button
                  type="button"
                  onClick={() => handleQuantityChange(shape.id, 1)}
                  className="w-6 h-6 flex items-center justify-center rounded bg-secondary hover:bg-accent text-muted-foreground"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingTemplate ? 'Edit Template' : 'Create Piece Template'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">
              Template Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., River Set, Basic Starter"
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          {/* Icon */}
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">
              Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {TEMPLATE_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`w-9 h-9 text-lg rounded-lg transition-all ${
                    icon === emoji
                      ? 'bg-primary ring-2 ring-primary'
                      : 'bg-card hover:bg-secondary'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this template for?"
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Pieces */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-muted-foreground">
                Pieces
              </label>
              <span className="text-xs text-muted-foreground">
                Total: {totalPieces} pieces
              </span>
            </div>

            <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
              {squareShapes.length > 0 && renderShapeGroup('Squares', squareShapes)}
              {rectShapes.length > 0 && renderShapeGroup('Rectangles', rectShapes)}
              {stripShapes.length > 0 && renderShapeGroup('Strips', stripShapes)}
              {diagonalShapes.length > 0 && renderShapeGroup('Diagonals', diagonalShapes)}
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
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? 'Saving...' : editingTemplate ? 'Save Changes' : 'Create Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
