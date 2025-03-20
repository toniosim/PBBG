/**
 * Main Pinia store for the game
 */

// Create the store with the Pinia defineStore function
// Using global variables since we're not using a module system
const useGameStore = Pinia.defineStore('gameStore', {
    state: () => ({
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
    }),

    getters: {
        // Calculate health percentage for progress bar
        healthPercent: (state) => {
            return (state.character.health / state.character.max_health) * 100;
        },

        // Calculate MP percentage for progress bar
        mpPercent: (state) => {
            return (state.character.mp / state.character.max_mp) * 100;
        },

        // Calculate AP percentage for progress bar
        apPercent: (state) => {
            return (state.character.ap / state.character.max_ap) * 100;
        },

        // Get current X position
        currentX: (state) => state.character.x,

        // Get current Y position
        currentY: (state) => state.character.y
    },

    actions: {
        /**
         * Initialize the map grid
         */
        initializeMap() {
            console.log("Initializing map...");
            this.mapTiles = [];
            for (let y = 0; y < this.mapSize; y++) {
                for (let x = 0; x < this.mapSize; x++) {
                    this.mapTiles.push({
                        x: x,
                        y: y,
                        has_building: true, // Placeholder, will be updated
                        current: (x === this.character.x && y === this.character.y)
                    });
                }
            }
        },

        /**
         * Update character data
         */
        updateCharacter(characterData) {
            if (!characterData) return;

            this.character = characterData;
            this.updateMapTiles();
        },

        /**
         * Update location data
         */
        updateLocation(locationData) {
            if (!locationData) return;
            this.location = locationData;
        },

        /**
         * Update available actions
         */
        updateActions(actions) {
            if (!actions) return;
            this.availableActions = actions;
        },

        /**
         * Update logs
         */
        updateLogs(logs) {
            if (!logs) return;
            this.logs = logs;
        },

        /**
         * Update map tiles based on current position
         */
        updateMapTiles() {
            this.mapTiles.forEach(tile => {
                tile.current = (tile.x === this.character.x && tile.y === this.character.y);
            });
        },

        /**
         * Show a toast message
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
         * Set connection status
         */
        setConnectionStatus(status) {
            this.connected = status;
        },

        /**
         * Open modal with action details
         */
        openModal(title, action, actionType, options) {
            this.modalTitle = title;
            this.modalAction = action;
            this.modalActionType = actionType;
            this.modalOptions = options || [];
            this.selectedOption = this.modalOptions.length > 0 ? this.modalOptions[0].value : '';
            this.showModal = true;
        },

        /**
         * Close the modal
         */
        closeModal() {
            this.showModal = false;
        },

        /**
         * Fetch initial game data
         */
        async fetchInitialData() {
            try {
                // Get character data
                const characterResponse = await fetch('/api/character');
                if (characterResponse.ok) {
                    const characterData = await characterResponse.json();
                    this.updateCharacter(characterData);
                }

                // Get location data
                const locationResponse = await fetch('/api/location');
                if (locationResponse.ok) {
                    this.updateLocation(await locationResponse.json());
                }

                // Get available actions
                const actionsResponse = await fetch('/api/actions');
                if (actionsResponse.ok) {
                    this.updateActions(await actionsResponse.json());
                }

                // Get action logs
                const logsResponse = await fetch('/api/logs');
                if (logsResponse.ok) {
                    this.updateLogs(await logsResponse.json());
                }
            } catch (error) {
                console.error('Error fetching initial data:', error);
                this.showToastMessage('Error loading game data', 'error');
            }
        }
    }
});