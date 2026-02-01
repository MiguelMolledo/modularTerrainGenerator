'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Search, X, Plus, Minus, Wand2, Image, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { DEFAULT_PROPS, PROP_CATEGORIES, PROP_SIZES } from '@/config/props';
import { ModularPiece, PropCategory } from '@/types';

interface PropsInventoryProps {
  onOpenAIDialog?: () => void;
  customProps?: ModularPiece[];
  onCreateProp?: (prop: ModularPiece) => void;
  onUpdateProp?: (prop: ModularPiece) => void;
  onDeleteProp?: (propId: string) => void;
}

// Local state for prop quantities (will be persisted to Supabase later)
interface PropQuantity {
  [propId: string]: number;
}

// Image optimization function - uses PNG to preserve transparency
const optimizeImage = (file: File, maxSize: number = 256): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Scale down if larger than maxSize
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Clear canvas for transparency support
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        // Use PNG to preserve transparency
        const optimized = canvas.toDataURL('image/png');
        resolve(optimized);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export function PropsInventory({
  onOpenAIDialog,
  customProps = [],
  onCreateProp,
  onUpdateProp,
  onDeleteProp
}: PropsInventoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PropCategory | 'all'>('all');
  const [quantities, setQuantities] = useState<PropQuantity>(() => {
    // Initialize with default quantities
    const initial: PropQuantity = {};
    DEFAULT_PROPS.forEach(prop => {
      initial[prop.id] = prop.quantity;
    });
    return initial;
  });

  // Create/Edit prop dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProp, setEditingProp] = useState<ModularPiece | null>(null);
  const [newPropName, setNewPropName] = useState('');
  const [newPropEmoji, setNewPropEmoji] = useState('📦');
  const [newPropCategory, setNewPropCategory] = useState<PropCategory>('custom');
  const [newPropSize, setNewPropSize] = useState<keyof typeof PROP_SIZES>('medium');
  const [newPropImage, setNewPropImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Handle image upload
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setIsUploadingImage(true);
    try {
      const optimized = await optimizeImage(file, 256);
      setNewPropImage(optimized);
    } catch (err) {
      console.error('Failed to optimize image:', err);
      alert('Failed to process image');
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  }, []);

  // Reset create dialog state
  const resetCreateDialog = useCallback(() => {
    setNewPropName('');
    setNewPropEmoji('📦');
    setNewPropCategory('custom');
    setNewPropSize('medium');
    setNewPropImage(null);
    setEditingProp(null);
  }, []);

  // Open create dialog
  const openCreateDialog = useCallback(() => {
    resetCreateDialog();
    setShowCreateDialog(true);
  }, [resetCreateDialog]);

  // Open edit dialog
  const openEditDialog = useCallback((prop: ModularPiece) => {
    setEditingProp(prop);
    setNewPropName(prop.name);
    setNewPropEmoji(prop.propEmoji || '📦');
    setNewPropCategory(prop.propCategory || 'custom');
    const sizeKey = Object.entries(PROP_SIZES).find(
      ([, size]) => size.width === prop.size.width && size.height === prop.size.height
    )?.[0] as keyof typeof PROP_SIZES || 'medium';
    setNewPropSize(sizeKey);
    setNewPropImage(prop.propImage || null);
    setShowCreateDialog(true);
  }, []);

  // Handle create/update prop
  const handleSaveProp = useCallback(() => {
    if (!newPropName.trim()) return;

    const sizeConfig = PROP_SIZES[newPropSize];

    if (editingProp) {
      // Update existing prop
      const updatedProp: ModularPiece = {
        ...editingProp,
        name: newPropName.trim(),
        propEmoji: newPropImage ? undefined : newPropEmoji,
        propImage: newPropImage || undefined,
        propCategory: newPropCategory,
        size: {
          width: sizeConfig.width,
          height: sizeConfig.height,
          label: sizeConfig.label,
        },
      };
      onUpdateProp?.(updatedProp);
    } else {
      // Create new prop
      const newProp: ModularPiece = {
        id: `custom-prop-${Date.now()}`,
        name: newPropName.trim(),
        terrainTypeId: 'prop',
        size: {
          width: sizeConfig.width,
          height: sizeConfig.height,
          label: sizeConfig.label,
        },
        isDiagonal: false,
        quantity: 99,
        pieceType: 'prop',
        propEmoji: newPropImage ? undefined : newPropEmoji,
        propImage: newPropImage || undefined,
        propCategory: newPropCategory,
      };
      onCreateProp?.(newProp);
    }

    setShowCreateDialog(false);
    resetCreateDialog();
  }, [newPropName, newPropEmoji, newPropCategory, newPropSize, newPropImage, editingProp, onCreateProp, onUpdateProp, resetCreateDialog]);

  // Combine default and custom props
  const allProps = useMemo(() => {
    return [...DEFAULT_PROPS, ...customProps];
  }, [customProps]);

  // Filter props by search and category
  const filteredProps = useMemo(() => {
    let props = allProps;

    // Filter by category
    if (selectedCategory !== 'all') {
      props = props.filter(p => p.propCategory === selectedCategory);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      props = props.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.propEmoji?.includes(query) ||
        p.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return props;
  }, [searchQuery, selectedCategory, allProps]);

  // Group props by category for display
  const propsByCategory = useMemo(() => {
    const groups = new Map<PropCategory, ModularPiece[]>();

    filteredProps.forEach(prop => {
      const category = prop.propCategory || 'custom';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(prop);
    });

    return groups;
  }, [filteredProps]);

  const updateQuantity = (propId: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [propId]: Math.max(0, (prev[propId] || 0) + delta),
    }));
  };

  const setQuantity = (propId: string, value: number) => {
    setQuantities(prev => ({
      ...prev,
      [propId]: Math.max(0, value),
    }));
  };

  const totalProps = Object.values(quantities).reduce((sum, q) => sum + q, 0);
  const uniqueProps = Object.values(quantities).filter(q => q > 0).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Props Library</h2>
          <p className="text-sm text-gray-400">
            {uniqueProps} unique props ({totalProps} total available)
            {customProps.length > 0 && ` · ${customProps.length} custom`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={openCreateDialog}
            variant="outline"
            className="border-gray-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Prop
          </Button>
          {onOpenAIDialog && (
            <Button
              onClick={onOpenAIDialog}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Wand2 className="h-4 w-4 mr-2" />
              AI Generate
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search props..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-8 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            selectedCategory === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          All
        </button>
        {PROP_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <span>{cat.icon}</span>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Props Grid */}
      <div className="space-y-6">
        {selectedCategory === 'all' ? (
          // Show grouped by category
          Array.from(propsByCategory.entries()).map(([category, props]) => {
            const categoryInfo = PROP_CATEGORIES.find(c => c.id === category);
            return (
              <div key={category}>
                <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                  <span className="text-lg">{categoryInfo?.icon}</span>
                  {categoryInfo?.name || 'Custom'} ({props.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {props.map(prop => {
                    const isCustom = customProps.some(cp => cp.id === prop.id);
                    return (
                      <PropCard
                        key={prop.id}
                        prop={prop}
                        quantity={quantities[prop.id] || 0}
                        onQuantityChange={(delta) => updateQuantity(prop.id, delta)}
                        onSetQuantity={(value) => setQuantity(prop.id, value)}
                        isCustom={isCustom}
                        onEdit={isCustom ? () => openEditDialog(prop) : undefined}
                        onDelete={isCustom ? () => onDeleteProp?.(prop.id) : undefined}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          // Show flat list for selected category
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProps.map(prop => {
              const isCustom = customProps.some(cp => cp.id === prop.id);
              return (
                <PropCard
                  key={prop.id}
                  prop={prop}
                  quantity={quantities[prop.id] || 0}
                  onQuantityChange={(delta) => updateQuantity(prop.id, delta)}
                  onSetQuantity={(value) => setQuantity(prop.id, value)}
                  isCustom={isCustom}
                  onEdit={isCustom ? () => openEditDialog(prop) : undefined}
                  onDelete={isCustom ? () => onDeleteProp?.(prop.id) : undefined}
                />
              );
            })}
          </div>
        )}

        {filteredProps.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No props found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Create/Edit Prop Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          resetCreateDialog();
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProp ? 'Edit Prop' : 'Create Prop'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">
                Name
              </label>
              <input
                type="text"
                value={newPropName}
                onChange={(e) => setNewPropName(e.target.value)}
                placeholder="e.g., Wooden Chair"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">
                Image (optional)
              </label>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              {newPropImage ? (
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-800 border border-gray-700">
                    <img
                      src={newPropImage}
                      alt="Prop preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={isUploadingImage}
                    >
                      Change
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNewPropImage(null)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="w-full justify-center gap-2"
                >
                  {isUploadingImage ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Image className="h-4 w-4" />
                      Upload Image
                    </>
                  )}
                </Button>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Image will be resized to 256px (PNG, preserves transparency)
              </p>
            </div>

            {/* Emoji (only if no image) */}
            {!newPropImage && (
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">
                  Emoji
                </label>
                <div className="flex items-center gap-2">
                  <div className="text-3xl w-12 h-12 flex items-center justify-center bg-gray-800 border border-gray-700 rounded-lg">
                    {newPropEmoji}
                  </div>
                  <input
                    type="text"
                    value={newPropEmoji}
                    onChange={(e) => {
                      const emoji = e.target.value.slice(-2);
                      if (emoji) setNewPropEmoji(emoji);
                    }}
                    className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-center text-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={2}
                  />
                </div>
              </div>
            )}

            {/* Category */}
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">
                Category
              </label>
              <select
                value={newPropCategory}
                onChange={(e) => setNewPropCategory(e.target.value as PropCategory)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PROP_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Size */}
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">
                Size
              </label>
              <select
                value={newPropSize}
                onChange={(e) => setNewPropSize(e.target.value as keyof typeof PROP_SIZES)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(PROP_SIZES).map(([key, size]) => (
                  <option key={key} value={key}>
                    {size.label} ({size.width}&quot; x {size.height}&quot;)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                resetCreateDialog();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProp}
              disabled={!newPropName.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {editingProp ? 'Save Changes' : 'Create Prop'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Individual prop card component
interface PropCardProps {
  prop: ModularPiece;
  quantity: number;
  onQuantityChange: (delta: number) => void;
  onSetQuantity: (value: number) => void;
  isCustom?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

function PropCard({ prop, quantity, onQuantityChange, onSetQuantity, isCustom, onEdit, onDelete }: PropCardProps) {
  const sizeLabel = Object.entries(PROP_SIZES).find(
    ([, size]) => size.width === prop.size.width && size.height === prop.size.height
  )?.[0] || 'custom';

  return (
    <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-start gap-3">
        {/* Emoji or Image */}
        <div className="text-3xl flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-900 rounded-lg overflow-hidden">
          {prop.propImage ? (
            <img src={prop.propImage} alt={prop.name} className="w-full h-full object-cover" />
          ) : (
            prop.propEmoji
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-white truncate">{prop.name}</h4>
            {isCustom && (
              <span className="text-xs px-1.5 py-0.5 bg-purple-600/30 text-purple-300 rounded">
                Custom
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 capitalize">{sizeLabel} ({prop.size.width}&quot; x {prop.size.height}&quot;)</p>
        </div>

        {/* Edit/Delete for custom props */}
        {isCustom && (
          <div className="flex gap-1">
            <button
              onClick={onEdit}
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700"
              title="Edit prop"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-gray-700"
              title="Delete prop"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Tags */}
      {prop.tags && prop.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {prop.tags.slice(0, 4).map(tag => (
            <span
              key={tag}
              className="px-1.5 py-0.5 text-xs bg-gray-700 text-gray-300 rounded"
            >
              {tag}
            </span>
          ))}
          {prop.tags.length > 4 && (
            <span className="px-1.5 py-0.5 text-xs bg-gray-700 text-gray-400 rounded">
              +{prop.tags.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Quantity Control */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm text-gray-400">Quantity:</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onQuantityChange(-1)}
            disabled={quantity <= 0}
            className="p-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            type="number"
            value={quantity}
            onChange={(e) => onSetQuantity(parseInt(e.target.value) || 0)}
            className="w-14 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-center text-white text-sm"
            min={0}
          />
          <button
            onClick={() => onQuantityChange(1)}
            className="p-1 rounded bg-gray-700 hover:bg-gray-600"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
