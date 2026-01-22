import React, { useState } from 'react';
import { useAgent } from '../hooks/useAgent';

export function ChatPage() {
  const { messages, sendMessage, isLoading } = useAgent();
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(input);
    setInput('');
  };

  return (
    <div className="flex h-screen">
      {/* 侧边栏 */}
      <aside className="w-64 bg-gray-900 text-white p-4">
        <h2 className="text-xl font-bold mb-4">Zen Worker</h2>
        <nav className="space-y-2">
          <a href="/" className="block p-2 rounded hover:bg-gray-800">
            聊天
          </a>
          <a href="/config" className="block p-2 rounded hover:bg-gray-800">
            配置
          </a>
        </nav>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto p-4">
          {messages.map((msg, i) => (
            <div key={i} className="mb-4 p-3 bg-white rounded shadow">
              <div className="text-sm text-gray-500">{msg.role}</div>
              <div className="mt-1">{msg.content}</div>
            </div>
          ))}
          {isLoading && <div className="text-gray-500">思考中...</div>}
        </div>

        <div className="border-t p-4 bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 px-3 py-2 border rounded"
              placeholder="输入消息..."
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
            >
              发送
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
