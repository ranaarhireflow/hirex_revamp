import { type ReactNode } from 'react';

interface Props {
  title: string;
  count?: number;
  description?: string;
  actions?: ReactNode;
  filters?: ReactNode;
}

export default function PageHeader({ title, count, description, actions, filters }: Props) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: description ? 6 : 0,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: '-0.018em',
              margin: 0,
              color: 'var(--hx-text)',
            }}
          >
            {title}
          </h1>
          {count != null && (
            <span
              style={{
                fontFamily: 'var(--hx-font-mono)',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--hx-text-3)',
                background: 'var(--hx-surface-2)',
                padding: '2px 8px',
                borderRadius: 6,
              }}
            >
              {count}
            </span>
          )}
        </div>
        {actions}
      </div>
      {description && (
        <p style={{ margin: 0, color: 'var(--hx-text-3)', fontSize: 14 }}>{description}</p>
      )}
      {filters && <div style={{ marginTop: 16 }}>{filters}</div>}
    </div>
  );
}
