export interface YAPIConfig {
  /** YAPI项目的基础URL */
  baseUrl: string;
  /** 项目token */
  token?: string;
  /** 接口ID */
  interfaceId: number;
  /** Mock地址 */
  mockUrl?: string;
  /** API路径 */
  path: string;
  /** 输出目录 */
  outputPath: string;
}

export const defaultConfig: Partial<YAPIConfig> = {
  outputPath: './generated',
  baseUrl: 'https://yapi.cht-group.net'
}; 