/**
 * Unauthorized - 401 未授权错误页面
 *
 * 当 token 缺失或无效时展示此页面。
 * 提示用户从服务器控制台获取正确的访问链接。
 */

export function Unauthorized() {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
            <div className="w-full max-w-md mx-4 text-center">
                {/* 图标 */}
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                        <svg
                            className="w-10 h-10 text-red-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                            />
                        </svg>
                    </div>
                </div>

                {/* 标题 */}
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">访问被拒绝</h1>
                <p className="text-gray-500 mb-8">缺少有效的访问令牌，无法连接到 Zen Swarm 服务。</p>

                {/* 提示卡片 */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-left">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <span className="text-base">🔑</span>
                        如何获取访问链接
                    </h2>
                    <ol className="space-y-2 text-sm text-gray-600">
                        <li className="flex gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-medium">
                                1
                            </span>
                            <span>打开启动 Zen Swarm 服务的终端窗口</span>
                        </li>
                        <li className="flex gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-medium">
                                2
                            </span>
                            <span>
                                找到以{' '}
                                <code className="bg-gray-100 px-1 rounded text-xs font-mono">🔑 Access URL:</code>{' '}
                                开头的日志行
                            </span>
                        </li>
                        <li className="flex gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-medium">
                                3
                            </span>
                            <span>复制完整 URL（包含 token 参数）并在浏览器中打开</span>
                        </li>
                    </ol>

                    {/* 示例 */}
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <p className="text-xs text-gray-400 mb-1">示例</p>
                        <code className="text-xs font-mono text-gray-600 break-all">
                            http://127.0.0.1:8124/ui?token=<span className="text-blue-500">abc123...</span>
                        </code>
                    </div>
                </div>

                {/* 底部提示 */}
                <p className="mt-6 text-xs text-gray-400">Token 在服务重启后会自动更新。</p>
            </div>
        </div>
    );
}
