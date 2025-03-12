/**
 * Main game module
 */
class Game {
    constructor() {
        // UI elements
        this.logContainer = document.getElementById('log-container');
        
        // Game subsystems
        this.characterManager = new CharacterManager();
        this.mapManager = new MapManager();
        this.actionsManager = new ActionsManager(
            this.characterManager, 
            this.mapManager, 
            this // Pass reference to game manager
        );
        
        // Game state
        this.isLoading = false;
        this.messageTimer = null;
    }
    
    /**
     * Initialize the game
     */
    async initialize() {
        // Initialize character
        await this.characterManager.initialize();
        
        // Initialize map
        this.mapManager.initialize();
        
        // Initialize actions
        await this.actionsManager.initialize();
        
        // Load logs
        await this.loadLogs();
        
        // Set up refresh timer (auto-refresh every minute)
        setInterval(() => this.refreshGame(), 60000);
    }
    
    /**
     * Refresh game state
     */
    async refreshGame() {
        await this.characterManager.loadCharacter();
        await this.mapManager.loadLocation();
        await this.actionsManager.loadActions();
        await this.loadLogs();
    }
    
    /**
     * Load action logs
     */
    async loadLogs() {
        const logs = await GameAPI.getLogs();
        this.updateLogs(logs);
    }
    
    /**
     * Update action logs in the UI
     * @param {Array} logs - Log entries
     */
    updateLogs(logs) {
        if (!logs || logs.length === 0) return;
        
        // Clear existing logs
        this.logContainer.innerHTML = '';
        
        // Add log entries
        logs.forEach(log => {
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            
            // Format timestamp
            let timestamp = 'Just now';
            if (log.timestamp) {
                const date = new Date(log.timestamp);
                timestamp = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            
            // Create timestamp element
            const timeElement = document.createElement('span');
            timeElement.className = 'log-time';
            timeElement.textContent = timestamp;
            
            // Create message element
            const messageElement = document.createElement('span');
            messageElement.className = 'log-message';
            messageElement.textContent = log.message;
            
            // Add elements to log entry
            logEntry.appendChild(timeElement);
            logEntry.appendChild(messageElement);
            
            // Add to container
            this.logContainer.appendChild(logEntry);
        });
        
        // Scroll to bottom
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }
    
    /**
     * Show a temporary message
     * @param {string} message - Message to display
     */
    showMessage(message) {
        // Clear existing message
        if (this.messageTimer) {
            clearTimeout(this.messageTimer);
        }
        
        // Add message to log
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry message-entry';
        
        const timeElement = document.createElement('span');
        timeElement.className = 'log-time';
        timeElement.textContent = 'Now';
        
        const messageElement = document.createElement('span');
        messageElement.className = 'log-message';
        messageElement.textContent = message;
        
        logEntry.appendChild(timeElement);
        logEntry.appendChild(messageElement);
        
        this.logContainer.appendChild(logEntry);
        
        // Scroll to bottom
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
        
        // Remove message after 5 seconds
        this.messageTimer = setTimeout(() => {
            if (logEntry.parentNode === this.logContainer) {
                this.logContainer.removeChild(logEntry);
            }
        }, 5000);
    }
    
    /**
     * Show an error message
     * @param {string} message - Error message
     */
    showError(message) {
        this.showMessage(`Error: ${message}`);
    }
    
    /**
     * Show loading state
     */
    showLoading() {
        this.isLoading = true;
        document.body.classList.add('loading');
    }
    
    /**
     * Hide loading state
     */
    hideLoading() {
        this.isLoading = false;
        document.body.classList.remove('loading');
    }
}

// Initialize the game when document is ready
document.addEventListener('DOMContentLoaded', async () => {
    const game = new Game();
    await game.initialize();
});
