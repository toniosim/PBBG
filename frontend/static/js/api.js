/**
 * API helper for making requests to the backend
 */
class GameAPI {
    /**
     * Get character information
     * @returns {Promise<Object>} Character data
     */
    static async getCharacter() {
        try {
            const response = await fetch('/api/character', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/login'; // Redirect if unauthorized
                    return null;
                }
                throw new Error('Failed to fetch character data');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching character:', error);
            return null;
        }
    }
    
    /**
     * Get location information
     * @returns {Promise<Object>} Location data
     */
    static async getLocation() {
        try {
            const response = await fetch('/api/location', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch location data');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching location:', error);
            return null;
        }
    }
    
    /**
     * Get available actions
     * @returns {Promise<Array>} Available actions
     */
    static async getActions() {
        try {
            const response = await fetch('/api/actions', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch actions');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching actions:', error);
            return [];
        }
    }
    
    /**
     * Get action logs
     * @returns {Promise<Array>} Action logs
     */
    static async getLogs() {
        try {
            const response = await fetch('/api/logs', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch logs');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching logs:', error);
            return [];
        }
    }
    
    /**
     * Perform an action
     * @param {string} actionType - The type of action to perform
     * @param {Object} actionData - Additional data for the action
     * @returns {Promise<Object>} Result of the action
     */
    static async performAction(actionType, actionData = {}) {
        try {
            const response = await fetch('/api/action', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    action_type: actionType,
                    action_data: actionData
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to perform action');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error performing action:', error);
            return {
                success: false,
                message: 'Failed to perform action'
            };
        }
    }
}
