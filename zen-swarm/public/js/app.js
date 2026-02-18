/**
 * Zen Swarm - Pure JavaScript Version
 * Using vanilla DOM manipulation
 */

// Import tRPC client
import { apiClient } from './api.js';

// Tab configuration
const tabs = [
    { id: 'agents', label: 'Agents', icon: '🤖' },
    { id: 'models', label: 'Models', icon: '🧠' },
    { id: 'prompts', label: 'Prompts', icon: '📝' },
    { id: 'tools', label: 'Tools', icon: '🔧' },
    { id: 'middlewares', label: 'Middlewares', icon: '🔌' },
    { id: 'mcp', label: 'MCP', icon: '🔗' },
];

// Active tab state
let activeTab = 'agents';

// Initialize app
function initApp() {
    renderHeader();
    renderTabs();
    renderMainContent();
    setupEventListeners();
}

// Render header
function renderHeader() {
    const header = document.createElement('header');
    header.className = 'bg-gray-800 border-b border-gray-700 px-6 py-4';
    header.innerHTML = `
        <div class="max-w-7xl mx-auto flex items-center justify-between">
            <h1 class="text-2xl font-bold text-white">Zen Swarm</h1>
            <span class="text-sm text-gray-400">Multi-Agent Dashboard</span>
        </div>
    `;
    document.getElementById('app').appendChild(header);
}

// Render tab navigation
function renderTabs() {
    const nav = document.createElement('nav');
    nav.className = 'bg-gray-800 border-b border-gray-700 px-6';
    nav.innerHTML = `
        <div class="max-w-7xl mx-auto flex space-x-1" id="tab-container">
            ${tabs
                .map(
                    (tab) => `
                <button
                    data-tab="${tab.id}"
                    class="tab-btn px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? 'tab-active text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'}"
                >
                    <span class="mr-2">${tab.icon}</span>
                    ${tab.label}
                </button>
            `,
                )
                .join('')}
        </div>
    `;
    document.getElementById('app').appendChild(nav);
}

// Render main content area
function renderMainContent() {
    const main = document.createElement('main');
    main.className = 'max-w-7xl mx-auto px-6 py-8';
    main.id = 'main-content';
    document.getElementById('app').appendChild(main);

    // Load initial panel
    loadPanel(activeTab);
}

// Setup event listeners
function setupEventListeners() {
    // Tab clicks
    document.querySelectorAll('.tab-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const tabId = e.currentTarget.dataset.tab;
            switchTab(tabId);
        });
    });
}

// Switch to a different tab
function switchTab(tabId) {
    if (tabId === activeTab) return;

    // Update active state
    activeTab = tabId;

    // Update tab styling
    document.querySelectorAll('.tab-btn').forEach((btn) => {
        const isActive = btn.dataset.tab === tabId;
        btn.className = `tab-btn px-4 py-3 text-sm font-medium transition-colors ${isActive ? 'tab-active text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'}`;
    });

    // Load new panel
    loadPanel(tabId);
}

// Load panel for active tab
async function loadPanel(tabId) {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = '<div class="text-center py-8 text-gray-400">Loading...</div>';

    try {
        switch (tabId) {
            case 'agents':
                const { renderAgentPanel } = await import('./components/agent-panel.js');
                mainContent.innerHTML = renderAgentPanel();
                break;
            case 'models':
                const { renderModelPanel } = await import('./components/model-panel.js');
                mainContent.innerHTML = renderModelPanel();
                break;
            case 'prompts':
                const { renderPromptPanel } = await import('./components/prompt-panel.js');
                mainContent.innerHTML = renderPromptPanel();
                break;
            case 'tools':
                const { renderToolPanel } = await import('./components/tool-panel.js');
                mainContent.innerHTML = renderToolPanel();
                break;
            case 'middlewares':
                const { renderMiddlewarePanel } = await import('./components/middleware-panel.js');
                mainContent.innerHTML = renderMiddlewarePanel();
                break;
            case 'mcp':
                const { renderMcpPanel } = await import('./components/mcp-panel.js');
                mainContent.innerHTML = renderMcpPanel();
                break;
        }
    } catch (error) {
        mainContent.innerHTML = `<div class="text-center py-8 text-red-400">Error: ${escapeHtml(error.message)}</div>`;
    }
}

// Helper: Escape HTML
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

// Make escapeHtml globally available
window.escapeHtml = escapeHtml;
window.apiClient = apiClient;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
