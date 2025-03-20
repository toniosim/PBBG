/**
 * Vue 3 Game Application with Vuex
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing game...");

    // Make sure Vue is available
    if (!window.Vue) {
        console.error("Vue is not loaded!");
        return;
    }

    // Make sure Vuex is available
    if (!window.Vuex) {
        console.error("Vuex is not loaded!");
        return;
    }

    try {
        // Initialize Socket.IO connection
        const socket = io();

        // Action costs for different action types
        const actionCosts = {
            'MOVE': 1,
            'ENTER_BUILDING': 1,
            'EXIT_BUILDING': 1,
            'REST': 2,
            'SEARCH': 1
        };

        // Create a Vuex store
        const store = Vuex.createStore({
            state() {
                return {
                    // Character data
                    character: {
                        id: null,
                        name: 'Loading...',
                        health: 100,
                        max_health: 100,
                        mp: 100,
                        max_mp: 100,
                        ap: 10,
                        max_ap: 10,
                        experience: 0,
                        x: 1,
                        y: 1,
                        inside_building: false
                    },

                    // Location data
                    location: {
                        name: 'Loading...',
                        description: 'Loading location information...',
                        inside_building: false,
                        has_building: false,
                        building_name: null
                    },

                    // Action logs
                    logs: [],

                    // Available actions
                    availableActions: [],

                    // Map data
                    mapSize: 3,
                    mapTiles: [],

                    // WebSocket connection status
                    connected: false,

                    // UI state
                    loaded: false,
                    showToast: false,
                    toastMessage: '',
                    toastType: 'info',
                    toastTimer: null,

                    showModal: false,
                    modalTitle: '',
                    modalAction: '',
                    modalActionType: '',
                    modalOptions: [],
                    selectedOption: '',
                };
            },

            getters: {
                // Calculate health percentage for progress bar
                healthPercent(state) {
                    return (state.character.health / state.character.max_health) * 100;
                },

                // Calculate MP percentage for progress bar
                mpPercent(state) {
                    return (state.character.mp / state.character.max_mp) * 100;
                },

                // Calculate AP percentage for progress bar
                apPercent(state) {
                    return (state.character.ap / state.character.max_ap) * 100;
                }
            },

            mutations: {
                // Set loaded state
                SET_LOADED(state, value) {
                    state.loaded = value;
                },

                // Update character data
                UPDATE_CHARACTER(state, character) {
                    if (character) {
                        state.character = character;
                        // Update map tiles based on new position
                        state.mapTiles.forEach(tile => {
                            tile.current = (tile.x === character.x && tile.y === character.y);
                        });
                    }
                },

                // Update location data
                UPDATE_LOCATION(state, location) {
                    if (location) {
                        state.location = location;
                    }
                },

                // Update available actions
                UPDATE_ACTIONS(state, actions) {
                    if (actions) {
                        state.availableActions = actions;
                    }
                },

                // Update logs
                UPDATE_LOGS(state, logs) {
                    if (logs) {
                        state.logs = logs;
                    }
                },

                // Initialize map grid
                INITIALIZE_MAP(state) {
                    state.mapTiles = [];
                    for (let y = 0; y < state.mapSize; y++) {
                        for (let x = 0; x < state.mapSize; x++) {
                            state.mapTiles.push({
                                x: x,
                                y: y,
                                has_building: true, // Placeholder, will be updated
                                current: (x === state.character.x && y === state.character.y)
                            });
                        }
                    }
                },

                // Set connection status
                SET_CONNECTION_STATUS(state, status) {
                    state.connected = status;
                },

                // Show toast message
                SHOW_TOAST(state, { message, type }) {
                    state.toastMessage = message;
                    state.toastType = type || 'info';
                    state.showToast = true;
                },

                // Hide toast message
                HIDE_TOAST(state) {
                    state.showToast = false;
                },

                // Open modal
                OPEN_MODAL(state, { title, action, actionType, options }) {
                    state.modalTitle = title;
                    state.modalAction = action;
                    state.modalActionType = actionType;
                    state.modalOptions = options || [];
                    state.selectedOption = state.modalOptions.length > 0 ?
                        state.modalOptions[0].value : '';
                    state.showModal = true;
                },

                // Close modal
                CLOSE_MODAL(state) {
                    state.showModal = false;
                },

                // Set selected option
                SET_SELECTED_OPTION(state, option) {
                    state.selectedOption = option;
                }
            },

            actions: {
                // Initialize map
                initializeMap({ commit }) {
                    commit('INITIALIZE_MAP');
                },

                // Show toast message
                showToastMessage({ commit, state }, { message, type }) {
                    // Clear previous timer if exists
                    if (state.toastTimer) {
                        clearTimeout(state.toastTimer);
                    }

                    // Show toast
                    commit('SHOW_TOAST', { message, type });

                    // Auto-hide after 5 seconds
                    const timer = setTimeout(() => {
                        commit('HIDE_TOAST');
                    }, 5000);

                    // Store the timer ID
                    state.toastTimer = timer;
                },

                // Fetch initial data from API
                async fetchInitialData({ commit, dispatch }) {
                    try {
                        // Get character data
                        const characterResponse = await fetch('/api/character');
                        if (characterResponse.ok) {
                            const characterData = await characterResponse.json();
                            commit('UPDATE_CHARACTER', characterData);
                        }

                        // Get location data
                        const locationResponse = await fetch('/api/location');
                        if (locationResponse.ok) {
                            commit('UPDATE_LOCATION', await locationResponse.json());
                        }

                        // Get available actions
                        const actionsResponse = await fetch('/api/actions');
                        if (actionsResponse.ok) {
                            commit('UPDATE_ACTIONS', await actionsResponse.json());
                        }

                        // Get action logs
                        const logsResponse = await fetch('/api/logs');
                        if (logsResponse.ok) {
                            commit('UPDATE_LOGS', await logsResponse.json());
                        }

                        // Set loaded state
                        commit('SET_LOADED', true);
                    } catch (error) {
                        console.error('Error fetching initial data:', error);
                        dispatch('showToastMessage', {
                            message: 'Error loading game data',
                            type: 'error'
                        });
                    }
                },

                // Perform game action using REST API
                async performActionREST({ commit, dispatch }, { actionType, actionData = {} }) {
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
                                    commit('UPDATE_CHARACTER', result.character);
                                }

                                // Update location
                                if (result.location) {
                                    commit('UPDATE_LOCATION', result.location);
                                }

                                // Update actions
                                if (result.available_actions) {
                                    commit('UPDATE_ACTIONS', result.available_actions);
                                }

                                // Update logs
                                if (result.logs) {
                                    commit('UPDATE_LOGS', result.logs);
                                }

                                // Show message
                                if (result.message) {
                                    dispatch('showToastMessage', {
                                        message: result.message,
                                        type: 'success'
                                    });
                                }
                            } else {
                                dispatch('showToastMessage', {
                                    message: result.message || 'Action failed',
                                    type: 'error'
                                });
                            }
                        } else {
                            dispatch('showToastMessage', {
                                message: 'Error performing action',
                                type: 'error'
                            });
                        }
                    } catch (error) {
                        console.error('Error performing action:', error);
                        dispatch('showToastMessage', {
                            message: 'Error performing action',
                            type: 'error'
                        });
                    }
                }
            }
        });

        // Create Vue app
        const app = Vue.createApp({
            computed: {
                // Map Vuex state to component
                ...Vuex.mapState([
                    'character', 'location', 'logs', 'availableActions',
                    'mapTiles', 'loaded', 'showToast', 'toastMessage',
                    'toastType', 'showModal', 'modalTitle', 'modalAction',
                    'modalActionType', 'modalOptions', 'selectedOption'
                ]),

                // Map Vuex getters to component
                ...Vuex.mapGetters([
                    'healthPercent', 'mpPercent', 'apPercent'
                ])
            },

            methods: {
                // Mix in Vuex action methods
                ...Vuex.mapActions([
                    'initializeMap', 'fetchInitialData', 'showToastMessage',
                    'performActionREST'
                ]),

                // Mix in Vuex mutation methods
                ...Vuex.mapMutations([
                    'OPEN_MODAL', 'CLOSE_MODAL', 'SET_CONNECTION_STATUS',
                    'SET_SELECTED_OPTION'
                ]),

                // Handle map tile click
                tileClick(tile) {
                    // Only allow clicking adjacent tiles
                    const distance = Math.abs(tile.x - this.character.x) +
                                     Math.abs(tile.y - this.character.y);

                    if (distance === 1 && !this.character.inside_building) {
                        // Determine direction
                        let direction;
                        if (tile.y < this.character.y) direction = 'north';
                        else if (tile.y > this.character.y) direction = 'south';
                        else if (tile.x < this.character.x) direction = 'west';
                        else if (tile.x > this.character.x) direction = 'east';

                        // Perform move action
                        if (direction) {
                            this.performAction('MOVE', { direction });
                        }
                    }
                },

                // Handle action button click
                handleAction(action) {
                    this.OPEN_MODAL({
                        title: action.name,
                        action: action.name,
                        actionType: action.type,
                        options: action.options || []
                    });
                },

                // Confirm action from modal
                confirmAction() {
                    const actionData = {};

                    // Add selected option if applicable
                    if (this.modalOptions.length > 0 && this.modalActionType !== 'MOVE') {
                        actionData.option = this.selectedOption;
                    }

                    // Perform the action
                    this.performAction(this.modalActionType, actionData);

                    // Hide modal
                    this.hideModal();
                },

                // Hide modal
                hideModal() {
                    this.CLOSE_MODAL();
                },

                // Perform game action
                performAction(actionType, actionData = {}) {
                    // Check if connected to Socket.IO
                    if (this.connected) {
                        // Emit action via Socket.IO
                        socket.emit('perform_action', {
                            action_type: actionType,
                            action_data: actionData
                        });
                    } else {
                        // Fallback to REST API
                        this.performActionREST({ actionType, actionData });
                    }

                    // Hide modal
                    this.hideModal();
                },

                // Check if character can perform an action
                canPerformAction(actionType) {
                    const cost = actionCosts[actionType] || 1;
                    return this.character.ap >= cost;
                },

                // Format log timestamp
                formatLogTime(timestamp) {
                    if (!timestamp) return 'Just now';

                    const date = new Date(timestamp);
                    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
            },

            mounted() {
                console.log("Component mounted");

                // Initialize map grid
                this.initializeMap();

                // Set up Socket.IO event listeners
                socket.on('connect', () => {
                    this.SET_CONNECTION_STATUS(true);
                    console.log('Connected to server');
                });

                socket.on('disconnect', () => {
                    this.SET_CONNECTION_STATUS(false);
                    console.log('Disconnected from server');
                    this.showToastMessage({
                        message: 'Connection lost. Reconnecting...',
                        type: 'error'
                    });
                });

                // Game data updates
                socket.on('character_update', (data) => {
                    this.$store.commit('UPDATE_CHARACTER', data);
                });

                socket.on('location_update', (data) => {
                    this.$store.commit('UPDATE_LOCATION', data);
                });

                socket.on('actions_update', (data) => {
                    this.$store.commit('UPDATE_ACTIONS', data);
                });

                socket.on('logs_update', (data) => {
                    this.$store.commit('UPDATE_LOGS', data);
                });

                // Messages and errors
                socket.on('message', (data) => {
                    this.showToastMessage({
                        message: data.text,
                        type: 'success'
                    });
                });

                socket.on('error', (data) => {
                    this.showToastMessage({
                        message: data.message,
                        type: 'error'
                    });
                });

                // Initial data fetch
                this.fetchInitialData();
            }
        });

        // Use Vuex
        app.use(store);

        // Mount the app
        app.mount('#app');
        console.log("App mounted successfully");

    } catch (error) {
        console.error("Error initializing game:", error);
    }
});