# LangGraph Frontend SDK Guide

This guide covers using `@langgraph-js/sdk` for building chat interfaces with LangGraph backend.

## Installation

```bash
# Core dependencies
npm install @langgraph-js/sdk react @nanostores/react

# Optional: For TypeScript
npm install --save-dev typescript @types/react
```

### Package Description

| Package             | Purpose                                                   |
| ------------------- | --------------------------------------------------------- |
| `@langgraph-js/sdk` | LangGraph frontend SDK (ChatProvider, useChat, etc.)      |
| `react`             | React framework                                           |
| `@nanostores/react` | React bindings for nanostores (used by @langgraph-js/sdk) |

## Basic Setup

### ChatProvider

Wrap your app with `ChatProvider` to enable chat functionality:

```typescript
import { ChatProvider } from '@langgraph-js/sdk/react';

function App() {
    return (
        <ChatProvider
            apiUrl="http://127.0.0.1:8123"
            defaultAgent="default"
            defaultHeaders={{}}
            withCredentials={false}
            showHistory={false}
            showGraph={false}
            autoRestoreLastSession={false}
        >
            <ChatPanel />
        </ChatProvider>
    );
}
```

### useChat Hook

Access chat state and mutations:

```typescript
import { useChat } from '@langgraph-js/sdk/react';

const chatStore = useChat();
const {
    // State
    userInput,
    loading,
    renderMessages,
    inChatError,
    currentAgent,
    currentChatId,

    // Mutations
    sendMessage,
    stopGeneration,
    createNewChat,
    setCurrentAgent,
    setUserInput,
} = chatStore;
```

## Key Concepts

### UnionStore Structure

`useChat()` returns a `UnionStore` with two parts:

- **data**: Immutable state atoms (nanostores)
- **mutations**: Functions to modify state

Access data directly from the store:

```typescript
const { userInput, loading, renderMessages } = useChat();
```

Access mutations for actions:

```typescript
const { sendMessage, createNewChat, stopGeneration } = useChat();
```

### extraParams

**Critical**: Use `extraParams` to pass runtime parameters to the backend:

```typescript
// Pass agent_id via extraParams
await sendMessage(content, {
    extraParams: {
        agent_id: selectedAgentId,
    },
});
```

### sendMessage Options

```typescript
await sendMessage(
    messages, // Message[] or string
    {
        extraParams, // Runtime parameters
        metadata, // Thread metadata
        command, // Command to execute
        _debug, // Debug options
    },
);
```

## Message Components

### Import Types

Import `RenderMessage` type and utility functions from `@langgraph-js/sdk`:

```typescript
import type { RenderMessage } from '@langgraph-js/sdk';
import { getThinkingContent, getTextContent } from '@langgraph-js/sdk';
```

**Note**: `RenderMessage` is provided by the SDK and contains all message fields including `type`, `content`, `id`,
`name`, `done`, etc.

### Handling Content Variations

**Human Message Component**:

```typescript
const renderContent = () => {
    if (typeof message.content === 'string') {
        return message.content;
    }

    if (Array.isArray(message.content)) {
        return message.content
            .filter((item: any) => item.type === 'text')
            .map((item: any) => item.text)
            .join('');
    }

    if (message.content && typeof message.content === 'object') {
        const content = message.content as any;
        return content.message || content.error || JSON.stringify(message.content);
    }

    return JSON.stringify(message.content);
};
```

**AI Message with Thinking**:

```typescript
const thinkingContent = getThinkingContent(message);
let textContent = getTextContent(message);
```

**Tool Message**:

```typescript
export const ToolMessage = ({ message, messageNumber }) => {
    const toolName = message.name || 'Unknown Tool';
    const status = message.done !== false ? 'success' : 'running';
    const toolOutput = message.content;

    // Render with status indicators
    return (
        <div className={statusColors[status]}>
            <span>{statusIcon}</span>
            <span>{messageNumber}. Tool: {toolName}</span>
            <pre>{toolOutput}</pre>
        </div>
    );
};
```

## Common Patterns

### Auto-scroll to Bottom

```typescript
import { useRef, useEffect } from 'react';

const messagesEndRef = useRef<HTMLDivElement>(null);

useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [renderMessages]);

// Render at end of messages list
<div ref={messagesEndRef} />
```

### Loading States

```typescript
{loading ? (
    <button disabled>
        发送中...
    </button>
) : (
    <button onClick={handleSubmit}>
        发送
    </button>
)}
```

### Error Handling

```typescript
if (inChatError) {
    return (
        <div className="error-message">
            <h2>连接错误</h2>
            <pre>
                {typeof inChatError === 'string'
                    ? inChatError
                    : JSON.stringify(inChatError, null, 2)}
            </pre>
        </div>
    );
}
```

## Common Issues & Solutions

### Issue: "Agent not found: xxx"

**Cause**: Using `setCurrentAgent()` directly without proper context

**Solution**: Pass `agent_id` via `extraParams` in `sendMessage()`:

```typescript
await sendMessage(content, {
    extraParams: { agent_id: selectedAgentId },
});
```

### Issue: "Objects are not valid as a React child"

**Cause**: `message.content` is an object, not a string

**Solution**: Handle different content types:

```typescript
if (typeof message.content === 'string') {
    return message.content;
}
if (typeof message.content === 'object') {
    const content = message.content as any;
    return content.message || content.error || JSON.stringify(message.content);
}
return JSON.stringify(message.content);
```

### Issue: Message content not rendering

**Cause**: `getTextContent()` returns array or object

**Solution**: Use fallback rendering:

```typescript
let textContent = getTextContent(message);
const displayContent = typeof textContent === 'string' ? textContent : JSON.stringify(textContent);
```

### Issue: TypeScript type errors with message content

**Solution**: Use type assertions:

```typescript
/** @ts-ignore */
const textContent = getTextContent(message);
```

## API URLs

| Component      | Default URL                           | Description             |
| -------------- | ------------------------------------- | ----------------------- |
| `apiUrl`       | `http://127.0.0.1:8123/api/langgraph` | LangGraph API endpoint  |
| `defaultAgent` | `'default'`                           | Default agent ID to use |

## Type Definitions

```typescript
interface ChatProviderProps {
    children: ReactNode;
    apiUrl?: string;
    defaultAgent?: string;
    defaultHeaders?: Record<string, string>;
    withCredentials?: boolean;
    fetch?: typeof fetch;
    showHistory?: boolean;
    showGraph?: boolean;
    autoRestoreLastSession?: boolean;
    onInitError?: (error: any, currentAgent: string) => void;
    historyFilter?: HistoryFilter;
}
```

**Note**: Import `RenderMessage` and related types from `@langgraph-js/sdk`. Do not redefine them locally.

## Resources

- [@langgraph-js/sdk](https://www.npmjs.com/package/@langgraph-js/sdk)
- [LangGraph Development Guide](./langgraph-development.md) - Backend development
- [Standard Agent System](./standard-agent.md) - Configuration-driven agents
