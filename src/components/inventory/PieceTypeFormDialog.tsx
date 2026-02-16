'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useInventoryStore } from '@/store/inventoryStore';
import { useElevationStore, createElevationKey } from '@/store/elevationStore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { PieceShape, CornerElevations, DEFAULT_CORNER_ELEVATIONS, MagnetConfig } from '@/types';
import { Loader2, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';

interface PieceTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingShape: PieceShape | null;
}

// Standard sizes in inches (0.5 to 12 in 0.5 inch increments)
const STANDARD_SIZES = Array.from({ length: 24 }, (_, i) => (i + 1) * 0.5);
const DEFAULT_BASE_HEIGHT = 0.5;  // Default base height for pieces
const BASE_HEIGHT_OPTIONS = [0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3]; // Available base heights in inches
const MAX_ELEVATION = 2.5;
const STEP = 0.5;

export function PieceTypeFormDialog({
  open,
  onOpenChange,
  editingShape,
}: PieceTypeFormDialogProps) {
  const { createShape, updateShape, isLoading, shapes } = useInventoryStore();
  const { setElevation, getElevation } = useElevationStore();

  const [name, setName] = useState('');
  const [width, setWidth] = useState(3);
  const [height, setHeight] = useState(3);
  const [isDiagonal, setIsDiagonal] = useState(false);
  const [defaultRotation, setDefaultRotation] = useState(0);

  // Elevation state
  const [showElevation, setShowElevation] = useState(false);
  const [elevation, setElevationState] = useState<CornerElevations>(DEFAULT_CORNER_ELEVATIONS);

  // Magnets state
  const [showMagnets, setShowMagnets] = useState(false);
  const [magnets, setMagnets] = useState<MagnetConfig[]>([]);

  // Base height state
  const [baseHeight, setBaseHeight] = useState(DEFAULT_BASE_HEIGHT);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (editingShape && editingShape.id) {
        // Editing existing
        setName(editingShape.name);
        setWidth(editingShape.width);
        setHeight(editingShape.height);
        setIsDiagonal(editingShape.isDiagonal);
        setDefaultRotation(editingShape.defaultRotation);
        setBaseHeight(editingShape.baseHeight ?? DEFAULT_BASE_HEIGHT);
        // Load existing elevation
        const key = createElevationKey('_default', editingShape.shapeKey);
        const existingElevation = getElevation(key);
        if (existingElevation) {
          setElevationState(existingElevation);
          setShowElevation(true);
        } else {
          setElevationState(DEFAULT_CORNER_ELEVATIONS);
          setShowElevation(false);
        }
        // Load existing magnets
        if (editingShape.magnets && editingShape.magnets.length > 0) {
          setMagnets(editingShape.magnets);
          setShowMagnets(true);
        } else {
          setMagnets([]);
          setShowMagnets(false);
        }
      } else if (editingShape) {
        // Duplicating (has data but no id)
        setName(editingShape.name);
        setWidth(editingShape.width);
        setHeight(editingShape.height);
        setIsDiagonal(editingShape.isDiagonal);
        setDefaultRotation(editingShape.defaultRotation);
        setBaseHeight(editingShape.baseHeight ?? DEFAULT_BASE_HEIGHT);
        setElevationState(DEFAULT_CORNER_ELEVATIONS);
        setShowElevation(false);
        setMagnets(editingShape.magnets || []);
        setShowMagnets((editingShape.magnets?.length || 0) > 0);
      } else {
        // Creating new
        setName('');
        setWidth(3);
        setHeight(3);
        setIsDiagonal(false);
        setDefaultRotation(0);
        setBaseHeight(DEFAULT_BASE_HEIGHT);
        setElevationState(DEFAULT_CORNER_ELEVATIONS);
        setShowElevation(false);
        setMagnets([]);
        setShowMagnets(false);
      }
    }
  }, [open, editingShape, getElevation]);

  // Check if elevation is non-flat
  const hasElevation = elevation.nw !== 0 || elevation.ne !== 0 ||
                       elevation.sw !== 0 || elevation.se !== 0;

  // Generate shape key from dimensions and elevation
  // Pieces with different elevations are different piece types
  const generateShapeKey = () => {
    let key = `${width}x${height}`;

    if (isDiagonal) {
      const rotationLabel = ['tl', 'tr', 'br', 'bl'][defaultRotation / 90] || 'tl';
      key += `-diagonal-${rotationLabel}`;
    }

    // Add elevation to key if non-flat
    if (hasElevation) {
      key += `-e${elevation.nw}-${elevation.ne}-${elevation.sw}-${elevation.se}`;
    }

    return key;
  };

  // Real-time validation: check if shapeKey already exists
  const shapeKey = generateShapeKey();
  const existingConflict = useMemo(() => {
    // Don't check conflict when editing the same shape
    if (editingShape?.id) return null;

    const conflict = shapes.find(s => s.shapeKey === shapeKey);
    return conflict || null;
  }, [shapes, shapeKey, editingShape?.id]);

  // Generate default name
  const generateDefaultName = () => {
    let baseName = `${width}x${height}`;

    if (isDiagonal) {
      const rotationLabel = ['TL', 'TR', 'BR', 'BL'][defaultRotation / 90] || 'TL';
      baseName += ` Diagonal ${rotationLabel}`;
    }

    // Add elevation description to name
    if (hasElevation) {
      // Detect common patterns
      if (elevation.nw === elevation.ne && elevation.sw === elevation.se && elevation.nw > elevation.sw) {
        baseName += ' Ramp N';
      } else if (elevation.nw === elevation.ne && elevation.sw === elevation.se && elevation.nw < elevation.sw) {
        baseName += ' Ramp S';
      } else if (elevation.nw === elevation.sw && elevation.ne === elevation.se && elevation.ne > elevation.nw) {
        baseName += ' Ramp E';
      } else if (elevation.nw === elevation.sw && elevation.ne === elevation.se && elevation.nw > elevation.ne) {
        baseName += ' Ramp W';
      } else {
        baseName += ' Slope';
      }
    }

    return baseName;
  };

  // Handle corner elevation change
  const handleCornerChange = (corner: keyof CornerElevations, value: number) => {
    setElevationState((prev) => ({ ...prev, [corner]: value }));
  };

  // Magnet management functions
  const addMagnet = () => {
    setMagnets([...magnets, { size: '3x2', quantity: 1 }]);
  };

  const updateMagnet = (index: number, field: 'size' | 'quantity', value: string | number) => {
    const updated = [...magnets];
    if (field === 'size') {
      updated[index].size = value as string;
    } else {
      updated[index].quantity = Math.max(1, value as number);
    }
    setMagnets(updated);
  };

  const removeMagnet = (index: number) => {
    setMagnets(magnets.filter((_, i) => i !== index));
  };

  // Quick presets for elevation
  // Ramps go from 0.5" (base) to 3" (base + 2.5" max elevation)
  const applyPreset = (preset: string) => {
    switch (preset) {
      case 'flat':
        setElevationState({ nw: 0, ne: 0, sw: 0, se: 0 });
        break;
      case 'ramp-n':
        // North edge elevated: 0.5" at south, 3" at north
        setElevationState({ nw: 2.5, ne: 2.5, sw: 0, se: 0 });
        break;
      case 'ramp-s':
        // South edge elevated: 0.5" at north, 3" at south
        setElevationState({ nw: 0, ne: 0, sw: 2.5, se: 2.5 });
        break;
      case 'ramp-e':
        // East edge elevated: 0.5" at west, 3" at east
        setElevationState({ nw: 0, ne: 2.5, sw: 0, se: 2.5 });
        break;
      case 'ramp-w':
        // West edge elevated: 0.5" at east, 3" at west
        setElevationState({ nw: 2.5, ne: 0, sw: 2.5, se: 0 });
        break;
    }
  };

  const handleSubmit = async () => {
    // Don't submit if there's a conflict
    if (existingConflict) return;

    const finalName = name.trim() || generateDefaultName();
    // Filter out empty magnets
    const validMagnets = magnets.filter(m => m.size && m.quantity > 0);

    let result;
    if (editingShape && editingShape.id) {
      // Update existing
      result = await updateShape(editingShape.id, {
        name: finalName,
        width,
        height,
        isDiagonal,
        defaultRotation: isDiagonal ? defaultRotation : 0,
        baseHeight: baseHeight !== DEFAULT_BASE_HEIGHT ? baseHeight : undefined,
        magnets: validMagnets.length > 0 ? validMagnets : undefined,
      });
      if (result) {
        // Save elevation
        const key = createElevationKey('_default', editingShape.shapeKey);
        setElevation(key, elevation);
      }
    } else {
      // Create new
      result = await createShape({
        shapeKey,
        name: finalName,
        width,
        height,
        isDiagonal,
        defaultRotation: isDiagonal ? defaultRotation : 0,
        baseHeight: baseHeight !== DEFAULT_BASE_HEIGHT ? baseHeight : undefined,
        magnets: validMagnets.length > 0 ? validMagnets : undefined,
      });
      if (result) {
        // Save elevation for new shape
        const key = createElevationKey('_default', shapeKey);
        setElevation(key, elevation);
      }
    }

    onOpenChange(false);
  };

  const isEditing = editingShape && editingShape.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Piece Type' : 'Create Piece Type'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preview */}
          <div className="flex justify-center py-4 bg-card rounded-lg">
            {isDiagonal ? (
              <svg
                width="80"
                height="80"
                viewBox="0 0 80 80"
                style={{ transform: `rotate(${defaultRotation}deg)` }}
              >
                <polygon
                  points="0,80 80,80 80,0"
                  fill="#666"
                  stroke="#888"
                  strokeWidth="2"
                />
              </svg>
            ) : hasElevation ? (
              /* Isometric preview with elevation */
              <svg viewBox="0 0 120 100" className="w-28 h-24">
                {(() => {
                  const baseX = 60;
                  const baseY = 80;
                  const scaleX = 8;
                  const scaleY = 4;
                  const heightScale = 10;
                  const w = width;
                  const h = height;

                  const corners = {
                    sw: { x: baseX - w * scaleX / 2, y: baseY, z: elevation.sw * heightScale },
                    se: { x: baseX + w * scaleX / 2, y: baseY, z: elevation.se * heightScale },
                    nw: { x: baseX - w * scaleX / 2 - h * scaleY, y: baseY - h * scaleY, z: elevation.nw * heightScale },
                    ne: { x: baseX + w * scaleX / 2 - h * scaleY, y: baseY - h * scaleY, z: elevation.ne * heightScale },
                  };

                  const topPoints = [
                    `${corners.sw.x},${corners.sw.y - corners.sw.z - 5}`,
                    `${corners.se.x},${corners.se.y - corners.se.z - 5}`,
                    `${corners.ne.x},${corners.ne.y - corners.ne.z - 5}`,
                    `${corners.nw.x},${corners.nw.y - corners.nw.z - 5}`,
                  ].join(' ');

                  return (
                    <>
                      <polygon
                        points={`${corners.sw.x},${corners.sw.y - 5} ${corners.nw.x},${corners.nw.y - 5} ${corners.nw.x},${corners.nw.y - corners.nw.z - 5} ${corners.sw.x},${corners.sw.y - corners.sw.z - 5}`}
                        fill="#555"
                        stroke="#333"
                        strokeWidth="1"
                      />
                      <polygon
                        points={`${corners.sw.x},${corners.sw.y - 5} ${corners.se.x},${corners.se.y - 5} ${corners.se.x},${corners.se.y - corners.se.z - 5} ${corners.sw.x},${corners.sw.y - corners.sw.z - 5}`}
                        fill="#666"
                        stroke="#333"
                        strokeWidth="1"
                      />
                      <polygon
                        points={topPoints}
                        fill="#777"
                        stroke="#333"
                        strokeWidth="1"
                      />
                    </>
                  );
                })()}
              </svg>
            ) : (
              <div
                className="border-2 border-border bg-secondary"
                style={{
                  width: `${Math.min(80, width * 15)}px`,
                  height: `${Math.min(80, height * 15)}px`,
                }}
              />
            )}
          </div>

          {/* Name */}
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">
              Name (optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={generateDefaultName()}
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">
                Width (inches)
              </label>
              <select
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {STANDARD_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}&quot;
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">
                Height (inches)
              </label>
              <select
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {STANDARD_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}&quot;
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Diagonal toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isDiagonal"
              checked={isDiagonal}
              onChange={(e) => {
                setIsDiagonal(e.target.checked);
                if (!e.target.checked) {
                  setDefaultRotation(0);
                }
              }}
              className="w-4 h-4 rounded border-border bg-card text-primary focus:ring-ring"
            />
            <label htmlFor="isDiagonal" className="text-sm text-muted-foreground">
              Diagonal (triangular) piece
            </label>
          </div>

          {/* Rotation for diagonal */}
          {isDiagonal && (
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">
                Corner Position
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 0, label: 'TL', desc: 'Top-Left' },
                  { value: 90, label: 'TR', desc: 'Top-Right' },
                  { value: 180, label: 'BR', desc: 'Bottom-Right' },
                  { value: 270, label: 'BL', desc: 'Bottom-Left' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDefaultRotation(option.value)}
                    className={`p-2 rounded-lg border text-center ${
                      defaultRotation === option.value
                        ? 'bg-primary/20 border-primary ring-1 ring-ring'
                        : 'bg-card border-border hover:border-border'
                    }`}
                  >
                    <div className="text-sm font-medium text-foreground">
                      {option.label}
                    </div>
                    <div className="text-xs text-muted-foreground">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Base Height */}
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">
              Base Height (3D thickness)
            </label>
            <div className="flex flex-wrap gap-2">
              {BASE_HEIGHT_OPTIONS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setBaseHeight(h)}
                  className={`px-3 py-1.5 rounded-lg border text-sm ${
                    baseHeight === h
                      ? 'bg-primary/20 border-primary ring-1 ring-ring text-foreground'
                      : 'bg-card border-border hover:border-border text-muted-foreground'
                  }`}
                >
                  {h}&quot;
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Thickness of the piece in 3D view (default: 0.5&quot;)
            </p>
          </div>

          {/* Elevation Section (only for non-diagonal) */}
          {!isDiagonal && (
            <div className="border border-border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowElevation(!showElevation)}
                className="w-full px-4 py-3 flex items-center justify-between bg-secondary/50 hover:bg-card transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    3D Elevation
                  </span>
                  {hasElevation && (
                    <span className="text-xs bg-primary/30 text-primary px-2 py-0.5 rounded">
                      Configured
                    </span>
                  )}
                </div>
                {showElevation ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {showElevation && (
                <div className="p-4 space-y-4 border-t border-border">
                  {/* Presets */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyPreset('flat')}
                      className="text-xs"
                    >
                      Flat
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyPreset('ramp-n')}
                      className="text-xs"
                    >
                      Ramp N
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyPreset('ramp-s')}
                      className="text-xs"
                    >
                      Ramp S
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyPreset('ramp-e')}
                      className="text-xs"
                    >
                      Ramp E
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyPreset('ramp-w')}
                      className="text-xs"
                    >
                      Ramp W
                    </Button>
                  </div>

                  {/* Corner sliders - showing total height (base 0.5" + elevation) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">NW</span>
                        <span className="text-foreground font-mono">
                          {(baseHeight + elevation.nw).toFixed(1)}&quot;
                          <span className="text-muted-foreground text-xs ml-1">(+{elevation.nw.toFixed(1)})</span>
                        </span>
                      </div>
                      <Slider
                        value={[elevation.nw]}
                        onValueChange={([v]) => handleCornerChange('nw', v)}
                        min={0}
                        max={MAX_ELEVATION}
                        step={STEP}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">NE</span>
                        <span className="text-foreground font-mono">
                          {(baseHeight + elevation.ne).toFixed(1)}&quot;
                          <span className="text-muted-foreground text-xs ml-1">(+{elevation.ne.toFixed(1)})</span>
                        </span>
                      </div>
                      <Slider
                        value={[elevation.ne]}
                        onValueChange={([v]) => handleCornerChange('ne', v)}
                        min={0}
                        max={MAX_ELEVATION}
                        step={STEP}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">SW</span>
                        <span className="text-foreground font-mono">
                          {(baseHeight + elevation.sw).toFixed(1)}&quot;
                          <span className="text-muted-foreground text-xs ml-1">(+{elevation.sw.toFixed(1)})</span>
                        </span>
                      </div>
                      <Slider
                        value={[elevation.sw]}
                        onValueChange={([v]) => handleCornerChange('sw', v)}
                        min={0}
                        max={MAX_ELEVATION}
                        step={STEP}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">SE</span>
                        <span className="text-foreground font-mono">
                          {(baseHeight + elevation.se).toFixed(1)}&quot;
                          <span className="text-muted-foreground text-xs ml-1">(+{elevation.se.toFixed(1)})</span>
                        </span>
                      </div>
                      <Slider
                        value={[elevation.se]}
                        onValueChange={([v]) => handleCornerChange('se', v)}
                        min={0}
                        max={MAX_ELEVATION}
                        step={STEP}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Base height: {baseHeight}&quot;. Sliders add 0-2.5&quot; elevation per corner (total: {baseHeight}&quot; - {(baseHeight + MAX_ELEVATION).toFixed(1)}&quot;).
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Magnets Section */}
          <div className="border border-border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowMagnets(!showMagnets)}
              className="w-full px-4 py-3 flex items-center justify-between bg-secondary/50 hover:bg-card transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  🧲 Magnets
                </span>
                {magnets.length > 0 && (
                  <span className="text-xs bg-purple-600/30 text-purple-400 px-2 py-0.5 rounded">
                    {magnets.reduce((sum, m) => sum + m.quantity, 0)} total
                  </span>
                )}
              </div>
              {showMagnets ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {showMagnets && (
              <div className="p-4 space-y-3 border-t border-border">
                {magnets.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No magnets configured
                  </p>
                ) : (
                  <div className="space-y-2">
                    {magnets.map((magnet, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={magnet.size}
                          onChange={(e) => updateMagnet(index, 'size', e.target.value)}
                          placeholder="Size (e.g., 3x2)"
                          className="flex-1 bg-card border border-border rounded px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                        <span className="text-muted-foreground text-sm">×</span>
                        <input
                          type="number"
                          value={magnet.quantity}
                          onChange={(e) => updateMagnet(index, 'quantity', parseInt(e.target.value) || 1)}
                          min={1}
                          className="w-16 bg-card border border-border rounded px-2 py-1.5 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeMagnet(index)}
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMagnet}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Magnet Type
                </Button>

                <p className="text-xs text-muted-foreground">
                  Enter magnet dimensions (e.g., 3x2, 5x10) and quantity per piece.
                </p>
              </div>
            )}
          </div>

          {/* Generated key preview */}
          <div className={`rounded-lg p-3 ${existingConflict ? 'bg-destructive/20 border border-destructive/50' : 'bg-secondary/50'}`}>
            <p className="text-xs text-muted-foreground">
              Shape key: <span className="text-foreground font-mono">{shapeKey}</span>
            </p>
            {existingConflict && (
              <p className="text-xs text-destructive mt-1">
                ⚠ Conflict: "{existingConflict.name}" already uses this key
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !!existingConflict}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Create Piece Type'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
