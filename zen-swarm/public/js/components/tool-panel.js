/**
 * Tool Panel - Pure JavaScript Version
 */

// State management
let tools = [];
let loading = false;
let error = null;
let showModal = false;
let editingId = null;
let formData = {
    id: '',
    name: '',
    description: '',
    parameters: '',
};

// Render panel
export function renderToolPanel() {
    setTimeout(loadTools, 0);
    return `
        <div class="space-y-6" id="tool-panel">
            <div class="flex justify-between items-center">
                <h2 class="text-xl font-semibold">Tools (<span id="tool-count">0</span>)</h2>
                <button
                    id="btn-create-tool"
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                >
                    + Create Tool
                </button>
            </div>
            <div id="tool-content">
                <div class="text-center py-8 text-gray-400">Loading...</div>
            </div>
        </div>
    `;
}

// Load tools
async function loadTools() {
    loading = true;
    error = null;
    renderToolsContent();

    try {
        tools = await window.apiClient.tools.list.query();
        loading = false;
        renderToolsContent();
        setupToolEventListeners();
    } catch (err) {
        loading = false;
        error = err.message;
        renderToolsContent();
    }
}

// Render tools content
function renderToolsContent() {
    const content = document.getElementById('tool-content');
    if (!content) return;

    if (loading) {
        content.innerHTML = '<div class="text-center py-8 text-gray-400">Loading...</div>';
        return;
    }

    if (error) {
        content.innerHTML = `<div class="text-center py-8 text-red-400">Error: ${window.escapeHtml(error)}</div>`;
        return;
    }

    if (tools.length === 0) {
        content.innerHTML = `
            <div class="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
                No tools yet. Create your first tool!
            </div>
        `;
        return;
    }

    document.getElementById('tool-count').textContent = tools.length;

    content.innerHTML = `
        <div class="grid gap-4" id="tool-list">
            ${tools
                .map(
                    (tool) => `
                <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
                    <div class="flex justify-between items-start">
                        <div class="flex-1 min-w-0">
                            <h3 class="text-lg font-medium text-white mb-1">${window.escapeHtml(tool.name)}</h3>
                            <p class="text-sm text-gray-500 mb-2">ID: ${window.escapeHtml(tool.id)}</p>
                            <p class="text-sm text-gray-400 mb-2">
                                ${window.escapeHtml(tool.description || 'No description')}
                            </p>
                            ${
                                tool.parameters
                                    ? `
                                <details class="mt-2">
                                    <summary class="text-xs text-gray-500 cursor-pointer">View Parameters</summary>
                                    <pre class="mt-1 p-2 bg-gray-900 rounded text-xs overflow-x-auto">
                                        ${window.escapeHtml(JSON.stringify(tool.parameters, null, 2))}
                                    </pre>
                                </details>
                            `
                                    : ''
                            }
                        </div>
                        <div class="flex gap-2">
                            <button
                                data-action="edit"
                                data-id="${window.escapeHtml(tool.id)}"
                                class="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded btn-edit-tool"
                            >
                                Edit
                            </button>
                            <button
                                data-action="delete"
                                data-id="${window.escapeHtml(tool.id)}"
                                class="px-3 py-1 text-sm bg-red-900/50 hover:bg-red-800 text-red-300 rounded btn-delete-tool"
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
function setupToolEventListeners() {
    const createBtn = document.getElementById('btn-create-tool');
    if (createBtn) {
        createBtn.addEventListener('click', () => openModal());
    }

    document.querySelectorAll('.btn-edit-tool').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const tool = tools.find((t) => t.id === id);
            if (tool) openModal(tool);
        });
    });

    document.querySelectorAll('.btn-delete-tool').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            handleDelete(id);
        });
    });
}

// Open modal
function openModal(tool = null) {
    if (tool) {
        editingId = tool.id;
        formData = {
            id: tool.id,
            name: tool.name,
            description: tool.description || '',
            parameters: tool.parameters ? JSON.stringify(tool.parameters, null, 2) : '',
        };
    } else {
        editingId = null;
        formData = { id: '', name: '', description: '', parameters: '' };
    }
    showModal = true;
    renderModal();
}

// Close modal
function closeModal() {
    showModal = false;
    editingId = null;
    const modal = document.getElementById('tool-modal');
    if (modal) modal.remove();
}

// Handle delete
async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this tool?')) return;
    try {
        await window.apiClient.tools.delete.mutate({ id });
        await loadTools();
    } catch (err) {
        alert('Failed to delete: ' + err.message);
    }
}

// Handle submit
async function handleSubmit(e) {
    e.preventDefault();

    let parameters;
    if (formData.parameters.trim()) {
        try {
            parameters = JSON.parse(formData.parameters);
        } catch (err) {
            alert('Invalid JSON parameters: ' + err.message);
            return;
        }
    }

    try {
        const data = {
            id: formData.id,
            name: formData.name,
            description: formData.description,
            parameters: parameters || null,
        };

        if (editingId) {
            await window.apiClient.tools.update.mutate({ ...data, id: editingId });
        } else {
            await window.apiClient.tools.create.mutate(data);
        }
        closeModal();
        await loadTools();
    } catch (err) {
        alert('Failed to save: ' + err.message);
    }
}

// Render modal
function renderModal() {
    const existingModal = document.getElementById('tool-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'tool-modal';
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 class="text-lg font-semibold mb-4">
                ${editingId ? 'Edit' : 'Create'} Tool
            </h3>
            <form id="tool-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-1">ID</label>
                    <input
                        type="text"
                        name="id"
                        value="${window.escapeHtml(formData.id)}"
                        ${editingId ? 'disabled' : 'required'}
                        class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., tool-read-file"
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
                        placeholder="e.g., Read File"
                    />
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Description</label>
                    <textarea
                        name="description"
                        rows="3"
                        class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Describe what this tool does"
                    >${window.escapeHtml(formData.description)}</textarea>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Parameters (JSON, optional)</label>
                    <textarea
                        name="parameters"
                        rows="6"
                        class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        placeholder='{\n  "type": "object",\n  "properties": {}\n}'
                    >${window.escapeHtml(formData.parameters)}</textarea>
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
                    form="tool-form"
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                    Save
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const form = modal.querySelector('#tool-form');
    form.addEventListener('submit', handleSubmit);

    form.querySelectorAll('input, textarea').forEach((input) => {
        input.addEventListener('input', (e) => {
            formData[e.target.name] = e.target.value;
        });
    });

    document.getElementById('btn-cancel').addEventListener('click', closeModal);
}
