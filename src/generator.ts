import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { YAPIConfig, defaultConfig } from './config';

// JSON Schema 属性类型
interface JSONSchemaProperty {
  type: string;
  description?: string;
  format?: string;
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
}

// JSON Schema 类型
interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
}

interface QueryParam {
  name: string;
  required: string | boolean;
  example?: string;
  desc?: string;
  type: string;
}

// YAPI接口参数类型
interface YAPIParameter {
  name: string;
  desc?: string;
  required?: string | boolean;
  type?: string;
  example?: string;
}

// YAPI接口类型
interface YAPIInterface {
  _id: string;
  title: string;
  path: string;
  method: string;
  project_id: number;
  req_query?: YAPIParameter[];
  req_headers?: YAPIParameter[];
  req_body_type?: string;
  req_body_form?: YAPIParameter[];
  req_body_other?: string | any;
  res_body_type?: string;
  res_body?: string | any;
}

// YAPI响应类型
interface YAPIResponse<T> {
  errcode: number;
  errmsg: string;
  data: T;
}

export class APIGenerator {
  private config: YAPIConfig;
  private generatedTypes: Set<string> = new Set();

  constructor(config: YAPIConfig) {
    this.config = { ...defaultConfig, ...config };
  }

  async generate() {
    try {
      console.log('开始生成API文件');
      
      // 在Vercel环境中使用/tmp目录
      if (process.env.VERCEL) {
        console.log('在Vercel环境中运行，使用/tmp目录');
        this.config.outputPath = '/tmp/generated';
      }
      
      // 创建输出目录（如果不存在）
      if (!fs.existsSync(this.config.outputPath)) {
        fs.mkdirSync(this.config.outputPath, { recursive: true });
      }

      // 获取接口详情
      const apiDetail = await this.fetchAPIDetail();
      console.log('接口详情获取成功，开始生成代码');

      // 生成类型定义和API请求代码
      const typeDefinition = this.generateTypes(apiDetail);
      const apiRequest = this.generateAPI(apiDetail);

      console.log('代码生成成功');

      // 返回生成的代码
      return {
        typeDefinition,
        apiRequest
      };
    } catch (error) {
      console.error('生成失败:', error);
      throw error;
    }
  }

  private cleanGeneratedFiles() {
    // 在Vercel环境中不执行文件操作
    if (process.env.VERCEL) {
      console.log('在Vercel环境中跳过文件清理');
      return;
    }
    
    const typesPath = path.join(this.config.outputPath, 'types.ts');
    const apiPath = path.join(this.config.outputPath, 'api.ts');

    if (fs.existsSync(typesPath)) {
      fs.unlinkSync(typesPath);
      console.log('已删除旧的类型定义文件');
    }

    if (fs.existsSync(apiPath)) {
      fs.unlinkSync(apiPath);
      console.log('已删除旧的API请求文件');
    }
  }

  async fetchAPIDetail() {
    try {
      console.log('开始获取接口详情，参数:', {
        baseUrl: this.config.baseUrl,
        interfaceId: this.config.interfaceId,
        token: this.config.token
      });

      // 确保baseUrl没有尾部斜杠
      const baseUrl = this.config.baseUrl.endsWith('/')
        ? this.config.baseUrl.slice(0, -1)
        : this.config.baseUrl;

      // 构建API请求URL
      const url = `${baseUrl}/api/interface/get?id=${this.config.interfaceId}${
        this.config.token ? `&token=${this.config.token}` : ''
      }`;

      console.log('请求接口详情URL:', url);

      // 发送请求获取接口详情
      const response = await axios.get(url);
      
      console.log('接口详情响应状态:', response.status);

      if (response.status !== 200) {
        throw new Error(`请求失败，状态码: ${response.status}`);
      }

      const { data } = response;

      if (data.errcode !== 0) {
        throw new Error(`获取接口详情失败: ${data.errmsg}`);
      }

      console.log('接口详情获取成功');
      
      // 使用配置中提供的路径
      const apiPath = this.config.path;
      console.log('使用API路径:', apiPath);

      return {
        ...data.data,
        path: apiPath
      };
    } catch (error) {
      console.error('获取接口详情失败:', error);
      if (error instanceof Error) {
        throw new Error(`获取接口详情失败: ${error.message}`);
      }
      throw new Error('获取接口详情失败');
    }
  }

  generateTypes(apiInterface: YAPIInterface): string {
    try {
      console.log('开始生成类型定义');
      
      let content = `/**
 * 接口名称: ${apiInterface.title}
 * 接口路径: ${apiInterface.path}
 * 接口方法: ${apiInterface.method}
 */

`;

      // 生成请求参数类型
      const requestTypeName = this.getTypeName(apiInterface.path, apiInterface.method, 'Request');
      let requestType = '';

      // 处理请求体参数
      if (apiInterface.req_body_type === 'json' && apiInterface.req_body_other) {
        try {
          console.log('解析请求体:', typeof apiInterface.req_body_other);
          
          const reqBodyJson = typeof apiInterface.req_body_other === 'string'
            ? JSON.parse(apiInterface.req_body_other)
            : apiInterface.req_body_other;
          
          console.log('请求体解析结果:', {
            type: reqBodyJson.type,
            hasProperties: !!reqBodyJson.properties
          });

          if (reqBodyJson.type === 'object' && reqBodyJson.properties) {
            requestType = this.generateTypeFromSchema(reqBodyJson, requestTypeName);
          } else {
            requestType = `export interface ${requestTypeName} {}\n`;
          }
        } catch (e) {
          console.error('解析请求体JSON失败:', e);
          requestType = `export interface ${requestTypeName} {}\n`;
        }
      }

      // 如果没有请求体，则使用查询参数
      if (!requestType && apiInterface.req_query && apiInterface.req_query.length > 0) {
        requestType = `export interface ${requestTypeName} {\n`;
        apiInterface.req_query.forEach(param => {
          const required = param.required === '1' ? '' : '?';
          const type = this.getTypeFromProperty(param);
          requestType += `  /** ${param.desc || ''} */\n`;
          requestType += `  ${param.name}${required}: ${type};\n`;
        });
        requestType += '}\n';
      }

      // 如果没有请求体和查询参数，则创建空接口
      if (!requestType) {
        requestType = `export interface ${requestTypeName} {}\n`;
      }

      // 生成响应类型
      const responseTypeName = this.getTypeName(apiInterface.path, apiInterface.method, 'Response');
      let responseType = '';

      if (apiInterface.res_body_type === 'json' && apiInterface.res_body) {
        try {
          console.log('解析响应体:', typeof apiInterface.res_body);
          
          const resBodyJson = typeof apiInterface.res_body === 'string'
            ? JSON.parse(apiInterface.res_body)
            : apiInterface.res_body;
          
          console.log('响应体解析结果:', {
            type: resBodyJson.type,
            hasProperties: !!resBodyJson.properties
          });

          if (resBodyJson.type === 'object' && resBodyJson.properties) {
            // 处理标准响应结构
            responseType = this.generateTypeFromSchema(resBodyJson, responseTypeName);
            
            // 检查是否有data字段，并且data是对象类型
            if (resBodyJson.properties.data && resBodyJson.properties.data.type === 'object') {
              console.log('检测到data字段是对象类型，生成Data接口');
              
              // 为data字段生成单独的接口
              const dataTypeName = `${responseTypeName}Data`;
              const dataSchema = resBodyJson.properties.data;
              
              if (dataSchema.properties) {
                const dataType = this.generateTypeFromSchema(
                  { type: 'object', properties: dataSchema.properties, required: dataSchema.required },
                  dataTypeName
                );
                
                // 将data类型更新为具体的接口类型
                responseType = responseType.replace(
                  /data\?:\s*Record<string,\s*any>;/,
                  `data?: ${dataTypeName};`
                );
                
                // 添加data接口定义
                responseType = dataType + '\n' + responseType;
              }
            }
          } else {
            responseType = `export interface ${responseTypeName} {}\n`;
          }
        } catch (e) {
          console.error('解析响应体JSON失败:', e);
          responseType = `export interface ${responseTypeName} {}\n`;
        }
      } else {
        responseType = `export interface ${responseTypeName} {}\n`;
      }

      content += requestType + '\n' + responseType;
      
      console.log('类型定义生成成功');
      return content;
    } catch (error) {
      console.error('生成类型定义失败:', error);
      throw error;
    }
  }

  generateAPI(apiInterface: YAPIInterface): string {
    try {
      console.log('开始生成API请求函数');
      
      const functionName = this.getFunctionName(apiInterface.path, apiInterface.method);
      const requestTypeName = this.getTypeName(apiInterface.path, apiInterface.method, 'Request');
      const responseTypeName = this.getTypeName(apiInterface.path, apiInterface.method, 'Response');
      const method = apiInterface.method.toLowerCase();
      const path = apiInterface.path;

      let content = `/**
 * ${apiInterface.title}
 * @description ${apiInterface.title}
 * @param data 请求参数
 * @returns Promise<${responseTypeName}>
 */
export function ${functionName}(data: ${requestTypeName}): Promise<${responseTypeName}> {
  return request({
    url: '${path}',
    method: '${method}',
    ${method.toLowerCase() === 'get' ? 'params: data' : 'data'}
  });
}

/**
 * 使用示例:
 * 
 * import { ${functionName} } from './api';
 * 
 * // 调用接口
 * const response = await ${functionName}({
 *   // 请求参数
 * });
 * console.log(response);
 */
`;

      console.log('API请求函数生成成功');
      return content;
    } catch (error) {
      console.error('生成API请求函数失败:', error);
      throw error;
    }
  }

  private getTypeFromQueryParam(param: QueryParam): string {
    switch (param.type) {
      case 'string':
        return 'string';
      case 'number':
      case 'integer':
        return param.example?.includes('.') ? 'number' : 'number';
      case 'boolean':
        return 'boolean';
      default:
        return 'string';
    }
  }

  private getTypeFromProperty(prop: YAPIParameter | JSONSchemaProperty): string {
    console.log('处理属性类型:', prop);
    
    // 处理YAPIParameter类型
    if ('name' in prop) {
      const type = prop.type?.toLowerCase() || 'string';
      
      if (type === 'text' || type === '文本') {
        return 'string';
      }
      
      if (type === 'integer' || type === 'number') {
        return 'number';
      }
      
      if (type === 'boolean') {
        return 'boolean';
      }
      
      return 'string';
    }
    
    // 处理JSONSchemaProperty类型
    const type = prop.type?.toLowerCase();
    
    if (!type) {
      return 'any';
    }
    
    if (type === 'text' || type === '文本') {
      return 'string';
    }
    
    if (type === 'string') {
      return 'string';
    }
    
    if (type === 'integer' || type === 'number') {
      // 处理特殊格式
      if (prop.format === 'int64') {
        return 'bigint';
      }
      if (prop.format === 'int32' || prop.format === 'int') {
        return 'number';
      }
      return 'number';
    }
    
    if (type === 'boolean') {
      return 'boolean';
    }
    
    if (type === 'array' && prop.items) {
      if (typeof prop.items === 'object') {
        // 处理数组项是对象的情况
        if (prop.items.type === 'object' && prop.items.properties) {
          return 'Record<string, any>[]';
        }
        const itemType = this.getTypeFromProperty(prop.items);
        return `${itemType}[]`;
      }
      return 'any[]';
    }
    
    if (type === 'object') {
      if (prop.properties) {
        // 这里我们不直接生成嵌套类型，而是在generateTypeFromSchema中处理
        return 'Record<string, any>';
      }
      return 'Record<string, any>';
    }
    
    console.log('未知类型:', type);
    return 'any';
  }

  private generateTypeFromSchema(schema: JSONSchema, typeName: string): string {
    console.log('生成类型定义:', { typeName, schemaType: schema.type });
    
    if (schema.type !== 'object' || !schema.properties) {
      return `export interface ${typeName} {}\n`;
    }
    
    let content = `export interface ${typeName} {\n`;
    
    // 处理所有属性
    for (const [key, prop] of Object.entries(schema.properties)) {
      const required = schema.required?.includes(key) ? '' : '?';
      let type = '';
      
      // 处理嵌套对象
      if (prop.type === 'object' && prop.properties) {
        // 为嵌套对象创建子接口
        const nestedTypeName = `${typeName}${this.capitalizeFirst(key)}`;
        const nestedType = this.generateNestedType(prop, nestedTypeName);
        
        // 添加子接口定义
        content = nestedType + '\n' + content;
        type = nestedTypeName;
      } else {
        type = this.getTypeFromProperty(prop);
      }
      
      const description = prop.description ? `/** ${prop.description} */\n  ` : '';
      content += `  ${description}${key}${required}: ${type};\n`;
    }
    
    content += '}\n';
    return content;
  }
  
  private generateNestedType(schema: JSONSchemaProperty, typeName: string): string {
    console.log('生成嵌套类型:', { typeName, schemaType: schema.type });
    
    if (schema.type !== 'object' || !schema.properties) {
      return `export interface ${typeName} {}\n`;
    }
    
    let content = `export interface ${typeName} {\n`;
    
    // 处理所有属性
    for (const [key, prop] of Object.entries(schema.properties)) {
      const required = schema.required?.includes(key) ? '' : '?';
      let type = '';
      
      // 处理嵌套对象
      if (prop.type === 'object' && prop.properties) {
        // 为嵌套对象创建子接口
        const nestedTypeName = `${typeName}${this.capitalizeFirst(key)}`;
        const nestedType = this.generateNestedType(prop, nestedTypeName);
        
        // 添加子接口定义
        content = nestedType + '\n' + content;
        type = nestedTypeName;
      } else {
        type = this.getTypeFromProperty(prop);
      }
      
      const description = prop.description ? `/** ${prop.description} */\n  ` : '';
      content += `  ${description}${key}${required}: ${type};\n`;
    }
    
    content += '}\n';
    return content;
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private getTypeName(path: string, method: string, suffix: string): string {
    // 移除开头的斜杠，然后按斜杠分割
    const parts = path.replace(/^\/+/, '').split('/');
    
    // 将路径部分转换为大驼峰格式
    const typeParts = parts.map(part => {
      // 处理带连字符的部分
      return part.split(/[-_]/)
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join('');
    });

    // 组合最终的类型名
    const typeName = typeParts.join('') +
      method.charAt(0).toUpperCase() +
      method.slice(1).toLowerCase() +
      suffix;
    
    console.log('生成类型名称:', { path, method, suffix, typeName });
    return typeName;
  }

  private getFunctionName(path: string, method: string): string {
    // 移除开头的斜杠，然后按斜杠分割
    const parts = path.replace(/^\/+/, '').split('/');
    
    // 将路径部分转换为驼峰格式
    const nameParts = parts.map((part, index) => {
      // 处理带连字符的部分
      const words = part.split(/[-_]/);
      return words.map((word, wordIndex) => {
        // 如果是第一个部分的第一个词，保持小写
        if (index === 0 && wordIndex === 0) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      }).join('');
    });

    // 组合最终的函数名
    const functionName = method.toLowerCase() + nameParts.join('');
    
    console.log('生成函数名称:', { path, method, functionName });
    return functionName;
  }
} 