/**
 * Vue 3 Game Application with Pinia
 */
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Socket.IO connection
    const socket = io();

    // Create Pinia instance
    const pinia = Pinia.createPinia();

    // Create Vue app
    const app = Vue.createApp({
        template: '#game-template',

        setup() {
            // Use the game store
            const store = useGameStore();

            // Action AP costs
            const actionCosts = {
                'MOVE': 0,
                'ENTER_BUILDING': 0,
                'EXIT_BUILDING': 0,
                'REST': 2,
                'SEARCH': 1
            };

            // Initialize data
            Vue.onMounted(() => {
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
                const distance = Math.abs(tile.x - store.currentX) + Math.abs(tile.y - store.currentY);

                if (distance === 1 && !store.character.inside_building) {
                    // Determine direction
                    let direction;
                    if (tile.y < store.character.y) direction = 'north';
                    else if (tile.y > store.character.y) direction = 'south';
                    else if (tile.x < store.character.x) direction = 'west';
                    else if (tile.x > store.character.x) direction = 'east';

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

            // Hide modal
            function hideModal() {
                store.closeModal();
            }

            // Return all needed state and methods
            return {
                // Expose store state and getters
                ...Vue.toRefs(store.$state),
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
});