import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { APIGenerator } from './generator';

interface YAPIConfigFile {
  token?: string;
  apis: {
    name?: string;
    interfaceUrl: string;
    mockUrl: string;
    outputDir?: string;
  }[];
}

export function activate(context: vscode.ExtensionContext) {
  console.log('YAPI TypeScript Generator 扩展已激活');

  // 注册命令：从配置文件生成
  const generateFromConfigCommand = vscode.commands.registerCommand('yapi-to-ts.generateFromConfig', async (uri?: vscode.Uri) => {
    try {
      // 如果没有提供URI，则提示用户选择配置文件
      if (!uri) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
          vscode.window.showErrorMessage('请先打开一个工作区');
          return;
        }

        const configFiles = await vscode.workspace.findFiles('**/yapi-config.json', '**/node_modules/**');
        if (configFiles.length === 0) {
          const createConfig = await vscode.window.showInformationMessage(
            '未找到YAPI配置文件。是否创建一个示例配置文件？',
            '是', '否'
          );

          if (createConfig === '是') {
            await createExampleConfig(workspaceFolders[0].uri);
            vscode.window.showInformationMessage('已创建示例配置文件：yapi-config.json');
          }
          return;
        }

        // 如果找到多个配置文件，让用户选择
        let selectedConfig: vscode.Uri | undefined;
        if (configFiles.length === 1) {
          selectedConfig = configFiles[0];
        } else {
          const items = configFiles.map(file => ({
            label: path.basename(file.fsPath),
            description: path.relative(workspaceFolders[0].uri.fsPath, file.fsPath),
            uri: file
          }));

          const selected = await vscode.window.showQuickPick(items, {
            placeHolder: '选择要使用的YAPI配置文件'
          });

          if (!selected) {
            return;
          }

          selectedConfig = selected.uri;
        }

        uri = selectedConfig;
      }

      // 读取配置文件
      const configContent = fs.readFileSync(uri.fsPath, 'utf-8');
      const config: YAPIConfigFile = JSON.parse(configContent);

      // 验证配置文件
      if (!config.apis || !Array.isArray(config.apis) || config.apis.length === 0) {
        vscode.window.showErrorMessage('配置文件格式不正确，请确保包含apis数组');
        return;
      }

      // 显示进度条
      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: '正在生成API文件',
        cancellable: false
      }, async (progress) => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
          vscode.window.showErrorMessage('请先打开一个工作区');
          return;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const configDir = uri ? path.dirname(uri.fsPath) : workspaceRoot;

        // 处理每个API
        let processedCount = 0;
        const totalApis = config.apis.length;
        
        for (const api of config.apis) {
          progress.report({ 
            increment: (100 / totalApis) * processedCount, 
            message: `正在处理 ${processedCount + 1}/${totalApis}` 
          });

          try {
            // 确定输出目录
            let outputPath: string;
            if (api.outputDir) {
              if (path.isAbsolute(api.outputDir)) {
                outputPath = api.outputDir;
              } else {
                outputPath = path.resolve(configDir, api.outputDir);
              }
            } else {
              const apiName = api.name || extractNameFromUrl(api.mockUrl);
              outputPath = path.join(workspaceRoot, 'generated', apiName);
            }

            // 创建输出目录
            if (!fs.existsSync(outputPath)) {
              fs.mkdirSync(outputPath, { recursive: true });
            }

            // 解析URL
            const { interfaceId, path: apiPath } = parseUrls(api.mockUrl, api.interfaceUrl);

            // 创建生成器实例
            const generator = new APIGenerator({
              interfaceId,
              path: apiPath,
              token: config.token,
              outputPath
            });

            // 生成代码
            const result = await generator.generate();
            
            // 写入文件
            const typesFilePath = path.join(outputPath, 'types.ts');
            const apiFilePath = path.join(outputPath, 'api.ts');

            fs.writeFileSync(typesFilePath, result.typeDefinition);
            fs.writeFileSync(apiFilePath, result.apiRequest);

            processedCount++;
          } catch (error) {
            vscode.window.showErrorMessage(`处理API失败: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        vscode.window.showInformationMessage(`成功生成 ${processedCount} 个API文件`);
        return Promise.resolve();
      });
    } catch (error) {
      vscode.window.showErrorMessage(`生成失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // 注册命令：创建配置文件
  const createConfigCommand = vscode.commands.registerCommand('yapi-to-ts.createConfig', async (uri?: vscode.Uri) => {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        vscode.window.showErrorMessage('请先打开一个工作区');
        return;
      }

      // 如果没有提供URI，则使用工作区根目录
      if (!uri) {
        uri = workspaceFolders[0].uri;
      }

      await createExampleConfig(uri);
      vscode.window.showInformationMessage('已创建示例配置文件：yapi-config.json');
    } catch (error) {
      vscode.window.showErrorMessage(`创建配置文件失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // 注册命令：使用向导生成
  const generateWithWizardCommand = vscode.commands.registerCommand('yapi-to-ts.generateWithWizard', async () => {
    try {
      // 获取用户输入的YAPI接口详情URL
      const interfaceUrl = await vscode.window.showInputBox({
        prompt: '请输入YAPI接口详情URL',
        placeHolder: 'https://yapi.example.com/project/123/interface/api/456'
      });

      if (!interfaceUrl) {
        return;
      }

      // 获取用户输入的YAPI Mock URL
      const mockUrl = await vscode.window.showInputBox({
        prompt: '请输入YAPI Mock URL',
        placeHolder: 'https://yapi.example.com/mock/123/api/example'
      });

      if (!mockUrl) {
        return;
      }

      // 获取用户输入的项目Token
      const token = await vscode.window.showInputBox({
        prompt: '请输入项目Token（可选）',
        placeHolder: '在YAPI项目设置中可以找到项目token',
        password: true
      });

      // 解析URL
      const { interfaceId, path: apiPath } = parseUrls(mockUrl, interfaceUrl);

      // 获取当前工作区
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        vscode.window.showErrorMessage('请先打开一个工作区');
        return;
      }

      // 获取输出目录
      const defaultOutputDir = path.join(workspaceFolders[0].uri.fsPath, 'generated');
      const outputDir = await vscode.window.showInputBox({
        prompt: '请输入输出目录',
        value: defaultOutputDir
      });

      if (!outputDir) {
        return;
      }

      // 创建输出目录
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // 显示进度条
      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: '正在生成API文件',
        cancellable: false
      }, async (progress) => {
        progress.report({ increment: 0, message: '正在获取接口详情...' });

        try {
          // 创建生成器实例
          const generator = new APIGenerator({
            interfaceId,
            path: apiPath,
            token,
            outputPath: outputDir
          });

          // 生成代码
          progress.report({ increment: 50, message: '正在生成代码...' });
          const result = await generator.generate();

          // 写入文件
          progress.report({ increment: 80, message: '正在写入文件...' });
          const typesFilePath = path.join(outputDir, 'types.ts');
          const apiFilePath = path.join(outputDir, 'api.ts');

          fs.writeFileSync(typesFilePath, result.typeDefinition);
          fs.writeFileSync(apiFilePath, result.apiRequest);

          // 打开生成的文件
          progress.report({ increment: 100, message: '生成完成' });
          const typesDoc = await vscode.workspace.openTextDocument(typesFilePath);
          const apiDoc = await vscode.workspace.openTextDocument(apiFilePath);

          await vscode.window.showTextDocument(typesDoc);
          await vscode.window.showTextDocument(apiDoc, { viewColumn: vscode.ViewColumn.Beside });

          vscode.window.showInformationMessage('API文件生成成功');
        } catch (error) {
          vscode.window.showErrorMessage(`生成失败: ${error instanceof Error ? error.message : String(error)}`);
        }

        return Promise.resolve();
      });
    } catch (error) {
      vscode.window.showErrorMessage(`生成失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  context.subscriptions.push(generateFromConfigCommand);
  context.subscriptions.push(createConfigCommand);
  context.subscriptions.push(generateWithWizardCommand);
}

// 创建示例配置文件
async function createExampleConfig(uri: vscode.Uri): Promise<void> {
  const configPath = path.join(uri.fsPath, 'yapi-config.json');
  
  const exampleConfig: YAPIConfigFile = {
    token: '你的项目token',
    apis: [
      {
        interfaceUrl: 'https://yapi.example.com/project/123/interface/api/456',
        mockUrl: 'https://yapi.example.com/mock/123/api/user',
        outputDir: 'src/api/user'
      }
    ]
  };

  fs.writeFileSync(configPath, JSON.stringify(exampleConfig, null, 2));
}

// 解析URL
function parseUrls(mockUrl: string, interfaceUrl: string) {
  // 1. 验证基本URL格式
  if (!mockUrl?.trim() || !interfaceUrl?.trim()) {
    throw new Error('URL不能为空');
  }

  try {
    // 2. 解析接口URL
    const interfaceUrlObj = new URL(interfaceUrl.trim());
    const interfacePath = interfaceUrlObj.pathname;
    const interfaceMatch = interfacePath.match(/\/interface\/api\/(\d+)/);

    if (!interfaceMatch) {
      throw new Error('接口URL格式不正确，无法找到接口ID');
    }

    const interfaceId = Number(interfaceMatch[1]);

    // 3. 解析Mock URL
    const mockUrlObj = new URL(mockUrl.trim());
    const mockPath = mockUrlObj.pathname;
    const mockMatch = mockPath.match(/\/mock\/(\d+)\/(.+)/);

    if (!mockMatch) {
      throw new Error('Mock URL格式不正确，请确保包含正确的mock路径');
    }

    const path = '/' + mockMatch[2];

    // 4. 构建结果
    return {
      interfaceId,
      path,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error instanceof TypeError && error.message.includes('URL')) {
        throw new Error('请输入有效的URL格式');
      }
      throw error;
    }
    throw new Error('请输入有效的URL');
  }
}

// 从URL中提取API名称
function extractNameFromUrl(url: string): string {
  try {
    // 尝试从URL路径中提取最后一部分作为名称
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    return pathParts[pathParts.length - 1] || 'api';
  } catch (error) {
    // 如果URL解析失败，返回默认名称
    return 'api';
  }
}

export function deactivate() {} 