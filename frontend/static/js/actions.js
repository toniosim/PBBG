/**
 * Actions module for handling game actions
 */
class ActionsManager {
    constructor(characterManager, mapManager, gameManager) {
        // Store references to other managers
        this.characterManager = characterManager;
        this.mapManager = mapManager;
        this.gameManager = gameManager;
        
        // UI elements
        this.actionsContainer = document.getElementById('actions-container');
        this.modal = document.getElementById('action-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.modalBody = document.getElementById('modal-body');
        this.modalConfirm = document.getElementById('modal-confirm');
        this.modalCancel = document.getElementById('modal-cancel');
        this.closeModal = document.querySelector('.close-modal');
        
        // Available actions
        this.availableActions = [];
        
        // Bind event handlers
        this.bindEvents();
    }
    
    /**
     * Initialize actions
     */
    async initialize() {
        // Load available actions
        await this.loadActions();
    }
    
    /**
     * Bind event handlers
     */
    bindEvents() {
        // Modal close button
        this.closeModal.addEventListener('click', () => {
            this.hideModal();
        });
        
        // Modal cancel button
        this.modalCancel.addEventListener('click', () => {
            this.hideModal();
        });
        
        // Close modal on outside click
        window.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.hideModal();
            }
        });
    }
    
    /**
     * Load available actions from the API
     */
    async loadActions() {
        this.availableActions = await GameAPI.getActions();
        this.renderActions();
    }
    
    /**
     * Update available actions
     * @param {Array} actions - New available actions
     */
    updateActions(actions) {
        if (!actions) return;
        
        this.availableActions = actions;
        this.renderActions();
    }
    
    /**
     * Render action buttons
     */
    renderActions() {
        this.actionsContainer.innerHTML = '';
        
        if (!this.availableActions || this.availableActions.length === 0) {
            const noActions = document.createElement('p');
            noActions.textContent = 'No actions available.';
            this.actionsContainer.appendChild(noActions);
            return;
        }
        
        this.availableActions.forEach(action => {
            const button = document.createElement('button');
            button.className = 'action-button';
            button.textContent = action.name;
            
            // Check if character has enough AP for the action
            const apCost = this.getActionAPCost(action.type);
            const canPerform = this.characterManager.canPerformAction(apCost);
            
            if (!canPerform) {
                button.disabled = true;
                button.title = 'Not enough AP';
            }
            
            // Add action handler
            button.addEventListener('click', () => {
                this.handleAction(action);
            });
            
            this.actionsContainer.appendChild(button);
        });
    }
    
    /**
     * Handle action click
     * @param {Object} action - Action data
     */
    handleAction(action) {
        // Check if this action needs options
        if (action.options && action.options.length > 0) {
            this.showActionOptions(action);
        } else {
            this.confirmAction(action);
        }
    }
    
    /**
     * Show action options in modal
     * @param {Object} action - Action data
     */
    showActionOptions(action) {
        this.modalTitle.textContent = `${action.name}`;
        this.modalBody.innerHTML = '';
        
        // Create option selection
        if (action.type === 'MOVE') {
            // Create direction buttons for movement
            const directionsContainer = document.createElement('div');
            directionsContainer.className = 'directions-container';
            
            action.options.forEach(option => {
                const dirButton = document.createElement('button');
                dirButton.className = 'btn-direction';
                dirButton.textContent = option.label;
                dirButton.dataset.value = option.value;
                
                dirButton.addEventListener('click', () => {
                    this.performAction(action.type, { direction: option.value });
                    this.hideModal();
                });
                
                directionsContainer.appendChild(dirButton);
            });
            
            this.modalBody.appendChild(directionsContainer);
            
            // Hide confirm button since we're using direction buttons
            this.modalConfirm.style.display = 'none';
        } else {
            // Create select dropdown for other action types
            const select = document.createElement('select');
            select.id = 'action-options';
            
            action.options.forEach(option => {
                const optionEl = document.createElement('option');
                optionEl.value = option.value;
                optionEl.textContent = option.label;
                select.appendChild(optionEl);
            });
            
            this.modalBody.appendChild(select);
            
            // Set up confirm button
            this.modalConfirm.style.display = 'block';
            this.modalConfirm.onclick = () => {
                const selectedValue = document.getElementById('action-options').value;
                this.performAction(action.type, { option: selectedValue });
                this.hideModal();
            };
        }
        
        this.showModal();
    }
    
    /**
     * Show action confirmation
     * @param {Object} action - Action data
     */
    confirmAction(action) {
        this.modalTitle.textContent = `Confirm ${action.name}`;
        this.modalBody.innerHTML = `<p>Are you sure you want to ${action.name.toLowerCase()}?</p>`;
        
        // Set up confirm button
        this.modalConfirm.style.display = 'block';
        this.modalConfirm.onclick = () => {
            this.performAction(action.type);
            this.hideModal();
        };
        
        this.showModal();
    }
    
    /**
     * Perform an action
     * @param {string} actionType - Type of action
     * @param {Object} actionData - Additional action data
     */
    async performAction(actionType, actionData = {}) {
        // Show loading state
        this.gameManager.showLoading();
        
        // Perform the action via API
        const result = await GameAPI.performAction(actionType, actionData);
        
        if (result.success) {
            // Update character data
            if (result.character) {
                this.characterManager.updateCharacter(result.character);
            }
            
            // Update location
            if (result.location) {
                this.mapManager.updateLocation(result.location);
            }
            
            // Update actions
            if (result.available_actions) {
                this.updateActions(result.available_actions);
            }
            
            // Update logs
            if (result.logs) {
                this.gameManager.updateLogs(result.logs);
            }
            
            // Show message
            if (result.message) {
                this.gameManager.showMessage(result.message);
            }
        } else {
            // Show error
            this.gameManager.showError(result.message || 'Action failed');
        }
        
        // Hide loading state
        this.gameManager.hideLoading();
    }
    
    /**
     * Show modal
     */
    showModal() {
        this.modal.classList.add('show');
    }
    
    /**
     * Hide modal
     */
    hideModal() {
        this.modal.classList.remove('show');
    }
    
    /**
     * Get AP cost for an action type
     * @param {string} actionType - Type of action
     * @returns {number} AP cost
     */
    getActionAPCost(actionType) {
        // Define AP costs for different action types
        const apCosts = {
            'MOVE': 1,
            'ENTER_BUILDING': 1,
            'EXIT_BUILDING': 1,
            'REST': 2,
            'SEARCH': 1
        };
        
        return apCosts[actionType] || 1; // Default to 1 AP if not specified
    }
}
