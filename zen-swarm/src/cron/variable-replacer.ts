/**
 * 变量替换工具
 * 支持 {{variable}} 语法
 */

/**
 * 替换模板中的变量占位符
 * @param template 包含 {{variable}} 占位符的模板字符串
 * @param variables 变量键值对
 * @returns 替换后的字符串
 */
export function replaceVariables(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        if (key in variables) {
            return variables[key];
        }
        // 找不到变量时保留原占位符并记录警告
        console.warn(`[Cron] Variable "${key}" not found in task variables`);
        return match;
    });
}

/**
 * 验证模板中的所有变量是否都已定义
 * @param template 包含 {{variable}} 占位符的模板字符串
 * @param variables 变量键值对
 * @returns 未定义的变量名数组，如果为空则表示全部已定义
 */
export function validateVariables(template: string, variables: Record<string, string>): string[] {
    const undefinedVars: string[] = [];
    const pattern = /\{\{(\w+)\}\}/g;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(template)) !== null) {
        const key = match[1];
        if (!(key in variables) && !undefinedVars.includes(key)) {
            undefinedVars.push(key);
        }
    }

    return undefinedVars;
}

/**
 * 从模板中提取所有变量名
 * @param template 包含 {{variable}} 占位符的模板字符串
 * @returns 变量名数组
 */
export function extractVariables(template: string): string[] {
    const vars: string[] = [];
    const pattern = /\{\{(\w+)\}\}/g;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(template)) !== null) {
        const key = match[1];
        if (!vars.includes(key)) {
            vars.push(key);
        }
    }

    return vars;
}
