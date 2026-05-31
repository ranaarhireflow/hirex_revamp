import { type CSSProperties } from 'react';

interface Props {
  used: number;       // minutes selected
  budget: number;     // interview duration in minutes
  count: number;      // # questions selected
}

export default function BudgetMeter({ used, budget, count }: Props) {
  const pct = budget > 0 ? Math.min(100, Math.round((used / budget) * 100)) : 0;
  const over = used > budget;
  const tight = !over && pct >= 90;

  const color = over ? 'var(--hx-danger)' : tight ? 'var(--hx-warn)' : 'var(--hx-success)';
  const trackBg = over ? 'rgba(220,38,38,0.10)' : tight ? 'rgba(217,119,6,0.10)' : 'rgba(22,163,74,0.10)';

  const label = over
    ? `${used - budget} min over budget`
    : tight
      ? `${budget - used} min remaining`
      : `${budget - used} min remaining`;

  return (
    <div style={containerStyle}>
      <div style={topRowStyle}>
        <span style={countStyle}>
          {count} question{count === 1 ? '' : 's'}
        </span>
        <span style={{ ...labelStyle, color }}>{label}</span>
      </div>
      <div style={{ ...trackStyle, background: trackBg }}>
        <div
          style={{
            ...fillStyle,
            width: `${over ? 100 : pct}%`,
            background: color,
          }}
        />
        {over && (
          <div style={{ ...overflowMarkStyle, background: color }} />
        )}
      </div>
      <div style={bottomRowStyle}>
        <span style={mutedStyle}>
          <strong style={{ color: 'var(--hx-text)' }}>{used}</strong> / {budget} min used
        </span>
        <span style={mutedStyle}>{pct}%</span>
      </div>
    </div>
  );
}

const containerStyle: CSSProperties = {
  background: 'var(--hx-surface)',
  border: '1px solid var(--hx-border-soft)',
  borderRadius: 8,
  padding: 12,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const topRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
};

const countStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--hx-text)',
};

const labelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
};

const trackStyle: CSSProperties = {
  height: 6,
  borderRadius: 999,
  overflow: 'hidden',
  position: 'relative',
};

const fillStyle: CSSProperties = {
  height: '100%',
  borderRadius: 999,
  transition: 'width 200ms ease-out, background 120ms ease-out',
};

const overflowMarkStyle: CSSProperties = {
  position: 'absolute',
  right: 0,
  top: 0,
  bottom: 0,
  width: 2,
  opacity: 0.5,
};

const bottomRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
};

const mutedStyle: CSSProperties = {
  fontSize: 11,
  fontFamily: 'var(--hx-font-mono)',
  color: 'var(--hx-text-3)',
};
