import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Collapse,
  Empty,
  Popconfirm,
  Progress,
  Spin,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  DeleteOutlined,
  ExclamationCircleFilled,
  FileTextOutlined,
} from '@ant-design/icons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteScreening, getScreening } from '../api/screenings';
import { scoreColor, VERDICT_COLOR, VERDICT_LABEL } from '../types';
import type { ScreenCandidate, Verdict } from '../types';
import PageHeader from '../components/PageHeader';

const { Text, Paragraph } = Typography;

export default function ScreeningDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { message } = AntApp.useApp();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['screening', id],
    queryFn: () => getScreening(id),
    enabled: !!id,
    // Poll while the background scorer is still working.
    refetchInterval: (q) => (q.state.data?.status === 'processing' ? 2500 : false),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteScreening(id),
    onSuccess: () => {
      message.success('Screening deleted');
      qc.invalidateQueries({ queryKey: ['screenings'] });
      navigate('/recruiter/screening');
    },
    onError: () => message.error('Delete failed'),
  });

  if (isLoading) {
    return (
      <div className="nx-empty">
        <Spin />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="nx-empty">
        <Empty description={`Failed to load: ${(error as Error)?.message ?? 'not found'}`} />
      </div>
    );
  }

  const processing = data.status === 'processing';

  return (
    <>
      <Link
        to="/recruiter/screening"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12, color: 'var(--hx-text-3)' }}
      >
        <ArrowLeftOutlined style={{ fontSize: 11 }} /> All screenings
      </Link>

      <PageHeader
        title={data.title}
        description={`${data.scored_count} / ${data.candidate_count} scored · ranked by match`}
        actions={
          <Popconfirm
            title="Delete this screening?"
            description="The shortlist and all results will be removed."
            onConfirm={() => deleteMut.mutate()}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />} loading={deleteMut.isPending}>
              Delete
            </Button>
          </Popconfirm>
        }
      />

      {processing && (
        <Alert
          type="info"
          showIcon
          icon={<Spin size="small" />}
          style={{ marginBottom: 16 }}
          message={`Scoring resumes… ${data.scored_count} of ${data.candidate_count} done.`}
        />
      )}
      {data.status === 'failed' && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="Scoring failed for every candidate. Check the API logs and retry."
        />
      )}

      <Collapse
        ghost
        style={{ marginBottom: 16 }}
        items={[
          {
            key: 'jd',
            label: <Text strong style={{ color: 'var(--hx-text-2)' }}>Job description</Text>,
            children: (
              <Paragraph style={{ whiteSpace: 'pre-wrap', color: 'var(--hx-text-2)', marginBottom: 0 }}>
                {data.jd_text}
              </Paragraph>
            ),
          },
        ]}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data.candidates.map((c, i) => (
          <CandidateCard key={c.id} candidate={c} rank={i + 1} />
        ))}
      </div>
    </>
  );
}

function CandidateCard({ candidate: c, rank }: { candidate: ScreenCandidate; rank: number }) {
  const scored = c.status === 'scored';
  const failed = c.status === 'failed';
  const pending = c.status === 'pending';
  const verdict = c.verdict as Verdict | null;

  return (
    <Card styles={{ body: { padding: 18 } }}>
      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
        {/* Match gauge */}
        <div style={{ width: 92, textAlign: 'center', flexShrink: 0 }}>
          {scored && c.match_score != null ? (
            <Progress
              type="circle"
              size={84}
              percent={c.match_score}
              strokeColor={scoreColor(c.match_score)}
              format={(p) => (
                <span style={{ color: scoreColor(c.match_score), fontWeight: 700, fontSize: 18 }}>
                  {p}%
                </span>
              )}
            />
          ) : pending ? (
            <div style={{ height: 84, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Spin />
            </div>
          ) : (
            <div
              style={{
                height: 84,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--hx-text-3)',
                fontSize: 24,
              }}
            >
              —
            </div>
          )}
          <div style={{ marginTop: 8, fontSize: 11, fontFamily: 'var(--f-mono)', color: 'var(--ink-faint)' }}>
            #{rank}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 2 }}>
            <Text strong style={{ fontSize: 16 }}>
              {c.candidate_name || c.file_name}
            </Text>
            {scored && verdict && <Tag color={VERDICT_COLOR[verdict]}>{VERDICT_LABEL[verdict]}</Tag>}
            {pending && <Tag>scoring…</Tag>}
            {failed && <Tag color="red">failed</Tag>}
          </div>
          <Text type="secondary" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <FileTextOutlined /> {c.file_name}
          </Text>

          {failed && c.error && (
            <Alert type="error" showIcon style={{ marginTop: 10 }} message={c.error} />
          )}

          {scored && (
            <>
              {c.summary && (
                <Paragraph style={{ marginTop: 10, marginBottom: 12, color: 'var(--hx-text-2)' }}>
                  {c.summary}
                </Paragraph>
              )}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: 18,
                }}
              >
                <BulletList
                  title="Strengths"
                  items={c.strengths}
                  icon={<CheckCircleFilled style={{ color: '#52c41a' }} />}
                  empty="No clear strengths surfaced."
                />
                <BulletList
                  title="Opportunities"
                  items={c.opportunities}
                  icon={<ExclamationCircleFilled style={{ color: '#faad14' }} />}
                  empty="No gaps surfaced."
                />
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

function BulletList({
  title,
  items,
  icon,
  empty,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
  empty: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontFamily: 'var(--f-mono)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--hx-text-3)',
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      {items.length === 0 ? (
        <Text type="secondary" style={{ fontSize: 13 }}>
          {empty}
        </Text>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((item, i) => (
            <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13.5, lineHeight: 1.5 }}>
              <span style={{ marginTop: 2, flexShrink: 0 }}>{icon}</span>
              <span style={{ color: 'var(--hx-text-2)' }}>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
