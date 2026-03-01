# Error Interception & Error Panel Requirements

## Overview

设计一个 warning 和 error 的打印拦截系统，确保错误能够被展示到错误面板。

**Status**: ✅ Implemented

## User Requirements

### 1. Error Panel Access

- **Command**: `/errors` opens the error panel as a standalone panel
- **Location**: Independent panel (not integrated into existing panels)
- **Access Pattern**: Command-driven, similar to other `/` commands

### 2. Error Interception Scope

**Intercept ALL sources of warnings and errors:**

- Agent execution errors
- Tool invocation errors (read, write, glob, grep, etc.)
- Command execution errors (terminal/bash)
- System-level errors (config loading, network requests, etc.)
- User input warnings

### 3. Panel Display

- **Display limit**: Show first 100 lines only (configurable)
- **Content**: Error messages + file location
- **Style**: Simple and practical
- **No advanced features**: No stack traces, error classification, or navigation needed (keep it simple)

### 4. Persistence

- **Storage location**: `.zen-code/errors.json`
- **Format**: JSON file
- **Persistence**: Keep error history across sessions
- **Max entries**: 500 (with FIFO eviction)

## Technical Considerations

### Error Capture Mechanism

- Intercept `console.error`, `console.warn` globally
- Hook into Agent middleware error flows
- Capture unhandled promise rejections
- Capture uncaught exceptions
- React ErrorBoundary integration

### Error Data Structure

```typescript
interface ErrorEntry {
    id: string; // UUID
    timestamp: string; // ISO format
    level: 'warning' | 'error';
    source: 'Agent' | 'Tool' | 'Terminal' | 'System' | 'Unknown';
    message: string;
    file?: string; // file location if available
    line?: number;
    column?: number;
    stack?: string; // optional, for debugging
}
```

### Panel Implementation

- Similar to other panels (ModelPanel, TaskPanel, etc.)
- Use TanStack Query for data fetching
- Virtual scrolling for performance (UniversalPanel)
- Search and filter capabilities
- Clear error history command (Ctrl+L)
- Delete individual errors (Backspace)

### Integration Points

- **AgentMiddleware**: Capture agent execution errors
- **FilesystemMiddleware**: Capture tool errors
- **TerminalMiddleware**: Capture bash errors
- **Global Error Handler**: Catch unhandled errors
- **React ErrorBoundary**: Capture component errors
- **MessageTool**: Capture tool execution errors

## Implementation Details

### File Structure

```
zen-code/src/chat/
├── services/
│   ├── ErrorInterceptor.ts    # Global error interception
│   └── ErrorStore.ts          # Persistence layer
├── hooks/
│   └── useErrors.ts           # TanStack Query hooks
├── components/
│   └── panels/
│       └── ErrorPanel.tsx     # Error panel UI
├── commands/
│   └── errorCommand.ts        # /errors command
└── context/
    └── ChatPanelContext.tsx   # Panel switching
```

### Initialization

Error interceptor is initialized at application startup in `zen-code/src/cli.ts`:

```typescript
import { initErrorInterceptor } from './chat/services/ErrorInterceptor';
initErrorInterceptor();
```

### Error Sources

| Source       | Capture Method                                | Examples                  |
| ------------ | --------------------------------------------- | ------------------------- |
| **Agent**    | `logAgentError()` + console.error             | LLM errors, agent crashes |
| **Tool**     | `logToolError()` + console.error              | Read/write failures       |
| **Terminal** | `logTerminalError()` + console.error          | Bash command errors       |
| **System**   | unhandled rejection/exception + console.error | Config, network           |
| **Unknown**  | console.error/warn fallback                   | Unclassified errors       |

### Panel Features

- **Filter by level**: All / Error / Warning
- **Filter by source**: All / Agent / Tool / Terminal / System
- **Search**: Fuzzy search in messages and file paths
- **Shortcuts**:
    - `ESC` - Close panel
    - `Backspace` - Delete selected error
    - `Ctrl+L` - Clear all errors
- **Time display**: Relative time (刚刚, X分钟前) + absolute time

## Acceptance Criteria

- [x] `/errors` command opens error panel
- [x] All error sources are captured and displayed
- [x] Errors are saved to `.zen-code/errors.json`
- [x] Panel shows first 100 lines with file locations
- [x] Simple and user-friendly interface
- [x] Search and filter functionality
- [x] Delete individual errors
- [x] Clear all errors
- [x] Error history persists across sessions

## Known Issues & Limitations

### Performance Considerations

1. **Synchronous file writes**: `ErrorStore` uses `writeFileSync` which blocks the main thread
    - **Impact**: Minimal for typical error rates, but could be noticeable under heavy error storms
    - **Planned fix**: Switch to async `writeFile` with debouncing

2. **5-second auto-refresh**: `useErrors` hooks refetch every 5 seconds
    - **Impact**: Unnecessary network/disk I/O when panel is not active
    - **Planned fix**: Refresh on panel open/focus instead of interval

### Error Classification Accuracy

1. **Keyword-based source inference**: Uses string matching to infer error sources
    - **Impact**: May misclassify some errors (e.g., "read" could be tool or system)
    - **Mitigation**: Explicit `logToolError()`, `logAgentError()` calls for known sources

2. **Stack trace parsing**: Simple regex may not handle all stack formats
    - **Impact**: Missing file/line/column information for some errors
    - **Mitigation**: Fallback to "Unknown" without crashing

### UI/UX Considerations

1. **console.clear() disabled**: `DynamicRenderer.tsx` has console.clear commented out
    - **Reason**: Preserves error history in terminal
    - **Trade-off**: Terminal output may accumulate over time
    - **Future**: Implement selective clearing (preserve errors, clear other output)

2. **Max 500 entries**: Error history is truncated after 500 errors
    - **Reason**: Prevents unbounded file growth
    - **Trade-off**: Older errors are lost
    - **User control**: Can export errors before they're lost (future feature)

## Testing

### Manual Test Scenarios

#### 1. Error Panel Basic Operations

```bash
# Test 1: Open empty panel
/errors  # Should show "暂无错误记录"

# Test 2: Generate errors
/sum 1 2 3  # Valid command
/sum        # Missing args (should show warning)

# Test 3: Check panel
/errors     # Should show warnings from invalid command
```

#### 2. Error Source Verification

```bash
# Test: Tool errors
# (Execute a command that triggers tool error)
# Check that source shows "🔧 Tool" in panel

# Test: Terminal errors
# (Execute a bash command that fails)
# Check that source shows "💻 Terminal" in panel

# Test: System errors
# (Disconnect network and try to fetch)
# Check that source shows "⚙️ System" in panel
```

#### 3. Persistence Test

```bash
# Test 1: Generate errors
# (Create some errors)

# Test 2: Restart application
# (Exit and run zen-code again)

# Test 3: Check errors persisted
/errors  # Should show errors from previous session
```

#### 4. Search and Filter Test

```bash
# Test 1: Search
/errors
# Press '/' and type "read"
# Should only show errors containing "read"

# Test 2: Filter by level
# Press Tab to switch filter
# Select "错误" to see only errors

# Test 3: Filter by source
# Select "Tool" to see only tool errors
```

#### 5. Delete and Clear Test

```bash
# Test 1: Delete single error
/errors
# Select an error and press Backspace
# Error should be removed

# Test 2: Clear all errors
/errors
# Press Ctrl+L
# All errors should be cleared
```

### Unit Test Coverage

- [x] `ErrorStore.addError()` - Add error with timestamp
- [x] `ErrorStore.getErrors()` - Retrieve all errors
- [x] `ErrorStore.deleteError()` - Delete single error
- [x] `ErrorStore.clearAll()` - Clear all errors
- [x] `ErrorStore.getStats()` - Get error statistics
- [x] `ErrorInterceptor.initErrorInterceptor()` - Initialize interception
- [x] `ErrorInterceptor.logToolError()` - Log tool error
- [x] `ErrorInterceptor.logTerminalError()` - Log terminal error
- [x] `ErrorInterceptor.logAgentError()` - Log agent error
- [x] `useErrors()` - Query hook for error list
- [x] `useDeleteError()` - Mutation hook for deletion
- [x] `useClearErrors()` - Mutation hook for clearing

## Future Enhancements (Optional)

### High Priority

- [ ] **Async file writes with debouncing** - Improve performance
- [ ] **Refresh on panel open instead of interval** - Reduce unnecessary I/O
- [ ] **Error export to file** - Allow users to export error logs
- [ ] **Error analytics dashboard** - Show error trends and statistics

### Medium Priority

- [ ] **Error grouping** - Group similar errors to reduce noise
- [ ] **Error bookmarking** - Mark important errors for later review
- [ ] **Error severity levels** - Add "critical" level for blocking errors
- [ ] **Auto-archive old errors** - Move old errors to archive file

### Low Priority

- [ ] **Error notifications** - Alert on new errors
- [ ] **Error suppression rules** - Ignore specific error patterns
- [ ] **Error replay** - Reconstruct error scenarios for debugging
- [ ] **Error sharing** - Share error logs with team

## Migration Guide

### Upgrading from Previous Version

No migration needed. Error panel is a new feature.

### First-Time Setup

1. Run application
2. Error interceptor initializes automatically
3. `.zen-code/errors.json` is created on first error
4. Access via `/errors` command

## Troubleshooting

### Panel Not Showing Errors

**Symptom**: `/errors` shows "暂无错误记录" but errors occurred

**Diagnosis**:

```bash
# Check error file exists
cat .zen-code/errors.json

# Check error interceptor initialized
# Look for "ErrorInterceptor" in startup logs
```

**Solution**:

- Verify `initErrorInterceptor()` is called in `cli.ts`
- Check file permissions on `.zen-code/` directory
- Restart application

### Errors Not Captured

**Symptom**: Errors appear in terminal but not in panel

**Diagnosis**:

- Check if error source uses `console.error` or `console.warn`
- Verify error happens after interceptor initialization

**Solution**:

- Use `logToolError()`, `logTerminalError()`, or `logAgentError()` for known sources
- Move initialization earlier in startup sequence

### Performance Issues

**Symptom**: UI lag when many errors occur

**Diagnosis**:

```bash
# Check error file size
ls -lh .zen-code/errors.json

# Monitor refresh frequency
# Look for repeated query executions in logs
```

**Solution**:

- Implement debounced file writes (see Performance Considerations)
- Disable auto-refresh: set `refetchInterval: false` in `useErrors`
- Increase `staleTime` to reduce refetch frequency

## References

- **Implementation**: `zen-code/src/chat/services/ErrorInterceptor.ts`
- **Storage**: `zen-code/src/chat/services/ErrorStore.ts`
- **Hooks**: `zen-code/src/chat/hooks/useErrors.ts`
- **UI**: `zen-code/src/chat/components/panels/ErrorPanel.tsx`
- **Command**: `zen-code/src/chat/commands/errorCommand.ts`
