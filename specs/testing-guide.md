# CodeGraph 测试体系指南

## 快速开始（4 步）

### 1️⃣ 安装依赖

```bash
# 根目录
pnpm add -D -w vitest v8 @vitest/ui

# 各包
pnpm --filter @codegraph/agent add -D vitest
pnpm --filter zen-code add -D vitest @testing-library/react @testing-library/user-event happy-dom
```

### 2️⃣ 创建配置

**根目录** `vitest.workspace.ts`：

```typescript
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
    'packages/config/vitest.config.ts',
    'packages/agent/vitest.config.ts',
    'packages/union-client/vitest.config.ts',
    'zen-code/vitest.config.ts',
]);
```

**包配置示例** `packages/agent/vitest.config.ts`：

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            thresholds: { statements: 70, branches: 70, functions: 70, lines: 70 },
        },
    },
});
```

**UI 配置** `zen-code/vitest.config.ts`：

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'happy-dom',
        setupFiles: ['./src/__tests__/setup.ts'],
        include: ['src/**/*.{test,testx}.{ts,tsx}'],
        coverage: { provider: 'v8', reporter: ['text', 'json'] },
    },
});
```

### 3️⃣ 更新脚本

**根 package.json**：

```json
{
    "scripts": {
        "test": "vitest",
        "test:run": "vitest run",
        "test:coverage": "vitest run --coverage",
        "test:ui": "vitest --ui",
        "test:watch": "vitest --watch"
    }
}
```

### 4️⃣ 验证

```bash
pnpm test -- --run
```

---

## 技术选型

| 工具 | 用途 | 理由 |
|------|------|------|
| **Vitest** ^2.x | 测试框架 | 原生 ESM、比 Jest 快 2-10x |
| **v8** ^10.x | 覆盖率 | 轻量、Node.js 原生支持 |
| **@testing-library/react** ^16.x | React 组件 | 行为驱动测试 |
| **happy-dom** ^15.x | DOM 环境 | 比 jsdom 更快 |

---

## 覆盖率目标

| 包 | 目标 | 最低 |
|---|------|------|
| `@codegraph/config` | 70% | 70% |
| `@codegraph/agent` | 70% | 70% |
| `@codegraph/union-client` | 60% | 60% |
| `zen-code` | 60% | 60% |

---

## 测试编写规范

### 基本结构（AAA 模式）

```typescript
describe('ModuleName', () => {
  describe('functionName', () => {
    it('should do X when Y', () => {
      // Arrange - 准备测试数据
      const input = { value: 42 };

      // Act - 执行被测试代码
      const result = doubleValue(input.value);

      // Assert - 验证结果
      expect(result).toBe(84);
    });
  });
});
```

### Mock 模式

**Mock 模块**：

```typescript
vi.mock('@langchain/core', () => ({
  AgentState: { extend: vi.fn((schema) => schema) },
}));
```

**Mock 文件系统**：

```typescript
describe('File Operations', () => {
  const testDir = `/tmp/test-${Date.now()}`;

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });
});
```

### 异步测试

```typescript
it('should handle async', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});

it('should handle errors', async () => {
  await expect(asyncFunction()).rejects.toThrow('Error message');
});
```

### React 组件测试

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('should render and handle click', async () => {
  const handleClick = vi.fn();
  const user = userEvent.setup();

  render(<Button onClick={handleClick}>Click me</Button>);

  await user.click(screen.getByRole('button'));

  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

### Hooks 测试

```typescript
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

it('should increment counter', () => {
  const { result } = renderHook(() => useCounter());

  act(() => {
    result.current.increment();
  });

  expect(result.current.count).toBe(1);
});
```

---

## 常用断言

```typescript
// 相等性
expect(value).toBe(42);              // 严格相等
expect(value).toEqual({ a: 1 });     // 深度相等
expect(value).toMatchObject({ a: 1 }); // 部分匹配

// 真值
expect(value).toBeTruthy();
expect(value).toBeNull();
expect(value).toBeDefined();

// 数组/字符串
expect(arr).toContain('item');
expect(str).toMatch(/pattern/);

// 对象
expect(obj).toHaveProperty('key');

// 函数
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledWith('arg');

// 异常
expect(() => fn()).toThrow('Error');

// Promise
await expect(promise).resolves.toBe('value');
```

---

## 调试命令

```bash
# 运行所有测试
pnpm test

# 只运行一次
pnpm test:run

# 覆盖率报告
pnpm test:coverage

# UI 调试器
pnpm test:ui

# 运行特定文件
pnpm test path/to/test.test.ts

# 只运行失败的测试
pnpm test -- --bail 1

# 运行匹配的测试
pnpm test -- --grep "should validate"
```

---

## 实施检查清单

### Phase 1: 基础设施（1-2 天）
- [ ] 安装所有依赖
- [ ] 创建 `vitest.workspace.ts`
- [ ] 为每个包创建 `vitest.config.ts`
- [ ] 更新 `package.json` 脚本
- [ ] 验证 `pnpm test` 运行成功

### Phase 2: 核心包测试（2-3 天）
- [ ] `@codegraph/agent` 测试
  - [ ] `state.test.ts`
  - [ ] `middlewares/*.test.ts`
  - [ ] `subagents/config.test.ts`
- [ ] 验证覆盖率 >= 70%

### Phase 3: UI 应用测试（2-3 天）
- [ ] `zen-code` 组件测试
  - [ ] `Chat.test.tsx`
  - [ ] `MessageBox.test.tsx`
  - [ ] `TaskPanel.test.tsx`
- [ ] 验证覆盖率 >= 60%

### Phase 4: 客户端测试（1-2 天）
- [ ] `@codegraph/union-client` Hooks 测试
- [ ] 全量测试运行

---

## 常见陷阱

| 问题 | 解决方案 |
|------|---------|
| 忘记 await | 所有异步操作都加 `await` |
| 测试相互依赖 | 每个测试独立，不共享状态 |
| 过度 mock | 只 mock 外部依赖 |
| 测试实现细节 | 测试公开行为而非私有属性 |

---

## 完整示例

### 工具函数测试

**文件**: `packages/agent/src/utils/validation.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { validateString } from './validation';

describe('validateString', () => {
  it('should pass when value meets all rules', () => {
    const result = validateString('hello', {
      required: true,
      minLength: 3,
      maxLength: 10,
    });
    expect(result.valid).toBe(true);
  });

  it('should fail when value is too short', () => {
    const result = validateString('hi', { minLength: 5 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Minimum length is 5');
  });
});
```

### React 组件测试

**文件**: `zen-code/src/chat/components/TaskPanel.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskPanel } from './TaskPanel';

describe('TaskPanel', () => {
  it('should render task list', () => {
    const tasks = [
      { id: '1', title: 'Task 1', status: 'pending' },
    ];
    render(<TaskPanel tasks={tasks} />);
    expect(screen.getByText('Task 1')).toBeDefined();
  });

  it('should handle task click', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    const tasks = [{ id: '1', title: 'Task 1', status: 'pending' }];

    render(<TaskPanel tasks={tasks} onSelectTask={onSelect} />);
    await user.click(screen.getByText('Task 1'));

    expect(onSelect).toHaveBeenCalledWith('1');
  });
});
```

---

## 参考资源

- [Vitest 文档](https://vitest.dev/)
- [Testing Library 原则](https://testing-library.com/docs/guiding-principles/)
- [项目记忆: vitest-complete-testing-guide](../.claude/memories/vitest-complete-testing-guide/MEMORY.md)
