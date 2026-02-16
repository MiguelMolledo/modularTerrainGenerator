'use client';

import React, { useState } from 'react';
import { useInventoryStore } from '@/store/inventoryStore';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmojiPicker } from '@/components/ui/EmojiPicker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PiecesGrid } from './PiecesGrid';
import { ObjectsList } from './ObjectsList';
import { Save, ChevronDown, ChevronUp, Wand2 } from 'lucide-react';

const TERRAIN_COLORS = [
  '#E5C07B', '#98C379', '#D19A66', '#61AFEF', '#56B6C2', '#E06C75',
  '#C678DD', '#ABB2BF', '#282C34', '#5C6370', '#BE5046', '#4EC9B0',
];

interface TerrainEditorProps {
  terrainTypeId: string;
}

export function TerrainEditor({ terrainTypeId }: TerrainEditorProps) {
  const { terrainTypes, updateTerrainType, isLoading } = useInventoryStore();
  const terrain = terrainTypes.find((t) => t.id === terrainTypeId);

  const [editedName, setEditedName] = useState(terrain?.name || '');
  const [editedColor, setEditedColor] = useState(terrain?.color || '#888888');
  const [editedIcon, setEditedIcon] = useState(terrain?.icon || '🗺️');
  const [editedDescription, setEditedDescription] = useState(terrain?.description || '');
  const [hasChanges, setHasChanges] = useState(false);
  const [showDescriptionEditor, setShowDescriptionEditor] = useState(false);

  // Update local state when terrain changes
  React.useEffect(() => {
    if (terrain) {
      setEditedName(terrain.name);
      setEditedColor(terrain.color);
      setEditedIcon(terrain.icon);
      setEditedDescription(terrain.description || '');
      setHasChanges(false);
    }
  }, [terrain]);

  if (!terrain) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Terrain type not found
        </CardContent>
      </Card>
    );
  }

  const handleSaveChanges = async () => {
    await updateTerrainType(terrainTypeId, {
      name: editedName,
      color: editedColor,
      icon: editedIcon,
      description: editedDescription,
    });
    setHasChanges(false);
  };

  return (
    <Card className="overflow-visible">
      <CardHeader className="border-b border-border overflow-visible">
        <div className="flex items-start gap-4">
          {/* Icon picker */}
          <EmojiPicker
            value={editedIcon}
            onChange={(emoji) => {
              setEditedIcon(emoji);
              setHasChanges(true);
            }}
          />

          <div className="flex-1">
            {/* Name input */}
            <input
              type="text"
              value={editedName}
              onChange={(e) => {
                setEditedName(e.target.value);
                setHasChanges(true);
              }}
              disabled={terrain.isDefault}
              className="text-xl font-bold bg-transparent border-b border-transparent hover:border-border focus:border-ring outline-none text-foreground w-full disabled:cursor-not-allowed disabled:opacity-50"
            />

            {/* Color picker */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-muted-foreground">Color:</span>
              <div className="flex gap-1">
                {TERRAIN_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setEditedColor(c);
                      setHasChanges(true);
                    }}
                    disabled={terrain.isDefault}
                    className={`w-5 h-5 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      editedColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-background' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {terrain.isDefault && (
              <p className="text-xs text-muted-foreground mt-2">
                Default terrain types cannot be renamed
              </p>
            )}
          </div>

          {/* Save button */}
          {hasChanges && (
            <Button onClick={handleSaveChanges} disabled={isLoading}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          )}
        </div>

        {/* Description section - collapsible */}
        <div className="mt-4 pt-4 border-t border-border">
          <button
            onClick={() => setShowDescriptionEditor(!showDescriptionEditor)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <Wand2 className="h-4 w-4 text-amber-500" />
            <span className="font-medium">AI Image Description</span>
            {showDescriptionEditor ? (
              <ChevronUp className="h-4 w-4 ml-auto" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-auto" />
            )}
            {editedDescription && !showDescriptionEditor && (
              <span className="text-xs text-muted-foreground truncate max-w-xs ml-2">
                {editedDescription.substring(0, 50)}...
              </span>
            )}
          </button>

          {showDescriptionEditor && (
            <div className="mt-3">
              <textarea
                value={editedDescription}
                onChange={(e) => {
                  setEditedDescription(e.target.value);
                  setHasChanges(true);
                }}
                placeholder="Describe this terrain for AI image generation. Be detailed about textures, colors, features, and atmosphere..."
                rows={4}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              />
              <p className="text-xs text-muted-foreground mt-2">
                This description is used when generating artistic battlemaps. Include details about textures, colors, typical features, and atmosphere.
              </p>
            </div>
          )}
        </div>
      </CardHeader>

      <Tabs defaultValue="pieces" className="w-full">
        <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent px-4">
          <TabsTrigger value="pieces" className="data-[state=active]:bg-card">
            Modular Pieces
          </TabsTrigger>
          <TabsTrigger value="objects" className="data-[state=active]:bg-card">
            3D Objects
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pieces" className="p-0 mt-0">
          <PiecesGrid terrainTypeId={terrainTypeId} />
        </TabsContent>

        <TabsContent value="objects" className="p-0 mt-0">
          <ObjectsList terrainTypeId={terrainTypeId} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
