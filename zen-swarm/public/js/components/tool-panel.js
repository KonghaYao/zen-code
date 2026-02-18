import { apiClient } from '../api.js';
import escapeHtml from 'https://esm.sh/escape-html';

export async function ToolPanel() {
    try {
        const tools = await apiClient.tools.list.query();

        return `
      <div class="space-y-6">
        <!-- Actions -->
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-semibold">Tools (${tools.length})</h2>
          <button
            onclick="showToolModal()"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
          >
            + Create Tool
          </button>
        </div>

        <!-- Tool List -->
        <div class="grid gap-4">
          ${
              tools.length === 0
                  ? `
            <div class="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
              No tools yet. Register your first tool!
            </div>
          `
                  : tools
                        .map(
                            (tool) => `
            <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
              <div class="flex justify-between items-start">
                <div class="flex-1 min-w-0">
                  <h3 class="text-lg font-medium text-white mb-1">${escapeHtml(tool.name)}</h3>
                  <p class="text-sm text-gray-500 mb-2">ID: ${escapeHtml(tool.id)}</p>
                  <p class="text-sm text-gray-400">${escapeHtml(tool.description || 'No description')}</p>
                  ${
                      tool.parameters
                          ? `
                    <details class="mt-2">
                      <summary class="text-xs text-gray-500 cursor-pointer">View Parameters</summary>
                      <pre class="mt-1 p-2 bg-gray-900 rounded text-xs overflow-x-auto">${escapeHtml(JSON.stringify(tool.parameters, null, 2))}</pre>
                    </details>
                  `
                          : ''
                  }
                </div>

                <div class="flex gap-2 ml-4">
                  <button onclick="editTool('${escapeHtml(tool.id)}')" class="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded">
                    Edit
                  </button>
                  <button onclick="deleteTool('${escapeHtml(tool.id)}')" class="px-3 py-1 text-sm bg-red-900/50 hover:bg-red-800 text-red-300 rounded">
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
      <div id="tool-modal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50">
        <div class="bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <h3 id="tool-modal-title" class="text-lg font-semibold mb-4">Create Tool</h3>
          <form id="tool-form" onsubmit="handleToolSubmit(event)">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-1">ID</label>
                <input type="text" id="tool-id-input" name="id" required
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., filesystem/read">
              </div>

              <div>
                <label class="block text-sm font-medium mb-1">Name</label>
                <input type="text" name="name" required
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Read File">
              </div>

              <div>
                <label class="block text-sm font-medium mb-1">Description</label>
                <textarea name="description" rows="3"
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="What does this tool do?"></textarea>
              </div>

              <div>
                <label class="block text-sm font-medium mb-1">Parameters (JSON)</label>
                <textarea name="parameters" rows="6"
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder='{"type": "object", "properties": {...}}'></textarea>
                <p class="text-xs text-gray-500 mt-1">Optional JSON schema for parameters</p>
              </div>
            </div>

            <div class="flex justify-end gap-3 mt-6">
              <button type="button" onclick="hideToolModal()"
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
        console.error('Failed to load tools:', error);
        return `<div class="text-center py-8 text-red-400">Error loading tools: ${error.message}</div>`;
    }
}

window.showToolModal = () => {
    document.getElementById('tool-modal').classList.remove('hidden');
    document.getElementById('tool-modal').classList.add('flex');
    document.getElementById('tool-modal-title').textContent = 'Create Tool';
    document.getElementById('tool-form').reset();
    document.getElementById('tool-id-input').disabled = false;
};

window.hideToolModal = () => {
    document.getElementById('tool-modal').classList.add('hidden');
    document.getElementById('tool-modal').classList.remove('flex');
};

window.editTool = async (id) => {
    try {
        const tool = await apiClient.tools.get.query({ id });
        document.getElementById('tool-modal-title').textContent = 'Edit Tool';
        document.getElementById('tool-id-input').value = tool.id;
        document.getElementById('tool-id-input').disabled = true;
        document.querySelector('[name="name"]').value = tool.name;
        document.querySelector('[name="description"]').value = tool.description || '';
        document.querySelector('[name="parameters"]').value = tool.parameters
            ? JSON.stringify(tool.parameters, null, 2)
            : '';
        showToolModal();
    } catch (error) {
        alert('Failed to load tool: ' + error.message);
    }
};

window.deleteTool = async (id) => {
    if (!confirm('Are you sure you want to delete this tool?')) return;
    try {
        await apiClient.tools.delete.mutate({ id });
        loadPanel('tools');
    } catch (error) {
        alert('Failed to delete tool: ' + error.message);
    }
};

window.handleToolSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    let parameters = null;
    const paramsStr = formData.get('parameters');
    if (paramsStr && paramsStr.trim()) {
        try {
            parameters = JSON.parse(paramsStr);
        } catch (e) {
            alert('Invalid JSON in parameters field');
            return;
        }
    }

    const data = {
        id: formData.get('id'),
        name: formData.get('name'),
        description: formData.get('description'),
        parameters,
    };

    try {
        const isEdit = document.getElementById('tool-id-input').disabled;
        if (isEdit) {
            await apiClient.tools.update.mutate(data);
        } else {
            await apiClient.tools.create.mutate(data);
        }
        hideToolModal();
        loadPanel('tools');
    } catch (error) {
        alert('Failed to save tool: ' + error.message);
    }
};
