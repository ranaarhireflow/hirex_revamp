import { useState } from 'react';
import {
  App as AntApp,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTemplate,
  deleteTemplate,
  listTemplates,
  updateTemplate,
} from '../api/question-templates';
import {
  DIFFICULTY_COLOR,
  EXPERIENCE_LEVELS,
  QUESTION_TYPES,
  QUESTION_TYPE_COLOR,
  ROLE_TYPES,
  ROLE_LABEL,
  ROUNDS,
} from '../types';
import type {
  ExperienceLevel,
  QuestionTemplate,
  QuestionType,
  RoleType,
  Round,
} from '../types';

const { Title, Text } = Typography;

interface EditValues {
  role_type: RoleType;
  round: Round;
  question_type: QuestionType;
  difficulty: string;
  question_text: string;
  experience_levels: string[];
}

export default function QuestionBank() {
  const { message } = AntApp.useApp();
  const qc = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<RoleType | undefined>(undefined);
  const [roundFilter, setRoundFilter] = useState<Round | undefined>(undefined);
  const [levelFilter, setLevelFilter] = useState<ExperienceLevel | undefined>(undefined);
  const [editTarget, setEditTarget] = useState<QuestionTemplate | 'new' | null>(null);
  const [form] = Form.useForm<EditValues>();

  const { data, isLoading } = useQuery({
    queryKey: ['question-templates', roleFilter, roundFilter, levelFilter],
    queryFn: () =>
      listTemplates({
        role_type: roleFilter,
        round: roundFilter,
        experience_level: levelFilter,
      }),
  });

  const filtered = data ?? [];

  const createMut = useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      message.success('Question added');
      qc.invalidateQueries({ queryKey: ['question-templates'] });
      setEditTarget(null);
    },
    onError: (e) => message.error((e as Error).message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<EditValues> }) =>
      updateTemplate(id, payload),
    onSuccess: () => {
      message.success('Question updated');
      qc.invalidateQueries({ queryKey: ['question-templates'] });
      setEditTarget(null);
    },
    onError: (e) => message.error((e as Error).message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      message.success('Question deleted');
      qc.invalidateQueries({ queryKey: ['question-templates'] });
    },
    onError: (e) => message.error((e as Error).message),
  });

  const openCreate = () => {
    setEditTarget('new');
    // Defer to next tick — Form mounts inside the modal.
    setTimeout(() => {
      form.resetFields();
      form.setFieldsValue({
        role_type: roleFilter ?? 'backend',
        round: roundFilter ?? 'R1',
        question_type: 'behavioural',
        difficulty: 'medium',
        question_text: '',
        experience_levels: levelFilter ? [levelFilter] : ['mid', 'senior'],
      });
    }, 0);
  };

  const openEdit = (q: QuestionTemplate) => {
    setEditTarget(q);
    setTimeout(() => {
      form.setFieldsValue({
        role_type: q.role_type,
        round: q.round,
        question_type: q.question_type,
        difficulty: q.difficulty,
        question_text: q.question_text,
        experience_levels: q.experience_levels ?? [],
      });
    }, 0);
  };

  const onSubmit = (values: EditValues) => {
    if (editTarget === 'new') createMut.mutate(values);
    else if (editTarget) updateMut.mutate({ id: editTarget.id, payload: values });
  };

  return (
    <Card>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          Question bank
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add question
        </Button>
      </Space>

      <Space wrap style={{ marginBottom: 16 }}>
        <Text strong>Filter:</Text>
        <Select<RoleType | undefined>
          allowClear
          placeholder="All roles"
          style={{ width: 220 }}
          value={roleFilter}
          onChange={(v) => setRoleFilter(v)}
          options={ROLE_TYPES}
        />
        <Select<Round | undefined>
          allowClear
          placeholder="All rounds"
          style={{ width: 200 }}
          value={roundFilter}
          onChange={(v) => setRoundFilter(v)}
          options={ROUNDS}
        />
        <Select<ExperienceLevel | undefined>
          allowClear
          placeholder="All experience levels"
          style={{ width: 240 }}
          value={levelFilter}
          onChange={(v) => setLevelFilter(v)}
          options={EXPERIENCE_LEVELS.map((e) => ({ value: e.value, label: e.label }))}
        />
        <Text type="secondary">{filtered.length} question{filtered.length === 1 ? '' : 's'}</Text>
      </Space>

      {!isLoading && filtered.length === 0 ? (
        <Empty description="No questions match these filters" />
      ) : (
        <Table<QuestionTemplate>
          dataSource={filtered}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 15 }}
          columns={[
            {
              title: 'Question',
              dataIndex: 'question_text',
              render: (v: string, r) => (
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Text>{v}</Text>
                  {r.is_starter && <Tag color="blue">Starter</Tag>}
                </Space>
              ),
            },
            {
              title: 'Role',
              dataIndex: 'role_type',
              width: 170,
              render: (v: RoleType) => ROLE_LABEL[v],
            },
            { title: 'Round', dataIndex: 'round', width: 70 },
            {
              title: 'Type',
              dataIndex: 'question_type',
              width: 130,
              render: (v: QuestionType) => (
                <Tag color={QUESTION_TYPE_COLOR[v]}>{v.replace('_', ' ')}</Tag>
              ),
            },
            {
              title: 'Difficulty',
              dataIndex: 'difficulty',
              width: 100,
              render: (v: string) => <Tag color={DIFFICULTY_COLOR[v] ?? 'default'}>{v}</Tag>,
            },
            {
              title: 'Time',
              dataIndex: 'time_minutes',
              width: 70,
              render: (v: number) => (
                <span style={{ fontFamily: 'var(--hx-font-mono)', fontSize: 12, color: 'var(--hx-text-2)' }}>
                  {v}m
                </span>
              ),
            },
            {
              title: 'Level',
              dataIndex: 'experience_levels',
              width: 180,
              render: (v: string[]) =>
                !v || v.length === 0 ? (
                  <Text type="secondary">any</Text>
                ) : (
                  <Space size={2} wrap>
                    {v.map((lvl) => (
                      <Tag key={lvl} style={{ fontSize: 11 }}>
                        {lvl}
                      </Tag>
                    ))}
                  </Space>
                ),
            },
            {
              title: '',
              key: 'actions',
              width: 100,
              render: (_, r) => (
                <Space>
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
                  <Popconfirm
                    title="Delete this question?"
                    okText="Delete"
                    okType="danger"
                    onConfirm={() => deleteMut.mutate(r.id)}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      )}

      <Modal
        open={editTarget !== null}
        title={editTarget === 'new' ? 'Add question' : 'Edit question'}
        onCancel={() => setEditTarget(null)}
        onOk={() => form.submit()}
        okText={editTarget === 'new' ? 'Add' : 'Save'}
        confirmLoading={createMut.isPending || updateMut.isPending}
        width={720}
        destroyOnHidden
      >
        <Form<EditValues> form={form} layout="vertical" onFinish={onSubmit}>
          <Space size="middle" style={{ width: '100%', flexWrap: 'wrap' }}>
            <Form.Item label="Role" name="role_type" rules={[{ required: true }]} style={{ minWidth: 220 }}>
              <Select options={ROLE_TYPES} />
            </Form.Item>
            <Form.Item label="Round" name="round" rules={[{ required: true }]} style={{ minWidth: 160 }}>
              <Select options={ROUNDS} />
            </Form.Item>
            <Form.Item label="Type" name="question_type" rules={[{ required: true }]} style={{ minWidth: 180 }}>
              <Select options={QUESTION_TYPES} />
            </Form.Item>
            <Form.Item label="Difficulty" name="difficulty" rules={[{ required: true }]} style={{ minWidth: 140 }}>
              <Select
                options={[
                  { value: 'easy', label: 'Easy' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'hard', label: 'Hard' },
                ]}
              />
            </Form.Item>
          </Space>
          <Form.Item
            label="Experience levels (empty = any)"
            name="experience_levels"
            tooltip="Which levels this question fits. A fresher won't get the tech-lead questions."
          >
            <Select
              mode="multiple"
              placeholder="Pick levels…"
              options={EXPERIENCE_LEVELS.map((e) => ({ value: e.value, label: e.label }))}
            />
          </Form.Item>
          <Form.Item
            label="Question text"
            name="question_text"
            rules={[{ required: true, min: 8 }]}
          >
            <Input.TextArea rows={5} placeholder="Walk me through…" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
