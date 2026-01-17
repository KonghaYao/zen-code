/**
 * 统一面板系统 - 搜索和过滤 Hook
 */

import { useMemo, useState } from 'react';
import type { PanelFilter } from './types';

interface UsePanelSearchOptions<T> {
  items: T[];
  searchFields?: (keyof T)[];
  filters?: PanelFilter[];
  defaultFilter?: string;
}

interface UsePanelSearchResult {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  filteredItems: any[];
  hasActiveFilter: boolean;
  hasSearchTerm: boolean;
}

/**
 * 简单的 fuzzy search 实现 (避免引入额外依赖)
 */
function fuzzyMatch(searchTerm: string, text: string): boolean {
  const searchLower = searchTerm.toLowerCase();
  const textLower = text.toLowerCase();

  // 精确匹配
  if (textLower.includes(searchLower)) {
    return true;
  }

  // Fuzzy 匹配 (字符按顺序出现)
  let searchIndex = 0;
  for (const char of textLower) {
    if (char === searchLower[searchIndex]) {
      searchIndex++;
      if (searchIndex === searchLower.length) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 搜索和过滤 Hook
 */
export function usePanelSearch<T extends Record<string, any>>(
  options: UsePanelSearchOptions<T>
): UsePanelSearchResult {
  const { items, searchFields, filters, defaultFilter = 'all' } = options;

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState(defaultFilter);

  // 过滤
  const filteredByFilter = useMemo(() => {
    if (activeFilter === 'all' || !filters || filters.length === 0) {
      return items;
    }

    const filter = filters.find((f) => f.id === activeFilter);
    return filter ? items.filter(filter.predicate) : items;
  }, [items, activeFilter, filters]);

  // 搜索 (fuzzy search)
  const filteredItems = useMemo(() => {
    if (!searchTerm || !searchFields || searchFields.length === 0) {
      return filteredByFilter;
    }

    return filteredByFilter.filter((item) => {
      // 检查所有搜索字段
      return searchFields.some((field) => {
        const value = item[field];
        if (typeof value === 'string') {
          return fuzzyMatch(searchTerm, value);
        }
        return false;
      });
    });
  }, [searchTerm, filteredByFilter, searchFields]);

  const hasActiveFilter = activeFilter !== 'all';
  const hasSearchTerm = searchTerm.length > 0;

  return {
    searchTerm,
    setSearchTerm,
    activeFilter,
    setActiveFilter,
    filteredItems,
    hasActiveFilter,
    hasSearchTerm,
  };
}
