import axios from 'axios';

// 生成器配置接口
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
    this.config = config;
  }

  async generate() {
    try {
      // 获取接口详情
      const apiDetail = await this.fetchAPIDetail();

      // 生成类型定义和API请求代码
      const typeDefinition = this.generateTypes(apiDetail);
      const apiRequest = this.generateAPI(apiDetail);

      // 返回生成的代码
      return {
        typeDefinition,
        apiRequest
      };
    } catch (error) {
      throw error;
    }
  }

  async fetchAPIDetail() {
    try {
      // 构建接口详情请求URL
      const url = `https://yapi.cht-group.net/api/interface/get`;
      
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
      throw new Error(`生成类型定义失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  generateAPI(apiInterface: YAPIInterface): string {
    try {
      const method = apiInterface.method.toLowerCase();
      const functionName = this.getFunctionName(apiInterface.path, apiInterface.method);
      const reqTypeName = this.getTypeName(apiInterface.path, apiInterface.method, 'Req');
      const resTypeName = this.getTypeName(apiInterface.path, apiInterface.method, 'Res');
      
      let hasRequestBody = apiInterface.req_body_type === 'json' && apiInterface.req_body_other;
      let hasQueryParams = apiInterface.req_query && apiInterface.req_query.length > 0;
      
      let output = '';
      
      // 导入类型
      output += `import axios from 'axios';\n`;
      
      // 导入请求和响应类型
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
      throw new Error(`生成API请求代码失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private getTypeName(path: string, method: string, suffix: string): string {
    // 从路径中提取名称
    const pathSegments = path.split('/').filter(Boolean);
    const lastSegment = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : 'api';
    
    // 将路径转换为PascalCase
    const nameParts = lastSegment.split(/[_\-\.]/).filter(Boolean);
    let typeName = nameParts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
    
    // 添加HTTP方法和后缀
    typeName += method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
    typeName += suffix;
    
    return typeName;
  }

  private getFunctionName(path: string, method: string): string {
    // 从路径中提取名称
    const pathSegments = path.split('/').filter(Boolean);
    const lastSegment = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : 'api';
    
    // 将路径转换为camelCase
    const nameParts = lastSegment.split(/[_\-\.]/).filter(Boolean);
    let functionName = nameParts[0].toLowerCase();
    for (let i = 1; i < nameParts.length; i++) {
      functionName += nameParts[i].charAt(0).toUpperCase() + nameParts[i].slice(1).toLowerCase();
    }
    
    // 添加HTTP方法
    functionName += method.toLowerCase();
    
    return functionName;
  }

  private generateTypeFromSchema(schema: JSONSchema, typeName: string): string {
    let output = '';
    
    if (schema.type === 'object' && schema.properties) {
      output += `export interface ${typeName} {\n`;
      
      for (const propName of Object.keys(schema.properties)) {
        const prop = schema.properties[propName];
        const isRequired = schema.required && schema.required.includes(propName);
        const optionalMark = isRequired ? '' : '?';
        
        if (prop.description) {
          output += `  /** ${prop.description} */\n`;
        }
        
        if (prop.type === 'object' && prop.properties) {
          // 生成嵌套对象类型
          const nestedTypeName = typeName + this.capitalizeFirstLetter(propName);
          
          // 如果嵌套类型尚未生成，则生成它
          if (!this.generatedTypes.has(nestedTypeName)) {
            const nestedType = this.generateTypeFromSchema(prop, nestedTypeName);
            output = nestedType + '\n\n' + output;
            this.generatedTypes.add(nestedTypeName);
          }
          
          output += `  ${propName}${optionalMark}: ${nestedTypeName};\n`;
        } else if (prop.type === 'array' && prop.items) {
          // 处理数组类型
          let itemType: string;
          
          if (prop.items.type === 'object' && prop.items.properties) {
            // 数组元素是对象
            const nestedTypeName = typeName + this.capitalizeFirstLetter(propName) + 'Item';
            
            // 如果嵌套类型尚未生成，则生成它
            if (!this.generatedTypes.has(nestedTypeName)) {
              const nestedType = this.generateTypeFromSchema(prop.items, nestedTypeName);
              output = nestedType + '\n\n' + output;
              this.generatedTypes.add(nestedTypeName);
            }
            
            itemType = nestedTypeName;
          } else {
            // 数组元素是基本类型
            itemType = this.convertJsonTypeToTs(prop.items.type);
          }
          
          output += `  ${propName}${optionalMark}: ${itemType}[];\n`;
        } else {
          // 基本类型
          output += `  ${propName}${optionalMark}: ${this.convertJsonTypeToTs(prop.type)};\n`;
        }
      }
      
      output += '}';
    } else if (schema.type === 'array' && schema.items) {
      // 处理顶级数组
      let itemType: string;
      
      if (schema.items.type === 'object' && schema.items.properties) {
        // 数组元素是对象
        const nestedTypeName = typeName + 'Item';
        
        // 如果嵌套类型尚未生成，则生成它
        if (!this.generatedTypes.has(nestedTypeName)) {
          const nestedType = this.generateTypeFromSchema(schema.items, nestedTypeName);
          output = nestedType + '\n\n';
          this.generatedTypes.add(nestedTypeName);
        }
        
        itemType = nestedTypeName;
      } else {
        // 数组元素是基本类型
        itemType = this.convertJsonTypeToTs(schema.items.type);
      }
      
      output += `export type ${typeName} = ${itemType}[];`;
    } else {
      // 处理其他类型
      output += `export type ${typeName} = ${this.convertJsonTypeToTs(schema.type)};`;
    }
    
    return output;
  }

  private getTypeFromQueryParam(param: YAPIParameter): string {
    if (!param.type || param.type === 'text') {
      return 'string';
    }
    
    switch (param.type) {
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      default:
        return 'string';
    }
  }

  private convertJsonTypeToTs(jsonType?: string): string {
    if (!jsonType) {
      return 'any';
    }
    
    switch (jsonType.toLowerCase()) {
      case 'string':
        return 'string';
      case 'integer':
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'array':
        return 'any[]';
      case 'object':
        return 'Record<string, any>';
      case 'null':
        return 'null';
      default:
        return 'any';
    }
  }

  private capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
} 