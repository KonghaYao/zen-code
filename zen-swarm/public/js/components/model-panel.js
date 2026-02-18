import { apiClient } from '../api.js';
import escapeHtml from 'https://esm.sh/escape-html';

export async function ModelPanel() {
    try {
        const models = await apiClient.models.list.query();

        return `
      <div class="space-y-6">
        <!-- Actions -->
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-semibold">Models (${models.length})</h2>
          <button
            onclick="showModelModal()"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
          >
            + Create Model
          </button>
        </div>

        <!-- Model List -->
        <div class="grid gap-4">
          ${
              models.length === 0
                  ? `
            <div class="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
              No models yet. Add your first model!
            </div>
          `
                  : models
                        .map(
                            (model) => `
            <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <h3 class="text-lg font-medium text-white">${escapeHtml(model.model_name)}</h3>
                    <span class="px-2 py-0.5 text-xs rounded ${getProviderBadge(model.model_provider)}">
                      ${escapeHtml(model.model_provider)}
                    </span>
                  </div>
                  <p class="text-sm text-gray-500 mb-2">ID: ${escapeHtml(model.id)}</p>

                  <div class="flex flex-wrap gap-2 text-xs">
                    <span class="text-gray-400">Temp: ${model.temperature ?? 0.7}</span>
                    <span class="text-gray-400">Max Tokens: ${model.max_tokens ?? 4096}</span>
                    ${model.enable_thinking ? '<span class="text-blue-400">Thinking</span>' : ''}
                  </div>
                </div>

                <div class="flex gap-2">
                  <button onclick="editModel('${escapeHtml(model.id)}')" class="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded">
                    Edit
                  </button>
                  <button onclick="deleteModel('${escapeHtml(model.id)}')" class="px-3 py-1 text-sm bg-red-900/50 hover:bg-red-800 text-red-300 rounded">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          `,
                        )
                        .join('')
          }
        </div>
      </div>

      <!-- Modal -->
      <div id="model-modal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50">
        <div class="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
          <h3 id="model-modal-title" class="text-lg font-semibold mb-4">Create Model</h3>
          <form id="model-form" onsubmit="handleModelSubmit(event)">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-1">ID</label>
                <input type="text" id="model-id-input" name="id" required
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., model-gpt4">
              </div>

              <div>
                <label class="block text-sm font-medium mb-1">Model Name</label>
                <input type="text" name="model_name" required
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., gpt-4">
              </div>

              <div>
                <label class="block text-sm font-medium mb-1">Provider</label>
                <select name="model_provider" required
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="ollama">Ollama</option>
                </select>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium mb-1">Temperature</label>
                  <input type="number" name="temperature" step="0.1" min="0" max="2" value="0.7"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1">Max Tokens</label>
                  <input type="number" name="max_tokens" min="1" value="4096"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500">
                </div>
              </div>

              <div class="flex items-center gap-2">
                <input type="checkbox" id="enable_thinking" name="enable_thinking"
                  class="w-4 h-4 bg-gray-700 border-gray-600 rounded">
                <label for="enable_thinking" class="text-sm">Enable Thinking (Extended)</label>
              </div>
            </div>

            <div class="flex justify-end gap-3 mt-6">
              <button type="button" onclick="hideModelModal()"
                class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
                Cancel
              </button>
              <button type="submit"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    } catch (error) {
        console.error('Failed to load models:', error);
        return `<div class="text-center py-8 text-red-400">Error loading models: ${error.message}</div>`;
    }
}

function getProviderBadge(provider) {
    const badges = {
        openai: 'bg-green-900/50 text-green-300',
        anthropic: 'bg-orange-900/50 text-orange-300',
        ollama: 'bg-purple-900/50 text-purple-300',
    };
    return badges[provider] || 'bg-gray-700 text-gray-300';
}

window.showModelModal = () => {
    document.getElementById('model-modal').classList.remove('hidden');
    document.getElementById('model-modal').classList.add('flex');
    document.getElementById('model-modal-title').textContent = 'Create Model';
    document.getElementById('model-form').reset();
    document.getElementById('model-id-input').disabled = false;
};

window.hideModelModal = () => {
    document.getElementById('model-modal').classList.add('hidden');
    document.getElementById('model-modal').classList.remove('flex');
};

window.editModel = async (id) => {
    try {
        const model = await apiClient.models.get.query({ id });
        document.getElementById('model-modal-title').textContent = 'Edit Model';
        document.getElementById('model-id-input').value = model.id;
        document.getElementById('model-id-input').disabled = true;
        document.querySelector('[name="model_name"]').value = model.model_name;
        document.querySelector('[name="model_provider"]').value = model.model_provider;
        document.querySelector('[name="temperature"]').value = model.temperature ?? 0.7;
        document.querySelector('[name="max_tokens"]').value = model.max_tokens ?? 4096;
        document.getElementById('enable_thinking').checked = model.enable_thinking ?? false;
        showModelModal();
    } catch (error) {
        alert('Failed to load model: ' + error.message);
    }
};

window.deleteModel = async (id) => {
    if (!confirm('Are you sure you want to delete this model?')) return;
    try {
        await apiClient.models.delete.mutate({ id });
        loadPanel('models');
    } catch (error) {
        alert('Failed to delete model: ' + error.message);
    }
};

window.handleModelSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = {
        id: formData.get('id'),
        model_name: formData.get('model_name'),
        model_provider: formData.get('model_provider'),
        temperature: parseFloat(formData.get('temperature')),
        max_tokens: parseInt(formData.get('max_tokens')),
        enable_thinking: document.getElementById('enable_thinking').checked,
    };

    try {
        const isEdit = document.getElementById('model-id-input').disabled;
        if (isEdit) {
            await apiClient.models.update.mutate(data);
        } else {
            await apiClient.models.create.mutate(data);
        }
        hideModelModal();
        loadPanel('models');
    } catch (error) {
        alert('Failed to save model: ' + error.message);
    }
};
