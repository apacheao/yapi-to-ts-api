"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const generator_1 = require("./generator");
function activate(context) {
    console.log('YAPI TypeScript Generator 扩展已激活');
    // 注册命令：从配置文件生成
    const generateFromConfigCommand = vscode.commands.registerCommand('yapi-to-ts.generateFromConfig', async (uri) => {
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
                    const createConfig = await vscode.window.showInformationMessage('未找到YAPI配置文件。是否创建一个示例配置文件？', '是', '否');
                    if (createConfig === '是') {
                        await createExampleConfig(workspaceFolders[0].uri);
                        vscode.window.showInformationMessage('已创建示例配置文件：yapi-config.json');
                    }
                    return;
                }
                // 如果找到多个配置文件，让用户选择
                let selectedConfig;
                if (configFiles.length === 1) {
                    selectedConfig = configFiles[0];
                }
                else {
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
            const config = JSON.parse(configContent);
            // 验证配置文件
            if (!config.apis || !Array.isArray(config.apis) || config.apis.length === 0) {
                vscode.window.showErrorMessage('配置文件格式不正确，请确保包含apis数组');
                return;
            }
            // 如果有多个API，让用户选择要生成哪个
            let selectedApis;
            if (config.apis.length === 1) {
                selectedApis = config.apis;
            }
            else {
                const items = config.apis.map(api => {
                    // 使用name字段或从mockUrl中提取名称
                    const apiName = api.name || extractNameFromUrl(api.mockUrl);
                    return {
                        label: apiName,
                        description: api.interfaceUrl,
                        picked: true,
                        api
                    };
                });
                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: '选择要生成的API',
                    canPickMany: true
                });
                if (!selected || selected.length === 0) {
                    return;
                }
                selectedApis = selected.map(item => item.api);
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
                // 按输出目录分组API
                const apiGroups = new Map();
                for (const api of selectedApis) {
                    // 确定输出目录
                    let outputPath;
                    if (api.outputDir) {
                        // 如果是相对路径，则相对于配置文件所在目录
                        if (path.isAbsolute(api.outputDir)) {
                            outputPath = api.outputDir;
                        }
                        else {
                            outputPath = path.resolve(configDir, api.outputDir);
                        }
                    }
                    else {
                        // 如果没有指定outputDir，则使用name或从URL提取名称
                        const apiName = api.name || extractNameFromUrl(api.mockUrl);
                        outputPath = path.join(workspaceRoot, 'generated', apiName);
                    }
                    // 将API添加到对应的组
                    if (!apiGroups.has(outputPath)) {
                        apiGroups.set(outputPath, []);
                    }
                    apiGroups.get(outputPath)?.push(api);
                }
                // 处理每个输出目录的API组
                let processedCount = 0;
                const totalGroups = apiGroups.size;
                for (const [outputPath, apis] of apiGroups.entries()) {
                    progress.report({
                        increment: (100 / totalGroups) * processedCount,
                        message: `正在处理 ${path.basename(outputPath)} (${processedCount + 1}/${totalGroups})`
                    });
                    try {
                        // 创建输出目录
                        if (!fs.existsSync(outputPath)) {
                            fs.mkdirSync(outputPath, { recursive: true });
                        }
                        // 生成每个API的代码
                        let typesContent = '';
                        let apiContent = 'import axios from \'axios\';\n';
                        let importedTypes = new Set();
                        for (const api of apis) {
                            // 解析URL
                            const { interfaceId, path: apiPath } = parseUrls(api.mockUrl, api.interfaceUrl);
                            // 创建生成器实例
                            const generator = new generator_1.APIGenerator({
                                interfaceId,
                                path: apiPath,
                                token: config.token,
                                outputPath
                            });
                            // 生成代码
                            const result = await generator.generate();
                            // 合并类型定义
                            typesContent += result.typeDefinition + '\n\n';
                            // 处理API请求代码
                            const apiLines = result.apiRequest.split('\n');
                            // 提取导入语句和内容
                            const contentLines = [];
                            let isImport = false;
                            for (const line of apiLines) {
                                if (line.startsWith('import ') && line.includes(' from ')) {
                                    if (!line.includes('import axios from')) { // 跳过axios导入
                                        // 提取类型名称
                                        const match = line.match(/import\s+\{\s*([^}]+)\s*\}\s+from/);
                                        if (match) {
                                            const types = match[1].split(',').map(t => t.trim());
                                            for (const type of types) {
                                                importedTypes.add(type);
                                            }
                                        }
                                    }
                                    isImport = true;
                                }
                                else if (line.trim() === '') {
                                    isImport = false;
                                }
                                else if (!isImport) {
                                    contentLines.push(line);
                                }
                            }
                            // 添加内容行
                            if (contentLines.length > 0) {
                                apiContent += contentLines.join('\n') + '\n\n';
                            }
                        }
                        // 添加导入语句到API内容的顶部（在axios导入之后）
                        if (importedTypes.size > 0) {
                            const importLine = `import { ${Array.from(importedTypes).join(', ')} } from './types';\n\n`;
                            apiContent = apiContent.replace('import axios from \'axios\';\n', `import axios from 'axios';\n${importLine}`);
                        }
                        // 写入文件
                        const typesFilePath = path.join(outputPath, 'types.ts');
                        const apiFilePath = path.join(outputPath, 'api.ts');
                        fs.writeFileSync(typesFilePath, typesContent);
                        fs.writeFileSync(apiFilePath, apiContent);
                        // 打开生成的文件
                        if (processedCount === totalGroups - 1) {
                            const typesDoc = await vscode.workspace.openTextDocument(typesFilePath);
                            const apiDoc = await vscode.workspace.openTextDocument(apiFilePath);
                            await vscode.window.showTextDocument(typesDoc);
                            await vscode.window.showTextDocument(apiDoc, { viewColumn: vscode.ViewColumn.Beside });
                        }
                    }
                    catch (error) {
                        vscode.window.showErrorMessage(`处理 ${path.basename(outputPath)} 失败: ${error instanceof Error ? error.message : String(error)}`);
                    }
                    processedCount++;
                }
                vscode.window.showInformationMessage(`成功生成 ${totalGroups} 个API文件组`);
                return Promise.resolve();
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`生成失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
    // 注册命令：创建配置文件
    const createConfigCommand = vscode.commands.registerCommand('yapi-to-ts.createConfig', async (uri) => {
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
        }
        catch (error) {
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
            // 创建输出目录
            const outputPath = path.join(workspaceFolders[0].uri.fsPath, 'generated');
            if (!fs.existsSync(outputPath)) {
                fs.mkdirSync(outputPath, { recursive: true });
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
                    const generator = new generator_1.APIGenerator({
                        interfaceId,
                        path: apiPath,
                        token,
                        outputPath
                    });
                    // 生成代码
                    progress.report({ increment: 50, message: '正在生成代码...' });
                    const result = await generator.generate();
                    // 写入文件
                    progress.report({ increment: 80, message: '正在写入文件...' });
                    const typesFilePath = path.join(outputPath, 'types.ts');
                    const apiFilePath = path.join(outputPath, 'api.ts');
                    fs.writeFileSync(typesFilePath, result.typeDefinition);
                    fs.writeFileSync(apiFilePath, result.apiRequest);
                    // 打开生成的文件
                    progress.report({ increment: 100, message: '生成完成' });
                    const typesDoc = await vscode.workspace.openTextDocument(typesFilePath);
                    const apiDoc = await vscode.workspace.openTextDocument(apiFilePath);
                    await vscode.window.showTextDocument(typesDoc);
                    await vscode.window.showTextDocument(apiDoc, { viewColumn: vscode.ViewColumn.Beside });
                    vscode.window.showInformationMessage('API文件生成成功');
                }
                catch (error) {
                    vscode.window.showErrorMessage(`生成失败: ${error instanceof Error ? error.message : String(error)}`);
                }
                return Promise.resolve();
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`生成失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
    context.subscriptions.push(generateFromConfigCommand);
    context.subscriptions.push(createConfigCommand);
    context.subscriptions.push(generateWithWizardCommand);
}
exports.activate = activate;
// 创建示例配置文件
async function createExampleConfig(uri) {
    const configPath = path.join(uri.fsPath, 'yapi-config.json');
    const exampleConfig = {
        token: '你的项目token',
        apis: [
            {
                interfaceUrl: 'https://yapi.example.com/project/123/interface/api/456',
                mockUrl: 'https://yapi.example.com/mock/123/api/user',
                outputDir: 'src/api/user'
            },
            {
                interfaceUrl: 'https://yapi.example.com/project/123/interface/api/789',
                mockUrl: 'https://yapi.example.com/mock/123/api/product',
                outputDir: 'src/api/product'
            }
        ]
    };
    fs.writeFileSync(configPath, JSON.stringify(exampleConfig, null, 2));
}
// 解析URL
function parseUrls(mockUrl, interfaceUrl) {
    console.log('开始解析URL:', { mockUrl, interfaceUrl });
    try {
        // 1. 验证基本URL格式
        if (!mockUrl?.trim() || !interfaceUrl?.trim()) {
            throw new Error('URL不能为空');
        }
        // 2. 解析接口URL
        const interfaceUrlObj = new URL(interfaceUrl.trim());
        const interfacePath = interfaceUrlObj.pathname;
        const interfaceMatch = interfacePath.match(/\/interface\/api\/(\d+)/);
        if (!interfaceMatch) {
            throw new Error('接口URL格式不正确，无法找到接口ID');
        }
        const interfaceId = Number(interfaceMatch[1]);
        console.log('接口ID:', interfaceId);
        // 3. 解析Mock URL
        const mockUrlObj = new URL(mockUrl.trim());
        const mockPath = mockUrlObj.pathname;
        const mockMatch = mockPath.match(/\/mock\/(\d+)\/(.+)/);
        if (!mockMatch) {
            throw new Error('Mock URL格式不正确，请确保包含正确的mock路径');
        }
        const projectId = mockMatch[1];
        const path = '/' + mockMatch[2];
        console.log('Mock解析结果:', { projectId, path });
        // 4. 构建结果
        const result = {
            interfaceId,
            path,
        };
        console.log('最终解析结果:', result);
        return result;
    }
    catch (error) {
        console.error('URL解析错误:', error);
        if (error instanceof Error) {
            if (error instanceof TypeError && error.message.includes('URL')) {
                throw new Error('请输入有效的URL格式');
            }
            throw new Error(`URL解析错误: ${error.message}`);
        }
        throw new Error('请输入有效的URL');
    }
}
// 从URL中提取API名称
function extractNameFromUrl(url) {
    try {
        // 尝试从URL路径中提取最后一部分作为名称
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        return pathParts[pathParts.length - 1] || 'api';
    }
    catch (error) {
        // 如果URL解析失败，返回默认名称
        return 'api';
    }
}
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map