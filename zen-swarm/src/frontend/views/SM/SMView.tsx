/**
 * State Machine View
 *
 * Main view for state machine management
 */

import { useSMStore } from '../../stores/smStore.js';
import { DefinitionList } from './components/DefinitionList.js';
import { InstanceList } from './components/InstanceList.js';
import { AllInstancesList } from './components/AllInstancesList.js';
import { StateMachineEditor } from './components/StateMachineEditor.js';
import { NewMachineEditor } from './components/NewMachineEditor.js';
import { InstanceDetail } from './components/InstanceDetail.js';
import { Layers, Activity } from '../../components/ui/Icons.js';

export function SMView() {
    const { sidebarTab, selectedMachineId, selectedStateId, isCreating, setSidebarTab } = useSMStore();

    return (
        <div className="flex h-full bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-900">
            {/* Sidebar */}
            <div className="w-64 flex flex-col border-r border-gray-200 bg-white">
                / {/* Tab Header */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setSidebarTab('definitions')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                            sidebarTab === 'definitions'
                                ? 'text-gray-900 bg-blue-50 border-b-2 border-blue-500'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                    >
                        <Layers size={16} className="inline mr-2" />
                        Definitions
                    </button>
                    <button
                        onClick={() => setSidebarTab('instances')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                            sidebarTab === 'instances'
                                ? 'text-gray-900 bg-blue-50 border-b-2 border-blue-500'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                    >
                        <Activity size={16} className="inline mr-2" />
                        Instances
                    </button>
                </div>
                {/* Sidebar Content */}
                <div className="flex-1 overflow-hidden">
                    {sidebarTab === 'definitions' ? <DefinitionList /> : <InstanceList />}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Tree View / Editor */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {sidebarTab === 'instances' ? (
                        // Instances tab: Show all instances or machine editor
                        selectedMachineId ? (
                            // Show machine editor when machine is selected
                            <StateMachineEditor machineId={selectedMachineId} />
                        ) : (
                            // Show all instances when no machine selected
                            <AllInstancesList />
                        )
                    ) : // Definitions tab: Show editor or create form
                    isCreating ? (
                        <NewMachineEditor />
                    ) : selectedMachineId ? (
                        <StateMachineEditor machineId={selectedMachineId} />
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400">
                            <div className="text-center">
                                <Layers size={48} className="mx-auto mb-4 opacity-50" />
                                <p className="text-lg">Select a state machine to view</p>
                                <p className="text-sm mt-2">or create a new one</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Panel - Instance Details / History */}
                {selectedStateId && (
                    <div className="w-80 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
                        <InstanceDetail stateId={selectedStateId} />
                    </div>
                )}
            </div>
        </div>
    );
}

export default SMView;
