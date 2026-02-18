/**
 * MCP Panel - Pure JavaScript Version
 */

// State management
let mcpConfigs = [];
let loading = false;
let error = null;
let showModal = false;
let editingId = null;
let formData = {
    id: '',
    name: '',
    config: '',
    enabled: true,
};

// Render panel
export function renderMcpPanel() {
    setTimeout(loadMcpConfigs, 0);
    return `
        <div class="space-y-6" id="mcp-panel">
            <div class="flex justify-between items-center">
                <h2 class="text-xl font-semibold">MCP Configurations (<span id="mcp-count">0</span>)</h2>
                <button
                    id="btn-create-mcp"
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                >
                    + Add MCP Config
                </button>
            </div>
            <div id="mcp-content">
                <div class="text-center py-8 text-gray-400">Loading...</div>
            </div>
        </div>
    `;
}

// Load MCP configs
async function loadMcpConfigs() {
    loading = true;
    error = null;
    renderMcpContent();

    try {
        mcpConfigs = await window.apiClient.mcp.list.query();
        loading = false;
        renderMcpContent();
        setupMcpEventListeners();
    } catch (err) {
        loading = false;
        error = err.message;
        renderMcpContent();
    }
}

// Render MCP content
function renderMcpContent() {
    const content = document.getElementById('mcp-content');
    if (!content) return;

    if (loading) {
        content.innerHTML = '<div class="text-center py-8 text-gray-400">Loading...</div>';
        return;
    }

    if (error) {
        content.innerHTML = `<div class="text-center py-8 text-red-400">Error: ${window.escapeHtml(error)}</div>`;
        return;
    }

    if (mcpConfigs.length === 0) {
        content.innerHTML = `
            <div class="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
                No MCP configurations yet. Add your first MCP server!
            </div>
        `;
        return;
    }

    document.getElementById('mcp-count').textContent = mcpConfigs.length;

    content.innerHTML = `
        <div class="grid gap-4" id="mcp-list">
            ${mcpConfigs
                .map(
                    (mcp) => `
                <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <h3 class="text-lg font-medium text-white">${window.escapeHtml(mcp.name)}</h3>
                                <span class="px-2 py-0.5 text-xs rounded ${mcp.enabled ? 'bg-green-900/50 text-green-300' : 'bg-gray-700 text-gray-400'}">
                                    ${mcp.enabled ? 'Enabled' : 'Disabled'}
                                </span>
                            </div>
                            <p class="text-sm text-gray-500 mb-2">ID: ${window.escapeHtml(mcp.id)}</p>
                            <div class="bg-gray-900 rounded-md p-3 mt-2">
                                <pre class="text-xs text-gray-400 overflow-x-auto">
                                    ${window.escapeHtml(JSON.stringify(mcp.config, null, 2))}
                                </pre>
                            </div>
                        </div>
                        <div class="flex flex-col gap-2">
                            <button
                                data-action="toggle"
                                data-id="${window.escapeHtml(mcp.id)}"
                                data-enabled="${mcp.enabled}"
                                class="px-3 py-1 text-sm rounded ${mcp.enabled ? 'bg-yellow-900/50 hover:bg-yellow-800 text-yellow-300' : 'bg-green-900/50 hover:bg-green-800 text-green-300'} btn-toggle-mcp"
                            >
                                ${mcp.enabled ? 'Disable' : 'Enable'}
                            </button>
                            <button
                                data-action="edit"
                                data-id="${window.escapeHtml(mcp.id)}"
                                class="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded btn-edit-mcp"
                            >
                                Edit
                            </button>
                            <button
                                data-action="delete"
                                data-id="${window.escapeHtml(mcp.id)}"
                                class="px-3 py-1 text-sm bg-red-900/50 hover:bg-red-800 text-red-300 rounded btn-delete-mcp"
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
function setupMcpEventListeners() {
    const createBtn = document.getElementById('btn-create-mcp');
    if (createBtn) {
        createBtn.addEventListener('click', () => openModal());
    }

    document.querySelectorAll('.btn-edit-mcp').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const mcp = mcpConfigs.find((m) => m.id === id);
            if (mcp) openModal(mcp);
        });
    });

    document.querySelectorAll('.btn-delete-mcp').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            handleDelete(id);
        });
    });

    document.querySelectorAll('.btn-toggle-mcp').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            const currentEnabled = e.currentTarget.dataset.enabled === 'true';
            await handleToggle(id, !currentEnabled);
        });
    });
}

// Open modal
function openModal(mcp = null) {
    if (mcp) {
        editingId = mcp.id;
        formData = {
            id: mcp.id,
            name: mcp.name,
            config: JSON.stringify(mcp.config, null, 2),
            enabled: mcp.enabled,
        };
    } else {
        editingId = null;
        formData = {
            id: '',
            name: '',
            config: JSON.stringify(
                {
                    command: 'npx',
                    args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/files'],
                },
                null,
                2,
            ),
            enabled: true,
        };
    }
    showModal = true;
    renderModal();
}

// Close modal
function closeModal() {
    showModal = false;
    editingId = null;
    const modal = document.getElementById('mcp-modal');
    if (modal) modal.remove();
}

// Handle delete
async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this MCP configuration?')) return;
    try {
        await window.apiClient.mcp.delete.mutate({ id });
        await loadMcpConfigs();
    } catch (err) {
        alert('Failed to delete MCP configuration: ' + err.message);
    }
}

// Handle toggle
async function handleToggle(id, enabled) {
    try {
        const mcp = await window.apiClient.mcp.get.query({ id });
        await window.apiClient.mcp.update.mutate({
            id,
            name: mcp.name,
            config: mcp.config,
            enabled,
        });
        await loadMcpConfigs();
    } catch (err) {
        alert('Failed to toggle MCP configuration: ' + err.message);
    }
}

// Handle submit
async function handleSubmit(e) {
    e.preventDefault();

    let config;
    try {
        config = JSON.parse(formData.config);
    } catch (err) {
        alert('Invalid JSON configuration: ' + err.message);
        return;
    }

    try {
        const data = {
            id: formData.id,
            name: formData.name,
            config: config,
            enabled: formData.enabled,
        };

        if (editingId) {
            await window.apiClient.mcp.update.mutate({ ...data, id: editingId });
        } else {
            await window.apiClient.mcp.create.mutate(data);
        }
        closeModal();
        await loadMcpConfigs();
    } catch (err) {
        alert('Failed to save MCP configuration: ' + err.message);
    }
}

// Render modal
function renderModal() {
    const existingModal = document.getElementById('mcp-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'mcp-modal';
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4">
            <h3 class="text-lg font-semibold mb-4">
                ${editingId ? 'Edit' : 'Add'} MCP Configuration
            </h3>
            <form id="mcp-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-1">ID</label>
                    <input
                        type="text"
                        name="id"
                        value="${window.escapeHtml(formData.id)}"
                        ${editingId ? 'disabled' : 'required'}
                        class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., mcp-filesystem"
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
                        placeholder="e.g., Filesystem MCP"
                    />
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Configuration (JSON)</label>
                    <textarea
                        name="config"
                        rows="10"
                        class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        placeholder='{\n  "command": "npx",\n  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/files"]\n}'
                    >${window.escapeHtml(formData.config)}</textarea>
                </div>
                <div class="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="mcp-enabled"
                        name="enabled"
                        ${formData.enabled ? 'checked' : ''}
                        class="w-4 h-4 bg-gray-700 border-gray-600 rounded"
                    />
                    <label for="mcp-enabled" class="text-sm">Enable this MCP configuration</label>
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
                    form="mcp-form"
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                    Save
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const form = modal.querySelector('#mcp-form');
    form.addEventListener('submit', handleSubmit);

    form.querySelectorAll('input, textarea').forEach((input) => {
        input.addEventListener('input', (e) => {
            if (input.type === 'checkbox') {
                formData.enabled = input.checked;
            } else {
                formData[e.target.name] = e.target.value;
            }
        });
    });

    document.getElementById('btn-cancel').addEventListener('click', closeModal);
}
