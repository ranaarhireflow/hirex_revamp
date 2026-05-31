import {
  App as AntApp,
  Button,
  Card,
  Descriptions,
  Empty,
  Input,
  List,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd';
import { CopyOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getInterview } from '../api/interviews';
import { EXPERIENCE_LABEL, QUESTION_TYPE_COLOR, ROLE_LABEL } from '../types';
import type { ExperienceLevel, QuestionInInterview } from '../types';

const { Title, Paragraph, Text } = Typography;

export default function InterviewDetail() {
  const { id } = useParams<{ id: string }>();
  const { message } = AntApp.useApp();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['interview', id],
    queryFn: () => getInterview(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <Card>
        <Skeleton active />
      </Card>
    );
  }
  if (isError || !data) {
    return (
      <Card>
        <Empty description="Interview not found" />
      </Card>
    );
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(data.candidate_url);
    message.success('Link copied');
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card
        extra={
          <Link to={`/recruiter/${data.id}/conduct`}>
            <Button type="primary" size="large" icon={<PlayCircleOutlined />}>
              {data.status === 'completed' ? 'View / re-open conduct' : 'Conduct interview'}
            </Button>
          </Link>
        }
      >
        <Title level={4} style={{ marginTop: 0 }}>
          {data.candidate_name || data.candidate_email}
        </Title>
        <Descriptions column={2} size="small" bordered>
          <Descriptions.Item label="Email">{data.candidate_email}</Descriptions.Item>
          <Descriptions.Item label="Role">
            {ROLE_LABEL[data.role_type] ?? data.role_type}
          </Descriptions.Item>
          <Descriptions.Item label="Experience">
            <Tag color="geekblue">
              {EXPERIENCE_LABEL[data.experience_level as ExperienceLevel] ?? data.experience_level}
              {data.years_experience != null ? ` · ${data.years_experience} yrs` : ''}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Variant">{data.role_variant}</Descriptions.Item>
          <Descriptions.Item label="Round">{data.current_round}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag>{data.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Duration">
            {Math.round(data.duration_limit_seconds / 60)} min
          </Descriptions.Item>
          <Descriptions.Item label="Max questions">{data.question_limit}</Descriptions.Item>
          <Descriptions.Item label="Tone / Language">
            <Tag>{data.tone}</Tag>
            <Tag>{data.language}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Resume" span={2}>
            {data.resume_url ? (
              <Text code>{data.resume_url}</Text>
            ) : (
              <Text type="secondary">none</Text>
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Candidate link">
        <Paragraph>
          Share this with {data.candidate_name || data.candidate_email}. Valid for 7 days.
        </Paragraph>
        <Space.Compact style={{ width: '100%' }}>
          <Input value={data.candidate_url} readOnly />
          <Button icon={<CopyOutlined />} onClick={copyLink}>
            Copy
          </Button>
        </Space.Compact>
        <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
          <Text type="warning">Candidate room ships in Stage 3 — the link 404s for now.</Text>
        </Paragraph>
      </Card>

      <Card
        title={
          <Space>
            <span>Question pipeline</span>
            <Tag color="blue">{data.questions.length} questions</Tag>
          </Space>
        }
      >
        {data.questions.length === 0 ? (
          <Empty description="No questions configured. Edit the interview to add some." />
        ) : (
          <List<QuestionInInterview>
            dataSource={data.questions}
            renderItem={(q, idx) => (
              <List.Item>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Space>
                    <Text strong>Q{idx + 1}.</Text>
                    <Text>{q.question_text}</Text>
                  </Space>
                  <Space size={6} wrap>
                    <Tag color={QUESTION_TYPE_COLOR[q.question_type]}>
                      {q.question_type.replace('_', ' ')}
                    </Tag>
                    <Tag>{q.round}</Tag>
                    <Tag color={q.generated_by === 'llm' ? 'purple' : 'default'}>
                      {q.generated_by === 'llm' ? 'AI-generated' : 'from bank / custom'}
                    </Tag>
                  </Space>
                </Space>
              </List.Item>
            )}
          />
        )}
      </Card>

      {data.custom_instructions && (
        <Card title="Custom instructions for the AI">
          <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
            {data.custom_instructions}
          </Paragraph>
        </Card>
      )}

      <Card title="Job description">
        <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{data.jd_text}</Paragraph>
      </Card>
    </Space>
  );
}
