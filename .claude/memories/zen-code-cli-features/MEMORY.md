---
name: "zen-code-cli-features"
description: "zen-code CLI 工具的特殊模式实现：包括 stdin 管道输入支持和 YOLO 模式状态显示；管道模式支持 echo \"content\" | zen-code 或 zen-code -p \"task\" 两种非交互模式，YOLO 模式通过 --yolo 参数启用并在 StatusBar 显示红色 🔥 标识；适用于需要非交互式输入或临时启用特殊功能的场景"
tags: ["zen-code", "cli", "stdin", "pipe", "yolo-mode", "status-bar", "non-interactive", "environment-variables"]
category: "configuration"
created: "2025-01-17"
last_updated: "2025-01-18"
priority: "medium"
context_scope: "project"
---

# 背景

zen-code CLI 工具需要支持多种输入模式和特殊运行模式：

1. **非交互式输入**：支持管道输入和命令行参数两种方式
2. **YOLO 模式**：临时启用特殊功能，无需持久化配置

## 功能 1：Stdin 管道输入支持

### 实现位置

- **tui/src/nonInteractive.ts**：stdin 读取和执行逻辑
- **tui/cli.js**：管道检测和模式路由

### 核心代码

**stdin 读取函数**（`nonInteractive.ts`）：
```typescript
async function readStdin(): Promise<string> {
    return new Promise((resolve, reject) => {
        let data = '';
        process.stdin.setEncoding('utf8');
        
        process.stdin.on('data', (chunk) => { data += chunk; });
        process.stdin.on('end', () => resolve(data));
        process.stdin.on('error', (error) => reject(error));
    });
}

export async function runNonInteractive(prompt?: string, useStdin: boolean = false) {
    let finalPrompt = prompt || '';
    
    if (useStdin) {
        const stdinContent = await readStdin();
        finalPrompt = stdinContent.trim();
    }
    // ... 执行 Graph
}
```

**管道检测和路由**（`cli.js`）：
```javascript
async function detectStdin() {
    return new Promise((resolve) => {
        const isTTY = process.stdin.isTTY;
        if (isTTY) {
            resolve(false);
            return;
        }
        
        const chunk = process.stdin.read();
        if (chunk) {
            process.stdin.unshift(chunk);
            resolve(true);
        } else {
            setTimeout(() => {
                const retryChunk = process.stdin.read();
                if (retryChunk) {
                    process.stdin.unshift(retryChunk);
                    resolve(true);
                } else {
                    resolve(false);
                }
            }, 100);
        }
    });
}

async function main() {
    if (args[0] === '-p' || args[0] === '--prompt') {
        // 参数模式
        const { runNonInteractive } = await import('./dist/nonInteractive.mjs');
        await runNonInteractive(prompt, false);
    } else {
        // 检测管道输入
        const hasStdin = await detectStdin();
        
        if (hasStdin) {
            // 管道模式
            const { runNonInteractive } = await import('./dist/nonInteractive.mjs');
            await runNonInteractive(undefined, true);
        } else {
            // 默认 TUI
            import('./dist/zen-code.mjs');
        }
    }
}
```

### 使用方式

```bash
# 管道模式（从 stdin 读取）
echo "explain this file" | zen-code
cat file.txt | zen-code
ls -la | zen-code "summarize"

# 参数模式（从 -p 参数读取）
zen-code -p "your task"

# TUI 模式（默认，交互式）
zen-code
```

### 关键要点

1. **stdin 检测**：通过 `process.stdin.isTTY` 判断是否是管道
2. **优先级**：管道模式 > -p 参数 > TUI 模式
3. **数据读取**：使用事件监听器累积 stdin 数据
4. **超时处理**：100ms 延迟检测避免阻塞
5. **unshift 技巧**：读取后放回缓冲区，确保数据不丢失

---

## 功能 2：YOLO 模式状态显示

### 实现位置

- **tui/cli.js**：参数处理和环境变量设置
- **tui/src/chat/components/StatusBar.tsx**：UI 状态显示

### 核心代码

**CLI 参数处理**（`cli.js`）：
```javascript
// 处理 --yolo 参数：设置环境变量但不保存到配置
const yoloIndex = args.indexOf('--yolo');
if (yoloIndex !== -1) {
    process.env.YOLO_MODE = 'true';
    args.splice(yoloIndex, 1); // 移除 --yolo 参数
}
```

**UI 状态显示**（`StatusBar.tsx`）：
```tsx
const StatusBar = () => {
    const isYoloMode = process.env.YOLO_MODE === 'true';
    
    return (
        <Box>
            {/* 其他状态信息 */}
            
            {isYoloMode && (
                <Text color="red" bold>
                    {' '}🔥 YOLO
                </Text>
            )}
        </Box>
    );
};
```

### 使用方式

```bash
# 启用 YOLO 模式
zen-code --yolo

# 正常模式
zen-code
```

### 设计要点

1. **临时性**：使用环境变量而非配置文件，确保每次启动时需要显式指定
2. **可见性**：使用红色 🔥 emoji 和粗体显示，醒目提示用户
3. **位置选择**：紧跟在核心配置信息（模型、agent）之后
4. **参数清理**：设置环境变量后从 args 中移除 `--yolo`，避免干扰后续逻辑

### 适用场景

需要临时启用某些特殊功能或行为模式（如跳过确认、加速执行等），但不希望持久化配置的场景

---

## 共同特点

1. **非侵入性**：都不修改配置文件，保持系统简洁
2. **环境变量传递**：通过 `process.env` 在 CLI 和 UI 间传递状态
3. **灵活组合**：可以同时使用，如 `cat file.txt | zen-code --yolo`
4. **用户友好**：提供清晰的视觉反馈和多种使用方式

## 相关文件

- `tui/src/nonInteractive.ts:24-57` - stdin 读取和执行函数
- `tui/cli.js:4-8,35-55` - 管道检测和 YOLO 参数处理
- `tui/src/chat/components/StatusBar.tsx:20-48` - YOLO 状态显示
