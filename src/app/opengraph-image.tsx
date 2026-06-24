import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Modular Terrain Creator — design terrain layouts for tabletop games';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  const accents: Record<number, string> = {
    14: '#10b981',
    15: '#10b981',
    26: '#10b981',
    27: '#10b981',
    40: '#b45309',
    41: '#b45309',
    52: '#b45309',
    53: '#b45309',
    54: '#b45309',
    67: '#0ea5e9',
    68: '#0ea5e9',
    69: '#0ea5e9',
    79: '#0ea5e9',
    80: '#0ea5e9',
    81: '#a8a29e',
    82: '#a8a29e',
  };

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background:
            'radial-gradient(circle at 20% 0%, #1e1b4b 0%, #0a0a0a 60%)',
          color: '#fafafa',
          fontFamily: 'sans-serif',
          padding: '64px 72px',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontSize: 28,
            color: '#a3a3a3',
          }}
        >
          <span style={{ fontSize: 44 }}>🗺️</span>
          <span style={{ fontWeight: 700, color: '#fafafa' }}>
            Terrain Creator
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 40,
            maxWidth: 720,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            Design modular terrain
          </div>
          <div
            style={{
              fontSize: 72,
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
              fontSize: 28,
              color: '#a3a3a3',
              marginTop: 28,
              lineHeight: 1.35,
            }}
          >
            Drag, snap, and stack pieces into reusable maps.
          </div>
        </div>

        {/* mini grid preview */}
        <div
          style={{
            position: 'absolute',
            right: 64,
            top: 140,
            display: 'flex',
            flexWrap: 'wrap',
            width: 12 * 28 + 11 * 4,
            padding: 20,
            borderRadius: 16,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {Array.from({ length: 96 }).map((_, i) => {
            const col = i % 12;
            const row = Math.floor(i / 12);
            return (
              <div
                key={i}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 4,
                  marginRight: col === 11 ? 0 : 4,
                  marginBottom: row === 7 ? 0 : 4,
                  background: accents[i] ?? 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              />
            );
          })}
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 56,
            left: 72,
            display: 'flex',
            gap: 12,
            fontSize: 22,
            color: '#a3a3a3',
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
          <span
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            modular-terrain.app
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
