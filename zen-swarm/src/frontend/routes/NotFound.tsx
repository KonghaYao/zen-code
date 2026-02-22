/**
 * 404 页面组件
 */

export function NotFound() {
    return (
        <div className="h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
            <div className="text-center text-white">
                <h1 className="text-9xl font-bold mb-4 opacity-80">404</h1>
                <p className="text-2xl font-semibold mb-2">页面未找到</p>
                <p className="text-lg opacity-80 mb-8">您访问的页面不存在</p>
                <a
                    href="/"
                    className="inline-block px-8 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
                >
                    返回首页
                </a>
            </div>
        </div>
    );
}
