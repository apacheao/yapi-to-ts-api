# 安装指南

## 准备工作

1. 确保已安装Node.js和npm
2. 安装vsce工具（用于打包VSCode扩展）：
   ```bash
   npm install -g @vscode/vsce
   ```

## 构建扩展

1. 安装依赖：
   ```bash
   npm install
   ```

2. 编译代码：
   ```bash
   npm run compile
   ```

3. 打包扩展：
   ```bash
   npm run package
   ```
   这将在当前目录下生成一个`.vsix`文件。

## 安装扩展

### 方法1：从VSCode扩展视图安装

1. 打开VSCode
2. 按下`Ctrl+Shift+X`（Windows/Linux）或`Cmd+Shift+X`（macOS）打开扩展视图
3. 点击视图右上角的"..."按钮，选择"从VSIX安装..."
4. 选择生成的`.vsix`文件

### 方法2：使用命令行安装

```bash
code --install-extension yapi-to-ts-vscode-0.1.0.vsix
```

## 使用扩展

1. 打开VSCode
2. 按下`Ctrl+Shift+P`（Windows/Linux）或`Cmd+Shift+P`（macOS）打开命令面板
3. 输入"YAPI: Generate TypeScript API"并选择该命令
4. 按照提示输入YAPI接口详情URL、Mock URL和项目Token
5. 扩展将在当前工作区的`generated`目录下生成TypeScript类型定义和API请求代码

## 调试扩展

1. 在VSCode中打开扩展项目
2. 按下`F5`启动调试会话
3. 这将打开一个新的VSCode窗口，其中已加载您的扩展
4. 在新窗口中，您可以测试扩展的功能 