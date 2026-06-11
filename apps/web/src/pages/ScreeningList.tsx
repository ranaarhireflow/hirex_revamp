import { Empty, Spin } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listScreenings } from '../api/screenings';
import { scoreColor } from '../types';
import type { ScreenStatus, ScreenSummary } from '../types';

const STATUS_LABEL: Record<ScreenStatus, string> = {
  processing: 'PROCESSING',
  completed: 'COMPLETED',
  failed: 'FAILED',
};

// Map screen status onto the nx-status classes used by the interview list
// (created = blue, in_progress = amber, completed = green, expired = red).
const STATUS_CLASS: Record<ScreenStatus, string> = {
  processing: 'in_progress',
  completed: 'completed',
  failed: 'expired',
};

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function ScreeningList() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['screenings'],
    queryFn: listScreenings,
    // Keep the list fresh while a batch is still scoring in the background.
    refetchInterval: (q) =>
      (q.state.data ?? []).some((s) => s.status === 'processing') ? 4000 : false,
  });

  const rows = data ?? [];

  return (
    <>
      <div className="nx-page-h">
        <div>
          <h1 className="nx-page-title">
            RESUME SCREENING
            <span className="nx-page-count">// {String(rows.length).padStart(2, '0')}</span>
          </h1>
          <p className="nx-page-desc">Match a stack of resumes against a JD before you interview.</p>
        </div>
        <Link to="/recruiter/screening/new" className="nx-action-primary">
          + New screening
          <ArrowRightOutlined style={{ fontSize: 10 }} />
        </Link>
      </div>

      <div style={{ marginTop: 24 }}>
        {isLoading ? (
          <div className="nx-empty">
            <Spin />
          </div>
        ) : isError ? (
          <div className="nx-empty">
            <Empty description={`Failed to load: ${(error as Error).message}`} />
          </div>
        ) : rows.length === 0 ? (
          <div className="nx-empty">
            <Empty description="No screenings yet — run the first one.">
              <Link to="/recruiter/screening/new" className="nx-action-primary">
                + New screening
              </Link>
            </Empty>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map((row) => (
              <ScreeningRow
                key={row.id}
                row={row}
                onOpen={() => navigate(`/recruiter/screening/${row.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ScreeningRow({ row, onOpen }: { row: ScreenSummary; onOpen: () => void }) {
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen();
      }}
      className="nx-row-card"
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}
        >
          <span className="nx-row-name">{row.title}</span>
          <span className={`nx-status ${STATUS_CLASS[row.status]}`}>
            <span className="dot" />
            {STATUS_LABEL[row.status]}
          </span>
        </div>
        <div className="nx-row-email">
          {row.scored_count} / {row.candidate_count} scored
        </div>
      </div>

      <div className="nx-meta-col" style={{ width: 96 }}>
        <div className="nx-meta-label">CANDIDATES</div>
        <div className="nx-meta-value">{row.candidate_count}</div>
      </div>
      <div className="nx-meta-col" style={{ width: 96 }}>
        <div className="nx-meta-label">TOP MATCH</div>
        <div className="nx-meta-value" style={{ color: scoreColor(row.top_score), fontWeight: 700 }}>
          {row.top_score != null ? `${row.top_score}%` : '—'}
        </div>
      </div>
      <div className="nx-meta-col" style={{ width: 84 }}>
        <div className="nx-meta-label">CREATED</div>
        <div
          className="nx-meta-value"
          style={{ color: 'var(--ink-faint)', fontFamily: 'var(--f-mono)', fontSize: 11 }}
        >
          {relativeDate(row.created_at)}
        </div>
      </div>

      <ArrowRightOutlined className="nx-row-card-arrow" style={{ fontSize: 13 }} />
    </div>
  );
}
