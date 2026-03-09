# ChatInput 图片粘贴功能设计

## 背景

用户希望在 TUI（zen-code）的 ChatInput 中支持通过 **Ctrl+V**
粘贴图片，将图片保存为本地文件，并在输入框中以文件名/占位符形式显示，最终与文字消息一同发送给 AI。

## 需求摘要

| 维度       | 决定                                              |
| ---------- | ------------------------------------------------- |
| 目标界面   | TUI (zen-code)                                    |
| 图片来源   | 剪贴板粘贴（Ctrl+V）                              |
| 图片处理   | 保存为本地临时文件，传入路径                      |
| 输入框显示 | 显示文件名/占位符（如 `[image: screenshot.png]`） |
| 发送行为   | 图片 + 文字一起发送                               |

---

## 用户交互流程

```
用户复制图片
    │
    ▼
在 ChatInput 中按 Ctrl+V
    │
    ▼
clipboardy 读取剪贴板内容
    │
    ├─ 是图片数据（base64/buffer）
    │       │
    │       ▼
    │   保存到临时文件
    │   ~/.zen-code/tmp/paste_<timestamp>.png
    │       │
    │       ▼
    │   输入框显示占位符
    │   [image: paste_1234567890.png] <文字继续输入>
    │
    └─ 是文本数据 → 正常粘贴文字（现有行为不变）

用户输入完文字，按 Enter 发送
    │
    ▼
消息结构：
  content: [
    { type: 'image_url', image_url: { url: 'file:///...' } },
    { type: 'text', text: '用户文字' }
  ]
```

---

## 技术方案

### 依赖

- **`clipboardy`** - 跨平台剪贴板访问（npm: `clipboardy`）
- 注意：clipboardy v4+ 是 ESM，需确认 bun 兼容性

### 新增文件

```
zen-code/src/chat/components/input/
├── useImagePaste.ts          # 核心 hook：监听粘贴、保存文件
├── ImagePreviewUI.tsx        # 占位符 UI 组件
```

### 数据结构

在 `ChatInputBuffer` 中新增 `attachedImages` 状态：

```typescript
interface AttachedImage {
    id: string; // 唯一标识
    filePath: string; // 本地文件绝对路径
    fileName: string; // 显示名称（如 paste_1234567890.png）
    originalSize: number; // 原始字节数
}
```

### useImagePaste Hook

```typescript
// zen-code/src/chat/components/input/useImagePaste.ts

export function useImagePaste(options: {
    onImageAttached: (image: AttachedImage) => void;
    tmpDir?: string; // 默认 ~/.zen-code/tmp
}) {
    // 监听 Ctrl+V 时机（由 MultiLineTextInput.onHotKey 传入）
    const handlePaste = async () => {
        const content = await clipboardy.read(); // 读取剪贴板
        // 判断是否为图片（base64 或二进制）
        // 保存到临时目录
        // 调用 onImageAttached
    };

    return { handlePaste };
}
```

### ChatInputBuffer 修改点

1. **新增 `attachedImages` state**
2. **`onHotKey` 中拦截 Ctrl+V**：先尝试图片粘贴，失败则走默认文本粘贴
3. **`onHotKey` 中拦截 Backspace**：当 `inputValue` 为空且 `attachedImages` 非空时，移除最后一张图片
4. **输入框上方显示 `ImagePreviewUI`**：展示已附加图片列表
5. **`handleSubmit` 修改**：构建多模态 content 数组

```typescript
// ChatInputBuffer.tsx
// onHotKey 新增逻辑
if (key === 'backspace' && inputValue === '' && attachedImages.length > 0) {
    setAttachedImages((prev) => prev.slice(0, -1));
    return; // 阻止默认行为
}
```

### ImagePreviewUI 组件

```
┌──────────────────────────────────────┐
│ 📎 paste_123.png  📎 paste_456.png   │
└──────────────────────────────────────┘
输入消息...█   ← 输入为空时按 Backspace 删除最后一张
```

- 使用 `ink` 的 `Box` + `Text` 渲染，图片名横向排列
- 无需焦点管理，删除行为由文字输入框的 Backspace 驱动

### 消息发送结构

修改 `ChatInput.tsx` 的 `handleSendMessage`：

```typescript
// 发送时构建 multimodal content
const content = [
    ...attachedImages.map((img) => ({
        type: 'image_url' as const,
        image_url: { url: `file://${img.filePath}` },
    })),
    { type: 'text' as const, text: inputValue },
];

await sendMessage([{ type: 'human', content }], { extraParams, metadata: metadataOfChat });
```

---

## 临时文件管理

- 存放路径：`~/.zen-code/tmp/`
- 命名：`paste_<Date.now()>.<ext>`（默认 `.png`，根据 MIME 类型推断）
- **生命周期**：发送后不自动删除（文件路径已传给 AI），由用户或系统定期清理
- **可选**：在 spec 中标记为 v2 功能——发送后自动清理

---

## 边界情况

| 场景                     | 处理方式                                |
| ------------------------ | --------------------------------------- |
| 剪贴板为纯文本           | 走原有文本粘贴逻辑，不触发图片流程      |
| 剪贴板为空               | 忽略，不报错                            |
| 图片过大（> 10MB）       | 显示警告提示，不附加                    |
| 临时目录不存在           | 自动创建 `~/.zen-code/tmp/`             |
| 发送时图片文件已被删除   | 提示错误，移除该附件                    |
| `loading` 状态下粘贴     | 允许附加图片，进入缓冲区等待发送        |
| Backspace 删除时已无图片 | 降级为普通 Backspace 删除文字（不拦截） |

---

## 实现步骤（优先级排序）

- [ ] **P0** 安装 `clipboardy`，确认 bun/ESM 兼容性
- [ ] **P0** 实现 `useImagePaste` hook（保存文件逻辑）
- [ ] **P0** 在 `ChatInputBuffer` 中集成 Ctrl+V 拦截
- [ ] **P0** 实现 `ImagePreviewUI` 占位符显示
- [ ] **P0** 输入框为空时 Backspace 快捷移除最后一张图
- [ ] **P0** 修改 `handleSendMessage` 支持 multimodal content
- [ ] **P1** 图片大小限制与错误提示
- [ ] **P2** 发送后临时文件自动清理

---

## 受影响文件

| 文件                                                     | 变更类型               |
| -------------------------------------------------------- | ---------------------- |
| `zen-code/src/chat/components/input/ChatInputBuffer.tsx` | 修改                   |
| `zen-code/src/chat/components/input/ChatInput.tsx`       | 修改                   |
| `zen-code/src/chat/components/input/useImagePaste.ts`    | 新增                   |
| `zen-code/src/chat/components/input/ImagePreviewUI.tsx`  | 新增                   |
| `zen-code/package.json`                                  | 添加 `clipboardy` 依赖 |
