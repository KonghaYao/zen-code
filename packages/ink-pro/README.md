# ink-pro

TUI components for Ink.js. Includes multi-line input, panels, and utilities for building terminal applications with
React.

## Components

### MultiLineTextInput

Multi-line text input with cursor navigation.

- Arrow keys for movement
- Word navigation with Ctrl/Cmd or Alt
- Home/End and Ctrl+A/E for line boundaries
- Word deletion with Ctrl/Cmd + Backspace/Delete
- Virtual scrolling for long text
- Handles CJK and emoji correctly
- Paste support with newline normalization

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

### UniversalPanel

List panel with search, filters, and keyboard navigation.

- Fuzzy search (press `/`)
- Custom filters (press `Tab`)
- Virtual scrolling
- Async data sources
- Custom item rendering

```tsx
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
/>
```

### MultiSelectPro

Multi-select dropdown.

```tsx
<MultiSelectPro
    options={[
        { label: 'Option 1', value: 'opt1' },
        { label: 'Option 2', value: 'opt2' },
    ]}
    values={values}
    onChange={setValues}
    onSubmit={(v) => console.log(v)}
/>
```

### Shimmer

Animated text highlight.

```tsx
<Shimmer text="Loading..." highlightColor="#00FFFF" baseColor="#003333" />
```

### LimitedOutput

Display last N lines in a bordered box.

```tsx
<LimitedOutput content={longText} maxLines={10} borderColor="cyan" showOmittedInfo />
```

## Hooks

### useMultiLineInput

Logic hook for multi-line text editing. Manages cursor position, text manipulation, and coordinate conversion.

```tsx
const { cursor, insertText, deleteChar, moveCursor } = useMultiLineInput(initialValue);
```

## Utilities

### parseKeypress

Parse keyboard events across platforms (macOS/Linux/Windows).

```tsx
import { parseKeypress } from 'ink-pro';

input.on('keypress', (str, key) => {
    const result = parseKeypress(key);
});
```

### textInputUtils

Text processing utilities: cursor position, display width, scrolling calculations.

## Installation

```bash
bun add ink-pro
```

**Peer dependencies:**

- `ink` ^6
- `react` ^18||^19

## Development

```bash
bun run build    # Build
bun run watch    # Watch mode
bun test         # Run tests
bun run tsc      # Type check
```

## License

MIT
