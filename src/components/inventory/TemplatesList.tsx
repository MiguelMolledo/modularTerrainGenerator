'use client';

import React, { useState } from 'react';
import { useInventoryStore } from '@/store/inventoryStore';
import { PieceTemplate } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TemplateFormDialog } from './TemplateFormDialog';
import { Plus, Pencil, Trash2, Lock } from 'lucide-react';

export function TemplatesList() {
  const { pieceTemplates, deletePieceTemplate, isLoading } = useInventoryStore();
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PieceTemplate | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleEdit = (template: PieceTemplate) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (deletingId === id) {
      await deletePieceTemplate(id);
      setDeletingId(null);
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
    }
  };

  const handleFormClose = (open: boolean) => {
    setShowForm(open);
    if (!open) {
      setEditingTemplate(undefined);
    }
  };

  const getTotalPieces = (template: PieceTemplate) => {
    return template.items.reduce((sum, item) => sum + item.quantity, 0);
  };

  // Separate default and custom templates
  const defaultTemplates = pieceTemplates.filter((t) => t.isDefault);
  const customTemplates = pieceTemplates.filter((t) => !t.isDefault);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Piece Templates</h3>
          <p className="text-sm text-muted-foreground">
            Pre-defined piece sets for quickly setting up new terrains
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditingTemplate(undefined);
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          New Template
        </Button>
      </div>

      {/* Custom Templates */}
      {customTemplates.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-foreground mb-3">Your Templates</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {customTemplates.map((template) => (
              <Card
                key={template.id}
                className="p-4 bg-card border-border hover:border-border transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{template.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground truncate">
                      {template.name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {getTotalPieces(template)} pieces
                    </p>
                    {template.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {template.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Piece breakdown */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {template.items.slice(0, 4).map((item) => (
                    <span
                      key={item.id}
                      className="text-xs bg-secondary text-foreground px-1.5 py-0.5 rounded"
                    >
                      {item.shape?.name}: {item.quantity}
                    </span>
                  ))}
                  {template.items.length > 4 && (
                    <span className="text-xs text-muted-foreground">
                      +{template.items.length - 4} more
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(template)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`flex-1 ${
                      deletingId === template.id
                        ? 'text-destructive bg-destructive/20 hover:bg-destructive/30'
                        : 'text-destructive hover:text-destructive/80'
                    }`}
                    onClick={() => handleDelete(template.id)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {deletingId === template.id ? 'Confirm?' : 'Delete'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Default Templates */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Lock className="h-3 w-3" />
          Default Templates
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {defaultTemplates.map((template) => (
            <Card
              key={template.id}
              className="p-4 bg-card/50 border-border"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{template.icon}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground truncate">
                    {template.name}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {getTotalPieces(template)} pieces
                  </p>
                  {template.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {template.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Piece breakdown */}
              <div className="mt-3 flex flex-wrap gap-1">
                {template.items.slice(0, 4).map((item) => (
                  <span
                    key={item.id}
                    className="text-xs bg-secondary/50 text-muted-foreground px-1.5 py-0.5 rounded"
                  >
                    {item.shape?.name}: {item.quantity}
                  </span>
                ))}
                {template.items.length > 4 && (
                  <span className="text-xs text-muted-foreground">
                    +{template.items.length - 4} more
                  </span>
                )}
                {template.items.length === 0 && (
                  <span className="text-xs text-muted-foreground italic">No pieces</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <TemplateFormDialog
        open={showForm}
        onOpenChange={handleFormClose}
        editingTemplate={editingTemplate}
      />
    </div>
  );
}
