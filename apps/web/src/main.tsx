import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, App as AntApp, theme as antdTheme } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import 'antd/dist/reset.css';
import './styles/tokens.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
});

// Linear/Stripe/Notion-grade theme: slate scale + single blue accent + Inter.
const HX_THEME = {
  algorithm: antdTheme.defaultAlgorithm,
  token: {
    fontFamily:
      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    fontSize: 14,
    fontSizeLG: 15,
    fontSizeHeading1: 28,
    fontSizeHeading2: 22,
    fontSizeHeading3: 18,
    fontSizeHeading4: 16,
    fontWeightStrong: 600,
    lineHeight: 1.55,

    colorPrimary: '#2563EB',
    colorInfo: '#2563EB',
    colorSuccess: '#16A34A',
    colorWarning: '#D97706',
    colorError: '#DC2626',

    colorBgLayout: '#F8FAFC',
    colorBgContainer: '#FFFFFF',
    colorBgElevated: '#FFFFFF',
    colorBgSpotlight: '#0F172A',

    colorText: '#0F172A',
    colorTextSecondary: '#334155',
    colorTextTertiary: '#64748B',
    colorTextQuaternary: '#94A3B8',
    colorTextDescription: '#64748B',

    colorBorder: '#E2E8F0',
    colorBorderSecondary: '#F1F5F9',
    colorSplit: '#F1F5F9',

    borderRadius: 8,
    borderRadiusLG: 10,
    borderRadiusSM: 6,
    borderRadiusXS: 4,

    boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
    boxShadowSecondary: '0 8px 24px rgba(15,23,42,0.08), 0 2px 4px rgba(15,23,42,0.04)',
    boxShadowTertiary: '0 1px 2px rgba(15,23,42,0.04)',

    controlHeight: 36,
    controlHeightLG: 40,
    controlHeightSM: 28,
    controlOutlineWidth: 2,
  },
  components: {
    Layout: {
      bodyBg: '#F8FAFC',
      headerBg: '#FFFFFF',
      siderBg: '#FFFFFF',
    },
    Card: {
      borderRadiusLG: 10,
      headerBg: 'transparent',
      headerFontSize: 14,
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: '#EFF6FF',
      itemSelectedColor: '#2563EB',
      itemHoverBg: '#F1F5F9',
      itemBorderRadius: 6,
    },
    Button: {
      fontWeight: 500,
      controlHeight: 36,
      paddingInline: 14,
    },
    Tag: {
      defaultBg: '#F1F5F9',
      defaultColor: '#475569',
    },
    Input: {
      activeBorderColor: '#2563EB',
      hoverBorderColor: '#CBD5E1',
    },
    Table: {
      headerBg: '#F8FAFC',
      headerColor: '#475569',
      rowHoverBg: '#F8FAFC',
    },
    Modal: {
      borderRadiusLG: 12,
    },
    Progress: {
      defaultColor: '#2563EB',
    },
  },
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={HX_THEME}>
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>,
);
