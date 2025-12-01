import * as vscode from 'vscode';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { jsonToYaml } from './yamlConverter';

/**
 * 将 JSONL 格式的文本转换为 YAML 格式
 */
function convertJsonlToYaml(jsonlText: string): string {
    const lines = jsonlText.split('\n');
    const yamlLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // 跳过空行
        if (line === '') {
            continue;
        }
        
        try {
            const yamlContent = jsonToYaml(line);
            yamlLines.push(yamlContent);
        } catch (error) {
            // 如果某行解析失败，保留原行并添加注释
            yamlLines.push(`# Error converting line ${i + 1}: ${error}`);
            yamlLines.push(`# Original content: ${line}`);
        }
    }
    
    return yamlLines.join('\n\n');
}

interface ConversionTarget {
    text: string;
    range: vscode.Range;
    isSelection: boolean;
}

/**
 * 获取要转换的文本内容和范围
 * @param document 文档对象
 * @param selections 选择区域
 * @param useFullLines 如果为 true，选中时获取整行内容；如果为 false，获取精确选中内容
 * @returns 要转换的目标对象
 */
function getConversionTarget(
    document: vscode.TextDocument,
    selections: readonly vscode.Selection[],
    useFullLines: boolean = false
): ConversionTarget {
    // 检查是否有选中的内容
    if (selections.length === 1 && !selections[0].isEmpty) {
        const selection = selections[0];
        
        if (useFullLines) {
            // 获取选中行的完整内容
            const startLine = selection.start.line;
            const endLine = selection.end.line;
            const startPos = new vscode.Position(startLine, 0);
            const endPos = new vscode.Position(endLine, document.lineAt(endLine).text.length);
            const range = new vscode.Range(startPos, endPos);
            return {
                text: document.getText(range),
                range: range,
                isSelection: true
            };
        } else {
            // 获取精确选中的内容
            return {
                text: document.getText(selection),
                range: new vscode.Range(selection.start, selection.end),
                isSelection: true
            };
        }
    } else {
        // 没有选中内容，返回整个文档
        const lastLine = document.lineCount - 1;
        const lastLineObj = document.lineAt(lastLine);
        const range = new vscode.Range(
            new vscode.Position(0, 0),
            new vscode.Position(lastLine, lastLineObj.text.length)
        );
        return {
            text: document.getText(),
            range: range,
            isSelection: false
        };
    }
}

/**
 * 将 YAML 内容保存到文件并打开
 * @param yamlContent YAML 内容
 * @param sourceFilePath 源文件路径
 * @param successMessage 成功消息
 * @param errorMessagePrefix 错误消息前缀
 */
async function saveYamlToFile(
    yamlContent: string,
    sourceFilePath: string,
    successMessage: string,
    errorMessagePrefix: string
): Promise<void> {
    try {
        // 获取当前文件路径并生成 YAML 文件路径
        const fileDir = path.dirname(sourceFilePath);
        const fileName = path.basename(sourceFilePath, path.extname(sourceFilePath));
        const yamlFilePath = path.join(fileDir, `${fileName}.jyb.yaml`);
        const yamlFileUri = vscode.Uri.file(yamlFilePath);
        
        // 将 YAML 内容写入文件
        const encoder = new TextEncoder();
        const yamlBytes = encoder.encode(yamlContent);
        await vscode.workspace.fs.writeFile(yamlFileUri, yamlBytes);
        
        // 打开新创建的 YAML 文件
        const yamlDocument = await vscode.workspace.openTextDocument(yamlFileUri);
        await vscode.window.showTextDocument(yamlDocument);
        
        vscode.window.showInformationMessage(successMessage);
    } catch (error) {
        vscode.window.showErrorMessage(`${errorMessagePrefix}: ${error}`);
    }
}

/**
 * 将 JSON 内容保存到文件并打开
 * @param jsonContent JSON 内容
 * @param sourceFilePath 源文件路径
 * @param successMessage 成功消息
 * @param errorMessagePrefix 错误消息前缀
 */
async function saveJsonToFile(
    jsonContent: string,
    sourceFilePath: string,
    successMessage: string,
    errorMessagePrefix: string
): Promise<void> {
    try {
        // 获取当前文件路径并生成 JSON 文件路径
        const fileDir = path.dirname(sourceFilePath);
        const fileName = path.basename(sourceFilePath, path.extname(sourceFilePath));
        const jsonFilePath = path.join(fileDir, `${fileName}.jyb.json`);
        const jsonFileUri = vscode.Uri.file(jsonFilePath);
        
        // 将 JSON 内容写入文件
        const encoder = new TextEncoder();
        const jsonBytes = encoder.encode(jsonContent);
        await vscode.workspace.fs.writeFile(jsonFileUri, jsonBytes);
        
        // 打开新创建的 JSON 文件
        const jsonDocument = await vscode.workspace.openTextDocument(jsonFileUri);
        await vscode.window.showTextDocument(jsonDocument);
        
        vscode.window.showInformationMessage(successMessage);
    } catch (error) {
        vscode.window.showErrorMessage(`${errorMessagePrefix}: ${error}`);
    }
}

/**
 * 将 YAML 格式的文本转换为 JSON 格式
 * @param yamlText YAML 文本
 * @returns JSON 字符串（格式化）
 */
function yamlToJson(yamlText: string): string {
    try {
        const jsonObject = yaml.load(yamlText);
        return JSON.stringify(jsonObject, null, 2);
    } catch (error) {
        throw new Error(`Failed to parse YAML: ${error}`);
    }
}

/**
 * 检查并获取活动的文本编辑器
 * @returns 活动的文本编辑器，如果不存在则显示警告并返回 undefined
 */
function getActiveEditor(): vscode.TextEditor | undefined {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active editor found.');
    }
    return editor;
}

/**
 * 激活扩展
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('JSONL to YAML Converter extension is now active');
    
    // 注册 JSONL 转 YAML 命令
    const disposable = vscode.commands.registerCommand('jsonYamlBridge.jsonlToYaml', async () => {
        console.log('jsonYamlBridge.jsonlToYaml command executed');
        const editor = getActiveEditor();
        if (!editor) {
            return;
        }
        
        const target = getConversionTarget(editor.document, editor.selections, true);
        const yamlContent = convertJsonlToYaml(target.text);
        
        if (editor.document.isUntitled) {
            await editor.edit(editBuilder => {
                editBuilder.replace(target.range, yamlContent);
            });
            // 如果转换的是整个文档，我们可能想把语言模式也改了
            if (!target.isSelection) {
                vscode.languages.setTextDocumentLanguage(editor.document, 'yaml');
            }
        } else {
            const currentFilePath = editor.document.uri.fsPath;
            await saveYamlToFile(
                yamlContent,
                currentFilePath,
                `JSONL converted to YAML and saved`,
                'Failed to convert JSONL to YAML'
            );
        }
    });
    
    // 注册 JSON 转 YAML 命令
    const jsonToYamlDisposable = vscode.commands.registerCommand('jsonYamlBridge.jsonToYaml', async () => {
        console.log('jsonYamlBridge.jsonToYaml command executed');
        const editor = getActiveEditor();
        if (!editor) {
            return;
        }
        
        const target = getConversionTarget(editor.document, editor.selections, false);
        const trimmedText = target.text.trim();
        
        if (!trimmedText) {
            vscode.window.showWarningMessage('No content to convert.');
            return;
        }
        
        try {
            const yamlContent = jsonToYaml(trimmedText);
            
            if (editor.document.isUntitled) {
                await editor.edit(editBuilder => {
                    editBuilder.replace(target.range, yamlContent);
                });
                if (!target.isSelection) {
                    vscode.languages.setTextDocumentLanguage(editor.document, 'yaml');
                }
            } else {
                const currentFilePath = editor.document.uri.fsPath;
                await saveYamlToFile(
                    yamlContent,
                    currentFilePath,
                    `JSON converted to YAML and saved`,
                    'Failed to convert JSON to YAML'
                );
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to convert JSON to YAML: ${error}`);
        }
    });
    
    // 注册 YAML 转 JSON 命令
    const yamlToJsonDisposable = vscode.commands.registerCommand('jsonYamlBridge.yamlToJson', async () => {
        console.log('jsonYamlBridge.yamlToJson command executed');
        const editor = getActiveEditor();
        if (!editor) {
            return;
        }
        
        const target = getConversionTarget(editor.document, editor.selections, false);
        const trimmedText = target.text.trim();
        
        if (!trimmedText) {
            vscode.window.showWarningMessage('No content to convert.');
            return;
        }
        
        try {
            const jsonContent = yamlToJson(trimmedText);
            
            if (editor.document.isUntitled) {
                await editor.edit(editBuilder => {
                    editBuilder.replace(target.range, jsonContent);
                });
                if (!target.isSelection) {
                    vscode.languages.setTextDocumentLanguage(editor.document, 'json');
                }
            } else {
                const currentFilePath = editor.document.uri.fsPath;
                await saveJsonToFile(
                    jsonContent,
                    currentFilePath,
                    `YAML converted to JSON and saved`,
                    'Failed to convert YAML to JSON'
                );
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to convert YAML to JSON: ${error}`);
        }
    });

    // 注册 Pretty JSON 命令
    const prettyJsonDisposable = vscode.commands.registerCommand('jsonYamlBridge.prettyJson', async () => {
        console.log('jsonYamlBridge.prettyJson command executed');
        const editor = getActiveEditor();
        if (!editor) {
            return;
        }
        
        const target = getConversionTarget(editor.document, editor.selections, false);
        const trimmedText = target.text.trim();
        
        if (!trimmedText) {
            vscode.window.showWarningMessage('No content to format.');
            return;
        }
        
        try {
            const jsonObject = JSON.parse(trimmedText);
            const prettyJson = JSON.stringify(jsonObject, null, 2);
            
            await editor.edit(editBuilder => {
                editBuilder.replace(target.range, prettyJson);
            });
            
            if (editor.document.languageId !== 'json' && !target.isSelection) {
                vscode.languages.setTextDocumentLanguage(editor.document, 'json');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to pretty print JSON: ${error}`);
        }
    });

    // 注册 Minify JSON 命令
    const minifyJsonDisposable = vscode.commands.registerCommand('jsonYamlBridge.minifyJson', async () => {
        console.log('jsonYamlBridge.minifyJson command executed');
        const editor = getActiveEditor();
        if (!editor) {
            return;
        }
        
        const target = getConversionTarget(editor.document, editor.selections, false);
        const trimmedText = target.text.trim();
        
        if (!trimmedText) {
            vscode.window.showWarningMessage('No content to minify.');
            return;
        }
        
        try {
            const jsonObject = JSON.parse(trimmedText);
            const minifiedJson = JSON.stringify(jsonObject);
            
            await editor.edit(editBuilder => {
                editBuilder.replace(target.range, minifiedJson);
            });
            
            if (editor.document.languageId !== 'json' && !target.isSelection) {
                vscode.languages.setTextDocumentLanguage(editor.document, 'json');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to minify JSON: ${error}`);
        }
    });
    
    context.subscriptions.push(disposable, jsonToYamlDisposable, yamlToJsonDisposable, prettyJsonDisposable, minifyJsonDisposable);
}

/**
 * 停用扩展
 */
export function deactivate() {}
