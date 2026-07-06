'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, Cloud, MousePointer2 } from 'lucide-react';

const COLS = 12;
const ROWS = 8;

type PieceKey = 'forest' | 'hill' | 'river' | 'ruin' | 'rock';

const PALETTE: { key: PieceKey; label: string; emoji: string; cell: string }[] =
  [
    { key: 'forest', label: 'Forest', emoji: '🌲', cell: 'bg-emerald-500/70' },
    { key: 'hill', label: 'Hill', emoji: '⛰️', cell: 'bg-amber-600/70' },
    { key: 'river', label: 'River', emoji: '🌊', cell: 'bg-sky-500/70' },
    { key: 'ruin', label: 'Ruin', emoji: '🏚️', cell: 'bg-stone-400/70' },
    { key: 'rock', label: 'Rock', emoji: '🗿', cell: 'bg-zinc-500/70' },
  ];

// Scripted build order: each step drags one piece from the palette onto the grid
const SCRIPT: { piece: PieceKey; cells: [number, number][] }[] = [
  {
    piece: 'forest',
    cells: [
      [1, 1],
      [2, 1],
      [1, 2],
      [2, 2],
    ],
  },
  {
    piece: 'hill',
    cells: [
      [9, 1],
      [8, 1],
      [10, 1],
      [8, 2],
      [9, 2],
      [10, 2],
    ],
  },
  {
    piece: 'river',
    cells: [
      [4, 5],
      [0, 6],
      [1, 6],
      [2, 6],
      [3, 6],
      [4, 6],
      [5, 5],
      [6, 5],
      [7, 5],
    ],
  },
  {
    piece: 'forest',
    cells: [
      [4, 2],
      [5, 2],
      [4, 3],
      [5, 3],
    ],
  },
  {
    piece: 'ruin',
    cells: [
      [9, 3],
      [10, 3],
      [9, 4],
      [10, 4],
    ],
  },
  { piece: 'rock', cells: [[7, 7]] },
];

type Placement = { id: number; piece: PieceKey; cells: string[] };

const cellKey = (c: number, r: number) => `${c}-${r}`;

const pieceByKey = (key: PieceKey) => PALETTE.find((p) => p.key === key)!;

const FULL_SCENE: Placement[] = SCRIPT.map((step, i) => ({
  id: i,
  piece: step.piece,
  cells: step.cells.map(([c, r]) => cellKey(c, r)),
}));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function HeroDesignerDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cellEls = useRef<Map<string, HTMLDivElement>>(new Map());
  const paletteEls = useRef<Map<PieceKey, HTMLDivElement>>(new Map());
  const saveEl = useRef<HTMLDivElement>(null);
  const visibleRef = useRef(false);

  const [placements, setPlacements] = useState<Placement[]>([]);
  const [cursor, setCursor] = useState({ x: 40, y: 40, shown: false });
  const [dragging, setDragging] = useState<PieceKey | null>(null);
  const [activePalette, setActivePalette] = useState<PieceKey | null>(null);
  const [ghostCells, setGhostCells] = useState<string[]>([]);
  const [savePressed, setSavePressed] = useState(false);
  const [toast, setToast] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const timer = setTimeout(() => {
        setReduced(true);
        setPlacements(FULL_SCENE);
      }, 0);
      return () => clearTimeout(timer);
    }

    const container = containerRef.current;
    if (!container) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.25 }
    );
    io.observe(container);

    let alive = true;

    const centerOf = (el: HTMLElement | null) => {
      if (!el || !containerRef.current) return null;
      const base = containerRef.current.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      return {
        x: rect.left - base.left + rect.width / 2,
        y: rect.top - base.top + rect.height / 2,
      };
    };

    const waitVisible = async () => {
      while (alive && !visibleRef.current) await sleep(300);
    };

    const run = async () => {
      await sleep(600);
      while (alive) {
        for (let i = 0; i < SCRIPT.length; i++) {
          await waitVisible();
          if (!alive) return;
          const step = SCRIPT[i];

          // 1. move the cursor to the palette item and pick it up
          const palettePos = centerOf(paletteEls.current.get(step.piece) ?? null);
          if (palettePos) setCursor({ ...palettePos, shown: true });
          await sleep(700);
          if (!alive) return;
          setActivePalette(step.piece);
          await sleep(220);
          if (!alive) return;
          setDragging(step.piece);

          // 2. drag towards the centroid of the target cells
          const centers = step.cells
            .map(([c, r]) => centerOf(cellEls.current.get(cellKey(c, r)) ?? null))
            .filter((p): p is { x: number; y: number } => p !== null);
          if (centers.length > 0) {
            const cx = centers.reduce((s, p) => s + p.x, 0) / centers.length;
            const cy = centers.reduce((s, p) => s + p.y, 0) / centers.length;
            setCursor({ x: cx, y: cy, shown: true });
          }
          await sleep(500);
          if (!alive) return;
          setGhostCells(step.cells.map(([c, r]) => cellKey(c, r)));
          await sleep(340);
          if (!alive) return;

          // 3. drop: the piece snaps into the grid
          setGhostCells([]);
          setDragging(null);
          setActivePalette(null);
          setPlacements((prev) => [
            ...prev,
            {
              id: i,
              piece: step.piece,
              cells: step.cells.map(([c, r]) => cellKey(c, r)),
            },
          ]);
          await sleep(380);
          if (!alive) return;
        }

        // save-to-cloud flow
        await waitVisible();
        if (!alive) return;
        const savePos = centerOf(saveEl.current);
        if (savePos) setCursor({ ...savePos, shown: true });
        await sleep(700);
        if (!alive) return;
        setSavePressed(true);
        await sleep(220);
        if (!alive) return;
        setSavePressed(false);
        setToast(true);
        setCursor((c) => ({ ...c, shown: false }));
        await sleep(2400);
        if (!alive) return;

        // reset and loop again
        setToast(false);
        setPlacements([]);
        await sleep(700);
      }
    };

    run();
    return () => {
      alive = false;
      io.disconnect();
    };
  }, []);

  const filled = new Map<string, PieceKey>();
  const anchors = new Map<string, PieceKey>();
  for (const p of placements) {
    for (const key of p.cells) filled.set(key, p.piece);
    anchors.set(p.cells[0], p.piece);
  }
  const ghosts = new Set(ghostCells);

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
    >
      {/* window chrome + toolbar */}
      <div className="h-9 border-b border-border bg-background/60 flex items-center px-4 gap-1.5">
        <span className="h-3 w-3 rounded-full bg-red-500/70" />
        <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
        <span className="h-3 w-3 rounded-full bg-green-500/70" />
        <span className="ml-4 text-xs text-muted-foreground">
          designer · battlefield-01
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden sm:inline text-[10px] text-muted-foreground">
            {placements.reduce((n, p) => n + p.cells.length, 0)} cells placed
          </span>
          <div
            ref={saveEl}
            className={`flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs transition-all duration-150 ${
              savePressed
                ? 'scale-90 bg-primary text-primary-foreground'
                : 'bg-secondary/60 text-foreground'
            }`}
          >
            <Cloud className="h-3.5 w-3.5" />
            Save
          </div>
        </div>
      </div>

      <div className="flex">
        {/* palette */}
        <div className="flex w-24 sm:w-32 md:w-44 border-r border-border bg-background/40 flex-col p-2 md:p-3 gap-2 shrink-0">
          <div className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Pieces
          </div>
          {PALETTE.map((piece) => (
            <div
              key={piece.key}
              ref={(el) => {
                if (el) paletteEls.current.set(piece.key, el);
              }}
              className={`text-xs md:text-sm text-foreground rounded-md px-2 py-1.5 transition-all duration-200 ${
                activePalette === piece.key
                  ? 'bg-primary/20 ring-2 ring-primary/60 scale-105'
                  : 'bg-secondary/60'
              }`}
            >
              <span className="mr-1">{piece.emoji}</span>
              <span className="hidden sm:inline">{piece.label}</span>
            </div>
          ))}
        </div>

        {/* grid */}
        <div className="flex-1 p-4 md:p-6 bg-gradient-to-br from-card to-background">
          <div
            className="grid gap-1 mx-auto"
            style={{
              gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
              maxWidth: '32rem',
            }}
          >
            {Array.from({ length: COLS * ROWS }).map((_, i) => {
              const c = i % COLS;
              const r = Math.floor(i / COLS);
              const key = cellKey(c, r);
              const piece = filled.get(key);
              const anchor = anchors.get(key);
              const isGhost = ghosts.has(key);
              return (
                <div
                  key={key}
                  ref={(el) => {
                    if (el) cellEls.current.set(key, el);
                  }}
                  className={`relative aspect-square rounded-sm border transition-colors duration-200 ${
                    isGhost
                      ? 'border-primary/70 bg-primary/15'
                      : 'border-border/40 bg-secondary/30'
                  }`}
                >
                  {piece && (
                    <div
                      className={`absolute inset-0 rounded-sm ${pieceByKey(piece).cell} ${
                        reduced ? '' : 'mtc-pop'
                      } flex items-center justify-center`}
                    >
                      {anchor && (
                        <span className="text-[10px] md:text-sm leading-none select-none">
                          {pieceByKey(anchor).emoji}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* animated cursor + dragged piece */}
      {!reduced && (
        <div
          className="pointer-events-none absolute left-0 top-0 z-20 transition-transform duration-700 ease-in-out"
          style={{
            transform: `translate(${cursor.x}px, ${cursor.y}px)`,
            opacity: cursor.shown ? 1 : 0,
            transitionProperty: 'transform, opacity',
          }}
        >
          {dragging && (
            <span className="absolute -top-3 left-3 flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-lg shadow-lg rotate-6">
              {pieceByKey(dragging).emoji}
            </span>
          )}
          <MousePointer2 className="h-5 w-5 text-foreground drop-shadow-md fill-background" />
        </div>
      )}

      {/* saved toast */}
      <div
        className={`absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg transition-all duration-300 ${
          toast ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
        }`}
      >
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20">
          <Check className="h-3 w-3 text-emerald-500" />
        </span>
        Saved to cloud
      </div>
    </div>
  );
}
