import { type CSSProperties } from 'react';
import { ClockCircleOutlined } from '@ant-design/icons';

interface Props {
  minutes: number;
  size?: 'sm' | 'md';
  style?: CSSProperties;
}

export default function TimeBadge({ minutes, size = 'sm', style }: Props) {
  const fs = size === 'sm' ? 11 : 12;
  const pad = size === 'sm' ? '2px 7px 2px 6px' : '3px 9px 3px 7px';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: pad,
        background: 'var(--hx-surface-2)',
        border: '1px solid var(--hx-border)',
        borderRadius: 999,
        fontSize: fs,
        fontWeight: 500,
        color: 'var(--hx-text-2)',
        fontFamily: 'var(--hx-font-mono)',
        lineHeight: 1.3,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <ClockCircleOutlined style={{ fontSize: fs - 1, color: 'var(--hx-text-3)' }} />
      {minutes}m
    </span>
  );
}
