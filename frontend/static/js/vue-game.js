/**
 * Vue 3 Game Application with Pinia - Fixed Version
 */
document.addEventListener('DOMContentLoaded', function() {
    // Log initialization to help with debugging
    console.log("DOM loaded, initializing game...");

    // Check dependencies
    if (!window.Vue) {
        console.error("Vue is not loaded!");
        return;
    }

    if (!window.Pinia) {
        console.error("Pinia is not loaded!");
        return;
    }

    try {
        // Initialize Socket.IO connection
        const socket = io();

        // Create Pinia instance
        const pinia = Pinia.createPinia();

        // Check if store is defined
        if (typeof useGameStore !== 'function') {
            console.error("Game store is not defined! Make sure store.js is loaded.");
            return;
        }

        // Create Vue app
        const app = Vue.createApp({
            template: '#game-template',

            setup() {
                console.log("Component setup running...");

                // Action AP costs
                const actionCosts = {
                    'MOVE': 1,
                    'ENTER_BUILDING': 1,
                    'EXIT_BUILDING': 1,
                    'REST': 2,
                    'SEARCH': 1
                };

                // Use store with Vue's Composition API
                const store = useGameStore();

                // Initialize data when component is mounted
                Vue.onMounted(() => {
                    console.log("Component mounted");
                    // Initialize map grid
                    store.initializeMap();

                    // Set up Socket.IO event listeners
                    setupSocketListeners();

                    // Initial data fetch
                    store.fetchInitialData();
                });

                /**
                 * Set up Socket.IO event listeners
                 */
                function setupSocketListeners() {
                    // Connection events
                    socket.on('connect', () => {
                        store.setConnectionStatus(true);
                        console.log('Connected to server');
                    });

                    socket.on('disconnect', () => {
                        store.setConnectionStatus(false);
                        console.log('Disconnected from server');
                        store.showToastMessage('Connection lost. Reconnecting...', 'error');
                    });

                    // Game data updates
                    socket.on('character_update', (data) => {
                        store.updateCharacter(data);
                    });

                    socket.on('location_update', (data) => {
                        store.updateLocation(data);
                    });

                    socket.on('actions_update', (data) => {
                        store.updateActions(data);
                    });

                    socket.on('logs_update', (data) => {
                        store.updateLogs(data);
                    });

                    // Messages and errors
                    socket.on('message', (data) => {
                        store.showToastMessage(data.text, 'success');
                    });

                    socket.on('error', (data) => {
                        store.showToastMessage(data.message, 'error');
                    });
                }

                /**
                 * Handle map tile click
                 */
                function tileClick(tile) {
                    // Only allow clicking adjacent tiles
                    const currentX = store.character.x;
                    const currentY = store.character.y;
                    const distance = Math.abs(tile.x - currentX) + Math.abs(tile.y - currentY);

                    if (distance === 1 && !store.character.inside_building) {
                        // Determine direction
                        let direction;
                        if (tile.y < currentY) direction = 'north';
                        else if (tile.y > currentY) direction = 'south';
                        else if (tile.x < currentX) direction = 'west';
                        else if (tile.x > currentX) direction = 'east';

                        // Perform move action
                        if (direction) {
                            performAction('MOVE', { direction });
                        }
                    }
                }

                /**
                 * Handle action button click
                 */
                function handleAction(action) {
                    store.openModal(
                        action.name,
                        action.name,
                        action.type,
                        action.options || []
                    );
                }

                /**
                 * Confirm action from modal
                 */
                function confirmAction() {
                    const actionData = {};

                    // Add selected option if applicable
                    if (store.modalOptions.length > 0 && store.modalActionType !== 'MOVE') {
                        actionData.option = store.selectedOption;
                    }

                    // Perform the action
                    performAction(store.modalActionType, actionData);

                    // Hide modal
                    store.closeModal();
                }

                /**
                 * Hide modal
                 */
                function hideModal() {
                    store.closeModal();
                }

                /**
                 * Perform game action
                 */
                function performAction(actionType, actionData = {}) {
                    // Check if connected to Socket.IO
                    if (store.connected) {
                        // Emit action via Socket.IO
                        socket.emit('perform_action', {
                            action_type: actionType,
                            action_data: actionData
                        });
                    } else {
                        // Fallback to REST API
                        performActionREST(actionType, actionData);
                    }

                    // Hide modal
                    store.closeModal();
                }

                /**
                 * Perform action using REST API (fallback)
                 */
                async function performActionREST(actionType, actionData = {}) {
                    try {
                        const response = await fetch('/api/action', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                action_type: actionType,
                                action_data: actionData
                            })
                        });

                        if (response.ok) {
                            const result = await response.json();

                            if (result.success) {
                                // Update character data
                                if (result.character) {
                                    store.updateCharacter(result.character);
                                }

                                // Update location
                                if (result.location) {
                                    store.updateLocation(result.location);
                                }

                                // Update actions
                                if (result.available_actions) {
                                    store.updateActions(result.available_actions);
                                }

                                // Update logs
                                if (result.logs) {
                                    store.updateLogs(result.logs);
                                }

                                // Show message
                                if (result.message) {
                                    store.showToastMessage(result.message, 'success');
                                }
                            } else {
                                store.showToastMessage(result.message || 'Action failed', 'error');
                            }
                        } else {
                            store.showToastMessage('Error performing action', 'error');
                        }
                    } catch (error) {
                        console.error('Error performing action:', error);
                        store.showToastMessage('Error performing action', 'error');
                    }
                }

                /**
                 * Check if character can perform an action
                 */
                function canPerformAction(actionType) {
                    const cost = actionCosts[actionType] || 1;
                    return store.character.ap >= cost;
                }

                /**
                 * Format log timestamp
                 */
                function formatLogTime(timestamp) {
                    if (!timestamp) return 'Just now';

                    const date = new Date(timestamp);
                    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }

                // Return all needed state and methods
                return {
                    // Expose store state directly
                    character: Vue.computed(() => store.character),
                    location: Vue.computed(() => store.location),
                    logs: Vue.computed(() => store.logs),
                    availableActions: Vue.computed(() => store.availableActions),
                    mapTiles: Vue.computed(() => store.mapTiles),
                    showToast: Vue.computed(() => store.showToast),
                    toastMessage: Vue.computed(() => store.toastMessage),
                    toastType: Vue.computed(() => store.toastType),
                    showModal: Vue.computed(() => store.showModal),
                    modalTitle: Vue.computed(() => store.modalTitle),
                    modalAction: Vue.computed(() => store.modalAction),
                    modalActionType: Vue.computed(() => store.modalActionType),
                    modalOptions: Vue.computed(() => store.modalOptions),
                    selectedOption: Vue.computed({
                        get: () => store.selectedOption,
                        set: (value) => store.selectedOption = value
                    }),

                    // Computed properties
                    healthPercent: Vue.computed(() => store.healthPercent),
                    mpPercent: Vue.computed(() => store.mpPercent),
                    apPercent: Vue.computed(() => store.apPercent),
                    currentX: Vue.computed(() => store.currentX),
                    currentY: Vue.computed(() => store.currentY),

                    // Methods
                    tileClick,
                    handleAction,
                    confirmAction,
                    hideModal,
                    canPerformAction,
                    performAction,
                    formatLogTime
                };
            }
        });

        // Use Pinia
        app.use(pinia);

        // Mount the app
        app.mount('#app');
        console.log("App mounted successfully");

    } catch (error) {
        console.error("Error initializing game:", error);
    }
});