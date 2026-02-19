/**
 * App 主组件
 */

import type { PanelType } from './types/index.js';
import { MainLayout } from './layouts/MainLayout.js';
import { AgentPanel } from './components/panels/AgentPanel/index.js';
import { ModelsPanel } from './components/panels/ModelsPanel/index.js';
import { PromptsPanel } from './components/panels/PromptsPanel/index.js';
import { ToolsPanel } from './components/panels/ToolsPanel/index.js';
import { MiddlewaresPanel } from './components/panels/MiddlewaresPanel/index.js';
import { MCPPanel } from './components/panels/MCPPanel/index.js';
import { ChatPanel } from './components/ChatPanel.js';

export function App() {
    return (
        <MainLayout>
            {(tab: PanelType) => {
                switch (tab) {
                    case 'chat':
                        return <ChatPanel />;
                    case 'agents':
                        return <AgentPanel />;
                    case 'models':
                        return <ModelsPanel />;
                    case 'prompts':
                        return <PromptsPanel />;
                    case 'tools':
                        return <ToolsPanel />;
                    case 'middlewares':
                        return <MiddlewaresPanel />;
                    case 'mcp':
                        return <MCPPanel />;
                    default:
                        return <div>Unknown panel: {tab}</div>;
                }
            }}
        </MainLayout>
    );
}
