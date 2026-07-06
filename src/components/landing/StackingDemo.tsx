'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Layers } from 'lucide-react';

const LEVELS = [
  {
    label: 'Level 0 · Ground',
    size: '92%',
    lift: 0,
    face: 'bg-emerald-600/50 border-emerald-500/60',
    dot: 'bg-emerald-500',
  },
  {
    label: 'Level 1 · Hill',
    size: '62%',
    lift: 26,
    face: 'bg-amber-600/50 border-amber-500/60',
    dot: 'bg-amber-500',
  },
  {
    label: 'Level 2 · Peak',
    size: '36%',
    lift: 52,
    face: 'bg-stone-400/50 border-stone-300/60',
    dot: 'bg-stone-400',
  },
];

// step 0..2 reveal levels, 3-4 hold, 5 clears before looping
const TOTAL_STEPS = 6;

export default function StackingDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const timer = setTimeout(() => {
        setReduced(true);
        setStep(LEVELS.length - 1);
      }, 0);
      return () => clearTimeout(timer);
    }

    const root = rootRef.current;
    if (!root) return;
    let visible = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0.25 }
    );
    io.observe(root);

    const interval = setInterval(() => {
      if (!visible) return;
      setStep((s) => (s + 1) % TOTAL_STEPS);
    }, 1000);

    return () => {
      clearInterval(interval);
      io.disconnect();
    };
  }, []);

  const visibleLevels = step >= TOTAL_STEPS - 1 ? 0 : Math.min(step + 1, LEVELS.length);

  return (
    <div ref={rootRef} className="flex flex-col h-full">
      {/* isometric stage */}
      <div
        className="relative h-52 rounded-lg border border-border bg-gradient-to-br from-card to-background overflow-hidden"
        style={{ perspective: '900px' }}
      >
        {LEVELS.map((level, i) => {
          const shown = i < visibleLevels;
          return (
            <div
              key={level.label}
              className={`absolute left-1/2 top-1/2 rounded-lg border transition-all duration-700 ease-out ${level.face}`}
              style={{
                width: level.size,
                aspectRatio: '1 / 1',
                transform: `translate(-50%, calc(-38% - ${
                  shown ? level.lift : level.lift + 46
                }px)) rotateX(58deg) rotateZ(45deg)`,
                opacity: shown ? 1 : 0,
                boxShadow: shown
                  ? '0 24px 32px -18px rgba(0,0,0,0.45)'
                  : 'none',
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
                backgroundSize: '14% 14%',
              }}
            />
          );
        })}
      </div>

      {/* level legend */}
      <div className="mt-4 space-y-2">
        {LEVELS.map((level, i) => {
          const shown = i < visibleLevels || reduced;
          return (
            <div
              key={level.label}
              className={`flex items-center gap-2 text-[11px] transition-all duration-500 ${
                shown
                  ? 'opacity-100 translate-x-0 text-foreground'
                  : 'opacity-35 -translate-x-1 text-muted-foreground'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${level.dot}`} />
              {level.label}
            </div>
          );
        })}
      </div>

      <div className="mt-auto flex items-center gap-1.5 pt-4 text-[11px] text-muted-foreground">
        <Layers className="h-3.5 w-3.5" />
        Stack pieces on multiple elevation levels
      </div>
    </div>
  );
}
