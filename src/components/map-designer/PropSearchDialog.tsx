'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useMapStore } from '@/store/mapStore';
import { DEFAULT_PROPS } from '@/config/props';
import { ModularPiece } from '@/types';
import { Search, X } from 'lucide-react';

interface PropSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
}

export function PropSearchDialog({ isOpen, onClose, position }: PropSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    customProps,
    startSidebarDrag,
    setEditMode,
  } = useMapStore();

  // Combine default props with custom props
  const allProps = useMemo(() => {
    return [...DEFAULT_PROPS, ...customProps];
  }, [customProps]);

  // Filter props based on search query (name or tags)
  const filteredProps = useMemo(() => {
    if (!searchQuery.trim()) {
      return allProps.slice(0, 12); // Show first 12 when no search
    }

    const query = searchQuery.toLowerCase().trim();
    return allProps.filter((prop) => {
      // Match by name
      if (prop.name.toLowerCase().includes(query)) return true;
      // Match by tags
      if (prop.tags?.some(tag => tag.toLowerCase().includes(query))) return true;
      // Match by category
      if (prop.propCategory?.toLowerCase().includes(query)) return true;
      // Match by emoji
      if (prop.propEmoji?.includes(query)) return true;
      return false;
    }).slice(0, 20); // Limit to 20 results
  }, [allProps, searchQuery]);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Reset search when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Handle prop selection
  const handlePropSelect = (prop: ModularPiece) => {
    // Switch to props edit mode
    setEditMode('props');
    // Start sidebar drag (which sets selectedPieceId and enables placement)
    startSidebarDrag(prop.id);
    // Close the dialog
    onClose();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && filteredProps.length > 0) {
      handlePropSelect(filteredProps[0]);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className="fixed z-50 bg-card border border-border rounded-lg shadow-2xl overflow-hidden"
        style={{
          left: Math.min(position.x, window.innerWidth - 320),
          top: Math.min(position.y, window.innerHeight - 400),
          width: 300,
          maxHeight: 380,
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search props by name or tag..."
              className="w-full pl-8 pr-8 py-2 bg-background border border-border rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 px-1">
            Press Enter to select first, Esc to close
          </p>
        </div>

        {/* Results list */}
        <div className="overflow-y-auto max-h-[280px]">
          {filteredProps.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No props found for &quot;{searchQuery}&quot;
            </div>
          ) : (
            <div className="p-1">
              {filteredProps.map((prop) => (
                <button
                  key={prop.id}
                  onClick={() => handlePropSelect(prop)}
                  className="w-full flex items-center gap-3 p-2 rounded hover:bg-accent transition-colors text-left"
                >
                  <span className="text-2xl flex-shrink-0">{prop.propEmoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground font-medium truncate">
                      {prop.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {prop.size.label} • {prop.propCategory}
                      {prop.tags && prop.tags.length > 0 && (
                        <span className="ml-1 text-muted-foreground">
                          • {prop.tags.slice(0, 2).join(', ')}
                          {prop.tags.length > 2 && '...'}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
