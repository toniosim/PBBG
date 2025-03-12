/**
 * Character module for handling character-related UI and logic
 */
class CharacterManager {
    constructor() {
        // Get UI elements
        this.nameElement = document.getElementById('character-name');
        this.healthBar = document.getElementById('health-bar');
        this.healthText = document.getElementById('health-text');
        this.mpBar = document.getElementById('mp-bar');
        this.mpText = document.getElementById('mp-text');
        this.apBar = document.getElementById('ap-bar');
        this.apText = document.getElementById('ap-text');
        this.experienceElement = document.getElementById('experience');
        
        // Character data
        this.characterData = null;
    }
    
    /**
     * Initialize character data
     */
    async initialize() {
        // Load initial character data
        await this.loadCharacter();
    }
    
    /**
     * Load character data from the API
     */
    async loadCharacter() {
        this.characterData = await GameAPI.getCharacter();
        this.updateUI();
    }
    
    /**
     * Update character data
     * @param {Object} newData - Updated character data
     */
    updateCharacter(newData) {
        if (!newData) return;
        
        this.characterData = newData;
        this.updateUI();
    }
    
    /**
     * Update the character UI with current data
     */
    updateUI() {
        if (!this.characterData) return;
        
        // Update name
        this.nameElement.textContent = this.characterData.name;
        document.getElementById('player-name').textContent = this.characterData.name;
        
        // Update health
        const healthPercent = (this.characterData.health / this.characterData.max_health) * 100;
        this.healthBar.style.width = `${healthPercent}%`;
        this.healthText.textContent = `${this.characterData.health}/${this.characterData.max_health}`;
        
        // Update MP
        const mpPercent = (this.characterData.mp / this.characterData.max_mp) * 100;
        this.mpBar.style.width = `${mpPercent}%`;
        this.mpText.textContent = `${this.characterData.mp}/${this.characterData.max_mp}`;
        
        // Update AP
        const apPercent = (this.characterData.ap / this.characterData.max_ap) * 100;
        this.apBar.style.width = `${apPercent}%`;
        this.apText.textContent = `${this.characterData.ap}/${this.characterData.max_ap}`;
        
        // Update experience
        this.experienceElement.textContent = this.characterData.experience;
    }
    
    /**
     * Check if character can perform an action that requires AP
     * @param {number} apCost - AP cost of the action
     * @returns {boolean} Whether the action can be performed
     */
    canPerformAction(apCost = 1) {
        return this.characterData && this.characterData.ap >= apCost;
    }
    
    /**
     * Get current character data
     * @returns {Object} Character data
     */
    getCharacterData() {
        return this.characterData;
    }
}
