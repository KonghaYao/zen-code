# TUI Chat Input 缓冲区功能规格文档

> **状态**: ✅ 已实现（2026-03-06 验证 - `ChatInputBuffer.tsx` 已实现）

## 1. 功能概述

### 1.1 目标

为 TUI 的 Chat Input 组件添加缓冲区功能，允许用户在 AI 处理消息时继续编辑和准备下一条消息，提升交互流畅度。

### 1.2 背景

- 当前实现：AI 响应时输入框被禁用（`disabled={loading}`），用户无法输入
- 改进目标：引入缓冲区概念，输入框始终可用，用户可预先准备下一条消息

## 2. 功能需求

### 2.1 核心行为

#### 状态定义

```
输入状态机:
┌─────────────┐
│   IDLE      │ ← 初始状态，无待发送消息
└──────┬──────┘
       │ 用户输入
       ↓
┌─────────────┐
│  BUFFERED   │ ← 有待发送消息在缓冲区
└──────┬──────┘
       │ AI 开始处理
       ↓
┌─────────────┐
│  SENDING    │ ← 消息已发送，等待响应
└──────┬──────┘
       │ AI 响应完成
       ↓
┌─────────────┐
│   IDLE      │
└─────────────┘
```

#### 缓冲区操作

1. **AI 响应中（loading=true）**
    - 用户可正常输入
    - 按 Enter 不触发 AI，将文本加入缓冲区
    - 输入框清空，缓冲区内容显示在上方

2. **AI 空闲（loading=false）**
    - 有缓冲区内容：自动发送缓冲区消息
    - 无缓冲区内容：Enter 直接触发 AI

3. **清空缓冲区**
    - Esc 清空当前缓冲区
    - 发送成功后自动清空

### 2.2 UI 状态指示

| 状态                    | 输入框行为 | Enter 行为  | 视觉提示      |
| ----------------------- | ---------- | ----------- | ------------- |
| loading=false, 无缓冲区 | 正常输入   | 直接触发 AI | 💬 绿色       |
| loading=true, 无缓冲区  | 正常输入   | 加入缓冲区  | ⏳ 灰色       |
| loading=true, 有缓冲区  | 正常输入   | 覆盖缓冲区  | 📝 黄色提示条 |
| loading=false, 有缓冲区 | 只读       | 自动触发 AI | 📤 自动发送中 |

### 2.3 交互流程

```
用户操作序列示例:

1. [loading=false] 用户输入 "Hello" → Enter
   └─> 直接触发 AI → [loading=true]

2. [loading=true] 用户输入 "How are you?" → Enter
   └─> 不触发 AI，加入缓冲区
   └─> 输入框清空，显示 "📝 缓冲区: How are you?"

3. [loading=true] 用户继续输入 "Wait!" → Enter
   └─> 覆盖旧缓冲区
   └─> 显示 "📝 缓冲区: Wait!"

4. [loading → false] AI 响应完成
   └─> 检测到缓冲区有内容
   └─> 自动发送 "Wait!" → [loading=true]

5. [loading=true] 用户按 Esc
   └─> 清空缓冲区，黄色提示条消失
```

## 3. 技术设计

### 3.1 数据结构

```typescript
// 扩展 Chat Context State（不持久化）
interface ChatInputBufferState {
    // 缓冲区内容
    bufferedMessage: string;

    // 状态标记
    bufferStatus: 'idle' | 'buffered' | 'sending';
}

// Context 提供
interface ChatContextType {
    // ... 现有字段

    // 缓冲区状态
    bufferState: ChatInputBufferState;
    setBufferState: React.Dispatch<React.SetStateAction<ChatInputBufferState>>;
}
```

**设计原则**：

- 使用 React Context 管理状态，不持久化
- 程序崩溃时缓冲区数据可丢失
- 简化数据结构，无需队列、配置项

### 3.2 Context 状态管理

#### 创建 ChatInputBufferContext

```typescript
// tui/src/chat/context/ChatInputBufferContext.tsx

interface ChatInputBufferContextType {
  bufferedMessage: string;
  setBufferedMessage: (message: string) => void;
  clearBuffer: () => void;
}

export const ChatInputBufferContext = createContext<ChatInputBufferContextType | null>(null);

export const ChatInputBufferProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bufferedMessage, setBufferedMessage] = useState('');

  const clearBuffer = useCallback(() => {
    setBufferedMessage('');
  }, []);

  return (
    <ChatInputBufferContext.Provider value={{ bufferedMessage, setBufferedMessage, clearBuffer }}>
      {children}
    </ChatInputBufferContext.Provider>
  );
};

export const useChatInputBuffer = () => {
  const context = useContext(ChatInputBufferContext);
  if (!context) {
    throw new Error('useChatInputBuffer must be used within ChatInputBufferProvider');
  }
  return context;
};
```

#### Chat.tsx 修改点

```typescript
// 添加 ChatInputBufferProvider 包裹
const ChatWrapper: React.FC = () => {
  const { config } = useSettings();

  return (
    <ChatInputBufferProvider>
      <ChatProvider apiUrl="http://127.0.0.1:8123" {...otherProps}>
        <Chat />
      </ChatProvider>
    </ChatInputBufferProvider>
  );
};

// Chat 组件内添加自动发送逻辑
const Chat: React.FC = () => {
  const { sendMessage, loading } = useChat();
  const { bufferedMessage, clearBuffer } = useChatInputBuffer();

  // loading 结束时立即发送缓冲区消息
  useEffect(() => {
    if (!loading && bufferedMessage.trim()) {
      const content: Message[] = [{
        type: 'human',
        content: bufferedMessage,
      }];
      sendMessage(content, { extraParams });
      clearBuffer(); // 发送后清空缓冲区
    }
  }, [loading]);

  // ... 其他逻辑不变
};
```

#### EnhancedTextInput.tsx

**保持不变**，作为底层组件，无需修改。

新增的 `ChatInputBuffer` 组件通过内部状态管理缓冲区逻辑，不影响 `EnhancedTextInput` 的行为。

### 3.3 组件架构

```
Chat.tsx
    └── ChatInput (现有组件)
            └── ChatInputBuffer (新增)
                ├── BufferedMessageIndicator (缓冲区提示条)
                └── EnhancedTextInput (底层组件，不修改)
```

#### 新建 ChatInputBuffer 组件

```typescript
// tui/src/chat/components/input/ChatInputBuffer.tsx

interface ChatInputBufferProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  loading: boolean;
  placeholder?: string;
  commandHandler: ReturnType<typeof useCommandHandler>;
}

export const ChatInputBuffer: React.FC<ChatInputBufferProps> = ({
  value,
  onChange,
  onSubmit,
  loading,
  placeholder = '输入消息...',
  commandHandler,
}) => {
  const { bufferedMessage, setBufferedMessage, clearBuffer } = useChatInputBuffer();
  const [internalValue, setInternalValue] = useState(value);

  // 同步外部 value 变化
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleSubmit = async () => {
    if (!internalValue.trim()) return;

    // 命令优先处理
    if (internalValue.startsWith('/')) {
      onSubmit(internalValue);
      setInternalValue('');
      return;
    }

    if (loading) {
      // AI 响应中：加入缓冲区
      setBufferedMessage(internalValue);
      setInternalValue(''); // 清空输入框
    } else {
      // AI 空闲：直接发送
      onSubmit(internalValue);
      setInternalValue('');
    }
  };

  const handleEsc = () => {
    if (bufferedMessage) {
      clearBuffer(); // 清空缓冲区
    } else {
      setInternalValue(''); // 清空输入框
    }
  };

  return (
    <Box flexDirection="column">
      {/* 缓冲区提示条 */}
      {bufferedMessage && (
        <Box paddingX={1}>
          <Text color="yellow">
            📝 缓冲区: {bufferedMessage.slice(0, 50)}{bufferedMessage.length > 50 ? '...' : ''}
          </Text>
        </Box>
      )}

      {/* 命令提示 */}
      <commandHandler.CommandHintUI />

      {/* 输入框（EnhancedTextInput 保持不变） */}
      <Box alignItems="center">
        <Box marginRight={1}>
          <Text color={commandHandler.isCommandInput ? 'yellow' : 'green'} bold>
            {commandHandler.isCommandInput ? '⚡ ' : '💬 '}
          </Text>
        </Box>
        <EnhancedTextInput
          id="global-input"
          value={internalValue}
          onChange={setInternalValue}
          onSubmit={handleSubmit}
          placeholder={
            loading
              ? bufferedMessage
                ? '按 Esc 清空缓冲区'
                : 'AI 响应中，Enter 将消息加入缓冲区'
              : commandHandler.isCommandInput
                ? '输入命令... (试试 /help)'
                : placeholder
          }
        />
      </Box>
    </Box>
  );
};
```

#### ChatInput 组件简化

```typescript
// tui/src/chat/Chat.tsx 中的 ChatInput

const ChatInput: React.FC<ChatInputProps> = ({ mode }) => {
  const { sendMessage, loading, userInput, setUserInput } = useChat();
  const { extraParams } = useSettings();
  const commandHandler = useCommandHandler({ extraParams });

  const handleSubmit = async (inputValue: string) => {
    // 命令处理
    const commandHandled = await commandHandler.executeCommand();
    if (commandHandled) return;

    // 消息发送
    const content: Message[] = [{ type: 'human', content: inputValue }];
    sendMessage(content, { extraParams });
    setUserInput('');
  };

  return (
    <Box flexDirection="column" paddingX={0} paddingY={0}>
      <commandHandler.CommandErrorUI />
      <commandHandler.CommandSuccessUI />

      <ChatInputBuffer
        value={userInput}
        onChange={setUserInput}
        onSubmit={handleSubmit}
        loading={loading}
        placeholder="输入消息..."
        commandHandler={commandHandler}
      />
    </Box>
  );
};
```

```

## 4. 边界情况处理

### 4.1 组件职责分离
- **EnhancedTextInput**：底层输入组件，处理光标、文本输入、粘贴等基础功能
- **ChatInputBuffer**：业务逻辑层，处理缓冲区状态、Enter/Esc 行为、与 AI 状态交互
- **ChatInput**：组合层，集成命令处理、缓冲区 UI、Token 进度条

### 4.2 并发控制
- **单条消息**：只缓冲一条消息，AI 响应中多次 Enter 覆盖旧缓冲区
- **命令优先**：命令（/开头）立即执行，不进入缓冲区
- **输入始终可用**：`EnhancedTextInput` 不受 `disabled` 控制，用户可随时输入

### 4.2 错误处理
- **发送失败**：保留缓冲区内容，允许重发
- **程序崩溃**：缓冲区数据丢失（符合设计预期）
- **AI 异常**：缓冲区保留，用户可用 Esc 清空

### 4.3 快捷键处理
| 快捷键 | loading=false | loading=true |
|--------|--------------|--------------|
| Enter | 触发 AI | 加入缓冲区 |
| Esc | 无操作 | 清空缓冲区 |
| Ctrl+C | 退出程序 | 中断 AI + 保留缓冲区 |

## 5. 实现步骤

### Phase 1: Context 层
- [ ] 创建 `ChatInputBufferContext.tsx`
- [ ] 在 `Chat.tsx` 中添加 Provider 包裹
- [ ] 实现 `useEffect` 监听 loading 变化自动发送

### Phase 2: 创建缓冲区 UI 组件
- [ ] 新建 `ChatInputBuffer.tsx` 封装输入框 + 缓冲区逻辑
- [ ] 内部使用 `EnhancedTextInput`（不修改底层组件）
- [ ] 处理 Enter 条件判断 + Esc 清空缓冲区
- [ ] 添加黄色缓冲区提示条组件

### Phase 3: UI 集成
- [ ] `ChatInput` 组件集成缓冲区逻辑
- [ ] 添加缓冲区内容显示（黄色提示条）
- [ ] 动态更新占位符文本

### Phase 4: 测试验证
- [ ] 手动测试：AI 响应时输入缓冲
- [ ] 手动测试：loading 结束自动发送
- [ ] 手动测试：Esc 清空缓冲区

## 6. 配置选项

无需配置文件，功能默认启用，无持久化。

## 7. 用户文档

### 使用说明
```

Chat Input 缓冲区使用指南:

核心行为：

- AI 响应中（loading）：输入框可用，Enter 将消息加入缓冲区
- AI 空闲：Enter 直接触发 AI，有缓冲区时自动发送缓冲区内容

操作示例：

1. AI 响应中，输入 "next question" → Enter └─> 消息进入缓冲区，上方显示黄色提示

2. AI 响应完成 └─> 缓冲区消息自动发送

3. 不想发送缓冲区消息？└─> 在 AI 响应完成前按 Esc 清空

注意事项：

- 只缓冲一条消息，多次 Enter 会覆盖
- 命令（/help、/model 等）不受影响，可随时执行
- 程序崩溃时缓冲区数据丢失

```

```

## 8. 性能考虑

- **内存占用**：单条缓冲区约 1KB，可忽略
- **响应延迟**：Context 状态更新 < 1ms
- **无持久化开销**：不涉及文件 I/O
