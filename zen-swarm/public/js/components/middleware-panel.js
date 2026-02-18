/**
 * Middleware Panel - Pure JavaScript Version
 */

// State management
let middlewares = [];
let loading = false;
let error = null;
let showModal = false;
let editingId = null;
let formData = {
    id: '',
    name: '',
    type: '',
    config: '',
};

// Render panel
export function renderMiddlewarePanel() {
    setTimeout(loadMiddlewares, 0);
    return `
        <div class="space-y-6" id="middleware-panel">
            <div class="flex justify-between items-center">
                <h2 class="text-xl font-semibold">Middlewares (<span id="middleware-count">0</span>)</h2>
                <button
                    id="btn-create-middleware"
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                >
                    + Create Middleware
                </button>
            </div>
            <div id="middleware-content">
                <div class="text-center py-8 text-gray-400">Loading...</div>
            </div>
        </div>
    `;
}

// Get type badge class
function getTypeBadge(type) {
    const badges = {
        mcp: 'bg-blue-900/50 text-blue-300',
        memories: 'bg-purple-900/50 text-purple-300',
        skills: 'bg-green-900/50 text-green-300',
        subagents: 'bg-yellow-900/50 text-yellow-300',
        agents_md: 'bg-pink-900/50 text-pink-300',
    };
    return badges[type] || 'bg-gray-700 text-gray-300';
}

// Load middlewares
async function loadMiddlewares() {
    loading = true;
    error = null;
    renderMiddlewaresContent();

    try {
        middlewares = await window.apiClient.middlewares.list.query();
        loading = false;
        renderMiddlewaresContent();
        setupMiddlewareEventListeners();
    } catch (err) {
        loading = false;
        error = err.message;
        renderMiddlewaresContent();
    }
}

// Render middlewares content
function renderMiddlewaresContent() {
    const content = document.getElementById('middleware-content');
    if (!content) return;

    if (loading) {
        content.innerHTML = '<div class="text-center py-8 text-gray-400">Loading...</div>';
        return;
    }

    if (error) {
        content.innerHTML = `<div class="text-center py-8 text-red-400">Error: ${window.escapeHtml(error)}</div>`;
        return;
    }

    if (middlewares.length === 0) {
        content.innerHTML = `
            <div class="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
                No middlewares yet. Create your first middleware!
            </div>
        `;
        return;
    }

    document.getElementById('middleware-count').textContent = middlewares.length;

    content.innerHTML = `
        <div class="grid gap-4" id="middleware-list">
            ${middlewares
                .map(
                    (middleware) => `
                <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <h3 class="text-lg font-medium text-white">${window.escapeHtml(middleware.name)}</h3>
                                <span class="px-2 py-0.5 text-xs rounded ${getTypeBadge(middleware.type)}">
                                    ${window.escapeHtml(middleware.type || 'custom')}
                                </span>
                            </div>
                            <p class="text-sm text-gray-500 mb-2">ID: ${window.escapeHtml(middleware.id)}</p>
                            ${
                                middleware.config
                                    ? `
                                <div class="bg-gray-900 rounded-md p-3 mt-2">
                                    <pre class="text-xs text-gray-400 overflow-x-auto">
                                        ${window.escapeHtml(JSON.stringify(middleware.config, null, 2))}
                                    </pre>
                                </div>
                            `
                                    : ''
                            }
                        </div>
                        <div class="flex gap-2">
                            <button
                                data-action="edit"
                                data-id="${window.escapeHtml(middleware.id)}"
                                class="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded btn-edit-middleware"
                            >
                                Edit
                            </button>
                            <button
                                data-action="delete"
                                data-id="${window.escapeHtml(middleware.id)}"
                                class="px-3 py-1 text-sm bg-red-900/50 hover:bg-red-800 text-red-300 rounded btn-delete-middleware"
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
function setupMiddlewareEventListeners() {
    const createBtn = document.getElementById('btn-create-middleware');
    if (createBtn) {
        createBtn.addEventListener('click', () => openModal());
    }

    document.querySelectorAll('.btn-edit-middleware').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const middleware = middlewares.find((m) => m.id === id);
            if (middleware) openModal(middleware);
        });
    });

    document.querySelectorAll('.btn-delete-middleware').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            handleDelete(id);
        });
    });
}

// Open modal
function openModal(middleware = null) {
    if (middleware) {
        editingId = middleware.id;
        formData = {
            id: middleware.id,
            name: middleware.name,
            type: middleware.type || '',
            config: middleware.config ? JSON.stringify(middleware.config, null, 2) : '',
        };
    } else {
        editingId = null;
        formData = { id: '', name: '', type: '', config: '' };
    }
    showModal = true;
    renderModal();
}

// Close modal
function closeModal() {
    showModal = false;
    editingId = null;
    const modal = document.getElementById('middleware-modal');
    if (modal) modal.remove();
}

// Handle delete
async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this middleware?')) return;
    try {
        await window.apiClient.middlewares.delete.mutate({ id });
        await loadMiddlewares();
    } catch (err) {
        alert('Failed to delete: ' + err.message);
    }
}

// Handle submit
async function handleSubmit(e) {
    e.preventDefault();

    let config;
    if (formData.config.trim()) {
        try {
            config = JSON.parse(formData.config);
        } catch (err) {
            alert('Invalid JSON config: ' + err.message);
            return;
        }
    }

    try {
        const data = {
            id: formData.id,
            name: formData.name,
            type: formData.type,
            config: config || null,
        };

        if (editingId) {
            await window.apiClient.middlewares.update.mutate({ ...data, id: editingId });
        } else {
            await window.apiClient.middlewares.create.mutate(data);
        }
        closeModal();
        await loadMiddlewares();
    } catch (err) {
        alert('Failed to save: ' + err.message);
    }
}

// Render modal
function renderModal() {
    const existingModal = document.getElementById('middleware-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'middleware-modal';
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 class="text-lg font-semibold mb-4">
                ${editingId ? 'Edit' : 'Create'} Middleware
            </h3>
            <form id="middleware-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-1">ID</label>
                    <input
                        type="text"
                        name="id"
                        value="${window.escapeHtml(formData.id)}"
                        ${editingId ? 'disabled' : 'required'}
                        class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., middleware-mcp"
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
                        placeholder="e.g., MCP Middleware"
                    />
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Type</label>
                    <select
                        name="type"
                        required
                        class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="mcp" ${formData.type === 'mcp' ? 'selected' : ''}>MCP</option>
                        <option value="memories" ${formData.type === 'memories' ? 'selected' : ''}>Memories</option>
                        <option value="skills" ${formData.type === 'skills' ? 'selected' : ''}>Skills</option>
                        <option value="subagents" ${formData.type === 'subagents' ? 'selected' : ''}>SubAgents</option>
                        <option value="agents_md" ${formData.type === 'agents_md' ? 'selected' : ''}>AgentsMd</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Configuration (JSON, optional)</label>
                    <textarea
                        name="config"
                        rows="6"
                        class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        placeholder='{\n  "enabled": true\n}'
                    >${window.escapeHtml(formData.config)}</textarea>
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
                    form="middleware-form"
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                    Save
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const form = modal.querySelector('#middleware-form');
    form.addEventListener('submit', handleSubmit);

    form.querySelectorAll('input, select, textarea').forEach((input) => {
        input.addEventListener('input', (e) => {
            formData[e.target.name] = e.target.value;
        });
    });

    document.getElementById('btn-cancel').addEventListener('click', closeModal);
}
