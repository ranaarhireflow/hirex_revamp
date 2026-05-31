import { type CSSProperties, useMemo } from 'react';

// 8 calm gradient pairs — deterministic by name so each candidate keeps their color.
const GRADIENTS: [string, string][] = [
  ['#6366F1', '#8B5CF6'], // indigo → violet
  ['#0EA5E9', '#2563EB'], // sky    → blue
  ['#14B8A6', '#06B6D4'], // teal   → cyan
  ['#F59E0B', '#EF4444'], // amber  → red
  ['#EC4899', '#F472B6'], // pink   → light pink
  ['#10B981', '#059669'], // emerald → green
  ['#8B5CF6', '#D946EF'], // violet → fuchsia
  ['#F97316', '#EA580C'], // orange → deep orange
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function initials(name: string | null | undefined, fallback: string): string {
  const source = (name?.trim() || fallback || '').trim();
  if (!source) return '?';
  const parts = source.split(/[\s.@]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

interface Props {
  name: string | null | undefined;
  email?: string;
  size?: number;
  style?: CSSProperties;
}

export default function Avatar({ name, email = '', size = 36, style }: Props) {
  const seed = (name || email).toLowerCase();
  const gradient = useMemo(() => GRADIENTS[hash(seed) % GRADIENTS.length], [seed]);
  const text = initials(name, email);
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${gradient[0]} 0%, ${gradient[1]} 100%)`,
        color: '#FFFFFF',
        fontSize: Math.round(size * 0.36),
        fontWeight: 600,
        letterSpacing: '-0.02em',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: 'inset 0 -1px 1px rgba(0,0,0,0.08)',
        ...style,
      }}
    >
      {text}
    </div>
  );
}
