import type { AppProps } from 'next/app';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { StyleProvider } from '@ant-design/cssinjs';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <StyleProvider hashPriority="high">
      <ConfigProvider locale={zhCN}>
        <Component {...pageProps} />
      </ConfigProvider>
    </StyleProvider>
  );
} 