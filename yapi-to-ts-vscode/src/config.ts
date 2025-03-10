export interface YAPIConfig {
  /** 接口ID */
  interfaceId: number;
  /** 项目token */
  token?: string;
  /** API路径 */
  path: string;
  /** 输出目录 */
  outputPath: string;
}

export const defaultConfig: Partial<YAPIConfig> = {}; 