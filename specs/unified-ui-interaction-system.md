# 统一 UI 交互系统设计规范

**版本**: v2.0.0 (Layered Architecture) **状态**: ✅ 已实现（2026-03-06 验证 -
GlobalApprovalPanel 和 interaction 系统均已实现） **创建日期**: 2025-01-21 **最后更新**: 2025-01-21

---

## 📋 v2.0.0 核心变更

**从具体类型到分层可扩展架构**

v1.1.0 的问题：

- ❌ Approve 和 Select 是平行的具体类型，难以复用
- ❌ 添加新类型需要修改多处代码
- ❌ 渲染逻辑和数据结构耦合

v2.0.0 的改进：

- ✅ **多层架构** - 基础层 → 面板层 → 类型层
- ✅ **可插拔渲染器** - 新类型只需注册，无需修改核心
- ✅ **组合优先** - 通过组合实现复杂交互
- ✅ **未来就绪** - 轻松扩展自定义交互类型

---

## 1. 架构概览

### 1.1 分层设计

```
┌─────────────────────────────────────────────────────┐
│                   Application Layer                  │
│  (ask_user_with_options, terminal, custom_tools)    │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│              Interaction Registry Layer             │
│  - 注册交互类型                                      │
│  - 提供类型特定的配置                                │
│  - 管理渲染器生命周期                                │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│              Interaction Panel Layer                │
│  - UnifiedUIPanel (统一面板)                        │
│  - Tab 管理                                         │
│  - 批量操作                                         │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│              Base Interaction Layer                 │
│  - BaseInteraction (基础数据结构)                   │
│  - BaseRenderer (渲染器接口)                        │
│  - InteractionContext (状态管理)                    │
└─────────────────────────────────────────────────────┘
```

### 1.2 核心理念

**Approve 和 Ask 都是基础交互类型的扩展实现**

```typescript
// 基础层：定义通用的交互结构
interface BaseInteraction {
    id: string;
    category: InteractionCategory; // 'panel' | 'inline'
    state: InteractionState;
    metadata: InteractionMetadata;
    tool?: ToolRenderData;
}

// 面板层：审批和选择都是面板类型的扩展
interface PanelInteraction extends BaseInteraction {
    category: 'panel';
    config: PanelConfig; // 面板配置（标题、描述、图标等）
    content: InteractionContent; // 内容（选择器、输入框、审批项等）
}

// 类型层：具体的交互实现
type ApprovalInteraction = PanelInteraction & {
    content: {
        type: 'approval';
        toolCall: { name: string; args: any };
        editableFields?: string[];
    };
};

type SelectionInteraction = PanelInteraction & {
    content: {
        type: 'selection';
        options: Array<{ label: string; value: any }>;
        singleSelect: boolean;
        allowCustomInput: boolean;
    };
};
```

---

## 2. 核心概念（v2.0 分层版）

### 2.1 基础层 - BaseInteraction

最底层的抽象，定义所有交互的通用属性：

```typescript
// === 交互类别 ===
enum InteractionCategory {
    PANEL = 'panel', // 面板类型（显示在 UnifiedUIPanel）
    INLINE = 'inline', // 内联类型（直接在消息中显示）
    MODAL = 'modal', // 模态框类型（未来扩展）
}

// === 交互状态 ===
enum InteractionState {
    IDLE = 'idle',
    ACTIVE = 'active', // 正在交互
    SUBMITTED = 'submitted',
    CANCELLED = 'cancelled',
    EDITED = 'edited',
}

// === 基础交互接口 ===
interface BaseInteraction {
    // 唯一标识
    id: string;

    // 类别（决定在哪里显示）
    category: InteractionCategory;

    // 状态
    state: InteractionState;

    // 元数据（通用）
    metadata: {
        title?: string;
        description?: string;
        icon?: string;
        priority?: 'high' | 'medium' | 'low';
        groupKey?: string; // 用于分组
        messageIndex?: number;
    };

    // 关联的工具
    tool?: ToolRenderData<any, any>;

    // 时间戳
    createdAt: Date;
    updatedAt: Date;

    // 结果（任意类型，由具体类型定义）
    result?: any;

    // 内部标记
    resultSent?: boolean;
}

// === 交互内容类型 ===
type InteractionContent = ApprovalContent | SelectionContent | InputContent | ConfirmContent | CustomContent;
```

### 2.2 面板层 - PanelInteraction

面板类型的交互扩展，所有显示在 UnifiedUIPanel 的交互：

```typescript
// === 面板配置 ===
interface PanelConfig {
    // 布局配置
    layout?: {
        width?: number; // 宽度（百分比或像素）
        border?: boolean; // 是否显示边框
        padding?: number; // 内边距
    };

    // 交互配置
    interaction?: {
        autoSubmit?: boolean; // 是否自动提交
        allowSkip?: boolean; // 是否允许跳过
        showPreview?: boolean; // 是否显示预览
    };

    // 样式配置
    style?: {
        borderColor?: string; // 边框颜色
        backgroundColor?: string; // 背景色
    };
}

// === 面板交互接口 ===
interface PanelInteraction extends BaseInteraction {
    category: 'panel';
    config: PanelConfig;
    content: InteractionContent;
}

// === 内容类型定义 ===

// 1. 审批内容
interface ApprovalContent {
    type: 'approval';
    toolCall: { name: string; args: any };
    editableFields?: string[];
    actionLabels?: {
        approve?: string;
        edit?: string;
        reject?: string;
    };
}

// 2. 选择内容
interface SelectionContent {
    type: 'selection';
    options: Array<{ label: string; value: any; description?: string }>;
    singleSelect: boolean;
    allowCustomInput: boolean;
    placeholder?: string;
    maxSelections?: number; // 多选时的最大选择数
}

// 3. 输入内容
interface InputContent {
    type: 'input';
    inputType: 'text' | 'password' | 'number' | 'email';
    placeholder?: string;
    defaultValue?: string;
    multiline?: boolean;
    maxLength?: number;
    validation?: {
        pattern?: RegExp;
        minLength?: number;
        custom?: (value: string) => string | undefined;
    };
}

// 4. 确认内容
interface ConfirmContent {
    type: 'confirm';
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean; // 是否为危险操作（红色按钮）
}

// 5. 自定义内容（未来扩展）
interface CustomContent {
    type: 'custom';
    customType: string; // 自定义类型标识
    render: (content: CustomContent, onSubmit: (result: any) => void) => ReactElement;
    [key: string]: any; // 其他自定义属性
}
```

### 2.3 类型层 - 具体交互类型

通过组合基础类型实现具体的交互：

```typescript
// === 审批交互 ===
type ApprovalInteraction = PanelInteraction & {
    content: ApprovalContent;
    result?: {
        status: 'approved' | 'edited' | 'rejected';
        editedArgs?: any;
        message?: string;
    };
};

// === 选择交互 ===
type SelectionInteraction = PanelInteraction & {
    content: SelectionContent;
    result?: {
        selected: any[];
        customInput?: string;
    };
};

// === 输入交互 ===
type InputInteraction = PanelInteraction & {
    content: InputContent;
    result?: {
        value: string;
    };
};

// === 确认交互 ===
type ConfirmInteraction = PanelInteraction & {
    content: ConfirmContent;
    result?: {
        confirmed: boolean;
    };
};

// === 联合类型 ===
type AnyPanelInteraction = ApprovalInteraction | SelectionInteraction | InputInteraction | ConfirmInteraction;

type AnyInteraction = AnyPanelInteraction | BaseInteraction;
```

---

## 3. 渲染器系统（可插拔）

### 3.1 渲染器接口

所有渲染器实现统一的接口：

```typescript
// === 渲染器接口 ===
interface InteractionRenderer<TContent extends InteractionContent> {
    // 渲染器类型标识
    type: TContent['type'];

    // 渲染函数
    render: (
        interaction: PanelInteraction & { content: TContent },
        onChange: (updates: Partial<PanelInteraction>) => void,
    ) => ReactElement;

    // 验证函数（可选）
    validate?: (content: TContent) => string | undefined;

    // 默认配置（可选）
    defaultConfig?: Partial<PanelConfig>;
}

// === 渲染器注册表 ===
interface RendererRegistry {
    register<T extends InteractionContent>(type: T['type'], renderer: InteractionRenderer<T>): void;

    get<T extends InteractionContent>(type: T['type']): InteractionRenderer<T> | undefined;

    list(): InteractionContent['type'][];
}
```

### 3.2 内置渲染器实现

```typescript
// === 审批渲染器 ===
const ApprovalRenderer: InteractionRenderer<ApprovalContent> = {
  type: 'approval',

  render(interaction, onChange) {
    const { content, state } = interaction;

    const handleApprove = () => {
      onChange({
        state: InteractionState.SUBMITTED,
        result: { status: 'approved' },
      });
    };

    const handleEdit = (editedArgs: any) => {
      onChange({
        state: InteractionState.EDITED,
        result: { status: 'edited', editedArgs },
      });
    };

    const handleReject = (message: string) => {
      onChange({
        state: InteractionState.CANCELLED,
        result: { status: 'rejected', message },
      });
    };

    return (
      <ApprovalItem
        toolCall={content.toolCall}
        editableFields={content.editableFields}
        actionLabels={content.actionLabels}
        onApprove={handleApprove}
        onEdit={handleEdit}
        onReject={handleReject}
      />
    );
  },

  defaultConfig: {
    layout: {
      border: true,
      padding: 1,
    },
    interaction: {
      allowSkip: false,
    },
  },
};

// === 选择渲染器 ===
const SelectionRenderer: InteractionRenderer<SelectionContent> = {
  type: 'selection',

  render(interaction, onChange) {
    const { content, metadata } = interaction;
    const [selected, setSelected] = useState<any[]>([]);
    const [customInput, setCustomInput] = useState('');

    const handleSubmit = () => {
      onChange({
        state: InteractionState.SUBMITTED,
        result: { selected, customInput },
      });
    };

    return (
      <Box flexDirection="column" paddingX={1}>
        {metadata?.title && (
          <Text color="cyan" bold>{metadata.title}</Text>
        )}
        {metadata?.description && (
          <Text dimColor>{metadata.description}</Text>
        )}

        <MultiSelectPro
          options={content.options}
          singleSelect={content.singleSelect}
          maxSelections={content.maxSelections}
          onChange={setSelected}
          onSubmit={handleSubmit}
        />

        {content.allowCustomInput && (
          <EnhancedTextInput
            value={customInput}
            onChange={setCustomInput}
            onSubmit={handleSubmit}
            placeholder={content.placeholder || 'Type custom option...'}
          />
        )}
      </Box>
    );
  },

  validate(content) {
    if (content.options.length === 0) {
      return 'At least one option is required';
    }
    if (content.singleSelect && content.maxSelections && content.maxSelections > 1) {
      return 'Single select cannot have maxSelections > 1';
    }
  },

  defaultConfig: {
    layout: {
      border: true,
      padding: 1,
    },
    interaction: {
      autoSubmit: false,
    },
  },
};

// === 输入渲染器 ===
const InputRenderer: InteractionRenderer<InputContent> = {
  type: 'input',

  render(interaction, onChange) {
    const { content } = interaction;
    const [value, setValue] = useState(content.defaultValue || '');

    const handleSubmit = () => {
      onChange({
        state: InteractionState.SUBMITTED,
        result: { value },
      });
    };

    const Component = content.multiline ? EnhancedTextInput : TextInput;

    return (
      <Box flexDirection="column" paddingX={1}>
        <Component
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          placeholder={content.placeholder}
          type={content.inputType}
          maxLength={content.maxLength}
        />
      </Box>
    );
  },

  validate(content) {
    if (content.validation?.pattern && content.defaultValue) {
      if (!content.validation.pattern.test(content.defaultValue)) {
        return 'Input does not match required pattern';
      }
    }
  },
};

// === 确认渲染器 ===
const ConfirmRenderer: InteractionRenderer<ConfirmContent> = {
  type: 'confirm',

  render(interaction, onChange) {
    const { content } = interaction;

    const handleConfirm = () => {
      onChange({
        state: InteractionState.SUBMITTED,
        result: { confirmed: true },
      });
    };

    const handleCancel = () => {
      onChange({
        state: InteractionState.CANCELLED,
        result: { confirmed: false },
      });
    };

    return (
      <Box flexDirection="column" paddingX={1}>
        <Text>{content.message}</Text>

        <Box marginTop={1}>
          <Button onPress={handleConfirm}>
            {content.confirmLabel || 'Confirm'}
          </Button>
          <Button onPress={handleCancel}>
            {content.cancelLabel || 'Cancel'}
          </Button>
        </Box>
      </Box>
    );
  },
};
```

### 3.3 渲染器注册

```typescript
// === 全局渲染器注册表 ===
class GlobalRendererRegistry implements RendererRegistry {
  private renderers = new Map<InteractionContent['type'], InteractionRenderer<any>>();

  register<T extends InteractionContent>(
    type: T['type'],
    renderer: InteractionRenderer<T>
  ) {
    this.renderers.set(type, renderer);
  }

  get<T extends InteractionContent>(type: T['type']) {
    return this.renderers.get(type) as InteractionRenderer<T> | undefined;
  }

  list() {
    return Array.from(this.renderers.keys());
  }
}

// === 初始化默认渲染器 ===
const defaultRegistry = new GlobalRendererRegistry();

// 注册内置渲染器
defaultRegistry.register('approval', ApprovalRenderer);
defaultRegistry.register('selection', SelectionRenderer);
defaultRegistry.register('input', InputRenderer);
defaultRegistry.register('confirm', ConfirmRenderer);

// 导出注册表实例
export const rendererRegistry = defaultRegistry;

// === 扩展：注册自定义渲染器 ===
// 用户可以在应用启动时注册自定义渲染器
rendererRegistry.register('my-custom-type', {
  type: 'my-custom-type',
  render: (interaction, onChange) => {
    // 自定义渲染逻辑
    return <MyCustomUI />;
  },
  defaultConfig: {
    layout: { border: true },
  },
});
```

---

## 4. InteractionContext（简化版）

```typescript
interface InteractionContextValue {
    // 添加交互
    addInteraction: (
        content: InteractionContent,
        options?: {
            tool?: ToolRenderData<any, any>;
            metadata?: Partial<InteractionMetadata>;
            config?: Partial<PanelConfig>;
        },
    ) => PanelInteraction;

    // 更新交互
    updateInteraction: (id: string, updates: Partial<PanelInteraction>) => void;

    // 移除交互
    removeInteraction: (id: string) => void;

    // 查询
    getInteraction: (id: string) => AnyInteraction | undefined;
    getInteractions: () => AnyInteraction[];
    getInteractionsByState: (state: InteractionState) => AnyInteraction[];
    getInteractionsByContent: <T extends InteractionContent['type']>(
        type: T,
    ) => Array<PanelInteraction & { content: InteractionContent & { type: T } }>;

    // 批量操作
    submitInteractions: () => Promise<void>;
    clearCompleted: () => void;

    // 状态
    hasPendingInteractions: boolean;
    allInteractionsProcessed: boolean;
}
```

---

## 5. UnifiedUIPanel（通用面板）

```typescript
export const UnifiedUIPanel: React.FC = () => {
  const ctx = useInteractionContext();
  const [activeTab, setActiveTab] = useState('pending');

  // 固定 Tabs 定义
  const TABS = [
    {
      id: 'pending',
      label: 'Pending',
      filter: (i: AnyInteraction) => i.state === InteractionState.IDLE,
      icon: '⏳',
    },
    {
      id: 'approvals',
      label: 'Approvals',
      filter: (i: AnyInteraction) =>
        i.category === 'panel' &&
        (i as PanelInteraction).content.type === 'approval',
      icon: '✅',
    },
    {
      id: 'selections',
      label: 'Selections',
      filter: (i: AnyInteraction) =>
        i.category === 'panel' &&
        (i as PanelInteraction).content.type === 'selection',
      icon: '📋',
    },
    {
      id: 'completed',
      label: 'Completed',
      filter: (i: AnyInteraction) =>
        i.state === InteractionState.SUBMITTED ||
        i.state === InteractionState.EDITED ||
        i.state === InteractionState.CANCELLED,
      icon: '✓',
    },
  ];

  // 获取当前 tab 的交互
  const currentInteractions = useMemo(() => {
    const tab = TABS.find(t => t.id === activeTab);
    return tab ? ctx.getInteractions().filter(tab.filter) : [];
  }, [activeTab, ctx.getInteractions()]);

  // 通用交互渲染器
  const renderInteraction = (interaction: AnyInteraction) => {
    if (interaction.category !== 'panel') {
      return <Text>Non-panel interaction: {interaction.category}</Text>;
    }

    const panelInteraction = interaction as PanelInteraction;
    const renderer = rendererRegistry.get(panelInteraction.content.type);

    if (!renderer) {
      return <Text color="red">Unknown renderer: {panelInteraction.content.type}</Text>;
    }

    return (
      <InteractionRendererWrapper
        key={interaction.id}
        interaction={panelInteraction}
        renderer={renderer}
        onChange={(updates) => ctx.updateInteraction(interaction.id, updates)}
      />
    );
  };

  return (
    <Box flexDirection="column">
      <Box justifyContent="space-between">
        <Text color="cyan" bold>Interactions</Text>
        {ctx.hasPendingInteractions && (
          <Text color="yellow">Ctrl+E to submit all</Text>
        )}
      </Box>

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        items={TABS.map(tab => ({
          id: tab.id,
          label: `${tab.icon} ${tab.label} (${ctx.getInteractions().filter(tab.filter).length})`,
        }))}
      />

      <Box flexDirection="column" paddingY={1}>
        {currentInteractions.map(renderInteraction)}
      </Box>
    </Box>
  );
};

// 渲染器包装器
const InteractionRendererWrapper: React.FC<{
  interaction: PanelInteraction;
  renderer: InteractionRenderer<any>;
  onChange: (updates: Partial<PanelInteraction>) => void;
}> = ({ interaction, renderer, onChange }) => {
  // 应用默认配置
  const config = {
    ...renderer.defaultConfig,
    ...interaction.config,
  };

  return (
    <Box
      borderStyle={config.layout?.border ? 'single' : undefined}
      paddingX={config.layout?.padding}
      marginBottom={1}
    >
      {renderer.render(
        { ...interaction, config },
        onChange
      )}
    </Box>
  );
};
```

---

## 6. 工具集成（简化 API）

### 6.1 声明式配置

```typescript
export const ask_user_with_options = createUITool({
  name: 'ask_user_with_options',
  parameters: ask_user_with_options_config.schema.shape,
  handler: ToolManager.waitForUIDone,

  // ⭐ v2.0: 声明内容而非完整类型
  interaction: (input, tool) => ({
    content: {
      type: 'selection',
      options: input.options.map(o => ({ label: o.label, value: o.label })),
      singleSelect: input.type === 'single_select',
      allowCustomInput: input.allow_custom_input ?? true,
      placeholder: input.placeholder,
    },
    metadata: {
      title: input.description || 'Select an option',
      groupKey: 'user-input',
    },
  }),

  preview: (tool) => (
    <Box>
      <Text color="yellow">⏳ Waiting for selection...</Text>
    </Box>
  ),
});
```

### 6.2 审批工具

```typescript
const TerminalContent = ({ tool }) => {
  const { addInteraction } = useInteractionContext();
  const interrupt = tool.getHumanInTheLoopData();

  useEffect(() => {
    if (interrupt?.reviewConfig && tool.state === 'interrupted') {
      addInteraction(
        {
          type: 'approval',
          toolCall: { name: tool.message.name!, args: tool.getInputRepaired() },
          editableFields: ['args'],
        },
        {
          tool,
          metadata: {
            title: `Approve ${tool.message.name}`,
            description: interrupt.reviewConfig.description,
            groupKey: 'approvals',
          },
        }
      );
    }
  }, [interrupt, tool, addInteraction]);

  return <InputPreviewer content={tool.getInputRepaired()} />;
};
```

---

## 7. 扩展新交互类型

### 7.1 添加自定义内容类型

```typescript
// 1. 定义内容类型
interface FilePickerContent {
  type: 'file-picker';
  accept?: string;  // 文件类型
  multiple?: boolean;
  maxFiles?: number;
}

// 2. 定义交互类型
type FilePickerInteraction = PanelInteraction & {
  content: FilePickerContent;
  result?: {
    files: string[];  // 文件路径数组
  };
};

// 3. 实现渲染器
const FilePickerRenderer: InteractionRenderer<FilePickerContent> = {
  type: 'file-picker',

  render(interaction, onChange) {
    const { content } = interaction;
    const [files, setFiles] = useState<string[]>([]);

    const handleSelect = () => {
      // 文件选择逻辑
      onChange({
        state: InteractionState.SUBMITTED,
        result: { files },
      });
    };

    return (
      <Box>
        <Text>Select files...</Text>
        <Button onPress={handleSelect}>Browse</Button>
      </Box>
    );
  },
};

// 4. 注册渲染器
rendererRegistry.register('file-picker', FilePickerRenderer);

// 5. 使用
export const file_picker_tool = createUITool({
  name: 'file_picker_tool',
  interaction: () => ({
    content: {
      type: 'file-picker',
      accept: '.ts,.js,.json',
      multiple: true,
      maxFiles: 5,
    },
    metadata: {
      title: 'Select files to process',
    },
  }),
});
```

---

## 8. v2.0 vs v1.1 对比

| 维度           | v1.1.0       | v2.0.0       | 改进     |
| -------------- | ------------ | ------------ | -------- |
| **架构**       | 具体类型平行 | 多层分层     | 可扩展   |
| **添加新类型** | 修改多处     | 注册渲染器   | 插件化   |
| **代码复用**   | 重复代码多   | 组合优先     | DRY      |
| **渲染逻辑**   | 耦合在类型中 | 可插拔渲染器 | 解耦     |
| **扩展性**     | 难以扩展     | 轻松扩展     | 未来就绪 |

---

## 9. 实现路径（v2.0）

### Sprint 1: 基础层

- [ ] 定义 BaseInteraction 和 InteractionCategory
- [ ] 定义 InteractionContent 联合类型
- [ ] 实现 InteractionContext
- [ ] 单元测试

### Sprint 2: 面板层

- [ ] 定义 PanelInteraction 和 PanelConfig
- [ ] 实现内置内容类型（Approval、Selection、Input、Confirm）
- [ ] 实现渲染器接口和注册表
- [ ] 集成测试

### Sprint 3: 渲染器

- [ ] 实现 ApprovalRenderer
- [ ] 实现 SelectionRenderer
- [ ] 实现 InputRenderer
- [ ] 实现 ConfirmRenderer
- [ ] 渲染器测试

### Sprint 4: 面板组件

- [ ] 实现 UnifiedUIPanel
- [ ] 实现 InteractionRendererWrapper
- [ ] 固定 Tabs 结构
- [ ] 批量操作

### Sprint 5: 工具集成和扩展

- [ ] 迁移 ask_user_with_options
- [ ] 迁移 terminal 工具
- [ ] 扩展性测试（添加自定义类型）
- [ ] 文档和示例

---

## 10. 关键优势

✅ **可扩展** - 添加新类型只需注册渲染器 ✅ **可组合** - 通过组合实现复杂交互 ✅ **可维护** - 关注点分离，职责清晰 ✅
**类型安全** - 完整的类型定义 ✅ **向后兼容** - 保留旧 API 适配器

---

**状态**: ✅ v2.0.0 分层可扩展架构设计完成
