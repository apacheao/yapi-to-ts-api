import React, { useState } from 'react';
import { Form, Input, Button, Tabs, Spin } from 'antd';
import { UploadOutlined, CloseCircleOutlined } from '@ant-design/icons';

interface FormValues {
  mockUrl: string;
  interfaceUrl: string;
  token?: string;
}

const DEFAULT_YAPI_URL = 'https://yapi.cht-group.net';

export default function Home() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [typeDefinition, setTypeDefinition] = useState('');
  const [apiRequest, setApiRequest] = useState('');
  const [error, setError] = useState('');

  const parseUrls = (mockUrl: string, interfaceUrl: string) => {
    console.log('开始解析URL:', { mockUrl, interfaceUrl });

    try {
      // 1. 验证基本URL格式
      if (!mockUrl?.trim() || !interfaceUrl?.trim()) {
        throw new Error('URL不能为空');
      }

      // 2. 解析接口URL
      const interfaceUrlObj = new URL(interfaceUrl.trim());
      const interfacePath = interfaceUrlObj.pathname;
      const interfaceMatch = interfacePath.match(/\/interface\/api\/(\d+)/);

      if (!interfaceMatch) {
        throw new Error('接口URL格式不正确，无法找到接口ID');
      }

      const interfaceId = Number(interfaceMatch[1]);
      console.log('接口ID:', interfaceId);

      // 3. 解析Mock URL
      const mockUrlObj = new URL(mockUrl.trim());
      const mockPath = mockUrlObj.pathname;
      const mockMatch = mockPath.match(/\/mock\/(\d+)\/(.+)/);

      if (!mockMatch) {
        throw new Error('Mock URL格式不正确，请确保包含正确的mock路径');
      }

      const projectId = mockMatch[1];
      const path = '/' + mockMatch[2];
      console.log('Mock解析结果:', { projectId, path });

      // 4. 构建结果
      const baseUrl = `${mockUrlObj.protocol}//${mockUrlObj.host}`;
      const result = {
        baseUrl,
        interfaceId,
        path,
      };

      console.log('最终解析结果:', result);
      return result;
    } catch (error) {
      console.error('URL解析错误:', error);
      if (error instanceof Error) {
        if (error instanceof TypeError && error.message.includes('URL')) {
          throw new Error('请输入有效的URL格式');
        }
        throw new Error(`URL解析错误: ${error.message}`);
      }
      throw new Error('请输入有效的URL');
    }
  };

  const onFinish = async (values: FormValues) => {
    setLoading(true);
    setTypeDefinition('');
    setApiRequest('');
    setError('');

    try {
      const { mockUrl, interfaceUrl, token } = values;

      // 解析URL
      const { baseUrl, interfaceId, path } = parseUrls(mockUrl, interfaceUrl);

      console.log('发送请求参数:', { baseUrl, interfaceId, path, token });

      // 发送请求到API
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseUrl,
          interfaceId,
          path,
          token,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '生成失败');
      }

      // 设置生成的代码
      if (result.data) {
        setTypeDefinition(result.data.typeDefinition || '');
        setApiRequest(result.data.apiRequest || '');
      } else {
        throw new Error('返回数据格式不正确');
      }
    } catch (error) {
      console.error('生成失败:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('生成失败: 未知错误');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div style={{ width: '60%', margin: '0 auto' }} className="bg-white rounded-lg shadow-md p-5">
        <h1 className="text-xl font-bold mb-5 border-b pb-2">
          YAPI TypeScript 生成器
        </h1>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
          requiredMark={false}
        >
          <Form.Item
            label="YAPI 接口详情 URL"
            name="interfaceUrl"
            rules={[{ required: true, message: '请输入YAPI接口详情URL' }]}
          >
            <Input placeholder="https://yapi.cht-group.net/project/19/interface/api/22236" />
          </Form.Item>
          <div className="text-gray-500 text-xs mb-4">
            从YAPI接口详情页面复制URL，例如：https://yapi.cht-group.net/project/407/interface/api/15594
          </div>

          <Form.Item
            label="YAPI Mock URL"
            name="mockUrl"
            rules={[{ required: true, message: '请输入YAPI Mock URL' }]}
          >
            <Input placeholder="https://yapi.cht-group.net/mock/19/api/finance/bill_file_task/withdraw" />
          </Form.Item>

          <Form.Item
            label="项目Token"
            name="token"
            rules={[{ required: true, message: '请输入项目Token' }]}
          >
            <Input.Password placeholder="在YAPI项目设置中可以找到项目token" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              className="w-full bg-blue-500 hover:bg-blue-600"
              icon={<UploadOutlined />}
            >
              生成API文件
            </Button>
          </Form.Item>
        </Form>

        {loading && (
          <div className="mt-4 flex justify-center">
            <Spin tip="生成中..." />
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md flex items-center text-sm">
            <CloseCircleOutlined className="mr-2" />
            {error}
          </div>
        )}

        {(typeDefinition || apiRequest) && (
          <div className="mt-5">
            <Tabs defaultActiveKey="1">
              <Tabs.TabPane tab="类型定义" key="1">
                <div className="bg-gray-50 p-3 rounded-md">
                  <pre className="whitespace-pre-wrap overflow-x-auto text-sm">
                    {typeDefinition || '暂无类型定义'}
                  </pre>
                </div>
              </Tabs.TabPane>
              <Tabs.TabPane tab="API请求" key="2">
                <div className="bg-gray-50 p-3 rounded-md">
                  <pre className="whitespace-pre-wrap overflow-x-auto text-sm">
                    {apiRequest || '暂无API请求代码'}
                  </pre>
                </div>
              </Tabs.TabPane>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
