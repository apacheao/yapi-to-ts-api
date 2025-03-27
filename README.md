# YAPI TypeScript Generator

这是一个VSCode扩展，用于从YAPI接口生成TypeScript类型定义和API请求代码。

## 功能

- 从YAPI接口生成TypeScript类型定义
- 生成对应的API请求代码
- 支持复杂的嵌套类型
- 自动处理路径参数和查询参数
- 支持配置文件批量生成API
- 支持右键菜单快速操作

## 使用方法

### 使用配置文件

1. 在VSCode中安装此扩展
2. 右键点击资源管理器中的任意位置，选择"YAPI: 创建配置文件"
3. 编辑生成的`yapi-config.json`文件，填入您的YAPI接口信息：
   ```json
   {
     "token": "你的项目token",
     "apis": [
       {
         "name": "user",
         "interfaceUrl": "https://yapi.example.com/project/123/interface/api/456",
         "mockUrl": "https://yapi.example.com/mock/123/api/user",
         "outputDir": "src/api/user"
       },
       {
         "name": "product",
         "interfaceUrl": "https://yapi.example.com/project/123/interface/api/789",
         "mockUrl": "https://yapi.example.com/mock/123/api/product",
         "outputDir": "src/api/product"
       }
     ]
   }
   ```
4. 右键点击`yapi-config.json`文件，选择"YAPI: 从配置文件生成API"
5. 如果配置文件中有多个API，您可以选择要生成的API
6. 扩展将在指定的输出目录下生成TypeScript类型定义和API请求代码


## 配置文件说明

`yapi-config.json` 文件支持以下配置项：

- `token`：项目Token（必填）
- `apis`：要生成的API列表
  - `name`：API名称，用于生成文件夹名称
  - `interfaceUrl`：YAPI接口详情URL
  - `mockUrl`：YAPI Mock URL
  - `outputDir`：输出目录（可选，默认为 `generated/{name}`）

## 示例

生成的类型定义示例：

```typescript
export interface UserGetRes {
  /** 用户ID */
  id: number;
  /** 用户名 */
  username: string;
  /** 邮箱 */
  email?: string;
  /** 角色列表 */
  roles: string[];
}
```

生成的API请求代码示例：

```typescript
import axios from 'axios';
import { UserGetRes } from './types';

/**
 * 获取用户信息
 * @description /api/user
 */
export async function getUserInfo(baseUrl = 'https://api.example.com') {
  const response = await axios.get<UserGetRes>(`${baseUrl}/api/user`);
  return response.data;
}
```

## 要求

- VSCode 1.60.0 或更高版本

## 安装

### 从VSIX文件安装

1. 下载最新的 `.vsix` 文件
2. 在VSCode中，打开命令面板（按下 `Ctrl+Shift+P` 或 `Cmd+Shift+P`）
3. 输入 `Extensions: Install from VSIX...` 并选择该命令
4. 选择下载的 `.vsix` 文件