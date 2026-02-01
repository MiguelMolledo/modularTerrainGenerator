'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SavedMap } from '@/types';
import { useMapInventoryStore } from '@/store/mapInventoryStore';
import { Trash2, Copy, Edit2, Download, MoreVertical, ImagePlus, ImageOff, Camera, FileText } from 'lucide-react';

interface MapCardProps {
  map: SavedMap;
  onExport: (map: SavedMap) => void;
  onExportReport: (map: SavedMap) => void;
}

export function MapCard({ map, onExport, onExportReport }: MapCardProps) {
  const router = useRouter();
  const { deleteMap, duplicateMap, renameMap, uploadCustomThumbnail, removeCustomThumbnail } = useMapInventoryStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(map.name);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
        setIsDeleting(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleEdit = () => {
    router.push(`/designer?mapId=${map.id}`);
  };

  const handleDuplicate = async () => {
    setIsMenuOpen(false);
    await duplicateMap(map.id, `${map.name} (Copy)`);
  };

  const handleDelete = async () => {
    if (isDeleting) {
      // Second click - actually delete
      await deleteMap(map.id);
      setIsDeleting(false);
      setIsMenuOpen(false);
    } else {
      // First click - show confirmation
      setIsDeleting(true);
      // Auto-cancel after 3 seconds
      setTimeout(() => setIsDeleting(false), 3000);
      // Don't close menu - wait for confirmation
    }
  };

  const handleRename = async () => {
    if (newName.trim() && newName !== map.name) {
      await renameMap(map.id, newName.trim());
    }
    setIsRenaming(false);
  };

  const handleExport = () => {
    setIsMenuOpen(false);
    onExport(map);
  };

  const handleExportReport = () => {
    setIsMenuOpen(false);
    onExportReport(map);
  };

  const handleUploadClick = () => {
    setIsMenuOpen(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setIsUploading(true);
    await uploadCustomThumbnail(map.id, file);
    setIsUploading(false);

    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveThumbnail = async () => {
    setIsMenuOpen(false);
    await removeCustomThumbnail(map.id);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card className={`group hover:ring-2 hover:ring-blue-500 transition-all overflow-visible relative ${isMenuOpen ? 'z-[9999]' : ''}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Flip Card Container */}
      <div
        className="h-32 relative cursor-pointer perspective-1000 overflow-hidden"
        onMouseEnter={() => map.snapshot && setIsFlipped(true)}
        onMouseLeave={() => setIsFlipped(false)}
        style={{ perspective: '1000px' }}
      >
        <div
          className="w-full h-full transition-transform duration-500 relative"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front - Custom Thumbnail */}
          <div
            className="absolute inset-0 bg-gray-800"
            style={{ backfaceVisibility: 'hidden' }}
            onClick={handleEdit}
          >
            {isUploading ? (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="animate-spin text-2xl mb-1">⏳</div>
                  <div className="text-xs">Uploading...</div>
                </div>
              </div>
            ) : map.thumbnail ? (
              <img
                src={map.thumbnail}
                alt={map.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="text-3xl mb-1">🗺️</div>
                  <div className="text-xs">No preview</div>
                </div>
              </div>
            )}

            {/* Custom thumbnail badge */}
            {map.isCustomThumbnail && map.thumbnail && !isUploading && (
              <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded">
                Custom
              </div>
            )}

            {/* Snapshot indicator - only if there's a snapshot to flip to */}
            {map.snapshot && !isFlipped && (
              <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                <Camera className="h-3 w-3" />
                Hover
              </div>
            )}

            {/* Overlay on hover - front side */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button variant="secondary" size="sm" onClick={handleEdit}>
                Open Map
              </Button>
            </div>
          </div>

          {/* Back - Auto-generated Snapshot */}
          <div
            className="absolute inset-0 bg-gray-800"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
            onClick={handleEdit}
          >
            {map.snapshot ? (
              <img
                src={map.snapshot}
                alt={`${map.name} snapshot`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="text-3xl mb-1">📷</div>
                  <div className="text-xs">No snapshot</div>
                </div>
              </div>
            )}

            {/* Snapshot badge */}
            <div className="absolute top-2 left-2 bg-gray-600 text-white text-xs px-1.5 py-0.5 rounded">
              Snapshot
            </div>

            {/* Overlay on hover - back side */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button variant="secondary" size="sm" onClick={handleEdit}>
                Open Map
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Menu button - OUTSIDE flip container to avoid overflow:hidden clipping */}
      <div ref={menuRef} className="absolute top-2 right-2 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white"
          onClick={(e) => {
            e.stopPropagation();
            setIsMenuOpen(!isMenuOpen);
          }}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>

        {/* Dropdown menu */}
        {isMenuOpen && (
          <div
            className="absolute right-0 top-10 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[160px] z-[9999] max-h-[400px] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-full px-3 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center gap-2"
              onClick={handleEdit}
            >
              <Edit2 className="h-4 w-4" /> Edit
            </button>
            <button
              className="w-full px-3 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center gap-2"
              onClick={handleDuplicate}
            >
              <Copy className="h-4 w-4" /> Duplicate
            </button>
            <button
              className="w-full px-3 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center gap-2"
              onClick={handleExport}
            >
              <Download className="h-4 w-4" /> Export JSON
            </button>
            <button
              className="w-full px-3 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center gap-2"
              onClick={handleExportReport}
            >
              <FileText className="h-4 w-4" /> Export Report
            </button>
            <hr className="my-1 border-gray-700" />
            <button
              className="w-full px-3 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center gap-2"
              onClick={handleUploadClick}
              disabled={isUploading}
            >
              <ImagePlus className="h-4 w-4" />
              {isUploading ? 'Uploading...' : 'Upload Thumbnail'}
            </button>
            {map.isCustomThumbnail && (
              <button
                className="w-full px-3 py-2 text-left text-sm text-orange-400 hover:bg-gray-700 flex items-center gap-2"
                onClick={handleRemoveThumbnail}
              >
                <ImageOff className="h-4 w-4" /> Remove Custom
              </button>
            )}
            <hr className="my-1 border-gray-700" />
            <button
              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                isDeleting
                  ? 'text-red-400 bg-red-950 hover:bg-red-900'
                  : 'text-red-400 hover:bg-gray-700'
              }`}
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? 'Click to confirm' : 'Delete'}
            </button>
          </div>
        )}
      </div>

      <CardContent className="p-3">
        {/* Name */}
        {isRenaming ? (
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') {
                setNewName(map.name);
                setIsRenaming(false);
              }
            }}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
            autoFocus
          />
        ) : (
          <h3
            className="font-medium text-white text-sm truncate cursor-pointer hover:text-blue-400"
            onClick={() => setIsRenaming(true)}
            title="Click to rename"
          >
            {map.name}
          </h3>
        )}

        {/* Info */}
        <div className="mt-1 text-xs text-gray-400 flex justify-between">
          <span>
            {map.mapWidth}&quot; x {map.mapHeight}&quot;
          </span>
          <span>{map.placedPieces.length} pieces</span>
        </div>

        {/* Date */}
        <div className="mt-1 text-xs text-gray-500">
          Updated {formatDate(map.updatedAt)}
        </div>
      </CardContent>
    </Card>
  );
}
