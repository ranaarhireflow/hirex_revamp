import { type CSSProperties } from 'react';

interface Props {
  total: number;
  covered: number;
}

export default function CoverageBar({ total, covered }: Props) {
  if (total <= 0) return null;
  return (
    <div style={containerStyle} role="meter" aria-valuemin={0} aria-valuemax={total} aria-valuenow={covered}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            ...segmentStyle,
            background: i < covered ? 'var(--hx-success)' : 'var(--hx-surface-2)',
            borderColor: i < covered ? 'var(--hx-success)' : 'var(--hx-border)',
          }}
        />
      ))}
    </div>
  );
}

const containerStyle: CSSProperties = {
  display: 'grid',
  gridAutoFlow: 'column',
  gridAutoColumns: '1fr',
  gap: 4,
  width: '100%',
};

const segmentStyle: CSSProperties = {
  height: 6,
  borderRadius: 999,
  border: '1px solid',
  transition: 'all 120ms ease-out',
};
