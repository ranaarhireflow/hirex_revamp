import { type CSSProperties } from 'react';

interface Props {
  size?: number;
  showWordmark?: boolean;
  style?: CSSProperties;
}

export default function Logo({ size = 28, showWordmark = true, style }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, ...style }}>
      <div
        aria-hidden
        style={{
          width: size,
          height: size,
          borderRadius: 8,
          background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          fontWeight: 700,
          fontSize: Math.round(size * 0.5),
          letterSpacing: '-0.04em',
          boxShadow: 'inset 0 -1px 1px rgba(0,0,0,0.1), 0 1px 2px rgba(37,99,235,0.2)',
        }}
      >
        H
      </div>
      {showWordmark && (
        <span
          style={{
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: '-0.022em',
            color: 'var(--hx-text)',
          }}
        >
          Hirex
        </span>
      )}
    </div>
  );
}
