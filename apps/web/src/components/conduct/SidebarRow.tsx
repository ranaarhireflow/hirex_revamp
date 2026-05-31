import { type CSSProperties } from 'react';
import type { QuestionConduct } from '../../api/conduct';
import { QUESTION_TYPE_COLOR } from '../../types';
import type { QuestionType } from '../../types';
import { ClockCircleOutlined } from '@ant-design/icons';

const STATUS_DOT: Record<QuestionConduct['conduct_status'], string> = {
  pending: '#CBD5E1',
  asked: '#2563EB',
  done: '#16A34A',
  skipped: '#D97706',
};

interface Props {
  question: QuestionConduct;
  index: number;
  active: boolean;
  onClick: () => void;
}

export default function SidebarRow({ question, index, active, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      style={{
        ...rowStyle,
        background: active ? 'var(--hx-accent-bg)' : 'transparent',
        borderLeftColor: active ? 'var(--hx-accent)' : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'var(--hx-surface-2)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ ...dotStyle, background: STATUS_DOT[question.conduct_status] }} aria-hidden />
        <span
          style={{
            fontFamily: 'var(--hx-font-mono)',
            fontSize: 11,
            fontWeight: 500,
            color: active ? 'var(--hx-accent)' : 'var(--hx-text-3)',
            letterSpacing: 0,
          }}
        >
          Q{index + 1}
        </span>
      </span>
      <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: active ? 500 : 400,
            color: 'var(--hx-text-2)',
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          } as CSSProperties}
        >
          {question.question_text}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: QUESTION_TYPE_COLOR[question.question_type as QuestionType] === 'cyan'
                ? '#0E7490'
                : QUESTION_TYPE_COLOR[question.question_type as QuestionType] === 'blue'
                  ? '#1D4ED8'
                  : QUESTION_TYPE_COLOR[question.question_type as QuestionType] === 'purple'
                    ? '#6D28D9'
                    : '#A21CAF',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {question.question_type.replace('_', ' ')}
          </span>
          <span style={timeBadgeStyle}>
            <ClockCircleOutlined style={{ fontSize: 9 }} /> {question.time_minutes}m
          </span>
          {question.score != null && (
            <span style={scoreBadgeStyle}>{question.score}</span>
          )}
        </span>
      </span>
    </button>
  );
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
  width: '100%',
  padding: '10px 14px 10px 11px',
  borderLeft: '3px solid',
  border: 'none',
  borderLeftWidth: 3,
  borderLeftStyle: 'solid',
  background: 'transparent',
  cursor: 'pointer',
  transition: 'background 120ms ease-out',
  fontFamily: 'inherit',
  outline: 'none',
};

const dotStyle: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: 999,
  flexShrink: 0,
  marginTop: 4,
};

const scoreBadgeStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: 'var(--hx-text-2)',
  background: 'var(--hx-surface-2)',
  border: '1px solid var(--hx-border)',
  borderRadius: 4,
  padding: '1px 6px',
  lineHeight: 1.4,
};

const timeBadgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
  fontSize: 10,
  fontWeight: 500,
  color: 'var(--hx-text-3)',
  fontFamily: 'var(--hx-font-mono)',
};
