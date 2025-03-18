from database import get_db, dict_to_redis_hash, redis_hash_to_dict


def initialize_world():
    """Initialize the 3x3 world grid with locations."""
    db = get_db()

    # Check if world already initialized
    if db.exists('world:initialized'):
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

    # Insert locations into Redis
    pipe = db.pipeline()

    for loc in locations:
        x, y, name, desc, has_building, b_name, b_desc = loc

        location_data = {
            'x': x,
            'y': y,
            'name': name,
            'description': desc,
            'has_building': has_building,
            'building_name': b_name,
            'building_description': b_desc
        }

        # Store location data
        pipe.hmset(f'location:{x}:{y}', dict_to_redis_hash(location_data))

    # Set flag that world is initialized
    pipe.set('world:initialized', '1')

    # Execute all commands
    pipe.execute()


def get_location_info(x, y, inside_building):
    """Get information about a location."""
    db = get_db()

    # Get location data
    location_data = db.hgetall(f'location:{x}:{y}')

    # If no location data found, return default
    if not location_data:
        return {
            'name': 'Unknown Area',
            'description': 'You seem to be lost.'
        }

    # Convert Redis hash to Python dict
    location_dict = redis_hash_to_dict(location_data)

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
            'has_building': bool(int(location_dict['has_building'])),
            'building_name': location_dict['building_name'] if int(location_dict['has_building']) else None
        }


def location_has_building(x, y):
    """Check if a location has a building."""
    db = get_db()

    # Get has_building field from location
    has_building = db.hget(f'location:{x}:{y}', 'has_building')

    if not has_building:
        return False

    return bool(int(has_building))