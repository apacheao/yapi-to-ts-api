# YAPI TypeScript 生成器

这是一个基于 YAPI 接口文档自动生成 TypeScript 类型定义和 API 请求函数的工具。

## 功能特点

- 自动解析 YAPI 接口文档
- 生成 TypeScript 类型定义
- 生成 API 请求函数
- 支持嵌套对象和复杂数据结构
- 友好的用户界面

## 本地开发

### 环境要求

- Node.js 14.x 或更高版本
- npm 或 yarn

### 安装依赖

```bash
npm install
# 或
yarn install
```

### 启动开发服务器

```bash
npm run dev
# 或
yarn dev
```

然后在浏览器中访问 http://localhost:3000

## 部署到线上环境

### 方法一：使用 Vercel 部署（推荐）

1. 在 GitHub 上创建一个仓库并推送代码
2. 在 [Vercel](https://vercel.com) 上注册账号
3. 导入 GitHub 仓库
4. 点击部署

### 方法二：使用 Docker 部署

1. 创建 Dockerfile

```dockerfile
FROM node:16-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:16-alpine AS runner
WORKDIR /app
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
```

2. 构建 Docker 镜像

```bash
docker build -t yapi-typescript-generator .
```

3. 运行 Docker 容器

```bash
docker run -p 3000:3000 yapi-typescript-generator
```

### 方法三：使用传统服务器部署

1. 构建生产版本

```bash
npm run build
# 或
yarn build
```

2. 启动生产服务器

```bash
npm start
# 或
yarn start
```

## 使用说明

1. 访问部署好的网站
2. 填写 YAPI 接口详情 URL（从 YAPI 接口详情页面复制）
3. 填写 YAPI Mock URL（从 YAPI 接口详情页面的 Mock 地址复制）
4. 填写项目 Token（在 YAPI 项目设置中可以找到）
5. 点击"生成 API 文件"按钮
6. 查看生成的类型定义和 API 请求函数
7. 复制代码到你的项目中使用

## 注意事项

- 确保 YAPI 服务器可以从部署环境访问
- 项目 Token 用于访问私有项目的接口
- 生成的代码需要根据项目实际情况进行适当调整

## 许可证

MIT 