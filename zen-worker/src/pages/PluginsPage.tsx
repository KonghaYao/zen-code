/**
 * PluginsPage - 插件管理页面
 */

import { Button } from '../components/common/Button';

export function PluginsPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">插件管理</h2>
          <p className="text-gray-600 mt-1">管理系统插件</p>
        </div>
        <Button>
          + 安装插件
        </Button>
      </div>

      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">🧩</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">插件功能开发中</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          插件系统将允许您扩展 Zen Worker 的功能，添加自定义工具和集成。
        </p>
        <p className="text-sm text-gray-400 mt-4">敬请期待...</p>
      </div>
    </div>
  );
}
