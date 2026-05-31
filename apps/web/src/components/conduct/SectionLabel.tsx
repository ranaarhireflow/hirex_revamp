import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  trailing?: ReactNode;
  action?: ReactNode;
}

export default function SectionLabel({ children, trailing, action }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span className="hx-section-label">{children}</span>
        {trailing && (
          <span style={{ fontSize: 12, color: 'var(--hx-text-3)', fontWeight: 500 }}>
            {trailing}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}
