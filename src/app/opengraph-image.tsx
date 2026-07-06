import { ImageResponse } from 'next/og';

export const alt =
  'Modular Terrain Creator — design terrain layouts for tabletop games';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const COLS = 12;
const ROWS = 8;
const CELL = 30;
const GAP = 4;

// Same scene the landing hero demo builds, so the share preview matches the app
const SCENE: { color: string; emoji?: string; cells: [number, number][] }[] = [
  {
    color: '#10b981',
    emoji: '🌲',
    cells: [
      [1, 1],
      [2, 1],
      [1, 2],
      [2, 2],
    ],
  },
  {
    color: '#d97706',
    emoji: '⛰️',
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
    color: '#0ea5e9',
    emoji: '🌊',
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
    color: '#10b981',
    emoji: '🌲',
    cells: [
      [4, 2],
      [5, 2],
      [4, 3],
      [5, 3],
    ],
  },
  {
    color: '#a8a29e',
    emoji: '🏚️',
    cells: [
      [9, 3],
      [10, 3],
      [9, 4],
      [10, 4],
    ],
  },
  { color: '#71717a', emoji: '🗿', cells: [[7, 7]] },
];

const PALETTE = [
  { emoji: '🌲', label: 'Forest' },
  { emoji: '⛰️', label: 'Hill' },
  { emoji: '🌊', label: 'River' },
  { emoji: '🏚️', label: 'Ruin' },
  { emoji: '🗿', label: 'Rock' },
];

export default async function OpengraphImage() {
  const fill = new Map<string, string>();
  const anchor = new Map<string, string>();
  for (const piece of SCENE) {
    for (const [c, r] of piece.cells) fill.set(`${c}-${r}`, piece.color);
    if (piece.emoji) {
      const [c, r] = piece.cells[0];
      anchor.set(`${c}-${r}`, piece.emoji);
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          background:
            'radial-gradient(circle at 20% 0%, #1e1b4b 0%, #0a0a0a 60%)',
          color: '#fafafa',
          fontFamily: 'sans-serif',
          padding: '56px 64px',
          position: 'relative',
        }}
      >
        {/* left: branding + headline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 520,
            marginRight: 40,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              fontSize: 26,
            }}
          >
            <span style={{ fontSize: 40 }}>🗺️</span>
            <span style={{ fontWeight: 700 }}>Terrain Creator</span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginTop: 36,
            }}
          >
            <div
              style={{
                fontSize: 54,
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
              }}
            >
              Design modular terrain
            </div>
            <div
              style={{
                fontSize: 54,
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                color: '#a78bfa',
                marginTop: 4,
              }}
            >
              for tabletop games
            </div>
            <div
              style={{
                fontSize: 26,
                color: '#a3a3a3',
                marginTop: 24,
                lineHeight: 1.35,
              }}
            >
              Drag, snap, and stack pieces into reusable maps — with AI-assisted
              layouts.
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              fontSize: 20,
              color: '#a3a3a3',
              marginTop: 36,
            }}
          >
            <span
              style={{
                padding: '8px 16px',
                borderRadius: 999,
                background: '#7c3aed',
                color: '#fff',
                fontWeight: 600,
              }}
            >
              Get started — it&apos;s free
            </span>
          </div>
        </div>

        {/* right: mini app window snapshot */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 18,
            border: '1px solid rgba(255,255,255,0.12)',
            background: '#17151f',
            overflow: 'hidden',
            boxShadow: '0 30px 60px -20px rgba(0,0,0,0.7)',
          }}
        >
          {/* window chrome */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '10px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            <div
              style={{
                width: 11,
                height: 11,
                borderRadius: 999,
                background: '#ef4444',
                display: 'flex',
              }}
            />
            <div
              style={{
                width: 11,
                height: 11,
                borderRadius: 999,
                background: '#eab308',
                display: 'flex',
              }}
            />
            <div
              style={{
                width: 11,
                height: 11,
                borderRadius: 999,
                background: '#22c55e',
                display: 'flex',
              }}
            />
            <span
              style={{ marginLeft: 12, fontSize: 15, color: '#a3a3a3' }}
            >
              designer · battlefield-01
            </span>
          </div>

          <div style={{ display: 'flex' }}>
            {/* palette */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: 14,
                borderRight: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: '#a3a3a3',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                Pieces
              </span>
              {PALETTE.map((piece) => (
                <div
                  key={piece.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.06)',
                    fontSize: 15,
                  }}
                >
                  <span>{piece.emoji}</span>
                  <span>{piece.label}</span>
                </div>
              ))}
            </div>

            {/* grid with the placed scene */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                width: COLS * CELL + (COLS - 1) * GAP + 36,
                padding: 18,
              }}
            >
              {Array.from({ length: COLS * ROWS }).map((_, i) => {
                const col = i % COLS;
                const row = Math.floor(i / COLS);
                const key = `${col}-${row}`;
                const color = fill.get(key);
                const emoji = anchor.get(key);
                return (
                  <div
                    key={key}
                    style={{
                      width: CELL,
                      height: CELL,
                      borderRadius: 5,
                      marginRight: col === COLS - 1 ? 0 : GAP,
                      marginBottom: row === ROWS - 1 ? 0 : GAP,
                      background: color ?? 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                    }}
                  >
                    {emoji ?? ''}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
