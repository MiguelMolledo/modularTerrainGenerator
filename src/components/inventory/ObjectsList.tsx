'use client';

import React, { useState } from 'react';
import { useInventoryStore } from '@/store/inventoryStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { ObjectFormDialog } from './ObjectFormDialog';
import { TerrainObject } from '@/types';

interface ObjectsListProps {
  terrainTypeId: string;
}

export function ObjectsList({ terrainTypeId }: ObjectsListProps) {
  const { terrainTypes, deleteTerrainObject } = useInventoryStore();
  const terrain = terrainTypes.find((t) => t.id === terrainTypeId);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingObject, setEditingObject] = useState<TerrainObject | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (deletingId === id) {
      await deleteTerrainObject(id);
      setDeletingId(null);
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
    }
  };

  if (!terrain) return null;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          3D objects for this terrain (dimensions in inches)
        </p>
        <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Object
        </Button>
      </div>

      {/* Objects list */}
      <div className="space-y-3">
        {terrain.objects.map((obj) => (
          <Card key={obj.id} className="p-4">
            <div className="flex items-center gap-4">
              {/* Emoji */}
              <span className="text-3xl">{obj.emoji}</span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground">{obj.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {obj.width}&quot; x {obj.height}&quot; x {obj.depth}&quot;
                </p>
                {obj.description && (
                  <p className="text-xs text-muted-foreground truncate">{obj.description}</p>
                )}
              </div>

              {/* Quantity */}
              <div className="text-center">
                <span className="text-lg font-semibold text-foreground">{obj.quantity}</span>
                <p className="text-xs text-muted-foreground">qty</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setEditingObject(obj)}
                >
                  <Edit2 className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDelete(obj.id)}
                >
                  <Trash2
                    className={`h-4 w-4 ${
                      deletingId === obj.id ? 'text-destructive' : 'text-muted-foreground'
                    }`}
                  />
                </Button>
              </div>
            </div>
            {deletingId === obj.id && (
              <p className="text-xs text-destructive mt-2">
                Click again to confirm delete
              </p>
            )}
          </Card>
        ))}

        {terrain.objects.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No 3D objects yet</p>
            <p className="text-sm mt-1">Add objects like trees, rocks, or buildings</p>
          </div>
        )}
      </div>

      {/* Add/Edit dialog */}
      <ObjectFormDialog
        open={isAddDialogOpen || editingObject !== null}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setEditingObject(null);
          }
        }}
        terrainTypeId={terrainTypeId}
        editObject={editingObject || undefined}
      />
    </div>
  );
}
