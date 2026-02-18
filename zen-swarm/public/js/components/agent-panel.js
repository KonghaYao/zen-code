import { apiClient } from '../api.js';
import escapeHtml from 'https://esm.sh/escape-html';

export async function AgentPanel() {
    try {
        const agents = await apiClient.agents.list.query();
        const models = await apiClient.models.list.query();
        const prompts = await apiClient.prompts.list.query();

        return `
      <div class="space-y-6">
        <!-- Actions -->
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-semibold">Agents (${agents.length})</h2>
          <button
            onclick="showAgentModal()"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
          >
            + Create Agent
          </button>
        </div>

        <!-- Agent List -->
        <div class="grid gap-4">
          ${
              agents.length === 0
                  ? `
            <div class="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
              No agents yet. Create your first agent!
            </div>
          `
                  : agents
                        .map(
                            (agent) => `
            <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <h3 class="text-lg font-medium text-white mb-1">${escapeHtml(agent.name)}</h3>
                  <p class="text-sm text-gray-400 mb-3">${escapeHtml(agent.description || 'No description')}</p>

                  <div class="flex flex-wrap gap-2 text-xs">
                    <span class="px-2 py-1 bg-purple-900/50 text-purple-300 rounded">
                      Model: ${models.find((m) => m.id === agent.model)?.model_name || agent.model}
                    </span>
                    <span class="px-2 py-1 bg-green-900/50 text-green-300 rounded">
                      Tools: ${Object.keys(agent.tools || {}).length}
                    </span>
                    <span class="px-2 py-1 bg-yellow-900/50 text-yellow-300 rounded">
                      Middleware: ${Object.keys(agent.middleware || {}).length}
                    </span>
                  </div>
                </div>

                <div class="flex gap-2">
                  <button onclick="editAgent('${escapeHtml(agent.id)}')" class="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded">
                    Edit
                  </button>
                  <button onclick="deleteAgent('${escapeHtml(agent.id)}')" class="px-3 py-1 text-sm bg-red-900/50 hover:bg-red-800 text-red-300 rounded">
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
      <div id="agent-modal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50">
        <div class="bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <h3 id="modal-title" class="text-lg font-semibold mb-4">Create Agent</h3>
          <form id="agent-form" onsubmit="handleAgentSubmit(event)">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-1">ID</label>
                <input type="text" id="agent-id-input" name="id" required
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., agent-assistant">
              </div>

              <div>
                <label class="block text-sm font-medium mb-1">Name</label>
                <input type="text" name="name" required
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Assistant">
              </div>

              <div>
                <label class="block text-sm font-medium mb-1">Description</label>
                <textarea name="description" rows="2"
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="What does this agent do?"></textarea>
              </div>

              <div>
                <label class="block text-sm font-medium mb-1">System Prompt</label>
                <select name="system_prompt" required
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  ${prompts.map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join('')}
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium mb-1">Model</label>
                <select name="model" required
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  ${models.map((m) => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.model_name)} (${escapeHtml(m.model_provider)})</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="flex justify-end gap-3 mt-6">
              <button type="button" onclick="hideAgentModal()"
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
        console.error('Failed to load agents:', error);
        return `<div class="text-center py-8 text-red-400">Error loading agents: ${error.message}</div>`;
    }
}

// Modal functions
window.showAgentModal = () => {
    document.getElementById('agent-modal').classList.remove('hidden');
    document.getElementById('agent-modal').classList.add('flex');
    document.getElementById('modal-title').textContent = 'Create Agent';
    document.getElementById('agent-form').reset();
    document.getElementById('agent-id-input').disabled = false;
};

window.hideAgentModal = () => {
    document.getElementById('agent-modal').classList.add('hidden');
    document.getElementById('agent-modal').classList.remove('flex');
};

window.editAgent = async (id) => {
    try {
        const agent = await apiClient.agents.get.query({ id });
        document.getElementById('modal-title').textContent = 'Edit Agent';
        document.getElementById('agent-id-input').value = agent.id;
        document.getElementById('agent-id-input').disabled = true;
        document.querySelector('[name="name"]').value = agent.name;
        document.querySelector('[name="description"]').value = agent.description || '';
        document.querySelector('[name="system_prompt"]').value = agent.system_prompt;
        document.querySelector('[name="model"]').value = agent.model;
        showAgentModal();
    } catch (error) {
        alert('Failed to load agent: ' + error.message);
    }
};

window.deleteAgent = async (id) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;
    try {
        await apiClient.agents.delete.mutate({ id });
        loadPanel('agents');
    } catch (error) {
        alert('Failed to delete agent: ' + error.message);
    }
};

window.handleAgentSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = {
        id: formData.get('id'),
        name: formData.get('name'),
        description: formData.get('description'),
        system_prompt: formData.get('system_prompt'),
        model: formData.get('model'),
        tools: {},
        middleware: {},
    };

    try {
        const isEdit = document.getElementById('agent-id-input').disabled;
        if (isEdit) {
            await apiClient.agents.update.mutate(data);
        } else {
            await apiClient.agents.create.mutate(data);
        }
        hideAgentModal();
        loadPanel('agents');
    } catch (error) {
        alert('Failed to save agent: ' + error.message);
    }
};
