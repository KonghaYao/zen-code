import { apiClient } from '../api.js';
import escapeHtml from 'https://esm.sh/escape-html';

export async function MiddlewarePanel() {
    try {
        const middlewares = await apiClient.middlewares.list.query();

        return `
      <div class="space-y-6">
        <!-- Actions -->
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-semibold">Middlewares (${middlewares.length})</h2>
          <button
            onclick="showMiddlewareModal()"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
          >
            + Create Middleware
          </button>
        </div>

        <!-- Middleware List -->
        <div class="grid gap-4">
          ${
              middlewares.length === 0
                  ? `
            <div class="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
              No middlewares yet. Register your first middleware!
            </div>
          `
                  : middlewares
                        .map(
                            (middleware) => `
            <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
              <div class="flex justify-between items-start">
                <div class="flex-1 min-w-0">
                  <h3 class="text-lg font-medium text-white mb-1">${escapeHtml(middleware.name)}</h3>
                  <p class="text-sm text-gray-500 mb-2">ID: ${escapeHtml(middleware.id)}</p>
                  <p class="text-sm text-gray-400">${escapeHtml(middleware.description || 'No description')}</p>
                  ${
                      middleware.parameters
                          ? `
                    <details class="mt-2">
                      <summary class="text-xs text-gray-500 cursor-pointer">View Parameters</summary>
                      <pre class="mt-1 p-2 bg-gray-900 rounded text-xs overflow-x-auto">${escapeHtml(JSON.stringify(middleware.parameters, null, 2))}</pre>
                    </details>
                  `
                          : ''
                  }
                </div>

                <div class="flex gap-2 ml-4">
                  <button onclick="editMiddleware('${escapeHtml(middleware.id)}')" class="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded">
                    Edit
                  </button>
                  <button onclick="deleteMiddleware('${escapeHtml(middleware.id)}')" class="px-3 py-1 text-sm bg-red-900/50 hover:bg-red-800 text-red-300 rounded">
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
      <div id="middleware-modal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50">
        <div class="bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <h3 id="middleware-modal-title" class="text-lg font-semibold mb-4">Create Middleware</h3>
          <form id="middleware-form" onsubmit="handleMiddlewareSubmit(event)">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-1">ID</label>
                <input type="text" id="middleware-id-input" name="id" required
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., memory/basic">
              </div>

              <div>
                <label class="block text-sm font-medium mb-1">Name</label>
                <input type="text" name="name" required
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Basic Memory">
              </div>

              <div>
                <label class="block text-sm font-medium mb-1">Description</label>
                <textarea name="description" rows="3"
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="What does this middleware do?"></textarea>
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
              <button type="button" onclick="hideMiddlewareModal()"
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
        console.error('Failed to load middlewares:', error);
        return `<div class="text-center py-8 text-red-400">Error loading middlewares: ${error.message}</div>`;
    }
}

window.showMiddlewareModal = () => {
    document.getElementById('middleware-modal').classList.remove('hidden');
    document.getElementById('middleware-modal').classList.add('flex');
    document.getElementById('middleware-modal-title').textContent = 'Create Middleware';
    document.getElementById('middleware-form').reset();
    document.getElementById('middleware-id-input').disabled = false;
};

window.hideMiddlewareModal = () => {
    document.getElementById('middleware-modal').classList.add('hidden');
    document.getElementById('middleware-modal').classList.remove('flex');
};

window.editMiddleware = async (id) => {
    try {
        const middleware = await apiClient.middlewares.get.query({ id });
        document.getElementById('middleware-modal-title').textContent = 'Edit Middleware';
        document.getElementById('middleware-id-input').value = middleware.id;
        document.getElementById('middleware-id-input').disabled = true;
        document.querySelector('[name="name"]').value = middleware.name;
        document.querySelector('[name="description"]').value = middleware.description || '';
        document.querySelector('[name="parameters"]').value = middleware.parameters
            ? JSON.stringify(middleware.parameters, null, 2)
            : '';
        showMiddlewareModal();
    } catch (error) {
        alert('Failed to load middleware: ' + error.message);
    }
};

window.deleteMiddleware = async (id) => {
    if (!confirm('Are you sure you want to delete this middleware?')) return;
    try {
        await apiClient.middlewares.delete.mutate({ id });
        loadPanel('middlewares');
    } catch (error) {
        alert('Failed to delete middleware: ' + error.message);
    }
};

window.handleMiddlewareSubmit = async (event) => {
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
        const isEdit = document.getElementById('middleware-id-input').disabled;
        if (isEdit) {
            await apiClient.middlewares.update.mutate(data);
        } else {
            await apiClient.middlewares.create.mutate(data);
        }
        hideMiddlewareModal();
        loadPanel('middlewares');
    } catch (error) {
        alert('Failed to save middleware: ' + error.message);
    }
};
