import { type CSSProperties } from 'react';

const LABELS: Record<number, { label: string; sub: string }> = {
  1: { label: '1', sub: 'No' },
  2: { label: '2', sub: 'Lean no' },
  3: { label: '3', sub: 'Mixed' },
  4: { label: '4', sub: 'Lean yes' },
  5: { label: '5', sub: 'Strong yes' },
};

// Selected colour per score on the NEXUS palette:
//   1 = magenta (hard no), 2 = magenta-amber, 3 = amber, 4 = lime, 5 = cyan (strong)
const SELECTED: Record<number, { bg: string; fg: string; border: string; glow: string }> = {
  1: { bg: 'rgba(255, 79, 216, 0.18)',  fg: '#ff4fd8', border: 'rgba(255, 79, 216, 0.65)',  glow: 'rgba(255, 79, 216, 0.35)' },
  2: { bg: 'rgba(255, 79, 216, 0.10)',  fg: '#ffb547', border: 'rgba(255, 181, 71, 0.55)',  glow: 'rgba(255, 181, 71, 0.25)' },
  3: { bg: 'rgba(255, 181, 71, 0.14)',  fg: '#ffb547', border: 'rgba(255, 181, 71, 0.65)',  glow: 'rgba(255, 181, 71, 0.30)' },
  4: { bg: 'rgba(184, 255, 94, 0.14)',  fg: '#b8ff5e', border: 'rgba(184, 255, 94, 0.65)',  glow: 'rgba(184, 255, 94, 0.30)' },
  5: { bg: 'rgba(94, 233, 255, 0.16)',  fg: '#5ee9ff', border: 'rgba(94, 233, 255, 0.70)',  glow: 'rgba(94, 233, 255, 0.40)' },
};

const REST = {
  bg: 'rgba(255, 255, 255, 0.04)',
  fg: 'var(--hx-text-3, #9aa3c7)',
  border: 'rgba(255, 255, 255, 0.10)',
};

interface Props {
  value: number | null;
  onChange: (n: number) => void;
  disabled?: boolean;
}

export default function ScoreSelector({ value, onChange, disabled }: Props) {
  return (
    <div role="radiogroup" aria-label="Score this answer" style={containerStyle}>
      {[1, 2, 3, 4, 5].map((n) => {
        const selected = value === n;
        const c = SELECTED[n];
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(n)}
            style={{
              ...buttonStyle,
              background: selected ? c.bg : REST.bg,
              color: selected ? c.fg : REST.fg,
              borderColor: selected ? c.border : REST.border,
              boxShadow: selected ? `0 0 24px ${c.glow}, inset 0 0 0 1px ${c.border}` : 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!selected && !disabled) {
                e.currentTarget.style.background = 'rgba(94, 233, 255, 0.06)';
                e.currentTarget.style.borderColor = 'rgba(94, 233, 255, 0.35)';
                e.currentTarget.style.color = '#e8ecff';
              }
            }}
            onMouseLeave={(e) => {
              if (!selected && !disabled) {
                e.currentTarget.style.background = REST.bg;
                e.currentTarget.style.borderColor = REST.border;
                e.currentTarget.style.color = REST.fg;
              }
            }}
          >
            <span style={{
              fontFamily: "'Orbitron', system-ui, sans-serif",
              fontSize: 22,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: '0.04em',
            }}>{LABELS[n].label}</span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              opacity: selected ? 1 : 0.7,
            }}>{LABELS[n].sub}</span>
          </button>
        );
      })}
    </div>
  );
}

const containerStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, 1fr)',
  gap: 10,
  width: '100%',
};

const buttonStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  height: 64,
  border: '1px solid',
  borderRadius: 10,
  transition: 'all 150ms cubic-bezier(0.2, 0.8, 0.2, 1)',
  outline: 'none',
  padding: '10px 10px',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
};
