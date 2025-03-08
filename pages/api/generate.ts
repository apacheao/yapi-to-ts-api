import { NextApiRequest, NextApiResponse } from 'next';
import { APIGenerator } from '../../src/generator';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允许POST请求' });
  }

  try {
    console.log('收到请求数据:', req.body);
    
    const { baseUrl, interfaceId, path, token } = req.body;

    if (!baseUrl || !interfaceId || !path) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 在Vercel环境中使用内存路径
    const outputPath = process.env.VERCEL ? '/tmp/generated' : './generated';

    const generator = new APIGenerator({
      baseUrl,
      interfaceId,
      path,
      token,
      outputPath
    });

    const result = await generator.generate();
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('生成失败:', error);
    
    if (error instanceof Error) {
      return res.status(500).json({ error: `生成失败: ${error.message}` });
    }
    
    return res.status(500).json({ error: '生成失败: 未知错误' });
  }
} 