import { useState } from 'react';
import {
  App as AntApp,
  Button,
  Card,
  Form,
  Input,
  Space,
  Typography,
  Upload,
} from 'antd';
import { InboxOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createScreening } from '../api/screenings';
import PageHeader from '../components/PageHeader';

const { Text } = Typography;
const { Dragger } = Upload;

interface FormValues {
  title?: string;
  jd_text: string;
}

export default function ScreeningCreate() {
  const [form] = Form.useForm<FormValues>();
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [files, setFiles] = useState<UploadFile[]>([]);

  const createMut = useMutation({
    mutationFn: async (values: FormValues) => {
      const realFiles = files
        .map((f) => f.originFileObj as File | undefined)
        .filter((f): f is File => !!f);
      if (realFiles.length === 0) throw new Error('Add at least one resume (or a ZIP of resumes).');
      return createScreening({
        jd_text: values.jd_text,
        title: values.title,
        files: realFiles,
      });
    },
    onSuccess: (screen) => {
      message.success(`Screening ${screen.candidate_count} candidate(s)…`);
      qc.invalidateQueries({ queryKey: ['screenings'] });
      navigate(`/recruiter/screening/${screen.id}`);
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (err as Error).message ?? 'Screening failed';
      message.error(msg);
    },
  });

  const uploadProps: UploadProps = {
    accept: '.pdf,.docx,.txt,.md,.zip',
    multiple: true,
    fileList: files,
    beforeUpload: () => false, // collect locally; upload on submit
    onChange: ({ fileList }) => setFiles(fileList),
    onRemove: (file) => setFiles((prev) => prev.filter((f) => f.uid !== file.uid)),
  };

  return (
    <Form<FormValues> form={form} layout="vertical" onFinish={(v) => createMut.mutate(v)}>
      <PageHeader
        title="New resume screening"
        description="Paste a JD, drop in a stack of resumes (or a ZIP), and get a ranked shortlist with match %, strengths, and opportunities."
      />

      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Card>
          <Form.Item
            label="Screening title (optional)"
            name="title"
            style={{ marginBottom: 16 }}
          >
            <Input placeholder="e.g. Senior Backend — June batch" />
          </Form.Item>

          <Form.Item
            label="Job description"
            name="jd_text"
            rules={[{ required: true, min: 20, message: 'At least 20 characters of JD.' }]}
            style={{ marginBottom: 0 }}
          >
            <Input.TextArea rows={8} placeholder="Paste the JD the resumes should be matched against…" />
          </Form.Item>
        </Card>

        <Card title={<Text strong>Resumes</Text>}>
          <Dragger {...uploadProps} style={{ background: 'transparent' }}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Click or drag resumes here</p>
            <p className="ant-upload-hint">
              PDF, DOCX, or text — individually or as a ZIP. Up to 50 candidates per batch.
              Resumes are scored and discarded; the files themselves are never stored.
            </p>
          </Dragger>
        </Card>

        <Card>
          <Space style={{ justifyContent: 'space-between', width: '100%' }} wrap>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {files.length} file{files.length === 1 ? '' : 's'} selected
            </Text>
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              icon={<ThunderboltOutlined />}
              loading={createMut.isPending}
              disabled={files.length === 0}
            >
              Screen resumes
            </Button>
          </Space>
        </Card>
      </Space>
    </Form>
  );
}
