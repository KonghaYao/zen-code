/**
 * Chat 独立路由组件
 *
 * 全屏聊天界面，不包含 Dock 布局
 */

import { ChatView } from '../views/ChatView.js';

export function ChatRoute() {
    return (
        <div className="h-screen w-screen overflow-hidden">
            <ChatView />
        </div>
    );
}
