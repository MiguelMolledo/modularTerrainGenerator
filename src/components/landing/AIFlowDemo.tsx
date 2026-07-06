'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Loader2, Check } from 'lucide-react';

const COLS = 10;
const ROWS = 6;

type Scene = {
  prompt: string;
  summary: string;
  placements: { emoji?: string; cell: string; cells: [number, number][] }[];
};

const SCENES: Scene[] = [
  {
    prompt: 'A ruined watchtower guarding a river crossing',
    summary: '15 pieces · 4 terrain types',
    placements: [
      {
        emoji: '🌊',
        cell: 'bg-sky-500/70',
        cells: [
          [0, 3],
          [1, 3],
          [2, 3],
          [3, 3],
          [4, 4],
          [5, 4],
          [6, 4],
          [7, 4],
          [8, 4],
          [9, 4],
        ],
      },
      {
        emoji: '🌉',
        cell: 'bg-amber-700/70',
        cells: [
          [3, 2],
          [3, 3],
          [4, 3],
          [4, 4],
        ],
      },
      {
        emoji: '🏚️',
        cell: 'bg-stone-400/70',
        cells: [
          [6, 1],
          [7, 1],
          [6, 2],
          [7, 2],
        ],
      },
      {
        emoji: '🌲',
        cell: 'bg-emerald-500/70',
        cells: [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
          [2, 0],
        ],
      },
      { emoji: '🗿', cell: 'bg-zinc-500/70', cells: [[8, 0]] },
    ],
  },
  {
    prompt: 'Forest ambush around a hidden clearing',
    summary: '18 pieces · 3 terrain types',
    placements: [
      {
        emoji: '🌲',
        cell: 'bg-emerald-500/70',
        cells: [
          [0, 0],
          [1, 0],
          [2, 0],
          [0, 1],
          [1, 1],
          [0, 2],
        ],
      },
      {
        emoji: '🌲',
        cell: 'bg-emerald-500/70',
        cells: [
          [7, 0],
          [8, 0],
          [9, 0],
          [8, 1],
          [9, 1],
          [9, 2],
        ],
      },
      {
        emoji: '🌲',
        cell: 'bg-emerald-500/70',
        cells: [
          [0, 4],
          [0, 5],
          [1, 5],
          [8, 5],
          [9, 5],
          [9, 4],
        ],
      },
      {
        emoji: '⛰️',
        cell: 'bg-amber-600/70',
        cells: [
          [4, 0],
          [5, 0],
        ],
      },
      {
        emoji: '🗿',
        cell: 'bg-zinc-500/70',
        cells: [
          [3, 3],
          [6, 2],
        ],
      },
    ],
  },
];

type Phase = 'typing' | 'generating' | 'placing' | 'done';

const STEPS = ['Describe', 'Generate', 'Refine'];

const cellKey = (c: number, r: number) => `${c}-${r}`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function AIFlowDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const visibleRef = useRef(false);

  const [sceneIdx, setSceneIdx] = useState(0);
  const [typed, setTyped] = useState('');
  const [phase, setPhase] = useState<Phase>('typing');
  const [placedCount, setPlacedCount] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const timer = setTimeout(() => {
        setReduced(true);
        setTyped(SCENES[0].prompt);
        setPhase('done');
        setPlacedCount(SCENES[0].placements.length);
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
      let idx = 0;
      while (alive) {
        await waitVisible();
        if (!alive) return;
        const scene = SCENES[idx];
        setSceneIdx(idx);
        setTyped('');
        setPlacedCount(0);
        setPhase('typing');
        await sleep(500);

        for (let i = 1; i <= scene.prompt.length; i++) {
          if (!alive) return;
          setTyped(scene.prompt.slice(0, i));
          await sleep(38);
        }

        await sleep(350);
        if (!alive) return;
        setPhase('generating');
        await sleep(1300);
        if (!alive) return;

        setPhase('placing');
        for (let i = 1; i <= scene.placements.length; i++) {
          if (!alive) return;
          setPlacedCount(i);
          await sleep(320);
        }

        await sleep(250);
        if (!alive) return;
        setPhase('done');
        await sleep(3200);
        idx = (idx + 1) % SCENES.length;
      }
    };

    run();
    return () => {
      alive = false;
      io.disconnect();
    };
  }, []);

  const scene = SCENES[sceneIdx];
  const filled = new Map<string, string>();
  const anchors = new Map<string, string>();
  scene.placements.slice(0, placedCount).forEach((p) => {
    p.cells.forEach(([c, r]) => filled.set(cellKey(c, r), p.cell));
    if (p.emoji) anchors.set(cellKey(p.cells[0][0], p.cells[0][1]), p.emoji);
  });

  const activeStep = phase === 'typing' ? 0 : phase === 'generating' ? 1 : 2;

  return (
    <div ref={rootRef} className="flex flex-col h-full">
      {/* prompt input mock */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 text-xs md:text-sm text-foreground min-h-[1.25rem] truncate">
          {typed}
          {phase === 'typing' && !reduced && (
            <span className="mtc-caret ml-0.5 inline-block h-3.5 w-[2px] bg-primary align-middle" />
          )}
        </div>
        <span
          className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] transition-colors ${
            phase === 'generating'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary/60 text-muted-foreground'
          }`}
        >
          {phase === 'generating' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          Generate
        </span>
      </div>

      {/* grid */}
      <div className="relative rounded-lg border border-border bg-gradient-to-br from-card to-background p-3">
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: COLS * ROWS }).map((_, i) => {
            const c = i % COLS;
            const r = Math.floor(i / COLS);
            const key = cellKey(c, r);
            const fill = filled.get(key);
            const emoji = anchors.get(key);
            return (
              <div
                key={key}
                className={`relative aspect-square rounded-sm border border-border/40 ${
                  phase === 'generating' && !reduced
                    ? 'mtc-shimmer bg-primary/10'
                    : 'bg-secondary/30'
                }`}
                style={
                  phase === 'generating' && !reduced
                    ? { animationDelay: `${(c + r) * 60}ms` }
                    : undefined
                }
              >
                {fill && (
                  <div
                    className={`absolute inset-0 rounded-sm ${fill} ${
                      reduced ? '' : 'mtc-pop'
                    } flex items-center justify-center`}
                  >
                    {emoji && (
                      <span className="text-[9px] md:text-xs leading-none select-none">
                        {emoji}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* summary badge */}
        <div
          className={`absolute bottom-2 right-2 flex items-center gap-1.5 rounded-md border border-border bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md transition-all duration-300 ${
            phase === 'done'
              ? 'translate-y-0 opacity-100'
              : 'translate-y-2 opacity-0'
          }`}
        >
          <Check className="h-3 w-3 text-emerald-500" />
          {scene.summary}
        </div>
      </div>

      {/* step rail */}
      <div className="mt-auto flex items-center gap-2 pt-4">
        {STEPS.map((step, i) => (
          <React.Fragment key={step}>
            {i > 0 && <span className="h-px flex-1 bg-border" />}
            <span
              className={`flex items-center gap-1.5 text-[11px] transition-colors duration-300 ${
                i <= activeStep ? 'text-foreground' : 'text-muted-foreground/60'
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] transition-colors duration-300 ${
                  i <= activeStep
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {i + 1}
              </span>
              {step}
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
