import { type CSSProperties } from 'react';
import type { InterviewStatus } from '../types';

const TOKENS: Record<InterviewStatus, { label: string; dot: string; bg: string; fg: string; border: string }> = {
  created:     { label: 'Created',     dot: '#94A3B8', bg: '#F1F5F9', fg: '#475569', border: '#E2E8F0' },
  scheduled:   { label: 'Scheduled',   dot: '#0EA5E9', bg: '#F0F9FF', fg: '#0369A1', border: '#BAE6FD' },
  in_progress: { label: 'In progress', dot: '#2563EB', bg: '#EFF6FF', fg: '#1D4ED8', border: '#BFDBFE' },
  completed:   { label: 'Completed',   dot: '#16A34A', bg: '#ECFDF5', fg: '#15803D', border: '#BBF7D0' },
  expired:     { label: 'Expired',     dot: '#DC2626', bg: '#FEF2F2', fg: '#B91C1C', border: '#FECACA' },
};

interface Props {
  status: InterviewStatus | string;
  style?: CSSProperties;
}

export default function StatusPill({ status, style }: Props) {
  const t = TOKENS[status as InterviewStatus] ?? TOKENS.created;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px 3px 8px',
        borderRadius: 999,
        background: t.bg,
        border: `1px solid ${t.border}`,
        color: t.fg,
        fontSize: 12,
        fontWeight: 500,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: t.dot,
          flexShrink: 0,
        }}
      />
      {t.label}
    </span>
  );
}
