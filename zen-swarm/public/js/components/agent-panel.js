/**
 * Agent Panel - Pure JavaScript Version
 */

// State management
let agents = [];
let models = [];
let prompts = [];
let tools = [];
let middlewares = [];
let loading = false;
let error = null;
let showModal = false;
let editingId = null;
let formData = {
    id: '',
    name: '',
    description: '',
    system_prompt: '',
    model: '',
    tools: {},
    middleware: {},
};

// Render panel
export function renderAgentPanel() {
    setTimeout(loadAgents, 0);
    return `
        <div class="space-y-6" id="agent-panel">
            <div class="flex justify-between items-center">
                <h2 class="text-xl font-semibold">Agents (<span id="agent-count">0</span>)</h2>
                <button
                    id="btn-create-agent"
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                >
                    + Create Agent
                </button>
            </div>
            <div id="agent-content">
                <div class="text-center py-8 text-gray-400">Loading...</div>
            </div>
        </div>
    `;
}

// Load agents
async function loadAgents() {
    loading = true;
    error = null;
    renderAgentsContent();

    try {
        // Load all related data
        const [agentsData, modelsData, promptsData, toolsData, middlewaresData] = await Promise.all([
            window.apiClient.agents.list.query(),
            window.apiClient.models.list.query(),
            window.apiClient.prompts.list.query(),
            window.apiClient.tools.list.query(),
            window.apiClient.middlewares.list.query(),
        ]);

        agents = agentsData;
        models = modelsData;
        prompts = promptsData;
        tools = toolsData;
        middlewares = middlewaresData;

        loading = false;
        renderAgentsContent();
        setupAgentEventListeners();
    } catch (err) {
        loading = false;
        error = err.message;
        renderAgentsContent();
    }
}

// Render agents content
function renderAgentsContent() {
    const content = document.getElementById('agent-content');
    if (!content) return;

    if (loading) {
        content.innerHTML = '<div class="text-center py-8 text-gray-400">Loading...</div>';
        return;
    }

    if (error) {
        content.innerHTML = `<div class="text-center py-8 text-red-400">Error: ${window.escapeHtml(error)}</div>`;
        return;
    }

    if (agents.length === 0) {
        content.innerHTML = `
            <div class="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
                No agents yet. Create your first agent!
            </div>
        `;
        return;
    }

    document.getElementById('agent-count').textContent = agents.length;

    // Helper to get model name
    const getModelName = (modelId) => {
        const model = models.find((m) => m.id === modelId);
        return model ? model.model_name : modelId;
    };

    // Helper to get prompt name
    const getPromptName = (promptId) => {
        const prompt = prompts.find((p) => p.id === promptId);
        return prompt ? prompt.name : promptId;
    };

    content.innerHTML = `
        <div class="grid gap-4" id="agent-list">
            ${agents
                .map(
                    (agent) => `
                <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <h3 class="text-lg font-medium text-white mb-1">${window.escapeHtml(agent.name)}</h3>
                            <p class="text-sm text-gray-500 mb-2">ID: ${window.escapeHtml(agent.id)}</p>
                            <p class="text-sm text-gray-400 mb-2">
                                ${window.escapeHtml(agent.description || 'No description')}
                            </p>
                            <div class="flex flex-wrap gap-3 text-xs">
                                <div class="flex items-center gap-1">
                                    <span class="text-gray-500">Model:</span>
                                    <span class="text-blue-400">${window.escapeHtml(getModelName(agent.model))}</span>
                                </div>
                                <div class="flex items-center gap-1">
                                    <span class="text-gray-500">Prompt:</span>
                                    <span class="text-green-400">${window.escapeHtml(getPromptName(agent.system_prompt))}</span>
                                </div>
                            </div>
                            ${
                                Object.keys(agent.tools || {}).length > 0 ||
                                Object.keys(agent.middleware || {}).length > 0
                                    ? `
                                <div class="mt-3 flex flex-wrap gap-2">
                                    ${Object.keys(agent.tools || {})
                                        .map((toolId) => {
                                            const tool = tools.find((t) => t.id === toolId);
                                            return tool
                                                ? `<span class="px-2 py-0.5 bg-purple-900/50 text-purple-300 text-xs rounded">${window.escapeHtml(tool.name)}</span>`
                                                : '';
                                        })
                                        .join('')}
                                    ${Object.keys(agent.middleware || {})
                                        .map((midId) => {
                                            const mid = middlewares.find((m) => m.id === midId);
                                            return mid
                                                ? `<span class="px-2 py-0.5 bg-yellow-900/50 text-yellow-300 text-xs rounded">${window.escapeHtml(mid.name)}</span>`
                                                : '';
                                        })
                                        .join('')}
                                </div>
                            `
                                    : ''
                            }
                        </div>
                        <div class="flex gap-2">
                            <button
                                data-action="edit"
                                data-id="${window.escapeHtml(agent.id)}"
                                class="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded btn-edit-agent"
                            >
                                Edit
                            </button>
                            <button
                                data-action="delete"
                                data-id="${window.escapeHtml(agent.id)}"
                                class="px-3 py-1 text-sm bg-red-900/50 hover:bg-red-800 text-red-300 rounded btn-delete-agent"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            `,
                )
                .join('')}
        </div>
    `;
}

// Setup event listeners
function setupAgentEventListeners() {
    // Create button
    const createBtn = document.getElementById('btn-create-agent');
    if (createBtn) {
        createBtn.addEventListener('click', () => openModal());
    }

    // Edit buttons
    document.querySelectorAll('.btn-edit-agent').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const agent = agents.find((a) => a.id === id);
            if (agent) openModal(agent);
        });
    });

    // Delete buttons
    document.querySelectorAll('.btn-delete-agent').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            handleDelete(id);
        });
    });
}

// Open modal
function openModal(agent = null) {
    if (agent) {
        editingId = agent.id;
        formData = {
            id: agent.id,
            name: agent.name,
            description: agent.description || '',
            system_prompt: agent.system_prompt || '',
            model: agent.model || '',
            tools: agent.tools || {},
            middleware: agent.middleware || {},
        };
    } else {
        editingId = null;
        formData = { id: '', name: '', description: '', system_prompt: '', model: '', tools: {}, middleware: {} };
    }
    showModal = true;
    renderModal();
}

// Close modal
function closeModal() {
    showModal = false;
    editingId = null;
    const modal = document.getElementById('agent-modal');
    if (modal) modal.remove();
}

// Handle delete
async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this agent?')) return;
    try {
        await window.apiClient.agents.delete.mutate({ id });
        await loadAgents();
    } catch (err) {
        alert('Failed to delete: ' + err.message);
    }
}

// Handle submit
async function handleSubmit(e) {
    e.preventDefault();
    try {
        if (editingId) {
            await window.apiClient.agents.update.mutate(formData);
        } else {
            await window.apiClient.agents.create.mutate(formData);
        }
        closeModal();
        await loadAgents();
    } catch (err) {
        alert('Failed to save: ' + err.message);
    }
}

// Render modal
function renderModal() {
    // Remove existing modal
    const existingModal = document.getElementById('agent-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'agent-modal';
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 class="text-lg font-semibold mb-4">
                ${editingId ? 'Edit' : 'Create'} Agent
            </h3>
            <form id="agent-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-1">ID</label>
                    <input
                        type="text"
                        name="id"
                        value="${window.escapeHtml(formData.id)}"
                        ${editingId ? 'disabled' : 'required'}
                        class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., agent-coder"
                    />
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Name</label>
                    <input
                        type="text"
                        name="name"
                        value="${window.escapeHtml(formData.name)}"
                        required
                        class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Code Assistant"
                    />
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Description</label>
                    <textarea
                        name="description"
                        rows="2"
                        class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Describe what this agent does"
                    >${window.escapeHtml(formData.description)}</textarea>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Model</label>
                    <select
                        name="model"
                        required
                        class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Select a model...</option>
                        ${models
                            .map(
                                (m) => `
                            <option value="${window.escapeHtml(m.id)}" ${formData.model === m.id ? 'selected' : ''}>
                                ${window.escapeHtml(m.model_name)} (${window.escapeHtml(m.id)})
                            </option>
                        `,
                            )
                            .join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">System Prompt</label>
                    <select
                        name="system_prompt"
                        required
                        class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Select a prompt...</option>
                        ${prompts
                            .map(
                                (p) => `
                            <option value="${window.escapeHtml(p.id)}" ${formData.system_prompt === p.id ? 'selected' : ''}>
                                ${window.escapeHtml(p.name)} (${window.escapeHtml(p.id)})
                            </option>
                        `,
                            )
                            .join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Tools</label>
                    <div class="space-y-2 max-h-48 overflow-y-auto bg-gray-900 rounded-lg p-3">
                        ${tools.length === 0 ? '<p class="text-gray-500 text-sm">No tools available</p>' : ''}
                        ${tools
                            .map(
                                (tool) => `
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="tools"
                                    value="${window.escapeHtml(tool.id)}"
                                    ${formData.tools[tool.id] ? 'checked' : ''}
                                    class="w-4 h-4 bg-gray-700 border-gray-600 rounded"
                                />
                                <span class="text-sm">
                                    ${window.escapeHtml(tool.name)} <span class="text-gray-500">(${window.escapeHtml(tool.id)})</span>
                                </span>
                            </label>
                        `,
                            )
                            .join('')}
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Middlewares</label>
                    <div class="space-y-2 max-h-48 overflow-y-auto bg-gray-900 rounded-lg p-3">
                        ${middlewares.length === 0 ? '<p class="text-gray-500 text-sm">No middlewares available</p>' : ''}
                        ${middlewares
                            .map(
                                (mid) => `
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="middleware"
                                    value="${window.escapeHtml(mid.id)}"
                                    ${formData.middleware[mid.id] ? 'checked' : ''}
                                    class="w-4 h-4 bg-gray-700 border-gray-600 rounded"
                                />
                                <span class="text-sm">
                                    ${window.escapeHtml(mid.name)} <span class="text-gray-500">(${window.escapeHtml(mid.id)})</span>
                                </span>
                            </label>
                        `,
                            )
                            .join('')}
                    </div>
                </div>
            </form>
            <div class="flex justify-end gap-3 mt-6">
                <button
                    type="button"
                    id="btn-cancel"
                    class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    form="agent-form"
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                    Save
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Setup form event listeners
    const form = modal.querySelector('#agent-form');
    form.addEventListener('submit', handleSubmit);

    // Setup select change events
    form.querySelectorAll('select').forEach((select) => {
        select.addEventListener('change', (e) => {
            formData[e.target.name] = e.target.value;
        });
    });

    // Setup checkbox change events for tools and middleware
    form.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        checkbox.addEventListener('change', (e) => {
            const name = e.target.name;
            const value = e.target.value;
            const checked = e.target.checked;

            if (name === 'tools' || name === 'middleware') {
                if (checked) {
                    formData[name][value] = true;
                } else {
                    delete formData[name][value];
                }
            }
        });
    });

    // Setup text input events
    form.querySelectorAll('input[type="text"], textarea').forEach((input) => {
        input.addEventListener('input', (e) => {
            formData[e.target.name] = e.target.value;
        });
    });

    // Cancel button
    document.getElementById('btn-cancel').addEventListener('click', closeModal);
}
