/**
 * Vue.js Game Application
 */
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Socket.IO connection
    const socket = io();
    
    // Create Vue application
    const app = new Vue({
        el: '#app',
        data: {
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
            currentX: 1,
            currentY: 1,
            
            // Modal state
            showModal: false,
            modalTitle: '',
            modalAction: '',
            modalActionType: '',
            modalOptions: [],
            selectedOption: '',
            
            // Toast message
            showToast: false,
            toastMessage: '',
            toastType: 'info',
            toastTimer: null,
            
            // WebSocket connection status
            connected: false,
            
            // Action AP costs
            actionCosts: {
                'MOVE': 1,
                'ENTER_BUILDING': 1,
                'EXIT_BUILDING': 1,
                'REST': 2,
                'SEARCH': 1
            }
        },
        
        computed: {
            // Calculate health percentage for progress bar
            healthPercent() {
                return (this.character.health / this.character.max_health) * 100;
            },
            
            // Calculate MP percentage for progress bar
            mpPercent() {
                return (this.character.mp / this.character.max_mp) * 100;
            },
            
            // Calculate AP percentage for progress bar
            apPercent() {
                return (this.character.ap / this.character.max_ap) * 100;
            }
        },
        
        created() {
            // Initialize map grid
            this.initializeMap();
            
            // Set up Socket.IO event listeners
            this.setupSocketListeners();
            
            // Initial data fetch
            this.fetchInitialData();
        },
        
        methods: {
            /**
             * Initialize the map grid
             */
            initializeMap() {
                this.mapTiles = [];
                for (let y = 0; y < this.mapSize; y++) {
                    for (let x = 0; x < this.mapSize; x++) {
                        this.mapTiles.push({
                            x: x,
                            y: y,
                            has_building: true, // Placeholder, will be updated
                            current: (x === this.currentX && y === this.currentY)
                        });
                    }
                }
            },
            
            /**
             * Set up Socket.IO event listeners
             */
            setupSocketListeners() {
                // Connection events
                socket.on('connect', () => {
                    this.connected = true;
                    console.log('Connected to server');
                });
                
                socket.on('disconnect', () => {
                    this.connected = false;
                    console.log('Disconnected from server');
                    this.showToastMessage('Connection lost. Reconnecting...', 'error');
                });
                
                // Game data updates
                socket.on('character_update', (data) => {
                    this.character = data;
                    
                    // Update map position
                    this.currentX = data.x;
                    this.currentY = data.y;
                    this.updateMapTiles();
                });
                
                socket.on('location_update', (data) => {
                    this.location = data;
                });
                
                socket.on('actions_update', (data) => {
                    this.availableActions = data;
                });
                
                socket.on('logs_update', (data) => {
                    this.logs = data;
                });
                
                // Messages and errors
                socket.on('message', (data) => {
                    this.showToastMessage(data.text, 'success');
                });
                
                socket.on('error', (data) => {
                    this.showToastMessage(data.message, 'error');
                });
            },
            
            /**
             * Fetch initial data using REST API
             */
            async fetchInitialData() {
                try {
                    // Get character data
                    const characterResponse = await fetch('/api/character');
                    if (characterResponse.ok) {
                        this.character = await characterResponse.json();
                        this.currentX = this.character.x;
                        this.currentY = this.character.y;
                        this.updateMapTiles();
                    }
                    
                    // Get location data
                    const locationResponse = await fetch('/api/location');
                    if (locationResponse.ok) {
                        this.location = await locationResponse.json();
                    }
                    
                    // Get available actions
                    const actionsResponse = await fetch('/api/actions');
                    if (actionsResponse.ok) {
                        this.availableActions = await actionsResponse.json();
                    }
                    
                    // Get action logs
                    const logsResponse = await fetch('/api/logs');
                    if (logsResponse.ok) {
                        this.logs = await logsResponse.json();
                    }
                } catch (error) {
                    console.error('Error fetching initial data:', error);
                    this.showToastMessage('Error loading game data', 'error');
                }
            },
            
            /**
             * Update map tiles based on current position
             */
            updateMapTiles() {
                this.mapTiles.forEach(tile => {
                    tile.current = (tile.x === this.currentX && tile.y === this.currentY);
                });
            },
            
            /**
             * Handle map tile click
             */
            tileClick(tile) {
                // Only allow clicking adjacent tiles
                const distance = Math.abs(tile.x - this.currentX) + Math.abs(tile.y - this.currentY);
                
                if (distance === 1 && !this.character.inside_building) {
                    // Determine direction
                    let direction;
                    if (tile.y < this.currentY) direction = 'north';
                    else if (tile.y > this.currentY) direction = 'south';
                    else if (tile.x < this.currentX) direction = 'west';
                    else if (tile.x > this.currentX) direction = 'east';
                    
                    // Perform move action
                    if (direction) {
                        this.performAction('MOVE', { direction });
                    }
                }
            },
            
            /**
             * Handle action button click
             */
            handleAction(action) {
                // Store current action
                this.modalTitle = action.name;
                this.modalAction = action.name;
                this.modalActionType = action.type;
                this.modalOptions = action.options || [];
                
                // Reset selected option
                this.selectedOption = this.modalOptions.length > 0 ? this.modalOptions[0].value : '';
                
                // Show modal
                this.showModal = true;
            },
            
            /**
             * Confirm action from modal
             */
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
            
            /**
             * Hide modal
             */
            hideModal() {
                this.showModal = false;
            },
            
            /**
             * Perform game action
             */
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
                    this.performActionREST(actionType, actionData);
                }
                
                // Hide modal
                this.hideModal();
            },
            
            /**
             * Perform action using REST API (fallback)
             */
            async performActionREST(actionType, actionData = {}) {
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
                                this.character = result.character;
                                this.currentX = result.character.x;
                                this.currentY = result.character.y;
                                this.updateMapTiles();
                            }
                            
                            // Update location
                            if (result.location) {
                                this.location = result.location;
                            }
                            
                            // Update actions
                            if (result.available_actions) {
                                this.availableActions = result.available_actions;
                            }
                            
                            // Update logs
                            if (result.logs) {
                                this.logs = result.logs;
                            }
                            
                            // Show message
                            if (result.message) {
                                this.showToastMessage(result.message, 'success');
                            }
                        } else {
                            this.showToastMessage(result.message || 'Action failed', 'error');
                        }
                    } else {
                        this.showToastMessage('Error performing action', 'error');
                    }
                } catch (error) {
                    console.error('Error performing action:', error);
                    this.showToastMessage('Error performing action', 'error');
                }
            },
            
            /**
             * Check if character can perform an action
             */
            canPerformAction(actionType) {
                const cost = this.actionCosts[actionType] || 1;
                return this.character.ap >= cost;
            },
            
            /**
             * Show toast message
             */
            showToastMessage(message, type = 'info') {
                // Clear previous timer if exists
                if (this.toastTimer) {
                    clearTimeout(this.toastTimer);
                }
                
                // Set toast data
                this.toastMessage = message;
                this.toastType = type;
                this.showToast = true;
                
                // Auto-hide after 5 seconds
                this.toastTimer = setTimeout(() => {
                    this.showToast = false;
                }, 5000);
            },
            
            /**
             * Format log timestamp
             */
            formatLogTime(timestamp) {
                if (!timestamp) return 'Just now';
                
                const date = new Date(timestamp);
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
        }
    });
});
