/**
 * HistoryPage - 历史记录页面
 */

import { Button } from '../components/common/Button';

export function HistoryPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">历史记录</h2>
          <p className="text-gray-600 mt-1">查看和管理对话历史</p>
        </div>
        <Button variant="danger">
          清空历史
        </Button>
      </div>

      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">📜</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">历史记录功能开发中</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          历史记录功能将允许您查看、搜索和管理过去的对话。
        </p>
        <p className="text-sm text-gray-400 mt-4">敬请期待...</p>
      </div>
    </div>
  );
}
