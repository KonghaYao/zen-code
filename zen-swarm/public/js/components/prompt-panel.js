import { apiClient } from '../api.js';
import escapeHtml from 'https://esm.sh/escape-html';

export async function PromptPanel() {
    try {
        const prompts = await apiClient.prompts.list.query();

        return `
      <div class="space-y-6">
        <!-- Actions -->
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-semibold">Prompts (${prompts.length})</h2>
          <button
            onclick="showPromptModal()"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
          >
            + Create Prompt
          </button>
        </div>

        <!-- Prompt List -->
        <div class="grid gap-4">
          ${
              prompts.length === 0
                  ? `
            <div class="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
              No prompts yet. Create your first system prompt!
            </div>
          `
                  : prompts
                        .map(
                            (prompt) => `
            <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
              <div class="flex justify-between items-start">
                <div class="flex-1 min-w-0">
                  <h3 class="text-lg font-medium text-white mb-1">${escapeHtml(prompt.name)}</h3>
                  <p class="text-sm text-gray-500 mb-2">ID: ${escapeHtml(prompt.id)}</p>
                  <p class="text-sm text-gray-400 line-clamp-2">${escapeHtml(prompt.content?.substring(0, 200) || '')}...</p>
                </div>

                <div class="flex gap-2 ml-4">
                  <button onclick="editPrompt('${escapeHtml(prompt.id)}')" class="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded">
                    Edit
                  </button>
                  <button onclick="deletePrompt('${escapeHtml(prompt.id)}')" class="px-3 py-1 text-sm bg-red-900/50 hover:bg-red-800 text-red-300 rounded">
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
      <div id="prompt-modal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50">
        <div class="bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <h3 id="prompt-modal-title" class="text-lg font-semibold mb-4">Create Prompt</h3>
          <form id="prompt-form" onsubmit="handlePromptSubmit(event)">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-1">ID</label>
                <input type="text" id="prompt-id-input" name="id" required
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., prompt-default">
              </div>

              <div>
                <label class="block text-sm font-medium mb-1">Name</label>
                <input type="text" name="name" required
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Default Assistant">
              </div>

              <div>
                <label class="block text-sm font-medium mb-1">Content</label>
                <textarea name="content" rows="10" required
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="You are a helpful assistant..."></textarea>
              </div>
            </div>

            <div class="flex justify-end gap-3 mt-6">
              <button type="button" onclick="hidePromptModal()"
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
        console.error('Failed to load prompts:', error);
        return `<div class="text-center py-8 text-red-400">Error loading prompts: ${error.message}</div>`;
    }
}

window.showPromptModal = () => {
    document.getElementById('prompt-modal').classList.remove('hidden');
    document.getElementById('prompt-modal').classList.add('flex');
    document.getElementById('prompt-modal-title').textContent = 'Create Prompt';
    document.getElementById('prompt-form').reset();
    document.getElementById('prompt-id-input').disabled = false;
};

window.hidePromptModal = () => {
    document.getElementById('prompt-modal').classList.add('hidden');
    document.getElementById('prompt-modal').classList.remove('flex');
};

window.editPrompt = async (id) => {
    try {
        const prompt = await apiClient.prompts.get.query({ id });
        document.getElementById('prompt-modal-title').textContent = 'Edit Prompt';
        document.getElementById('prompt-id-input').value = prompt.id;
        document.getElementById('prompt-id-input').disabled = true;
        document.querySelector('[name="name"]').value = prompt.name;
        document.querySelector('[name="content"]').value = prompt.content;
        showPromptModal();
    } catch (error) {
        alert('Failed to load prompt: ' + error.message);
    }
};

window.deletePrompt = async (id) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;
    try {
        await apiClient.prompts.delete.mutate({ id });
        loadPanel('prompts');
    } catch (error) {
        alert('Failed to delete prompt: ' + error.message);
    }
};

window.handlePromptSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = {
        id: formData.get('id'),
        name: formData.get('name'),
        content: formData.get('content'),
    };

    try {
        const isEdit = document.getElementById('prompt-id-input').disabled;
        if (isEdit) {
            await apiClient.prompts.update.mutate(data);
        } else {
            await apiClient.prompts.create.mutate(data);
        }
        hidePromptModal();
        loadPanel('prompts');
    } catch (error) {
        alert('Failed to save prompt: ' + error.message);
    }
};
