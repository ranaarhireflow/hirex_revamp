import { useMemo, useState, type CSSProperties } from 'react';
import { Empty, Input, Spin } from 'antd';
import { SearchOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listInterviews } from '../api/interviews';
import { EXPERIENCE_LABEL, ROLE_LABEL } from '../types';
import type { ExperienceLevel, InterviewSummary, InterviewStatus, RoleType } from '../types';
import Avatar from '../components/Avatar';

type StatusFilter = 'all' | InterviewStatus;

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'created', label: 'Created' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
];

const STATUS_LABEL: Record<InterviewStatus, string> = {
  created: 'CREATED',
  scheduled: 'SCHEDULED',
  in_progress: 'IN PROGRESS',
  completed: 'COMPLETED',
  expired: 'EXPIRED',
};

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function InterviewsList() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['interviews'],
    queryFn: listInterviews,
  });

  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo<InterviewSummary[]>(() => {
    let rows = data ?? [];
    if (status !== 'all') rows = rows.filter((r) => r.status === status);
    if (search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.candidate_email.toLowerCase().includes(s) ||
          (r.candidate_name?.toLowerCase().includes(s) ?? false) ||
          r.role_type.toLowerCase().includes(s),
      );
    }
    return rows;
  }, [data, status, search]);

  const counts = useMemo(() => {
    const all = data?.length ?? 0;
    const by = (s: InterviewStatus) => data?.filter((r) => r.status === s).length ?? 0;
    return { all, created: by('created'), in_progress: by('in_progress'), completed: by('completed') };
  }, [data]);

  return (
    <>
      {/* ---------- Page header ---------- */}
      <div className="nx-page-h">
        <div>
          <h1 className="nx-page-title">
            INTERVIEWS
            <span className="nx-page-count">// {String(counts.all).padStart(2, '0')}</span>
          </h1>
          <p className="nx-page-desc">Pipeline · conducted and pending sessions.</p>
        </div>
        <Link to="/recruiter/new" className="nx-action-primary">
          + New interview
          <ArrowRightOutlined style={{ fontSize: 10 }} />
        </Link>
      </div>

      <div className="nx-filter-row">
        {FILTERS.map((f) => {
          const active = status === f.value;
          const n = f.value === 'all' ? counts.all : counts[f.value as keyof typeof counts] ?? 0;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatus(f.value)}
              className={`nx-filter-chip ${active ? 'is-active' : ''}`}
            >
              {f.label}
              <span className="count">{n}</span>
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <Input
          placeholder="// SEARCH CANDIDATES, EMAILS, ROLES"
          prefix={<SearchOutlined style={{ color: 'var(--ink-faint)' }} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ maxWidth: 360 }}
        />
      </div>

      {/* ---------- List ---------- */}
      <div style={{ marginTop: 24 }}>
        {isLoading ? (
          <div className="nx-empty">
            <Spin />
          </div>
        ) : isError ? (
          <div className="nx-empty">
            <Empty description={`Failed to load: ${(error as Error).message}`} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="nx-empty">
            <Empty
              description={
                status === 'all' && !search
                  ? 'No interviews yet — activate the first one.'
                  : 'No interviews match these filters.'
              }
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((row) => (
              <InterviewRow
                key={row.id}
                row={row}
                onOpen={() => navigate(`/recruiter/${row.id}`)}
                onConduct={() => navigate(`/recruiter/${row.id}/conduct`)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function InterviewRow({
  row,
  onOpen,
  onConduct,
}: {
  row: InterviewSummary;
  onOpen: () => void;
  onConduct: () => void;
}) {
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }}
      className="nx-row-card"
    >
      <Avatar name={row.candidate_name} email={row.candidate_email} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
          <span className="nx-row-name">{row.candidate_name || row.candidate_email}</span>
          <span className={`nx-status ${row.status}`}>
            <span className="dot" />
            {STATUS_LABEL[row.status as InterviewStatus] ?? row.status}
          </span>
        </div>
        <div className="nx-row-email">{row.candidate_email}</div>
      </div>

      <div className="nx-meta-col">
        <div className="nx-meta-label">ROLE</div>
        <div className="nx-meta-value">{ROLE_LABEL[row.role_type as RoleType] ?? row.role_type}</div>
      </div>
      <div className="nx-meta-col">
        <div className="nx-meta-label">LEVEL</div>
        <div className="nx-meta-value">
          {EXPERIENCE_LABEL[row.experience_level as ExperienceLevel] ?? row.experience_level}
        </div>
      </div>
      <div className="nx-meta-col" style={{ width: 64 }}>
        <div className="nx-meta-label">ROUND</div>
        <div className="nx-meta-value">{row.current_round}</div>
      </div>
      <div className="nx-meta-col" style={{ width: 84 }}>
        <div className="nx-meta-label">CREATED</div>
        <div className="nx-meta-value" style={{ color: 'var(--ink-faint)', fontFamily: 'var(--f-mono)', fontSize: 11 }}>
          {relativeDate(row.created_at)}
        </div>
      </div>

      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 150, justifyContent: 'flex-end' }}
        onClick={(e) => e.stopPropagation()}
      >
        {row.status === 'completed' ? (
          <button className="nx-action-ghost" onClick={onConduct}>View report</button>
        ) : row.status === 'expired' ? (
          <button className="nx-action-ghost" disabled style={{ opacity: 0.5 }}>Expired</button>
        ) : (
          <button className="nx-action-primary" onClick={onConduct}>▸ Conduct</button>
        )}
        <ArrowRightOutlined className="nx-row-card-arrow" style={cssArrow} />
      </div>
    </div>
  );
}

const cssArrow: CSSProperties = {
  fontSize: 13,
};
