import { useState, type CSSProperties } from 'react';
import { Button, Input, InputNumber, Tooltip } from 'antd';
import { ThunderboltOutlined, LoadingOutlined } from '@ant-design/icons';

interface Props {
  onGenerate: (input: { count: number; focus?: string }) => void;
  isPending: boolean;
}

export default function GenerateMorePanel({ onGenerate, isPending }: Props) {
  const [count, setCount] = useState<number>(5);
  const [focus, setFocus] = useState('');

  const submit = () => {
    if (isPending) return;
    onGenerate({ count, focus: focus.trim() || undefined });
  };

  return (
    <div style={panelStyle}>
      <div style={panelHeaderStyle}>
        <span className="hx-section-label">Generate more</span>
        <Tooltip title="Adds new AI-generated questions to the end of the queue. Won't repeat existing ones.">
          <span style={{ color: 'var(--hx-text-4)', fontSize: 11, cursor: 'help' }}>ⓘ</span>
        </Tooltip>
      </div>

      <div style={fieldRowStyle}>
        <label style={fieldLabelStyle}>Count</label>
        <InputNumber
          min={1}
          max={10}
          value={count}
          onChange={(v) => setCount(typeof v === 'number' ? v : 5)}
          disabled={isPending}
          size="small"
          style={{ width: 72 }}
        />
      </div>

      <div style={fieldColStyle}>
        <label style={fieldLabelStyle}>Focus / custom prompt</label>
        <Input.TextArea
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          rows={2}
          placeholder="e.g. probe deeply on idempotency"
          disabled={isPending}
          style={{ fontSize: 12, resize: 'none' }}
        />
      </div>

      <Button
        type="primary"
        block
        size="middle"
        icon={isPending ? <LoadingOutlined /> : <ThunderboltOutlined />}
        onClick={submit}
        disabled={isPending}
      >
        {isPending ? 'Generating…' : `Generate ${count}`}
      </Button>

      {isPending && (
        <div style={hintStyle}>
          ~25-40s. New questions will appear in the queue when ready — keep interviewing.
        </div>
      )}
    </div>
  );
}

const panelStyle: CSSProperties = {
  borderTop: '1px solid var(--hx-border)',
  background: 'var(--hx-surface-2)',
  padding: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  flexShrink: 0,
};

const panelHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
};

const fieldRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
};

const fieldColStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const fieldLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--hx-text-3)',
};

const hintStyle: CSSProperties = {
  fontSize: 11,
  color: 'var(--hx-text-3)',
  lineHeight: 1.45,
  background: 'var(--hx-surface)',
  border: '1px solid var(--hx-border-soft)',
  borderRadius: 6,
  padding: '8px 10px',
};
