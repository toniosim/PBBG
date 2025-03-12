from database import get_db
import sqlite3

def initialize_world():
    """Initialize the 3x3 world grid with locations."""
    db = get_db()
    cursor = db.cursor()
    
    # Check if world already initialized
    cursor.execute('SELECT COUNT(*) FROM locations')
    if cursor.fetchone()[0] > 0:
        return  # World already initialized
    
    # Create the 3x3 grid
    locations = [
        # Row 0
        (0, 0, 'Forest Edge', 'A dense forest borders this area to the north and west.', 1,
         'Ranger Station', 'A small wooden station used by the local forest rangers.'),
        (1, 0, 'North Road', 'A well-traveled road runs north to south.', 1,
         'Roadside Inn', 'A cozy inn offering respite to weary travelers.'),
        (2, 0, 'Eastern Hills', 'Rolling hills stretch to the east as far as the eye can see.', 1,
         'Old Windmill', 'A weathered windmill creaks in the breeze.'),
        
        # Row 1
        (0, 1, 'Western Creek', 'A small creek flows from the northwest to the southeast.', 1,
         'Fisherman\'s Hut', 'A simple wooden hut with fishing gear scattered around.'),
        (1, 1, 'Town Square', 'The central hub of a small settlement.', 1,
         'Town Hall', 'A modest but well-maintained building where town business is conducted.'),
        (2, 1, 'Marketplace', 'Stalls are set up for traders and merchants.', 1,
         'General Store', 'A store selling various goods and supplies.'),
        
        # Row 2
        (0, 2, 'Southwestern Farm', 'Tilled fields stretch across the landscape.', 1,
         'Farmhouse', 'A rustic farmhouse with a smoking chimney.'),
        (1, 2, 'South Road', 'A dusty road continues southward.', 1,
         'Guard Post', 'A small outpost where guards keep watch over the southern approach.'),
        (2, 2, 'Southeastern Meadow', 'A meadow full of wildflowers and tall grass.', 1,
         'Abandoned Cottage', 'A partially ruined cottage, long since abandoned.')
    ]
    
    # Insert locations into the database
    cursor.executemany(
        '''INSERT INTO locations 
           (x, y, name, description, has_building, building_name, building_description) 
           VALUES (?, ?, ?, ?, ?, ?, ?)''',
        locations
    )
    
    db.commit()

def get_location_info(x, y, inside_building):
    """Get information about a location."""
    db = get_db()
    db.row_factory = sqlite3.Row
    
    cursor = db.execute('SELECT * FROM locations WHERE x = ? AND y = ?', (x, y))
    location = cursor.fetchone()
    
    if not location:
        return {
            'name': 'Unknown Area',
            'description': 'You seem to be lost.'
        }
    
    # Convert row to dictionary
    location_dict = dict(location)
    
    # Format response based on whether player is inside or outside
    if inside_building:
        return {
            'name': location_dict['building_name'],
            'description': location_dict['building_description'],
            'inside_building': True,
            'building_name': location_dict['building_name']
        }
    else:
        return {
            'name': location_dict['name'],
            'description': location_dict['description'],
            'inside_building': False,
            'has_building': bool(location_dict['has_building']),
            'building_name': location_dict['building_name'] if location_dict['has_building'] else None
        }

def location_has_building(x, y):
    """Check if a location has a building."""
    db = get_db()
    
    cursor = db.execute('SELECT has_building FROM locations WHERE x = ? AND y = ?', (x, y))
    location = cursor.fetchone()
    
    if not location:
        return False
    
    return bool(location[0])
