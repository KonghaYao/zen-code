// Components
import { AgentPanel } from './components/agent-panel.js';
import { ModelPanel } from './components/model-panel.js';
import { PromptPanel } from './components/prompt-panel.js';
import { ToolPanel } from './components/tool-panel.js';
import { MiddlewarePanel } from './components/middleware-panel.js';

const tabs = [
    { id: 'agents', label: 'Agents', icon: '🤖' },
    { id: 'models', label: 'Models', icon: '🧠' },
    { id: 'prompts', label: 'Prompts', icon: '📝' },
    { id: 'tools', label: 'Tools', icon: '🔧' },
    { id: 'middlewares', label: 'Middlewares', icon: '🔌' },
];

function App() {
    return `
    <div class="min-h-screen">
      <!-- Header -->
      <header class="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          <h1 class="text-2xl font-bold text-white">Zen Swarm</h1>
          <span class="text-sm text-gray-400">Multi-Agent Dashboard</span>
        </div>
      </header>

      <!-- Navigation Tabs -->
      <nav class="bg-gray-800 border-b border-gray-700 px-6">
        <div class="max-w-7xl mx-auto flex space-x-1">
          ${tabs
              .map(
                  (tab) => `
            <button
              data-tab="${tab.id}"
              onclick="setActiveTab('${tab.id}')"
              class="tab-btn px-4 py-3 text-sm font-medium transition-colors ${tab.id === 'agents' ? 'tab-active' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'}"
            >
              <span class="mr-2">${tab.icon}</span>
              ${tab.label}
            </button>
          `,
              )
              .join('')}
        </div>
      </nav>

      <!-- Main Content -->
      <main class="max-w-7xl mx-auto px-6 py-8">
        <div id="panel-content"></div>
      </main>
    </div>
  `;
}

// Tab switching
window.setActiveTab = async (tabId) => {
    // Update tab styling
    document.querySelectorAll('.tab-btn').forEach((btn) => {
        const isActive = btn.dataset.tab === tabId;
        btn.classList.toggle('tab-active', isActive);
        btn.classList.toggle('text-gray-400', !isActive);
    });

    // Load panel content
    await loadPanel(tabId);
};

// Load panel content
async function loadPanel(tab) {
    const container = document.getElementById('panel-content');
    container.innerHTML = '<div class="text-center py-8 text-gray-400">Loading...</div>';

    try {
        let panel;
        switch (tab) {
            case 'agents':
                panel = await AgentPanel();
                break;
            case 'models':
                panel = await ModelPanel();
                break;
            case 'prompts':
                panel = await PromptPanel();
                break;
            case 'tools':
                panel = await ToolPanel();
                break;
            case 'middlewares':
                panel = await MiddlewarePanel();
                break;
            default:
                panel = '<div class="text-center py-8 text-gray-400">Unknown tab</div>';
        }
        container.innerHTML = panel;
    } catch (error) {
        console.error('Failed to load panel:', error);
        container.innerHTML = `<div class="text-center py-8 text-red-400">Error: ${error.message}</div>`;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('app').innerHTML = App();
    loadPanel('agents');
});
