# 变更检测策略详解

## Git Diff 策略

### 基本用法

```bash
# 检测最近 N 次提交的变更
git diff --name-only HEAD~10 -- '*.ts' '*.tsx'

# 检测两个分支之间的差异
git diff --name-only main..feature-branch -- '*.ts' '*.tsx'

# 检测指定时间范围的变更
git diff --name-only --since="2024-01-01" -- '*.ts' '*.tsx'
```

### 使用标签标记更新点

```bash
# 创建更新标签
git tag codebase-last-update

# 检测自上次更新后的变更
git diff --name-only codebase-last-update -- '*.ts' '*.tsx'

# 更新后移动标签
git tag -f codebase-last-update
```

### 获取变更详情

```bash
# 获取变更统计
git diff --stat HEAD~10 -- '*.ts' '*.tsx'

# 获取变更内容（用于分析）
git diff HEAD~10 -- 'packages/standard-agent/src/*.ts'
```

---

## 文件时间戳策略

### 原理

对比 `.codebase/*.md` 的修改时间与源文件，找出比文档更新的源文件。

### 实现

```bash
# 获取文档最后修改时间
find .codebase -name "*.md" -exec stat -f "%m %N" {} \; | sort -n

# 获取比文档新的源文件
find packages -name "*.ts" -newer .codebase/packages/standard-agent.md
```

### 局限性

- 无法检测文件内容是否真正有意义的变更
- Git 操作（如 checkout）可能改变时间戳
- 不如 Git Diff 精确

---

## 手动指定策略

### 适用场景

- 用户明确知道哪些模块需要更新
- 非 Git 项目
- 需要精确控制更新范围

### 用户输入格式

```
# 指定模块
/codebase-update packages/standard-agent packages/agent

# 指定文件
/codebase-update --files src/package.ts,src/repository.ts

# 指定提交范围
/codebase-update --since HEAD~5
```

---

## 依赖分析策略

### 静态分析

分析 import 语句，构建依赖图：

```typescript
// 简化的依赖分析
function analyzeDependencies(modulePath: string): string[] {
    const dependencies: string[] = [];
    const files = glob.sync(`${modulePath}/**/*.ts`);

    for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const imports = content.match(/import .* from ['"](.*)['"]/g) || [];

        for (const imp of imports) {
            const depPath = resolveImport(file, imp);
            if (depPath && !depPath.includes('node_modules')) {
                dependencies.push(depPath);
            }
        }
    }

    return dependencies;
}
```

### 传递性影响

当共享类型变更时，需要更新所有依赖它的模块：

```
packages/shared/types.ts 变更
    ↓
影响 packages/agent（直接依赖）
    ↓
影响 zen-code/src/chat（间接依赖）
```

---

## 优先级判断规则

### High Priority

- 文件新增/删除
- 公共接口签名变更
- 导出函数/类的参数或返回值变化
- 类型定义变更

### Medium Priority

- 新增导出函数/类
- 现有函数实现逻辑变更
- 配置项变更

### Low Priority

- 内部函数变更（非导出）
- 注释更新
- 代码格式化
- 测试文件变更

---

## 批量更新策略

### 分组处理

```typescript
interface UpdateBatch {
  priority: 'high' | 'medium' | 'low';
  modules: UpdatePlan[];
}

// 按优先级分组
const batches: UpdateBatch[] = [
  { priority: 'high', modules: [...] },
  { priority: 'medium', modules: [...] },
  { priority: 'low', modules: [...] },
];

// 先处理高优先级，再处理低优先级
for (const batch of batches) {
  await Promise.all(batch.modules.map(dispatchSubAgent));
}
```

### 并行限制

避免同时派发过多 SubAgent：

```typescript
const MAX_PARALLEL = 5;

async function processWithLimit(modules: UpdatePlan[]) {
    const results = [];
    for (let i = 0; i < modules.length; i += MAX_PARALLEL) {
        const batch = modules.slice(i, i + MAX_PARALLEL);
        const batchResults = await Promise.all(batch.map((m) => dispatchSubAgent(m)));
        results.push(...batchResults);
    }
    return results;
}
```
