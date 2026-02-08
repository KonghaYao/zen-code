---
name: tui-development
description:
    'Guide for building TUI (Terminal UI) applications using React and Ink.js. Covers fundamental patterns, component
    architecture, input handling, and best practices for terminal-based interfaces.'
---

# TUI Development with React + Ink.js

## Overview

This skill provides comprehensive guidance for building modern TUI (Terminal User Interface) applications using React
and Ink.js. It covers fundamental patterns, component architecture, input handling, performance optimization, and best
practices for creating efficient terminal-based interfaces.

## Technology Stack

### Installation

```bash
# Using pnpm (recommended)
pnpm add ink react ink-spinner ink-pro
pnpm add -D vite @vitejs/plugin-react typescript

# Or using npm
npm install ink react ink-spinner ink-pro
npm install -D vite @vitejs/plugin-react typescript
```

### Core Dependencies

-   **ink** (^6.6.0) - React renderer for TUI
-   **react** (^19.2.3) - React for components
-   **ink-spinner** (^5.0.0) - Spinner components
-   **ink-pro** (\*) - Advanced TUI components (CodeGraph)
-   **vite** (^7.3.1) - Build tool
-   **@vitejs/plugin-react** (^5.1.2) - Vite + React plugin
-   **typescript** - TypeScript support

## ink-pro Components

ink-pro is a component library built on Ink.js that provides production-ready components for building TUI applications.

### Installation

```bash
pnpm add ink-pro
```

### MultiLineTextInput

Multi-line text input with cursor navigation. Handles CJK, emoji, word movement, and virtual scrolling.

```tsx
import { MultiLineTextInput } from 'ink-pro';

<MultiLineTextInput
    value={value}
    onChange={setValue}
    placeholder="Type something..."
    onSubmit={(v) => console.log(v)}
    maxVisibleLines={10}
/>;
```

**Keyboard shortcuts:**

-   Arrow keys for cursor movement
-   Ctrl/Cmd + ←→ or Alt + ←→ for word navigation
-   Home/End or Ctrl+A/E for line boundaries
-   Ctrl/Cmd + Backspace/Delete for word deletion
-   Enter to submit, Ctrl/Cmd + Enter for newline

### UniversalPanel

List panel with search, filters, and keyboard navigation. Supports virtual scrolling and async data sources.

```tsx
import { UniversalPanel } from 'ink-pro';

<UniversalPanel
    config={{
        id: 'tasks',
        title: 'Tasks',
        dataSource: async () => fetchTasks(),
        searchFields: ['title'],
        filters: [{ id: 'pending', label: 'Pending', predicate: (t) => t.status === 'pending' }],
        renderItem: (item, index, isSelected) => <Text color={isSelected ? 'green' : 'white'}>{item.title}</Text>,
        onSelect: (item) => console.log(item),
    }}
    onClose={onClose}
/>;
```

**Keyboard shortcuts:**

-   ↑↓ to navigate
-   Enter to select
-   `/` to enter search mode
-   Tab to cycle filters
-   ESC to close panel

### MultiSelectPro

Multi-select dropdown component.

```tsx
import { MultiSelectPro } from 'ink-pro';

<MultiSelectPro
    options={[
        { label: 'Option 1', value: 'opt1' },
        { label: 'Option 2', value: 'opt2' },
    ]}
    values={values}
    onChange={setValues}
    onSubmit={(v) => console.log(v)}
/>;
```

### Shimmer

Animated text highlight effect.

```tsx
import { Shimmer } from 'ink-pro';

<Shimmer text="Loading..." highlightColor="#00FFFF" baseColor="#003333" />;
```

### LimitedOutput

Display last N lines in a bordered box with omitted lines indicator.

```tsx
import { LimitedOutput } from 'ink-pro';

<LimitedOutput content={longText} maxLines={10} borderColor="cyan" showOmittedInfo />;
```

### Hooks

#### useMultiLineInput

Logic hook for multi-line text editing. Manages cursor position, text manipulation, and coordinate conversion.

```tsx
import { useMultiLineInput } from 'ink-pro';

const { cursor, insertText, deleteChar, moveCursor } = useMultiLineInput(initialValue);
```

#### Utilities

##### parseKeypress

Parse keyboard events across platforms (macOS/Linux/Windows).

```tsx
import { parseKeypress } from 'ink-pro';

input.on('keypress', (str, key) => {
    const result = parseKeypress(key);
});
```

##### textInputUtils

Text processing utilities for cursor position, display width, and scrolling calculations.

```tsx
import { textInputUtils } from 'ink-pro';

// Convert cursor position to line/column
const { line, column } = textInputUtils.cursorToLineColumn(text, cursorPos);

// Calculate display width (handles CJK, emoji)
const width = textInputUtils.getDisplayWidth(text);
```

## Core Concepts

### 1. Application Structure

#### Basic Application Setup

```tsx
// app.tsx
import React from 'react';
import { render } from 'ink';

const App: React.FC = () => {
    return (
        <Box flexDirection="column">
            <Text>Hello, TUI!</Text>
        </Box>
    );
};

render(<App />);
```

#### Layered Architecture Pattern

```
CLI Entry (cli.ts)
    ↓
Application Container (app.tsx)
    ↓
Component Layer (components/)
    ├── Lists/Tables
    ├── Forms/Inputs
    ├── Status Indicators
    └── Navigation
    ↓
Context Layer (context/)
    ├── ThemeContext
    ├── State Management
    └── Global State
    ↓
Utilities Layer (hooks/, utils/)
    ├── Custom Hooks
    ├── Helpers
    └── Constants
```

### 2. Layout and Styling

#### Flexbox Layout System

Ink uses Flexbox for layout:

```tsx
import { Box, Text } from 'ink';

// Vertical layout
<Box flexDirection="column">
    <Text>Item 1</Text>
    <Text>Item 2</Text>
    <Text>Item 3</Text>
</Box>

// Horizontal layout
<Box flexDirection="row">
    <Text>Left</Text>
    <Text>Right</Text>
</Box>

// Advanced layout with spacing
<Box flexDirection="column" padding={2} gap={1}>
    <Text>Title</Text>
    <Box paddingLeft={2}>
        <Text>Indented content</Text>
    </Box>
</Box>
```

#### Borders and Styling

```tsx
import { Box, Text } from 'ink';

<Box borderStyle="single" borderColor="cyan" paddingX={1} paddingY={1}>
    <Text>Bordered content</Text>
</Box>;
```

### 3. Input Handling

#### Basic Text Input

```tsx
import { MultiLineTextInput } from 'ink-pro';
import { useState } from 'react';

const MyInput: React.FC = () => {
    const [value, setValue] = useState('');

    return (
        <Box>
            <Text>Enter text: </Text>
            <MultiLineTextInput value={value} onChange={setValue} placeholder="Type here..." maxVisibleLines={1} />
        </Box>
    );
};
```

#### Keyboard Input Handling

```tsx
import { useInput } from 'ink-pro';
import { useState, useEffect } from 'react';

const KeyboardHandler: React.FC = () => {
    const [keyPressed, setKeyPressed] = useState('');

    useInput((input, key) => {
        if (key.ctrl && input === 'c') {
            process.exit();
        }

        if (key.return) {
            console.log('Enter pressed');
        }

        if (key.leftArrow) {
            setKeyPressed('Left Arrow');
        }

        if (key.tab) {
            console.log('Tab pressed');
        }

        if (input) {
            setKeyPressed(`Key: ${input}`);
        }
    });

    return <Text>Last key: {keyPressed}</Text>;
};
```

### 4. Lists and Virtual Scrolling

#### Static Lists

```tsx
import { Box, Text } from 'ink';

const SimpleList: React.FC<{ items: string[] }> = ({ items }) => {
    return (
        <Box flexDirection="column">
            {items.map((item, index) => (
                <Text key={index}>
                    {index + 1}. {item}
                </Text>
            ))}
        </Box>
    );
};
```

#### Virtual Scrolling Pattern

For long lists, implement virtual scrolling to improve performance:

```tsx
import { Box, Text } from 'ink';
import { useState, useMemo } from 'react';

const VirtualList: React.FC<{ items: string[]; visibleCount: number }> = ({ items, visibleCount }) => {
    const [startIndex, setStartIndex] = useState(0);

    const visibleItems = useMemo(() => {
        return items.slice(startIndex, startIndex + visibleCount);
    }, [items, startIndex, visibleCount]);

    const scrollDown = () => {
        if (startIndex + visibleCount < items.length) {
            setStartIndex((prev) => prev + 1);
        }
    };

    const scrollUp = () => {
        if (startIndex > 0) {
            setStartIndex((prev) => prev - 1);
        }
    };

    useInput((input, key) => {
        if (key.downArrow) scrollDown();
        if (key.upArrow) scrollUp();
    });

    return (
        <Box flexDirection="column">
            <Text>
                Showing {visibleItems.length} of {items.length} items
            </Text>
            {visibleItems.map((item, index) => (
                <Text key={startIndex + index}>{item}</Text>
            ))}
            <Text>Use ↑↓ to scroll</Text>
        </Box>
    );
};
```

#### Using Static for Performance

The `Static` component prevents re-renders for historical content:

```tsx
import { Box, Text, Static } from 'ink';
import { useState, useEffect } from 'react';

const LogViewer: React.FC = () => {
    const [logs, setLogs] = useState<string[]>([]);
    const [currentLog, setCurrentLog] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            const newLog = `Log ${logs.length + 1} at ${new Date().toLocaleTimeString()}`;
            setLogs((prev) => [...prev, currentLog]);
            setCurrentLog(newLog);
        }, 2000);

        return () => clearInterval(interval);
    }, [logs, currentLog]);

    return (
        <Box flexDirection="column">
            <Box borderStyle="double" padding={1}>
                <Text>Current: {currentLog}</Text>
            </Box>

            <Static items={logs}>
                {(log, index) => (
                    <Text key={index} dimColor>
                        {log}
                    </Text>
                )}
            </Static>
        </Box>
    );
};
```

### 5. State Management

#### Using Context API

```tsx
// context.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

interface AppState {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    };

    return <AppContext.Provider value={{ theme, toggleTheme }}>{children}</AppContext.Provider>;
};

export const useAppState = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppState must be used within AppProvider');
    }
    return context;
};
```

#### Using the Context

```tsx
import { useAppState } from './context';
import { Text } from 'ink';

const ThemedText: React.FC = () => {
    const { theme, toggleTheme } = useAppState();

    return <Text color={theme === 'light' ? 'black' : 'white'}>Current theme: {theme} (Press any key to toggle)</Text>;
};
```

### 6. Focus Management

#### Using Ink's Focus System

```tsx
import { useFocus, useFocusManager, Box, Text } from 'ink';
import { useEffect } from 'react';

const FocusableItem: React.FC<{ id: string; label: string }> = ({ id, label }) => {
    const { isFocused } = useFocus({ id });

    return (
        <Text color={isFocused ? 'cyan' : 'gray'}>
            {isFocused ? '> ' : '  '}
            {label}
        </Text>
    );
};

const FocusManager: React.FC = () => {
    const focusManager = useFocusManager();

    useInput((input, key) => {
        if (key.downArrow) {
            focusManager.focusNext();
        }
        if (key.upArrow) {
            focusManager.focusPrevious();
        }
    });

    return (
        <Box flexDirection="column">
            <FocusableItem id="item1" label="Item 1" />
            <FocusableItem id="item2" label="Item 2" />
            <FocusableItem id="item3" label="Item 3" />
            <Text dimColor>Use ↑↓ to navigate</Text>
        </Box>
    );
};
```

## Best Practices

### 1. Performance

-   **Use `Static` for historical content**: Prevent unnecessary re-renders of lists and logs
-   **Implement virtual scrolling**: For long lists, only render visible items
-   **Memoize expensive calculations**: Use `useMemo` and `useCallback`
-   **Debounce user input**: For search/filter operations
-   **Lazy load data**: Load data only when needed

```tsx
// Bad: Re-renders on every state change
const List = ({ items }: { items: string[] }) => (
    <Box flexDirection="column">
        {items.map((item) => (
            <Text>{item}</Text>
        ))}
    </Box>
);

// Good: Memoized
const List = React.memo(({ items }: { items: string[] }) => (
    <Box flexDirection="column">
        {items.map((item, index) => (
            <Text key={index}>{item}</Text>
        ))}
    </Box>
));
```

### 2. User Experience

-   **Provide clear feedback**: Show loading states, success messages, and errors
-   **Support keyboard shortcuts**: Common operations should have keyboard shortcuts
-   **Auto-focus input fields**: Guide users to right place
-   **Show help text**: Display available shortcuts and commands
-   **Handle common key bindings**: Use standard keys like Ctrl+C for exit, Tab for navigation

### 3. Code Organization

-   **Separate concerns**: Logic hooks vs UI components
-   **Use TypeScript**: For type safety and better IDE support
-   **Define clear interfaces**: For all components and props
-   **Group related files**: Organize by feature (components/, hooks/, context/)
-   **Export types**: Make them reusable across your application

### 4. Error Handling

-   **Validate inputs**: Before processing user input
-   **Show user-friendly errors**: Instead of raw error messages
-   **Implement retry mechanisms**: For failed async operations
-   **Log errors**: For debugging purposes

```tsx
const SafeComponent: React.FC = () => {
    const [error, setError] = useState<string | null>(null);

    const handleError = (err: unknown) => {
        const message = err instanceof Error ? err.message : 'An error occurred';
        setError(message);
        console.error('Component error:', err);
    };

    if (error) {
        return <Text color="red">Error: {error}</Text>;
    }

    return <Text>Content</Text>;
};
```

### 5. Accessibility

-   **Use clear labels**: For all interactive elements
-   **Provide keyboard navigation**: For all UI elements
-   **Use semantic colors**: Consistent meaning for colors (e.g., red for errors)
-   **Support screen readers**: Use appropriate text representations

## Common Patterns

### Pattern 1: Controlled Components

```tsx
import { MultiLineTextInput } from 'ink-pro';

const ControlledInput: React.FC = () => {
    const [value, setValue] = useState('');

    return (
        <Box>
            <Text>Input: </Text>
            <MultiLineTextInput
                value={value}
                onChange={setValue}
                onSubmit={() => console.log('Submitted:', value)}
                maxVisibleLines={1}
            />
        </Box>
    );
};
```

### Pattern 2: Menu System

```tsx
const Menu: React.FC<{ items: { label: string; action: () => void }[] }> = ({ items }) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useInput((input, key) => {
        if (key.downArrow) {
            setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
        }
        if (key.upArrow) {
            setSelectedIndex((prev) => Math.max(prev - 1, 0));
        }
        if (key.return) {
            items[selectedIndex].action();
        }
    });

    return (
        <Box flexDirection="column">
            {items.map((item, index) => (
                <Text key={index} color={index === selectedIndex ? 'cyan' : 'white'}>
                    {index === selectedIndex ? '> ' : '  '}
                    {item.label}
                </Text>
            ))}
        </Box>
    );
};
```

### Pattern 3: Pagination

```tsx
const PaginatedList: React.FC<{ items: string[]; pageSize: number }> = ({ items, pageSize }) => {
    const [currentPage, setCurrentPage] = useState(0);
    const totalPages = Math.ceil(items.length / pageSize);

    const startIdx = currentPage * pageSize;
    const visibleItems = items.slice(startIdx, startIdx + pageSize);

    useInput((input, key) => {
        if (key.rightArrow && currentPage < totalPages - 1) {
            setCurrentPage((prev) => prev + 1);
        }
        if (key.leftArrow && currentPage > 0) {
            setCurrentPage((prev) => prev - 1);
        }
    });

    return (
        <Box flexDirection="column">
            {visibleItems.map((item, index) => (
                <Text key={startIdx + index}>{item}</Text>
            ))}
            <Text dimColor>
                Page {currentPage + 1} of {totalPages}
            </Text>
        </Box>
    );
};
```

### Pattern 4: Confirmation Dialog

```tsx
interface ConfirmationDialogProps {
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ message, onConfirm, onCancel }) => {
    const [choice, setChoice] = useState<'yes' | 'no' | null>(null);

    useInput((input, key) => {
        if (input === 'y' || input === 'Y') {
            setChoice('yes');
        }
        if (input === 'n' || input === 'N') {
            setChoice('no');
        }
    });

    useEffect(() => {
        if (choice === 'yes') onConfirm();
        if (choice === 'no') onCancel();
    }, [choice, onConfirm, onCancel]);

    return (
        <Box borderStyle="single" padding={1}>
            <Text>{message}</Text>
            <Text>Confirm? [Y/n]</Text>
        </Box>
    );
};
```

## Testing

### Unit Testing with Vitest

```tsx
import { render } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
    it('renders correctly', () => {
        const { container } = render(<MyComponent />);
        expect(container).toBeDefined();
    });

    it('displays correct text', () => {
        const { getByText } = render(<MyComponent label="Hello" />);
        const element = getByText('Hello');
        expect(element).toBeDefined();
    });
});
```

### Integration Testing

```tsx
import { render } from '@testing-library/react';
import { App } from './App';

describe('App Integration', () => {
    it('handles user input', async () => {
        const { getByText } = render(<App />);
    });
});
```

## Troubleshooting

### Issue: Component not re-rendering

**Solution:** Check if you're using `Static` incorrectly. Only use `Static` for content that doesn't change.

### Issue: Input not being captured

**Solution:** Ensure your component is focused using `useFocus` or `autoFocus`.

### Issue: Performance problems with long lists

**Solution:** Implement virtual scrolling or use `Static` for historical items. Or use ink-pro's `UniversalPanel` which
has built-in virtual scrolling.

### Issue: Layout looks incorrect

**Solution:** Check your Flexbox properties and ensure proper use of `flexDirection`, `flexGrow`, etc.

### Issue: Colors not displaying

**Solution:** Ensure your terminal supports colors. Test with a simple colored Text component.

## Resources

-   [Ink.js Documentation](https://github.com/vadimdemedes/ink)
-   [React 19 Documentation](https://react.dev/)
-   [Vite Documentation](https://vitejs.dev/)
-   [Testing Library for Ink](https://github.com/vadimdemedes/ink-testing-library)
-   [ink-pro](https://www.npmjs.com/package/ink-pro) - CodeGraph's TUI component library
