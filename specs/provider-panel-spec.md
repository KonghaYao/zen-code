# Provider Panel 设计规格

> **状态**: ✅ 已实现（2026-03-06 验证 - `zen-swarm/src/frontend/components/provider-panel/` 完整实现）

## 概述

为 zen-swarm Web UI 设计的 Provider Panel，允许用户配置多个 AI 提供商（OpenAI、Anthropic），将 API Key 和 Base
URL 存储在 SQLite 数据库中。

---

## 需求摘要

### 平台

- **目标**: Web UI (zen-swarm) 仅限
- **存储**: SQLite 数据库（非 settings.json 或环境变量）

### 支持的提供商

- OpenAI
- Anthropic

### 核心功能

#### 1. 多提供商配置

- 支持保存多个提供商配置
- 允许在不同提供商之间切换
- 每个提供商拥有独立的 API Key 和 Base URL

#### 2. 表单字段

| 字段     | 类型    | 必填 | 默认值             | 验证规则                |
| -------- | ------- | ---- | ------------------ | ----------------------- |
| name     | string  | Yes  | -                  | 1-50 字符，项目内唯一   |
| type     | enum    | Yes  | -                  | 'openai' \| 'anthropic' |
| apiKey   | string  | Yes  | -                  | 最小 10 字符            |
| baseUrl  | string  | Yes  | 根据 type 自动填充 | 有效 URL 格式           |
| isActive | boolean | No   | false              | 全局唯一（仅一个活跃）  |

#### 3. 默认 Base URL

| 提供商类型 | 默认 Base URL               | 备注            |
| ---------- | --------------------------- | --------------- |
| OpenAI     | `https://api.openai.com/v1` | 包含 `/v1` 后缀 |
| Anthropic  | `https://api.anthropic.com` | 无 `/v1` 后缀   |

> ⚠️ **注意**: OpenAI 和 Anthropic API 请求格式不同：
>
> - OpenAI: `Authorization: Bearer <key>`
> - Anthropic: `x-api-key: <key>` + `anthropic-version` header

#### 4. UI 设计

- **布局**: Modal 对话框
- **风格**: 与现有 zen-swarm 组件保持一致
- **交互**:
    - 新增提供商
    - 编辑现有提供商
    - 删除提供商（需确认）
    - 设置活跃提供商（单选）
    - 保存/取消操作

#### 5. 存储行为

- 仅存储在 SQLite 中
- 不自动同步到环境变量
- 活跃提供商决定运行时使用哪个配置

---

## 与现有系统集成

### 存储层差异

| 系统            | 存储位置                    | 用途        |
| --------------- | --------------------------- | ----------- |
| zen-code (TUI)  | `~/.zen-code/settings.json` | TUI 配置    |
| zen-swarm (Web) | SQLite `providers` 表       | Web UI 配置 |

**决策**: 两个系统独立存储，不进行数据同步。

### 运行时配置读取

```typescript
// zen-swarm 启动时从 SQLite 加载活跃提供商
async function loadActiveProvider(): Promise<ProviderConfig | null> {
    const provider = await db.provider.findFirst({
        where: { isActive: true },
    });

    if (provider) {
        // 同步到运行时环境（可选，用于 LangChain 初始化）
        process.env.MODEL_PROVIDER = provider.type;
        if (provider.type === 'openai') {
            process.env.OPENAI_API_KEY = provider.apiKey;
        } else if (provider.type === 'anthropic') {
            process.env.ANTHROPIC_API_KEY = provider.apiKey;
        }
    }

    return provider;
}
```

### 迁移策略

首次启动时，自动从环境变量迁移现有配置：

```typescript
async function migrateFromEnvVars(db: Database): Promise<void> {
    const existingCount = await db.provider.count();
    if (existingCount > 0) return; // 已有数据，跳过迁移

    const providers: Omit<Provider, 'id' | 'createdAt' | 'updatedAt'>[] = [];

    if (process.env.OPENAI_API_KEY) {
        providers.push({
            name: 'OpenAI (从环境变量迁移)',
            type: 'openai',
            apiKey: process.env.OPENAI_API_KEY,
            baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
            isActive: !process.env.ANTHROPIC_API_KEY, // 仅有 OpenAI 时设为活跃
        });
    }

    if (process.env.ANTHROPIC_API_KEY) {
        providers.push({
            name: 'Anthropic (从环境变量迁移)',
            type: 'anthropic',
            apiKey: process.env.ANTHROPIC_API_KEY,
            baseUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
            isActive: true, // Anthropic 优先设为活跃
        });
    }

    for (const provider of providers) {
        await db.provider.create({ data: provider });
    }
}
```

---

## 数据模型

### Provider 表 (SQLite)

```sql
CREATE TABLE providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('openai', 'anthropic')),
  api_key_encrypted TEXT NOT NULL,  -- 加密存储
  api_key_iv TEXT NOT NULL,         -- 加密 IV
  base_url TEXT NOT NULL,
  is_active INTEGER DEFAULT 0 CHECK(is_active IN (0, 1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 确保名称唯一
CREATE UNIQUE INDEX idx_providers_name ON providers(name);

-- 确保仅有一个活跃提供商（通过触发器）
CREATE TRIGGER ensure_single_active_provider
AFTER UPDATE OF is_active ON providers
WHEN NEW.is_active = 1
BEGIN
  UPDATE providers SET is_active = 0 WHERE id != NEW.id AND is_active = 1;
END;

CREATE TRIGGER ensure_single_active_provider_insert
AFTER INSERT ON providers
WHEN NEW.is_active = 1
BEGIN
  UPDATE providers SET is_active = 0 WHERE id != NEW.id AND is_active = 1;
END;
```

### TypeScript 接口

```typescript
import { z } from 'zod';

// Zod Schema（用于 API 验证）
export const ProviderSchema = z.object({
    name: z.string().min(1, '名称不能为空').max(50, '名称不能超过 50 字符'),
    type: z.enum(['openai', 'anthropic'], {
        errorMap: () => ({ message: '类型必须是 openai 或 anthropic' }),
    }),
    apiKey: z.string().min(10, 'API Key 长度不足'),
    baseUrl: z.string().url('请输入有效的 URL'),
    isActive: z.boolean().optional().default(false),
});

export const ProviderUpdateSchema = ProviderSchema.partial();

// TypeScript 接口
export interface Provider {
    id: string;
    name: string;
    type: 'openai' | 'anthropic';
    apiKey: string; // 返回时脱敏
    baseUrl: string;
    isActive: boolean;
    createdAt: number;
    updatedAt: number;
}

// 数据库实体（包含加密字段）
export interface ProviderEntity {
    id: string;
    name: string;
    type: 'openai' | 'anthropic';
    apiKeyEncrypted: string;
    apiKeyIv: string;
    baseUrl: string;
    isActive: boolean;
    createdAt: number;
    updatedAt: number;
}
```

---

## API 设计 (tRPC)

### Router: `providerRouter`

| 过程        | 输入                                                 | 输出                                 | 描述                          |
| ----------- | ---------------------------------------------------- | ------------------------------------ | ----------------------------- |
| `list`      | -                                                    | `Provider[]`                         | 列出所有提供商（apiKey 脱敏） |
| `get`       | `{ id: string }`                                     | `Provider`                           | 获取单个提供商                |
| `create`    | `ProviderSchema`                                     | `Provider`                           | 创建新提供商                  |
| `update`    | `{ id: string } & ProviderUpdateSchema`              | `Provider`                           | 更新提供商                    |
| `delete`    | `{ id: string }`                                     | `{ success: boolean }`               | 删除提供商                    |
| `setActive` | `{ id: string }`                                     | `Provider`                           | 设为活跃提供商                |
| `validate`  | `{ type: string, apiKey: string, baseUrl?: string }` | `{ valid: boolean, error?: string }` | 验证 API Key 有效性           |

### tRPC 实现示例

```typescript
import { router, procedure } from '../trpc';
import { ProviderSchema, ProviderUpdateSchema } from './schema';
import { encryptApiKey, decryptApiKey, maskApiKey } from '../utils/encryption';

export const providerRouter = router({
    list: procedure.query(async ({ ctx }) => {
        const providers = await ctx.db.provider.findMany();
        return providers.map((p) => ({
            ...p,
            apiKey: maskApiKey(decryptApiKey(p.apiKeyEncrypted, p.apiKeyIv)),
            apiKeyEncrypted: undefined,
            apiKeyIv: undefined,
        }));
    }),

    create: procedure.input(ProviderSchema).mutation(async ({ ctx, input }) => {
        // 检查名称唯一性
        const existing = await ctx.db.provider.findUnique({
            where: { name: input.name },
        });
        if (existing) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: '提供商名称已存在',
            });
        }

        // 加密 API Key
        const { encrypted, iv } = encryptApiKey(input.apiKey);

        // 如果设为活跃，先取消其他活跃状态
        if (input.isActive) {
            await ctx.db.provider.updateMany({
                where: { isActive: true },
                data: { isActive: false },
            });
        }

        const provider = await ctx.db.provider.create({
            data: {
                ...input,
                apiKeyEncrypted: encrypted,
                apiKeyIv: iv,
            },
        });

        return { ...provider, apiKey: maskApiKey(input.apiKey) };
    }),

    setActive: procedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
        // 事务处理：取消所有活跃 + 设置新活跃
        const provider = await ctx.db.$transaction(async (tx) => {
            await tx.provider.updateMany({
                where: { isActive: true },
                data: { isActive: false },
            });
            return tx.provider.update({
                where: { id: input.id },
                data: { isActive: true },
            });
        });

        return { ...provider, apiKey: maskApiKey(decryptApiKey(provider.apiKeyEncrypted, provider.apiKeyIv)) };
    }),
});
```

---

## UI 组件结构

```
ProviderPanel (Modal)
├── ProviderList
│   ├── ProviderCard (for each provider)
│   │   ├── 提供商信息展示（名称、类型、Base URL）
│   │   ├── API Key 显示（脱敏 + 揭示按钮）
│   │   ├── 活跃状态指示器（徽章/图标）
│   │   ├── 编辑按钮
│   │   ├── 删除按钮（需二次确认）
│   │   └── 设为活跃按钮
│   └── 新增提供商按钮
├── ProviderForm (Modal 内的表单模式)
│   ├── 名称输入框
│   ├── 类型选择器（OpenAI/Anthropic 单选）
│   ├── API Key 输入框（密码类型 + 揭示按钮）
│   ├── Base URL 输入框（根据类型自动填充默认值）
│   ├── API Key 验证按钮（可选）
│   └── 保存/取消按钮
└── 关闭按钮
```

### 组件状态

```typescript
// ProviderPanel 状态
interface ProviderPanelState {
    mode: 'list' | 'create' | 'edit';
    editingId: string | null;
    isSubmitting: boolean;
    deleteConfirmId: string | null;
}

// ProviderForm 状态
interface ProviderFormState {
    name: string;
    type: 'openai' | 'anthropic';
    apiKey: string;
    baseUrl: string;
    showApiKey: boolean;
    isValidating: boolean;
    validationError: string | null;
    errors: Record<string, string>;
}
```

---

## 安全方案

### API Key 加密存储

```typescript
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

// 从环境变量获取加密密钥（32 bytes）
const ENCRYPTION_KEY = scryptSync(process.env.PROVIDER_ENCRYPTION_KEY || 'default-key-please-change', 'salt', 32);

const ALGORITHM = 'aes-256-gcm';

export function encryptApiKey(plaintext: string): {
    encrypted: string;
    iv: string;
    authTag: string;
} {
    const iv = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
    };
}

export function decryptApiKey(encrypted: string, iv: string, authTag: string): string {
    const decipher = createDecipheriv(ALGORITHM, ENCRYPTION_KEY, Buffer.from(iv, 'hex'));

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

export function maskApiKey(apiKey: string): string {
    if (apiKey.length <= 8) return '****';
    return `${apiKey.slice(0, 4)}${'*'.repeat(apiKey.length - 8)}${apiKey.slice(-4)}`;
}
```

### 安全检查清单

- [x] API Key 使用 AES-256-GCM 加密存储
- [x] 输入框默认遮蔽 API Key
- [x] 揭示 API Key 需要用户主动点击
- [x] 返回列表时 API Key 脱敏显示
- [x] 删除操作需要二次确认
- [ ] 可选：API Key 验证（调用 API 测试有效性）

---

## 状态管理

### React Query 配置

```typescript
// query-keys.ts
export const providerKeys = {
    all: ['providers'] as const,
    list: () => [...providerKeys.all, 'list'] as const,
    detail: (id: string) => [...providerKeys.all, 'detail', id] as const,
};

// hooks/useProviders.ts
export function useProviders() {
    return useQuery({
        queryKey: providerKeys.list(),
        queryFn: () => trpc.provider.list.query(),
        staleTime: 5 * 60 * 1000, // 5 分钟
    });
}

export function useCreateProvider() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: ProviderInput) => trpc.provider.create.mutate(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: providerKeys.list() });
        },
        onError: (error) => {
            toast.error(`创建失败: ${error.message}`);
        },
    });
}

export function useSetActiveProvider() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => trpc.provider.setActive.mutate({ id }),
        onSuccess: (data) => {
            // 乐观更新：更新缓存中的活跃状态
            queryClient.setQueryData(providerKeys.list(), (old: Provider[] | undefined) => {
                if (!old) return old;
                return old.map((p) => ({ ...p, isActive: p.id === data.id }));
            });
            toast.success(`已切换到 ${data.name}`);
        },
    });
}
```

---

## 错误处理

### 错误类型

| 错误场景         | 错误码                | 用户提示                           |
| ---------------- | --------------------- | ---------------------------------- |
| 名称已存在       | BAD_REQUEST           | "提供商名称已存在，请使用其他名称" |
| API Key 格式无效 | BAD_REQUEST           | "API Key 格式不正确"               |
| URL 格式无效     | BAD_REQUEST           | "请输入有效的 URL"                 |
| 提供商不存在     | NOT_FOUND             | "提供商不存在或已被删除"           |
| 网络错误         | INTERNAL_SERVER_ERROR | "网络错误，请稍后重试"             |
| 加密/解密失败    | INTERNAL_SERVER_ERROR | "配置保存失败，请联系管理员"       |

### 前端错误边界

```tsx
import { ErrorBoundary } from 'react-error-boundary';

function ProviderPanelFallback({ error, resetErrorBoundary }) {
    return (
        <div className="p-4 text-center">
            <p className="text-red-500">加载提供商配置失败</p>
            <p className="text-sm text-gray-500">{error.message}</p>
            <button onClick={resetErrorBoundary} className="mt-2 btn btn-primary">
                重试
            </button>
        </div>
    );
}

// 使用
<ErrorBoundary FallbackComponent={ProviderPanelFallback}>
    <ProviderPanel />
</ErrorBoundary>;
```

---

## 实现任务清单

### 后端 (zen-swarm/src/server/)

1. [ ] 创建 SQLite migration 文件 (`001_add_providers_table.sql`)
2. [ ] 创建加密工具 (`utils/encryption.ts`)
3. [ ] 创建 Zod schema (`routers/provider/schema.ts`)
4. [ ] 创建 tRPC provider router (`routers/provider/index.ts`)
5. [ ] 集成到主 router (`routers/_app.ts`)
6. [ ] 实现环境变量迁移逻辑 (`migrations/migrate-providers.ts`)

### 前端 (zen-swarm/src/ui/)

1. [ ] 创建 ProviderPanel 组件 (`components/ProviderPanel/index.tsx`)
2. [ ] 创建 ProviderList 组件 (`components/ProviderPanel/ProviderList.tsx`)
3. [ ] 创建 ProviderCard 组件 (`components/ProviderPanel/ProviderCard.tsx`)
4. [ ] 创建 ProviderForm 组件 (`components/ProviderPanel/ProviderForm.tsx`)
5. [ ] 创建 tRPC hooks (`hooks/useProviders.ts`)
6. [ ] 在主 UI 添加触发按钮

### 集成

1. [ ] 运行数据库迁移
2. [ ] 测试环境变量迁移
3. [ ] 测试 CRUD 操作
4. [ ] 测试活跃提供商切换
5. [ ] 测试 API Key 加密/解密

---

## 测试策略

### 单元测试

```typescript
// encryption.test.ts
describe('API Key Encryption', () => {
    it('should encrypt and decrypt correctly', () => {
        const original = 'sk-test-1234567890';
        const { encrypted, iv, authTag } = encryptApiKey(original);
        const decrypted = decryptApiKey(encrypted, iv, authTag);
        expect(decrypted).toBe(original);
    });

    it('should mask API key correctly', () => {
        expect(maskApiKey('sk-test-1234567890')).toBe('sk-t**********6789');
        expect(maskApiKey('short')).toBe('****');
    });
});

// provider-router.test.ts
describe('Provider Router', () => {
    it('should prevent duplicate names', async () => {
        // ...
    });

    it('should ensure only one active provider', async () => {
        // ...
    });
});
```

### 集成测试

```typescript
describe('Provider Panel E2E', () => {
  it('should create, edit, and delete provider', async () => {
    render(<ProviderPanel />);

    // 创建
    await userEvent.click(screen.getByText('新增提供商'));
    await userEvent.type(screen.getByLabelText('名称'), 'Test OpenAI');
    await userEvent.click(screen.getByLabelText('OpenAI'));
    await userEvent.type(screen.getByLabelText('API Key'), 'sk-test-123');
    await userEvent.click(screen.getByText('保存'));

    // 验证创建成功
    expect(screen.getByText('Test OpenAI')).toBeInTheDocument();

    // 删除
    await userEvent.click(screen.getByLabelText('删除'));
    await userEvent.click(screen.getByText('确认'));

    // 验证删除成功
    expect(screen.queryByText('Test OpenAI')).not.toBeInTheDocument();
  });
});
```

---

## 性能考虑

1. **缓存策略**: 使用 React Query 的 `staleTime` 减少不必要的重新获取
2. **懒加载**: Provider Panel 仅在打开时渲染
3. **乐观更新**: 设置活跃提供商时立即更新 UI
4. **防抖验证**: Base URL 输入框使用 debounce 验证

---

## 参考资料

- 现有面板组件: `zen-code/src/chat/components/ProviderPanel.tsx`
- tRPC 架构: `.claude/memories/zen-swarm-trpc-architecture/MEMORY.md`
- 配置系统: `packages/config/src/implementations/FileSystemConfigStore.ts`
- React Query 最佳实践: `.claude/skills/tanstack-query/SKILL.md`

---

## 变更日志

| 日期       | 版本 | 变更内容                                                             |
| ---------- | ---- | -------------------------------------------------------------------- |
| 2025-01-XX | 1.0  | 初始版本                                                             |
| 2025-01-XX | 1.1  | 添加：加密存储方案、迁移策略、验证规则、状态管理、错误处理、测试策略 |
