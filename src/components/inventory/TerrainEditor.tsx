'use client';

import React, { useState } from 'react';
import { useInventoryStore } from '@/store/inventoryStore';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PiecesGrid } from './PiecesGrid';
import { ObjectsList } from './ObjectsList';
import { Save } from 'lucide-react';

const TERRAIN_EMOJIS = ['🏜️', '🌲', '🏔️', '🌊', '🐊', '🌋', '❄️', '🌾', '🏛️', '🌙', '☀️', '🌸'];
const TERRAIN_COLORS = [
  '#E5C07B', '#98C379', '#D19A66', '#61AFEF', '#56B6C2', '#E06C75',
  '#C678DD', '#ABB2BF', '#282C34', '#5C6370', '#BE5046', '#E5C07B',
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
  const [hasChanges, setHasChanges] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const iconButtonRef = React.useRef<HTMLButtonElement>(null);

  // Update local state when terrain changes
  React.useEffect(() => {
    if (terrain) {
      setEditedName(terrain.name);
      setEditedColor(terrain.color);
      setEditedIcon(terrain.icon);
      setHasChanges(false);
    }
  }, [terrain]);

  // Close icon picker when clicking outside
  React.useEffect(() => {
    if (!showIconPicker) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.icon-picker-container')) {
        setShowIconPicker(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showIconPicker]);

  if (!terrain) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
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
    });
    setHasChanges(false);
  };

  return (
    <Card className="overflow-visible">
      <CardHeader className="border-b border-gray-800 overflow-visible">
        <div className="flex items-start gap-4">
          {/* Icon picker */}
          <div className="relative icon-picker-container">
            <button
              ref={iconButtonRef}
              onClick={() => {
                if (!showIconPicker && iconButtonRef.current) {
                  const rect = iconButtonRef.current.getBoundingClientRect();
                  setPickerPosition({
                    top: rect.bottom + 8,
                    left: rect.left,
                  });
                }
                setShowIconPicker(!showIconPicker);
              }}
              className="text-4xl p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
            >
              {editedIcon}
            </button>
            {showIconPicker && (
              <div
                className="fixed bg-gray-900 border border-gray-600 rounded-lg p-3 grid grid-cols-4 gap-2 shadow-2xl"
                style={{
                  zIndex: 9999,
                  top: pickerPosition.top,
                  left: pickerPosition.left,
                }}
              >
                {TERRAIN_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setEditedIcon(emoji);
                      setHasChanges(true);
                      setShowIconPicker(false);
                    }}
                    className={`w-12 h-12 text-2xl rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors ${
                      editedIcon === emoji ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-gray-800'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

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
              className="text-xl font-bold bg-transparent border-b border-transparent hover:border-gray-600 focus:border-blue-500 outline-none text-white w-full disabled:cursor-not-allowed disabled:opacity-50"
            />

            {/* Color picker */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-gray-400">Color:</span>
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
                      editedColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-900' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {terrain.isDefault && (
              <p className="text-xs text-gray-500 mt-2">
                Default terrain types cannot be renamed
              </p>
            )}
          </div>

          {/* Save button */}
          {hasChanges && !terrain.isDefault && (
            <Button onClick={handleSaveChanges} disabled={isLoading}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          )}
        </div>
      </CardHeader>

      <Tabs defaultValue="pieces" className="w-full">
        <TabsList className="w-full justify-start border-b border-gray-800 rounded-none bg-transparent px-4">
          <TabsTrigger value="pieces" className="data-[state=active]:bg-gray-800">
            Modular Pieces
          </TabsTrigger>
          <TabsTrigger value="objects" className="data-[state=active]:bg-gray-800">
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
