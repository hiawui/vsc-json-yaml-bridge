const fs = require('fs');
const path = require('path');

/**
 * 转义字符串中的特殊字符
 * 使用 JSON.stringify 来自动处理所有需要转义的字符（控制字符、Unicode等）
 */
function escapeString(str) {
    // JSON.stringify 会自动处理所有转义，包括：
    // - 控制字符：\n, \r, \t, \b, \f 等
    // - 反斜杠和引号
    // - Unicode 字符
    // 返回的字符串包含两端的引号，需要去掉
    return JSON.stringify(str).slice(1, -1);
}

/**
 * 检查字符串是否需要使用引号
 */
function needsQuotes(str) {
    // 如果包含特殊字符或看起来像数字/布尔值/null，需要引号
    return /^[\s\-:{}[\],&*#?|<>=!%@`]/.test(str) ||
        /^[\d\-]/.test(str) ||
        /^(true|false|null|yes|no|on|off)$/i.test(str) ||
        /^[\d\.]+$/.test(str);
}

/**
 * 格式化字符串值
 */
function formatString(value) {
    // 如果包含换行符或 ": "，使用块字面量样式
    if (value.includes('\n') || value.includes(': ')) {
        // 替换不支持的字符为空格
        const lines = value.split('\n').map(line => line.replace(/[\x00-\x08\x0b-\x1f\x7f]/g, ' '));
        
        // 判断是否需要使用 chomping indicator
        let chompingIndicator = '';
        
        if (value.endsWith('\n')) {
            // 如果以换行符结尾
            // 检查是否有多个连续换行符在末尾
            if (value.endsWith('\n\n')) {
                // 如果有多个换行符，使用 '+' 保留所有换行符
                chompingIndicator = '+';
            } else {
                // 只有一个换行符，这是默认行为，不需要指示符
                // 但如果我们想要严格还原，可能需要考虑 strip '-' 的情况
                // 这里我们使用默认行为（保留一个换行符）
                chompingIndicator = '';
            }
        } else {
            // 如果不以换行符结尾，使用 '-' 去除末尾换行符
            chompingIndicator = '-';
        }
        
        // 移除 split 产生的末尾空字符串（如果原字符串以 \n 结尾，split 会产生一个空串）
        if (lines.length > 0 && lines[lines.length - 1] === '') {
            lines.pop();
        }
        
        return `|${chompingIndicator}\n${lines.join('\n')}`;
    }
    // 转义字符串
    const escaped = escapeString(value);
    // 如果需要引号或为空字符串，使用双引号
    if (value === '' || needsQuotes(value) || escaped !== value) {
        return `"${escaped}"`;
    }
    return value;
}

/**
 * 处理多行 YAML 值的缩进
 * @param yamlValue 已转换的 YAML 值字符串
 * @param prefix 前缀（如 "- " 或 "key: "）
 * @param indentStr 当前缩进字符串
 * @returns 处理后的多行字符串数组
 */
function formatMultilineYaml(yamlValue, prefix, indentStr) {
    const lines = yamlValue.split('\n');
    const result = [];
    
    // 如果第一行是块字面量标记 (|)，或者带 chomping indicator 的标记
    if (lines[0].match(/^\|[+\-]?$/)) {
        result.push(`${indentStr}${prefix}${lines[0]}`);
        lines.slice(1).forEach(line => {
            result.push(`${indentStr}  ${line}`);
        });
    } else {
        // 多行对象或数组
        result.push(`${indentStr}${prefix}`);
        lines.forEach(line => {
            result.push(line);
        });
    }
    
    return result;
}

/**
 * 将 JavaScript 值转换为 YAML 格式
 */
function valueToYaml(value, indent = 0) {
    const indentStr = ' '.repeat(indent);
    
    if (value === null) {
        return 'null';
    }
    
    if (value === undefined) {
        return 'null';
    }
    
    if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    }
    
    if (typeof value === 'number') {
        if (isNaN(value)) {
            return '.nan';
        }
        if (!isFinite(value)) {
            return value > 0 ? '.inf' : '-.inf';
        }
        return value.toString();
    }
    
    if (typeof value === 'string') {
        // 先尝试解析是否为 JSON
        try {
            const parsed = JSON.parse(value);
            // 如果解析成功且结果不是字符串（避免循环解析纯字符串 JSON）
            if (typeof parsed !== 'string') {
                // 递归处理解析后的值
                return valueToYaml(parsed, indent);
            }
        } catch {
            // 解析失败，按普通字符串处理
        }
        return formatString(value);
    }
    
    if (Array.isArray(value)) {
        if (value.length === 0) {
            return '[]';
        }
        const items = [];
        for (const item of value) {
            const itemYaml = valueToYaml(item, indent + 2);
            // 如果项目是多行或是已缩进的块（对象/数组），需要正确处理缩进
            // 检查 valueYaml 是否以空格开头，表示它是一个块级元素
            if (itemYaml.includes('\n') || itemYaml.startsWith(' ')) {
                items.push(...formatMultilineYaml(itemYaml, '- ', indentStr));
            } else {
                items.push(`${indentStr}- ${itemYaml}`);
            }
        }
        return items.join('\n');
    }
    
    if (typeof value === 'object') {
        const keys = Object.keys(value);
        if (keys.length === 0) {
            return '{}';
        }
        const items = [];
        for (const key of keys) {
            const keyValue = value[key];
            const keyStr = needsQuotes(key) ? `"${escapeString(key)}"` : key;
            const valueYaml = valueToYaml(keyValue, indent + 2);
            // 如果值是多行或已缩进的块（对象/数组），需要正确处理缩进
            if (valueYaml.includes('\n') || valueYaml.startsWith(' ')) {
                items.push(...formatMultilineYaml(valueYaml, `${keyStr}: `, indentStr));
            } else {
                items.push(`${indentStr}${keyStr}: ${valueYaml}`);
            }
        }
        return items.join('\n');
    }
    
    return String(value);
}

/**
 * 将单行 JSON 字符串转换为 YAML 格式
 */
function jsonToYaml(jsonString) {
    try {
        const jsonObject = JSON.parse(jsonString);
        const yamlText = valueToYaml(jsonObject, 0);
        return yamlText;
    } catch (error) {
        throw new Error(`Failed to parse JSON: ${error}`);
    }
}

// Main Script Logic
const args = process.argv.slice(2);

if (args.length === 0) {
    console.log('Usage: node scripts/json2yaml.js <file1> <file2> ...');
    process.exit(1);
}

async function processFiles() {
    for (const filePath of args) {
        try {
            const absolutePath = path.resolve(filePath);
            if (!fs.existsSync(absolutePath)) {
                console.error(`File not found: ${filePath}`);
                continue;
            }

            const content = fs.readFileSync(absolutePath, 'utf8');
            const trimmedText = content.trim();
            
            if (!trimmedText) {
                console.warn(`Skipping empty file: ${filePath}`);
                continue;
            }

            console.log(`Converting ${filePath}...`);
            const yamlContent = jsonToYaml(trimmedText);

            // Output filename logic matches extension.ts
            const fileDir = path.dirname(absolutePath);
            const fileName = path.basename(absolutePath, path.extname(absolutePath));
            const yamlFilePath = path.join(fileDir, `${fileName}.jyb.yaml`);

            fs.writeFileSync(yamlFilePath, yamlContent, 'utf8');
            console.log(`Saved to ${yamlFilePath}`);

        } catch (error) {
            console.error(`Error converting ${filePath}: ${error.message}`);
        }
    }
}

processFiles();

