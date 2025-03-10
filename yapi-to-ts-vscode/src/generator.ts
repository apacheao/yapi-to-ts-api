import axios from 'axios';
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
  items?: JSONSchemaProperty;
}

interface QueryParam {
  name: string;
  required?: string | boolean;
  example?: string;
  desc?: string;
  type?: string;
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

  async fetchAPIDetail() {
    try {
      console.log(`正在获取接口详情，接口ID: ${this.config.interfaceId}`);
      
      // 从mockUrl中提取baseUrl
      const mockUrlMatch = this.config.path.match(/^\/([^\/]+)/);
      const baseUrl = mockUrlMatch ? `https://yapi.cht-group.net` : 'https://yapi.cht-group.net';
      
      const url = `${baseUrl}/api/interface/get`;
      
      const params: any = {
        id: this.config.interfaceId
      };
      
      // 如果有token，添加到请求参数中
      if (this.config.token) {
        params.token = this.config.token;
      }
      
      const response = await axios.get<YAPIResponse<YAPIInterface>>(url, { params });
      
      if (response.data.errcode !== 0) {
        throw new Error(`获取接口详情失败: ${response.data.errmsg}`);
      }
      
      return response.data.data;
    } catch (error) {
      console.error('获取接口详情失败:', error);
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(`获取接口详情失败: ${error.response.status} ${error.response.statusText}`);
        } else if (error.request) {
          throw new Error('获取接口详情失败: 无法连接到YAPI服务器');
        } else {
          throw new Error(`获取接口详情失败: ${error.message}`);
        }
      }
      throw error;
    }
  }

  generateTypes(apiInterface: YAPIInterface): string {
    try {
      console.log('开始生成类型定义');
      
      let output = '';
      
      // 重置已生成的类型集合
      this.generatedTypes = new Set();
      
      // 生成请求参数类型
      if (apiInterface.req_body_type === 'json' && apiInterface.req_body_other) {
        let reqBodySchema: JSONSchema;
        
        if (typeof apiInterface.req_body_other === 'string') {
          reqBodySchema = JSON.parse(apiInterface.req_body_other);
        } else {
          reqBodySchema = apiInterface.req_body_other;
        }
        
        const reqTypeName = this.getTypeName(apiInterface.path, apiInterface.method, 'Req');
        output += this.generateTypeFromSchema(reqBodySchema, reqTypeName);
        output += '\n\n';
        
        // 记录已生成的类型
        this.generatedTypes.add(reqTypeName);
      } else if (apiInterface.req_query && apiInterface.req_query.length > 0) {
        const reqTypeName = this.getTypeName(apiInterface.path, apiInterface.method, 'Req');
        
        output += `export interface ${reqTypeName} {\n`;
        
        for (const param of apiInterface.req_query) {
          const paramType = this.getTypeFromQueryParam(param);
          const isRequired = param.required === '1' || param.required === true;
          const optionalMark = isRequired ? '' : '?';
          
          if (param.desc) {
            output += `  /** ${param.desc} */\n`;
          }
          
          output += `  ${param.name}${optionalMark}: ${paramType};\n`;
        }
        
        output += '}\n\n';
        
        // 记录已生成的类型
        this.generatedTypes.add(reqTypeName);
      }
      
      // 生成响应类型
      if (apiInterface.res_body_type === 'json' && apiInterface.res_body) {
        let resBodySchema: JSONSchema;
        
        if (typeof apiInterface.res_body === 'string') {
          resBodySchema = JSON.parse(apiInterface.res_body);
        } else {
          resBodySchema = apiInterface.res_body;
        }
        
        const resTypeName = this.getTypeName(apiInterface.path, apiInterface.method, 'Res');
        output += this.generateTypeFromSchema(resBodySchema, resTypeName);
        
        // 记录已生成的类型
        this.generatedTypes.add(resTypeName);
      }
      
      return output;
    } catch (error) {
      console.error('生成类型定义失败:', error);
      throw new Error(`生成类型定义失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  generateAPI(apiInterface: YAPIInterface): string {
    try {
      console.log('开始生成API请求代码');
      
      const method = apiInterface.method.toLowerCase();
      const functionName = this.getFunctionName(apiInterface.path, apiInterface.method);
      const reqTypeName = this.getTypeName(apiInterface.path, apiInterface.method, 'Req');
      const resTypeName = this.getTypeName(apiInterface.path, apiInterface.method, 'Res');
      
      let hasRequestBody = apiInterface.req_body_type === 'json' && apiInterface.req_body_other;
      let hasQueryParams = apiInterface.req_query && apiInterface.req_query.length > 0;
      
      let output = '';
      
      // 导入类型
      output += `import axios from 'axios';\n`;
      
      // 始终导入请求和响应类型，不再检查generatedTypes集合
      if (hasRequestBody || hasQueryParams) {
        output += `import { ${reqTypeName} } from './types';\n`;
      }
      
      output += `import { ${resTypeName} } from './types';\n`;
      
      output += '\n';
      
      // 生成API函数
      output += `/**\n`;
      output += ` * ${apiInterface.title}\n`;
      output += ` * @description ${apiInterface.path}\n`;
      output += ` * @method ${apiInterface.method.toUpperCase()}\n`;
      output += ` */\n`;
      
      // 提取路径的最后一部分作为API路径
      const apiPath = this.config.path;
      
      if (hasRequestBody) {
        output += `export async function ${functionName}(data: ${reqTypeName}) {\n`;
        output += `  const response = await axios.${method}<${resTypeName}>('${apiPath}', data);\n`;
        output += `  return response.data;\n`;
        output += `}\n`;
      } else if (hasQueryParams) {
        output += `export async function ${functionName}(params: ${reqTypeName}) {\n`;
        output += `  const response = await axios.${method}<${resTypeName}>('${apiPath}', { params });\n`;
        output += `  return response.data;\n`;
        output += `}\n`;
      } else {
        output += `export async function ${functionName}() {\n`;
        output += `  const response = await axios.${method}<${resTypeName}>('${apiPath}');\n`;
        output += `  return response.data;\n`;
        output += `}\n`;
      }
      
      return output;
    } catch (error) {
      console.error('生成API请求代码失败:', error);
      throw new Error(`生成API请求代码失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private getTypeFromQueryParam(param: QueryParam): string {
    // 根据字段名称推断类型
    const fieldName = param.name.toLowerCase();
    if (fieldName.includes('id') && !fieldName.includes('idea') && !fieldName.includes('hide')) {
      return 'string | number'; // ID通常是字符串或数字
    }
    if (fieldName.includes('time') || fieldName.includes('date')) {
      return 'string'; // 时间/日期通常是字符串
    }
    if (fieldName.includes('count') || fieldName.includes('amount') || fieldName.includes('price') || fieldName.includes('quantity')) {
      return 'number'; // 数量/金额通常是数字
    }
    if (fieldName.includes('is') || fieldName.includes('has') || fieldName.includes('enable') || fieldName.includes('disable')) {
      return 'boolean'; // 布尔标志
    }

    // 根据示例值推断类型
    if (param.example !== undefined && param.example !== '') {
      const exampleType = typeof param.example;
      if (exampleType === 'string') return 'string';
      if (exampleType === 'number') return 'number';
      if (exampleType === 'boolean') return 'boolean';
    }

    // 根据类型字段推断
    switch (param.type) {
      case 'string':
        return 'string';
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'integer':
        return 'number';
      default:
        return 'unknown'; // 使用unknown代替any，更安全
    }
  }

  private getTypeFromProperty(prop: YAPIParameter | JSONSchemaProperty): string {
    // 根据字段名称推断类型
    if ('name' in prop) {
      // 根据常见字段名称模式推断类型
      const fieldName = prop.name.toLowerCase();
      if (fieldName.includes('id') && !fieldName.includes('idea') && !fieldName.includes('hide')) {
        return 'string | number'; // ID通常是字符串或数字
      }
      if (fieldName.includes('time') || fieldName.includes('date')) {
        return 'string'; // 时间/日期通常是字符串
      }
      if (fieldName.includes('count') || fieldName.includes('amount') || fieldName.includes('price') || fieldName.includes('quantity')) {
        return 'number'; // 数量/金额通常是数字
      }
      if (fieldName.includes('is') || fieldName.includes('has') || fieldName.includes('enable') || fieldName.includes('disable')) {
        return 'boolean'; // 布尔标志
      }
    }

    // 根据示例值推断类型
    if ('example' in prop && prop.example !== undefined && prop.example !== '') {
      const exampleType = typeof prop.example;
      if (exampleType === 'string') return 'string';
      if (exampleType === 'number') return 'number';
      if (exampleType === 'boolean') return 'boolean';
    }

    // 根据类型字段推断
    if ('type' in prop) {
      switch (prop.type) {
        case 'string':
          return 'string';
        case 'number':
          return 'number';
        case 'boolean':
          return 'boolean';
        case 'integer':
          return 'number';
        case 'array':
          if ('items' in prop && prop.items) {
            const itemType = this.getTypeFromProperty(prop.items);
            return `${itemType}[]`;
          }
          return 'any[]';
        case 'object':
          if ('properties' in prop && prop.properties) {
            let result = '{ ';
            for (const [key, value] of Object.entries(prop.properties)) {
              const propType = this.getTypeFromProperty(value);
              const isRequired = prop.required?.includes(key);
              const optionalMark = isRequired ? '' : '?';
              result += `${key}${optionalMark}: ${propType}; `;
            }
            result += '}';
            return result;
          }
          return 'Record<string, any>';
        default:
          // 尝试根据字段名称推断
          if ('name' in prop) {
            const fieldName = prop.name.toLowerCase();
            if (fieldName.includes('id')) {
              return 'string | number';
            }
          }
          return 'unknown'; // 使用unknown代替any，更安全
      }
    }
    
    return 'unknown'; // 使用unknown代替any，更安全
  }

  private generateTypeFromSchema(schema: JSONSchema, typeName: string): string {
    try {
      let output = '';
      
      if (schema.type === 'object' && schema.properties) {
        // 记录已生成的类型
        this.generatedTypes.add(typeName);
        
        output += `export interface ${typeName} {\n`;
        
        for (const [key, prop] of Object.entries(schema.properties)) {
          const isRequired = schema.required?.includes(key);
          const optionalMark = isRequired ? '' : '?';
          
          if (prop.description) {
            output += `  /** ${prop.description} */\n`;
          }
          
          if (prop.type === 'object' && prop.properties) {
            const nestedTypeName = `${typeName}${this.capitalizeFirst(key)}`;
            output += `  ${key}${optionalMark}: ${nestedTypeName};\n`;
            
            // 生成嵌套类型
            const nestedType = this.generateNestedType(prop, nestedTypeName);
            output = nestedType + '\n' + output;
          } else if (prop.type === 'array' && prop.items && prop.items.type === 'object' && prop.items.properties) {
            const nestedTypeName = `${typeName}${this.capitalizeFirst(key)}Item`;
            output += `  ${key}${optionalMark}: ${nestedTypeName}[];\n`;
            
            // 生成嵌套类型
            const nestedType = this.generateNestedType(prop.items, nestedTypeName);
            output = nestedType + '\n' + output;
          } else {
            const propType = this.getTypeFromProperty(prop);
            output += `  ${key}${optionalMark}: ${propType};\n`;
          }
        }
        
        output += '}\n';
      } else if (schema.type === 'array' && schema.items) {
        // 记录已生成的类型
        this.generatedTypes.add(typeName);
        
        if (schema.items.type === 'object' && schema.items.properties) {
          const itemTypeName = `${typeName}Item`;
          output += this.generateNestedType(schema.items, itemTypeName);
          output += `\nexport type ${typeName} = ${itemTypeName}[];\n`;
        } else {
          const itemType = this.getTypeFromProperty(schema.items);
          output += `export type ${typeName} = ${itemType}[];\n`;
        }
      }
      
      return output;
    } catch (error) {
      console.error('生成类型失败:', error);
      throw new Error(`生成类型失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private generateNestedType(schema: JSONSchemaProperty, typeName: string): string {
    try {
      // 记录已生成的类型
      this.generatedTypes.add(typeName);
      
      let output = `export interface ${typeName} {\n`;
      
      if (schema.type === 'object' && schema.properties) {
        for (const [key, prop] of Object.entries(schema.properties)) {
          const isRequired = schema.required?.includes(key);
          const optionalMark = isRequired ? '' : '?';
          
          if (prop.description) {
            output += `  /** ${prop.description} */\n`;
          }
          
          if (prop.type === 'object' && prop.properties) {
            const nestedTypeName = `${typeName}${this.capitalizeFirst(key)}`;
            output += `  ${key}${optionalMark}: ${nestedTypeName};\n`;
            
            // 递归生成嵌套类型
            const nestedType = this.generateNestedType(prop, nestedTypeName);
            output = nestedType + '\n' + output;
          } else if (prop.type === 'array' && prop.items && prop.items.type === 'object' && prop.items.properties) {
            const nestedTypeName = `${typeName}${this.capitalizeFirst(key)}Item`;
            output += `  ${key}${optionalMark}: ${nestedTypeName}[];\n`;
            
            // 递归生成嵌套类型
            const nestedType = this.generateNestedType(prop.items, nestedTypeName);
            output = nestedType + '\n' + output;
          } else {
            const propType = this.getTypeFromProperty(prop);
            output += `  ${key}${optionalMark}: ${propType};\n`;
          }
        }
      }
      
      output += '}\n';
      return output;
    } catch (error) {
      console.error('生成嵌套类型失败:', error);
      throw new Error(`生成嵌套类型失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private getTypeName(path: string, method: string, suffix: string): string {
    try {
      // 移除路径中的前导斜杠
      const trimmedPath = path.startsWith('/') ? path.substring(1) : path;
      
      // 将路径分割为段
      const segments = trimmedPath.split('/');
      
      // 处理每个段，转换为驼峰命名
      const processedSegments = segments.map(segment => {
        // 处理路径参数，例如 :id 转换为 Id
        if (segment.startsWith(':')) {
          return this.capitalizeFirst(segment.substring(1));
        }
        
        // 处理普通段，转换为驼峰命名
        return segment.split(/[-_]/).map(this.capitalizeFirst).join('');
      });
      
      // 组合成类型名
      const typeName = processedSegments.join('') + method.toUpperCase() + suffix;
      
      return typeName;
    } catch (error) {
      console.error('生成类型名失败:', error);
      return `Unknown${suffix}`;
    }
  }

  private getFunctionName(path: string, method: string): string {
    try {
      // 提取路径的最后一个部分
      const pathParts = path.split('/').filter(Boolean);
      const lastPart = pathParts[pathParts.length - 1];
      
      if (lastPart) {
        // 直接使用路径的最后一部分作为函数名，不添加请求方式前缀
        return this.camelCase(lastPart);
      }
      
      // 如果无法提取最后一部分，则使用原来的逻辑，但不添加请求方式前缀
      // 移除路径中的前导斜杠
      const trimmedPath = path.startsWith('/') ? path.substring(1) : path;
      
      // 将路径分割为段
      const segments = trimmedPath.split('/');
      
      // 处理每个段，转换为驼峰命名
      const processedSegments = segments.map((segment, index) => {
        // 处理路径参数，例如 :id 转换为 ById
        if (segment.startsWith(':')) {
          return 'By' + this.capitalizeFirst(segment.substring(1));
        }
        
        // 处理普通段，转换为驼峰命名
        const parts = segment.split(/[-_]/);
        
        // 第一个段的第一个单词小写，其他大写
        if (index === 0) {
          return parts.map((part, i) => {
            return i === 0 ? part.toLowerCase() : this.capitalizeFirst(part);
          }).join('');
        }
        
        // 其他段全部大写
        return parts.map(this.capitalizeFirst).join('');
      });
      
      // 组合成函数名
      const functionName = processedSegments.join('');
      
      return functionName;
    } catch (error) {
      console.error('生成函数名失败:', error);
      return `apiUnknown`;
    }
  }

  // 将字符串转换为驼峰命名，保持原始的驼峰格式
  private camelCase(str: string): string {
    // 如果路径已经是驼峰命名，则保持原样
    // 检查是否包含大写字母（表示可能已经是驼峰命名）
    if (/[A-Z]/.test(str)) {
      // 确保第一个字母小写
      return str.charAt(0).toLowerCase() + str.slice(1);
    }
    
    // 否则，将字符串按非字母数字字符分割
    return str
      .split(/[^a-zA-Z0-9]/)
      .map((word, index) => {
        if (!word) return '';
        // 第一个单词首字母小写，其他单词首字母大写
        if (index === 0) {
          return word.toLowerCase();
        }
        return this.capitalizeFirst(word);
      })
      .join('');
  }
} 