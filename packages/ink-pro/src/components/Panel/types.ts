/**
 * 统一面板系统 - 类型定义
 */

/**
 * 面板过滤器
 */
export interface PanelFilter {
  id: string;
  label: string;
  predicate: (item: any) => boolean;
}

/**
 * 面板上下文 (传递给快捷键处理函数)
 */
export interface PanelContext<T> {
  items: T[];
  filteredItems: T[];
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  onClose: () => void;
}

/**
 * 面板快捷键处理函数类型
 */
export type PanelKeyHandler<T> = (context: PanelContext<T>) => void | Promise<void>;

/**
 * 面板快捷键映射
 */
export type PanelKeyMap<T> = Record<string, PanelKeyHandler<T>>;

/**
 * 面板配置接口
 */
export interface PanelConfig<T = any> {
  /** 面板唯一标识 */
  id: string;
  /** 面板标题 */
  title: string;
  /** 面板图标 (emoji) */
  icon: string;

  // 数据源
  /** 数据源函数 (同步或异步) */
  dataSource: () => Promise<T[]> | T[];

  // 搜索配置
  /** 是否启用搜索 */
  searchable?: boolean;
  /** 用于搜索的字段 (fuzzy search) */
  searchFields?: (keyof T)[];
  /** 搜索框占位符 */
  searchPlaceholder?: string;

  // 过滤配置
  /** 是否启用过滤 */
  filterable?: boolean;
  /** 过滤器列表 */
  filters?: PanelFilter[];
  /** 默认过滤器 ID */
  defaultFilter?: string;

  // 渲染配置
  /** 渲染每个列表项 */
  renderItem: (item: T, index: number, isSelected: boolean) => React.ReactNode;
  /** 空数据渲染 */
  renderEmpty?: () => React.ReactNode;

  // 交互配置
  /** 选择项回调 */
  onSelect?: (item: T) => void | Promise<void>;
  /** 删除项回调 */
  onDelete?: (item: T) => void | Promise<void>;
  /** 判断是否为当前选中项 */
  isSelected?: (item: T) => boolean;

  // 虚拟滚动配置
  /** 每项高度 (行数) */
  itemHeight: number;
  /** 可见数量 (默认 8) */
  visibleCount?: number;

  // 额外配置
  /** 显示总数 */
  showCount?: boolean;
  /** 显示状态信息 */
  showStatus?: boolean;
  /** 状态信息渲染函数 */
  statusInfo?: (items: T[]) => React.ReactNode;

  // 自定义快捷键
  keyMap?: PanelKeyMap<T>;
}

/**
 * 选择项基础接口
 */
export interface SelectableItem {
  id: string;
  label: string;
  description?: string;
  category?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * 虚拟滚动列表 Props
 */
export interface VirtualScrollListProps<T> {
  items: T[];
  selectedIndex: number;
  itemHeight: number;
  visibleCount?: number;
  renderItem: (item: T, index: number, isSelected: boolean) => React.ReactNode;
}

/**
 * 搜索栏 Props
 */
export interface SearchBarProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  activeFilter: string;
  filters?: PanelFilter[];
  onFilterChange: (filter: string) => void;
  placeholder: string;
  filteredCount: number;
  totalCount: number;
}

/**
 * 面板容器 Props
 */
export interface PanelContainerProps {
  title: string;
  icon: string;
  count?: number;
  children: React.ReactNode;
  statusInfo?: React.ReactNode
}

/**
 * 统一面板 Props
 */
export interface UniversalPanelProps<T> {
  config: PanelConfig<T>;
  onClose: () => void;
}
