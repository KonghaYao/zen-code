/**
 * Prompt Panel - Pure JavaScript Version
 */

// State management
let prompts = [];
let loading = false;
let error = null;
let showModal = false;
let editingId = null;
let formData = {
    id: '',
    name: '',
    content: '',
    metadata: '',
};

// Render panel
export function renderPromptPanel() {
    setTimeout(loadPrompts, 0);
    return `
        <div class="space-y-6" id="prompt-panel">
            <div class="flex justify-between items-center">
                <h2 class="text-xl font-semibold">Prompts (<span id="prompt-count">0</span>)</h2>
                <button
                    id="btn-create-prompt"
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                >
                    + Create Prompt
                </button>
            </div>
            <div id="prompt-content">
                <div class="text-center py-8 text-gray-400">Loading...</div>
            </div>
        </div>
    `;
}

// Load prompts
async function loadPrompts() {
    loading = true;
    error = null;
    renderPromptsContent();

    try {
        prompts = await window.apiClient.prompts.list.query();
        loading = false;
        renderPromptsContent();
        setupPromptEventListeners();
    } catch (err) {
        loading = false;
        error = err.message;
        renderPromptsContent();
    }
}

// Render prompts content
function renderPromptsContent() {
    const content = document.getElementById('prompt-content');
    if (!content) return;

    if (loading) {
        content.innerHTML = '<div class="text-center py-8 text-gray-400">Loading...</div>';
        return;
    }

    if (error) {
        content.innerHTML = `<div class="text-center py-8 text-red-400">Error: ${window.escapeHtml(error)}</div>`;
        return;
    }

    if (prompts.length === 0) {
        content.innerHTML = `
            <div class="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
                No prompts yet. Create your first prompt!
            </div>
        `;
        return;
    }

    document.getElementById('prompt-count').textContent = prompts.length;

    content.innerHTML = `
        <div class="grid gap-4" id="prompt-list">
            ${prompts
                .map(
                    (prompt) => `
                <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <h3 class="text-lg font-medium text-white mb-1">${window.escapeHtml(prompt.name)}</h3>
                            <p class="text-sm text-gray-500 mb-2">ID: ${window.escapeHtml(prompt.id)}</p>
                            <div class="bg-gray-900 rounded-md p-3 mt-2">
                                <pre class="text-xs text-gray-400 overflow-x-auto">
                                    ${window.escapeHtml(prompt.content || '')}
                                </pre>
                            </div>
                            ${
                                prompt.metadata
                                    ? `
                                <details class="mt-2">
                                    <summary class="text-xs text-gray-500 cursor-pointer">View Metadata</summary>
                                    <pre class="mt-1 p-2 bg-gray-900 rounded text-xs overflow-x-auto">
                                        ${window.escapeHtml(JSON.stringify(prompt.metadata, null, 2))}
                                    </pre>
                                </details>
                            `
                                    : ''
                            }
                        </div>
                        <div class="flex gap-2">
                            <button
                                data-action="edit"
                                data-id="${window.escapeHtml(prompt.id)}"
                                class="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded btn-edit-prompt"
                            >
                                Edit
                            </button>
                            <button
                                data-action="delete"
                                data-id="${window.escapeHtml(prompt.id)}"
                                class="px-3 py-1 text-sm bg-red-900/50 hover:bg-red-800 text-red-300 rounded btn-delete-prompt"
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
function setupPromptEventListeners() {
    const createBtn = document.getElementById('btn-create-prompt');
    if (createBtn) {
        createBtn.addEventListener('click', () => openModal());
    }

    document.querySelectorAll('.btn-edit-prompt').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const prompt = prompts.find((p) => p.id === id);
            if (prompt) openModal(prompt);
        });
    });

    document.querySelectorAll('.btn-delete-prompt').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            handleDelete(id);
        });
    });
}

// Open modal
function openModal(prompt = null) {
    if (prompt) {
        editingId = prompt.id;
        formData = {
            id: prompt.id,
            name: prompt.name,
            content: prompt.content || '',
            metadata: prompt.metadata ? JSON.stringify(prompt.metadata, null, 2) : '',
        };
    } else {
        editingId = null;
        formData = { id: '', name: '', content: '', metadata: '' };
    }
    showModal = true;
    renderModal();
}

// Close modal
function closeModal() {
    showModal = false;
    editingId = null;
    const modal = document.getElementById('prompt-modal');
    if (modal) modal.remove();
}

// Handle delete
async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this prompt?')) return;
    try {
        await window.apiClient.prompts.delete.mutate({ id });
        await loadPrompts();
    } catch (err) {
        alert('Failed to delete: ' + err.message);
    }
}

// Handle submit
async function handleSubmit(e) {
    e.preventDefault();
    try {
        if (editingId) {
            await window.apiClient.prompts.update.mutate(formData);
        } else {
            await window.apiClient.prompts.create.mutate(formData);
        }
        closeModal();
        await loadPrompts();
    } catch (err) {
        alert('Failed to save: ' + err.message);
    }
}

// Render modal
function renderModal() {
    const existingModal = document.getElementById('prompt-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'prompt-modal';
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4">
            <h3 class="text-lg font-semibold mb-4">
                ${editingId ? 'Edit' : 'Create'} Prompt
            </h3>
            <form id="prompt-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-1">ID</label>
                    <input
                        type="text"
                        name="id"
                        value="${window.escapeHtml(formData.id)}"
                        ${editingId ? 'disabled' : 'required'}
                        class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., prompt-coding"
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
                        placeholder="e.g., Coding Assistant"
                    />
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Content</label>
                    <textarea
                        name="content"
                        rows="8"
                        required
                        class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        placeholder="Enter the prompt content"
                    >${window.escapeHtml(formData.content)}</textarea>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Metadata (JSON, optional)</label>
                    <textarea
                        name="metadata"
                        rows="4"
                        class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        placeholder='{"key": "value"}'
                    >${window.escapeHtml(formData.metadata)}</textarea>
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
                    form="prompt-form"
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                    Save
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const form = modal.querySelector('#prompt-form');
    form.addEventListener('submit', handleSubmit);

    form.querySelectorAll('input, textarea').forEach((input) => {
        input.addEventListener('input', (e) => {
            const name = e.target.name;
            const value = e.target.value;

            // Handle JSON metadata field
            if (name === 'metadata') {
                try {
                    formData[name] = value.trim() ? JSON.parse(value) : {};
                } catch (err) {
                    // Don't update on invalid JSON
                }
            } else {
                formData[name] = value;
            }
        });
    });

    document.getElementById('btn-cancel').addEventListener('click', closeModal);
}
