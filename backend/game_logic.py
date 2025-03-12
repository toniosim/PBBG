from models import (
    get_character_by_user_id, 
    update_character_position, 
    update_character_stats,
    add_action_log,
    get_action_logs
)
from world_data import get_location_info, location_has_building

def process_action(user_id, action_type, action_data=None):
    """Process a player action and return the result."""
    if action_data is None:
        action_data = {}
    
    character = get_character_by_user_id(user_id)
    character_id = character['id']
    
    result = {
        'success': True,
        'message': '',
        'character_updates': {},
        'log_entry': ''
    }
    
    # Handle different action types
    if action_type == 'MOVE':
        result = handle_move(character, action_data.get('direction'))
    elif action_type == 'ENTER_BUILDING':
        result = handle_enter_building(character)
    elif action_type == 'EXIT_BUILDING':
        result = handle_exit_building(character)
    elif action_type == 'REST':
        result = handle_rest(character)
    elif action_type == 'SEARCH':
        result = handle_search(character)
    else:
        result['success'] = False
        result['message'] = 'Invalid action type'
        return result
    
    # Apply character updates
    if result['success'] and result['character_updates']:
        if 'position' in result['character_updates']:
            pos = result['character_updates']['position']
            update_character_position(
                character_id, 
                pos['x'], 
                pos['y'], 
                pos['inside_building']
            )
        
        if 'stats' in result['character_updates']:
            stats = result['character_updates']['stats']
            update_character_stats(
                character_id,
                health=stats.get('health'),
                mp=stats.get('mp'),
                ap=stats.get('ap'),
                experience=stats.get('experience')
            )
    
    # Add action log
    if result['success'] and result['log_entry']:
        add_action_log(character_id, action_type, result['log_entry'])
    
    # Get updated character data
    updated_character = get_character_by_user_id(user_id)
    result['character'] = updated_character
    
    # Get location info
    result['location'] = get_location_info(
        updated_character['x'], 
        updated_character['y'], 
        updated_character['inside_building']
    )
    
    # Get available actions
    result['available_actions'] = get_available_actions(
        updated_character['x'], 
        updated_character['y'], 
        updated_character['inside_building']
    )
    
    # Get recent logs
    result['logs'] = get_action_logs(character_id)
    
    return result

def get_available_actions(x, y, inside_building):
    """Get available actions for a character at a specific location."""
    actions = []
    
    # Movement is always available when outside
    if not inside_building:
        actions.append({
            'type': 'MOVE',
            'name': 'Move',
            'options': [
                {'value': 'north', 'label': 'North'},
                {'value': 'east', 'label': 'East'},
                {'value': 'south', 'label': 'South'},
                {'value': 'west', 'label': 'West'}
            ]
        })
    
    # Enter building action
    if not inside_building and location_has_building(x, y):
        actions.append({
            'type': 'ENTER_BUILDING',
            'name': 'Enter Building',
            'options': []
        })
    
    # Exit building action
    if inside_building:
        actions.append({
            'type': 'EXIT_BUILDING',
            'name': 'Exit Building',
            'options': []
        })
    
    # Rest action is always available
    actions.append({
        'type': 'REST',
        'name': 'Rest',
        'options': []
    })
    
    # Search action
    actions.append({
        'type': 'SEARCH',
        'name': 'Search Area',
        'options': []
    })
    
    return actions

def handle_move(character, direction):
    """Handle character movement."""
    result = {
        'success': True,
        'message': '',
        'character_updates': {},
        'log_entry': ''
    }
    
    # Check if character has enough AP
    if character['ap'] < 1:
        result['success'] = False
        result['message'] = 'Not enough AP to move'
        return result
    
    # Determine new position based on direction
    new_x, new_y = character['x'], character['y']
    
    if direction == 'north':
        new_y = max(0, character['y'] - 1)
    elif direction == 'east':
        new_x = min(2, character['x'] + 1)
    elif direction == 'south':
        new_y = min(2, character['y'] + 1)
    elif direction == 'west':
        new_x = max(0, character['x'] - 1)
    else:
        result['success'] = False
        result['message'] = 'Invalid direction'
        return result
    
    # Check if actually moved
    if new_x == character['x'] and new_y == character['y']:
        result['message'] = "You can't move any further in that direction."
        return result
    
    # Update position and AP
    result['character_updates']['position'] = {
        'x': new_x,
        'y': new_y,
        'inside_building': False
    }
    
    result['character_updates']['stats'] = {
        'ap': character['ap'] - 1
    }
    
    result['message'] = f'Moved {direction}'
    result['log_entry'] = f'Moved {direction} to ({new_x}, {new_y})'
    
    return result

def handle_enter_building(character):
    """Handle entering a building."""
    result = {
        'success': True,
        'message': '',
        'character_updates': {},
        'log_entry': ''
    }
    
    # Check if character has enough AP
    if character['ap'] < 1:
        result['success'] = False
        result['message'] = 'Not enough AP to enter building'
        return result
    
    # Check if there's a building to enter
    if not location_has_building(character['x'], character['y']):
        result['success'] = False
        result['message'] = 'No building to enter at this location'
        return result
    
    # Update position and AP
    result['character_updates']['position'] = {
        'x': character['x'],
        'y': character['y'],
        'inside_building': True
    }
    
    result['character_updates']['stats'] = {
        'ap': character['ap'] - 1
    }
    
    location = get_location_info(character['x'], character['y'], False)
    building_name = location.get('building_name', 'building')
    
    result['message'] = f'Entered {building_name}'
    result['log_entry'] = f'Entered {building_name} at ({character["x"]}, {character["y"]})'
    
    return result

def handle_exit_building(character):
    """Handle exiting a building."""
    result = {
        'success': True,
        'message': '',
        'character_updates': {},
        'log_entry': ''
    }
    
    # Check if character has enough AP
    if character['ap'] < 1:
        result['success'] = False
        result['message'] = 'Not enough AP to exit building'
        return result
    
    # Check if character is actually in a building
    if not character['inside_building']:
        result['success'] = False
        result['message'] = 'Not inside a building'
        return result
    
    # Update position and AP
    result['character_updates']['position'] = {
        'x': character['x'],
        'y': character['y'],
        'inside_building': False
    }
    
    result['character_updates']['stats'] = {
        'ap': character['ap'] - 1
    }
    
    location = get_location_info(character['x'], character['y'], True)
    building_name = location.get('building_name', 'building')
    
    result['message'] = f'Exited {building_name}'
    result['log_entry'] = f'Exited {building_name} at ({character["x"]}, {character["y"]})'
    
    return result

def handle_rest(character):
    """Handle resting to recover HP and MP."""
    result = {
        'success': True,
        'message': '',
        'character_updates': {},
        'log_entry': ''
    }
    
    # Check if character has enough AP
    if character['ap'] < 2:
        result['success'] = False
        result['message'] = 'Not enough AP to rest (need 2 AP)'
        return result
    
    # Calculate recovery amounts
    hp_recovery = min(10, character['max_health'] - character['health'])
    mp_recovery = min(10, character['max_mp'] - character['mp'])
    
    # Update stats
    result['character_updates']['stats'] = {
        'health': character['health'] + hp_recovery,
        'mp': character['mp'] + mp_recovery,
        'ap': character['ap'] - 2
    }
    
    result['message'] = f'Rested and recovered {hp_recovery} HP and {mp_recovery} MP'
    result['log_entry'] = f'Rested and recovered {hp_recovery} HP and {mp_recovery} MP'
    
    return result

def handle_search(character):
    """Handle searching the area."""
    result = {
        'success': True,
        'message': '',
        'character_updates': {},
        'log_entry': ''
    }
    
    # Check if character has enough AP
    if character['ap'] < 1:
        result['success'] = False
        result['message'] = 'Not enough AP to search'
        return result
    
    # For now, just a simple search with no rewards
    result['character_updates']['stats'] = {
        'ap': character['ap'] - 1
    }
    
    location_type = 'building' if character['inside_building'] else 'area'
    result['message'] = f'Searched the {location_type} but found nothing'
    result['log_entry'] = f'Searched the {location_type} at ({character["x"]}, {character["y"]}) but found nothing'
    
    return result
