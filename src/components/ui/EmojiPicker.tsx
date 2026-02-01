'use client';

import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Smile } from 'lucide-react';
import { Button } from './button';

// Dynamically import Picker to avoid SSR issues
const Picker = dynamic(
  () => import('@emoji-mart/react').then((mod) => mod.default),
  { ssr: false, loading: () => <div className="w-[352px] h-[435px] bg-gray-800 animate-pulse rounded-lg" /> }
);

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  className?: string;
}

export function EmojiPicker({ value, onChange, className }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [emojiData, setEmojiData] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load emoji data dynamically
  useEffect(() => {
    import('@emoji-mart/data').then((data) => {
      setEmojiData(data.default);
    });
  }, []);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleEmojiSelect = (emoji: any) => {
    onChange(emoji.native);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className || ''}`}>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="h-12 w-12 text-2xl p-0 border-gray-700 hover:border-gray-600"
      >
        {value || <Smile className="h-5 w-5 text-gray-400" />}
      </Button>

      {isOpen && emojiData && (
        <div className="absolute z-50 mt-2 left-0">
          <Picker
            data={emojiData}
            onEmojiSelect={handleEmojiSelect}
            theme="dark"
            previewPosition="none"
            skinTonePosition="search"
            navPosition="top"
            perLine={8}
            maxFrequentRows={2}
          />
        </div>
      )}
    </div>
  );
}
