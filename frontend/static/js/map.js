/**
 * Map module for handling the game map
 */
class MapManager {
    constructor() {
        // Map container
        this.mapContainer = document.getElementById('game-map');
        
        // Map data
        this.mapSize = 3; // 3x3 grid
        this.mapTiles = [];
        this.currentX = 1;
        this.currentY = 1;
        this.insideBuilding = false;
        
        // Location data
        this.locationElement = document.getElementById('location-name');
        this.descriptionElement = document.getElementById('location-description');
        this.buildingInfoElement = document.getElementById('building-info');
    }
    
    /**
     * Initialize the map
     */
    initialize() {
        this.createMapGrid();
        this.loadLocation();
    }
    
    /**
     * Create the map grid
     */
    createMapGrid() {
        this.mapContainer.innerHTML = '';
        
        for (let y = 0; y < this.mapSize; y++) {
            for (let x = 0; x < this.mapSize; x++) {
                const tile = document.createElement('div');
                tile.className = 'map-tile';
                tile.dataset.x = x;
                tile.dataset.y = y;
                
                // Add tile name placeholder
                const tileName = document.createElement('div');
                tileName.className = 'map-tile-name';
                tileName.textContent = `(${x}, ${y})`;
                tile.appendChild(tileName);
                
                // Add building marker placeholder (will be populated later)
                const buildingMarker = document.createElement('div');
                buildingMarker.className = 'building-marker hidden';
                tile.appendChild(buildingMarker);
                
                this.mapContainer.appendChild(tile);
                this.mapTiles.push(tile);
            }
        }
    }
    
    /**
     * Load location data from the API
     */
    async loadLocation() {
        const location = await GameAPI.getLocation();
        if (location) {
            this.updateLocation(location);
        }
    }
    
    /**
     * Update location data
     * @param {Object} locationData - Location data from the API
     */
    updateLocation(locationData) {
        if (!locationData) return;
        
        // Update location text
        this.locationElement.textContent = locationData.name;
        this.descriptionElement.textContent = locationData.description;
        
        // Update building info
        if (locationData.inside_building) {
            this.buildingInfoElement.classList.remove('hidden');
        } else {
            this.buildingInfoElement.classList.add('hidden');
        }
        
        // Update map position
        this.updateMapPosition(locationData);
    }
    
    /**
     * Update the map position
     * @param {Object} locationData - Location data with x, y coordinates
     */
    updateMapPosition(locationData) {
        // Store current position
        this.currentX = locationData.x ?? this.currentX;
        this.currentY = locationData.y ?? this.currentY;
        this.insideBuilding = locationData.inside_building ?? this.insideBuilding;
        
        // Update map tile visuals
        this.updateMapTiles();
    }
    
    /**
     * Update map tiles based on character position
     */
    updateMapTiles() {
        // Reset all tiles
        this.mapTiles.forEach(tile => {
            const x = parseInt(tile.dataset.x);
            const y = parseInt(tile.dataset.y);
            
            // Reset class
            tile.className = 'map-tile';
            
            // Mark current position
            if (x === this.currentX && y === this.currentY) {
                tile.classList.add('current');
            }
            
            // Add building marker if applicable
            const buildingMarker = tile.querySelector('.building-marker');
            if (buildingMarker) {
                buildingMarker.classList.add('hidden'); // Reset all building markers first
            }
        });
        
        // Make API call to get all location data for the map
        this.fetchMapData();
    }
    
    /**
     * Fetch map data for all tiles
     */
    async fetchMapData() {
        // In a real game, we would fetch all location data for the map
        // For this example, just add some placeholder building markers
        const buildingLocations = [
            {x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0},
            {x: 0, y: 1}, {x: 1, y: 1}, {x: 2, y: 1},
            {x: 0, y: 2}, {x: 1, y: 2}, {x: 2, y: 2}
        ];
        
        // Add building markers
        buildingLocations.forEach(loc => {
            const tile = this.getTileAt(loc.x, loc.y);
            if (tile) {
                const buildingMarker = tile.querySelector('.building-marker');
                if (buildingMarker) {
                    buildingMarker.classList.remove('hidden');
                }
            }
        });
    }
    
    /**
     * Get tile element at specific coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {HTMLElement} The tile element
     */
    getTileAt(x, y) {
        return this.mapTiles.find(tile => 
            parseInt(tile.dataset.x) === x && 
            parseInt(tile.dataset.y) === y
        );
    }
}
