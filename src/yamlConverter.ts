/**
 * 转义字符串中的特殊字符
 * 使用 JSON.stringify 来自动处理所有需要转义的字符（控制字符、Unicode等）
 */
function escapeString(str: string): string {
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
function needsQuotes(str: string): boolean {
    // 如果包含特殊字符或看起来像数字/布尔值/null，需要引号
    return /^[\s\-:{}[\],&*#?|<>=!%@`]/.test(str) ||
        /^[\d\-]/.test(str) ||
        /^(true|false|null|yes|no|on|off)$/i.test(str) ||
        /^[\d\.]+$/.test(str);
}

/**
 * 格式化字符串值
 */
function formatString(value: string): string {
    // 如果包含换行符或 ": "，使用块字面量样式
    if (value.includes('\n') || value.includes(': ')) {
        const lines = value.split('\n');
        // 保留末尾的换行符信息
        const endsWithNewline = value.endsWith('\n');
        // 移除末尾的空行（但保留一个如果原字符串以换行符结尾）
        while (lines.length > 0 && lines[lines.length - 1] === '' && !endsWithNewline) {
            lines.pop();
        }
        // 返回块字面量标记和内容，内容会在调用处处理缩进
        return `|\n${lines.join('\n')}`;
    }
    // 转义字符串
    const escaped = escapeString(value);
    // 如果需要引号，使用双引号
    if (needsQuotes(value) || escaped !== value) {
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
function formatMultilineYaml(yamlValue: string, prefix: string, indentStr: string): string[] {
    const lines = yamlValue.split('\n');
    const result: string[] = [];
    
    // 如果第一行是块字面量标记 (|)，直接跟在前缀后面
    if (lines[0] === '|') {
        result.push(`${indentStr}${prefix}|`);
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
export function valueToYaml(value: any, indent: number = 0): string {
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
        const items: string[] = [];
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
        const items: string[] = [];
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
export function jsonToYaml(jsonString: string): string {
    try {
        const jsonObject = JSON.parse(jsonString);
        const yamlText = valueToYaml(jsonObject, 0);
        return yamlText;
    } catch (error) {
        throw new Error(`Failed to parse JSON: ${error}`);
    }
}

