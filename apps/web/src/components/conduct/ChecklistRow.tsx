import { type CSSProperties } from 'react';
import { CheckOutlined } from '@ant-design/icons';

interface Props {
  point: string;
  checked: boolean;
  onToggle: () => void;
}

export default function ChecklistRow({ point, checked, onToggle }: Props) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      style={{
        ...rowStyle,
        background: checked ? 'var(--hx-success-bg)' : 'transparent',
        borderColor: checked ? 'rgba(22,163,74,0.25)' : 'var(--hx-border-soft)',
      }}
      onMouseEnter={(e) => {
        if (!checked) {
          e.currentTarget.style.background = 'var(--hx-surface-2)';
          e.currentTarget.style.borderColor = 'var(--hx-border)';
        }
      }}
      onMouseLeave={(e) => {
        if (!checked) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = 'var(--hx-border-soft)';
        }
      }}
    >
      <span
        aria-hidden
        style={{
          ...iconBoxStyle,
          background: checked ? 'var(--hx-success)' : '#FFFFFF',
          borderColor: checked ? 'var(--hx-success)' : '#CBD5E1',
        }}
      >
        {checked && <CheckOutlined style={{ color: '#FFFFFF', fontSize: 12 }} />}
      </span>
      <span
        style={{
          fontSize: 14,
          color: checked ? 'var(--hx-text-2)' : 'var(--hx-text)',
          textAlign: 'left',
          flex: 1,
          lineHeight: 1.5,
        }}
      >
        {point}
      </span>
    </button>
  );
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
  width: '100%',
  padding: '10px 12px',
  border: '1px solid',
  borderRadius: 8,
  cursor: 'pointer',
  transition: 'all 120ms ease-out',
  background: 'transparent',
  fontFamily: 'inherit',
  outline: 'none',
  textAlign: 'left',
};

const iconBoxStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 18,
  height: 18,
  border: '1.5px solid',
  borderRadius: 4,
  flexShrink: 0,
  marginTop: 1,
  transition: 'all 120ms ease-out',
};
