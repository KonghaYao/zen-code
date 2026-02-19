/**
 * App 主组件
 *
 * 路由 5 个主要视图：
 * - dashboard: DashboardView
 * - agent-config: AgentConfigView
 * - resources: ResourcesView
 * - cron: CronView
 * - chat: ChatView (全屏模式)
 */

import type { PanelType } from './types/index.js';
import { MainLayout } from './layouts/MainLayout.js';
import { DashboardView } from './views/DashboardView.js';
import { AgentConfigView } from './views/AgentConfigView.js';
import { ResourcesView } from './views/ResourcesView.js';
import { CronView } from './views/CronView.js';
import { ChatView } from './views/ChatView.js';

export function App() {
    return (
        <MainLayout>
            {(tab: PanelType) => {
                switch (tab) {
                    case 'dashboard':
                        return <DashboardView />;
                    case 'agent-config':
                        return <AgentConfigView />;
                    case 'resources':
                        return <ResourcesView />;
                    case 'cron':
                        return <CronView />;
                    case 'chat':
                        return <ChatView />;
                    default:
                        return <div>Unknown panel: {tab}</div>;
                }
            }}
        </MainLayout>
    );
}
