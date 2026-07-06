'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FileDown, FileText } from 'lucide-react';

const PIECES = [
  { emoji: '🌲', label: 'Forest tiles', count: 9, bar: 'bg-emerald-500/80', width: '100%' },
  { emoji: '🌊', label: 'River tiles', count: 8, bar: 'bg-sky-500/80', width: '88%' },
  { emoji: '⛰️', label: 'Hill tiles', count: 6, bar: 'bg-amber-600/80', width: '66%' },
  { emoji: '🏚️', label: 'Ruin tiles', count: 4, bar: 'bg-stone-400/80', width: '44%' },
];

type Phase = 'counting' | 'press' | 'doc' | 'reset';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function ExportDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const visibleRef = useRef(false);
  const [phase, setPhase] = useState<Phase>('reset');
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const timer = setTimeout(() => {
        setReduced(true);
        setPhase('doc');
      }, 0);
      return () => clearTimeout(timer);
    }

    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.25 }
    );
    io.observe(root);

    let alive = true;

    const waitVisible = async () => {
      while (alive && !visibleRef.current) await sleep(300);
    };

    const run = async () => {
      while (alive) {
        await waitVisible();
        if (!alive) return;
        setPhase('counting');
        await sleep(1800);
        if (!alive) return;
        setPhase('press');
        await sleep(280);
        if (!alive) return;
        setPhase('doc');
        await sleep(2800);
        if (!alive) return;
        setPhase('reset');
        await sleep(600);
      }
    };

    run();
    return () => {
      alive = false;
      io.disconnect();
    };
  }, []);

  const barsShown = phase !== 'reset';
  const docShown = phase === 'doc';

  return (
    <div ref={rootRef} className="flex flex-col h-full">
      {/* pieces summary */}
      <div className="rounded-lg border border-border bg-background/40 p-3 space-y-2.5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Pieces needed
        </div>
        {PIECES.map((piece, i) => (
          <div key={piece.label} className="flex items-center gap-2">
            <span className="w-5 text-sm text-center shrink-0">
              {piece.emoji}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-foreground truncate">{piece.label}</span>
                <span
                  className={`text-muted-foreground tabular-nums transition-opacity duration-300 ${
                    barsShown ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  ×{piece.count}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                <div
                  className={`h-full rounded-full ${piece.bar} transition-all ease-out`}
                  style={{
                    width: barsShown ? piece.width : '0%',
                    transitionDuration: reduced ? '0ms' : '900ms',
                    transitionDelay: barsShown && !reduced ? `${i * 140}ms` : '0ms',
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* export button + generated doc */}
      <div className="relative mt-3 flex items-center justify-between gap-2">
        <span
          className={`flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[11px] transition-all duration-150 ${
            phase === 'press'
              ? 'scale-90 bg-primary text-primary-foreground'
              : 'bg-secondary/60 text-foreground'
          }`}
        >
          <FileDown className="h-3.5 w-3.5" />
          Export PDF
        </span>
        <span
          className={`flex items-center gap-1.5 rounded-md border border-border bg-popover px-2.5 py-1.5 text-[11px] text-popover-foreground shadow-md transition-all duration-300 ${
            docShown
              ? 'translate-y-0 opacity-100 scale-100'
              : 'translate-y-2 opacity-0 scale-95'
          }`}
        >
          <FileText className="h-3.5 w-3.5 text-red-400" />
          battlefield-01.pdf
        </span>
      </div>

      <div className="mt-auto pt-4 text-[11px] text-muted-foreground">
        Get a printable shopping list for every map
      </div>
    </div>
  );
}
