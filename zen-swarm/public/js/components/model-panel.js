/**
 * Model Panel - Pure JavaScript Version
 */

// State management
let models = [];
let loading = false;
let error = null;
let showModal = false;
let editingId = null;
let formData = {
    id: '',
    model_name: '',
    model_provider: 'openai',
    temperature: 0.7,
    max_tokens: 4096,
    enable_thinking: false,
};

// Render panel
export function renderModelPanel() {
    setTimeout(loadModels, 0);
    return `
        <div class="space-y-6" id="model-panel">
            <div class="flex justify-between items-center">
                <h2 class="text-xl font-semibold">Models (<span id="model-count">0</span>)</h2>
                <button
                    id="btn-create-model"
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                >
                    + Create Model
                </button>
            </div>
            <div id="model-content">
                <div class="text-center py-8 text-gray-400">Loading...</div>
            </div>
        </div>
    `;
}

// Load models
async function loadModels() {
    loading = true;
    error = null;
    renderModelsContent();

    try {
        models = await window.apiClient.models.list.query();
        loading = false;
        renderModelsContent();
        setupModelEventListeners();
    } catch (err) {
        loading = false;
        error = err.message;
        renderModelsContent();
    }
}

// Get provider badge class
function getProviderBadge(provider) {
    const badges = {
        openai: 'bg-green-900/50 text-green-300',
        anthropic: 'bg-orange-900/50 text-orange-300',
        ollama: 'bg-purple-900/50 text-purple-300',
    };
    return badges[provider] || 'bg-gray-700 text-gray-300';
}

// Render models content
function renderModelsContent() {
    const content = document.getElementById('model-content');
    if (!content) return;

    if (loading) {
        content.innerHTML = '<div class="text-center py-8 text-gray-400">Loading...</div>';
        return;
    }

    if (error) {
        content.innerHTML = `<div class="text-center py-8 text-red-400">Error: ${window.escapeHtml(error)}</div>`;
        return;
    }

    if (models.length === 0) {
        content.innerHTML = `
            <div class="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
                No models yet. Add your first model!
            </div>
        `;
        return;
    }

    document.getElementById('model-count').textContent = models.length;

    content.innerHTML = `
        <div class="grid gap-4" id="model-list">
            ${models
                .map(
                    (model) => `
                <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <h3 class="text-lg font-medium text-white">${window.escapeHtml(model.model_name)}</h3>
                                <span class="px-2 py-0.5 text-xs rounded ${getProviderBadge(model.model_provider)}">
                                    ${window.escapeHtml(model.model_provider)}
                                </span>
                            </div>
                            <p class="text-sm text-gray-500 mb-2">ID: ${window.escapeHtml(model.id)}</p>
                            <div class="flex flex-wrap gap-2 text-xs">
                                <span class="text-gray-400">Temp: ${model.temperature ?? 0.7}</span>
                                <span class="text-gray-400">Max Tokens: ${model.max_tokens ?? 4096}</span>
                                ${model.enable_thinking ? '<span class="text-blue-400">Thinking</span>' : ''}
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <button
                                data-action="edit"
                                data-id="${window.escapeHtml(model.id)}"
                                class="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded btn-edit-model"
                            >
                                Edit
                            </button>
                            <button
                                data-action="delete"
                                data-id="${window.escapeHtml(model.id)}"
                                class="px-3 py-1 text-sm bg-red-900/50 hover:bg-red-800 text-red-300 rounded btn-delete-model"
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
function setupModelEventListeners() {
    // Create button
    const createBtn = document.getElementById('btn-create-model');
    if (createBtn) {
        createBtn.addEventListener('click', () => openModal());
    }

    // Edit buttons
    document.querySelectorAll('.btn-edit-model').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const model = models.find((m) => m.id === id);
            if (model) openModal(model);
        });
    });

    // Delete buttons
    document.querySelectorAll('.btn-delete-model').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            handleDelete(id);
        });
    });
}

// Open modal
function openModal(model = null) {
    if (model) {
        editingId = model.id;
        formData = {
            id: model.id,
            model_name: model.model_name,
            model_provider: model.model_provider,
            temperature: model.temperature ?? 0.7,
            max_tokens: model.max_tokens ?? 4096,
            enable_thinking: model.enable_thinking ?? false,
        };
    } else {
        editingId = null;
        formData = {
            id: '',
            model_name: '',
            model_provider: 'openai',
            temperature: 0.7,
            max_tokens: 4096,
            enable_thinking: false,
        };
    }
    showModal = true;
    renderModal();
}

// Close modal
function closeModal() {
    showModal = false;
    editingId = null;
    const modal = document.getElementById('model-modal');
    if (modal) modal.remove();
}

// Handle delete
async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this model?')) return;
    try {
        await window.apiClient.models.delete.mutate({ id });
        await loadModels();
    } catch (err) {
        alert('Failed to delete: ' + err.message);
    }
}

// Handle submit
async function handleSubmit(e) {
    e.preventDefault();
    try {
        if (editingId) {
            await window.apiClient.models.update.mutate(formData);
        } else {
            await window.apiClient.models.create.mutate(formData);
        }
        closeModal();
        await loadModels();
    } catch (err) {
        alert('Failed to save: ' + err.message);
    }
}

// Render modal
function renderModal() {
    const existingModal = document.getElementById('model-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'model-modal';
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 class="text-lg font-semibold mb-4">
                ${editingId ? 'Edit' : 'Create'} Model
            </h3>
            <form id="model-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-1">ID</label>
                    <input
                        type="text"
                        name="id"
                        value="${window.escapeHtml(formData.id)}"
                        ${editingId ? 'disabled' : 'required'}
                        class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., model-gpt4"
                    />
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Model Name</label>
                    <input
                        type="text"
                        name="model_name"
                        value="${window.escapeHtml(formData.model_name)}"
                        required
                        class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., gpt-4"
                    />
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Provider</label>
                    <select
                        name="model_provider"
                        required
                        class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="openai" ${formData.model_provider === 'openai' ? 'selected' : ''}>OpenAI</option>
                        <option value="anthropic" ${formData.model_provider === 'anthropic' ? 'selected' : ''}>Anthropic</option>
                        <option value="ollama" ${formData.model_provider === 'ollama' ? 'selected' : ''}>Ollama</option>
                    </select>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-1">Temperature</label>
                        <input
                            type="number"
                            name="temperature"
                            value="${formData.temperature}"
                            step="0.1"
                            min="0"
                            max="2"
                            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Max Tokens</label>
                        <input
                            type="number"
                            name="max_tokens"
                            value="${formData.max_tokens}"
                            min="1"
                            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="enable_thinking"
                        name="enable_thinking"
                        ${formData.enable_thinking ? 'checked' : ''}
                        class="w-4 h-4 bg-gray-700 border-gray-600 rounded"
                    />
                    <label for="enable_thinking" class="text-sm">Enable Thinking (Extended)</label>
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
                    form="model-form"
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                    Save
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const form = modal.querySelector('#model-form');
    form.addEventListener('submit', handleSubmit);

    form.querySelectorAll('input, select, textarea').forEach((input) => {
        input.addEventListener('input', (e) => {
            if (input.type === 'checkbox') {
                formData[input.name] = input.checked;
            } else {
                formData[input.name] = input.value;
            }
        });
    });

    document.getElementById('btn-cancel').addEventListener('click', closeModal);
}
