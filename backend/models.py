from database import get_db, get_next_id, dict_to_redis_hash, redis_hash_to_dict
from datetime import datetime
import json
import time


def create_user(username, password_hash, character_name):
    """Create a new user and character."""
    db = get_db()

    # Check if username already exists
    if db.exists(f'username:{username}'):
        raise ValueError("Username already exists")

    # Get new IDs
    user_id = get_next_id('users')
    character_id = get_next_id('characters')

    try:
        # Create user
        user_data = {
            'id': user_id,
            'username': username,
            'password_hash': password_hash,
            'created_at': datetime.now().isoformat()
        }

        # Create character
        character_data = {
            'id': character_id,
            'user_id': user_id,
            'name': character_name,
            'health': 100,
            'max_health': 100,
            'mp': 100,
            'max_mp': 100,
            'ap': 10,
            'max_ap': 10,
            'experience': 0,
            'x': 1,
            'y': 1,
            'inside_building': 0,
            'created_at': datetime.now().isoformat()
        }

        # Store in Redis
        pipe = db.pipeline()

        # Store user
        pipe.hmset(f'user:{user_id}', dict_to_redis_hash(user_data))
        pipe.set(f'username:{username}', user_id)

        # Store character
        pipe.hmset(f'character:{character_id}', dict_to_redis_hash(character_data))
        pipe.set(f'user_character:{user_id}', character_id)

        # Create initial action log
        log_id = get_next_id('action_logs')
        log_data = {
            'id': log_id,
            'character_id': character_id,
            'action_type': 'SIGNUP',
            'message': f'Created character {character_name}',
            'created_at': datetime.now().isoformat()
        }

        # Store log in a sorted set
        timestamp = time.time()
        pipe.zadd(f'action_logs:{character_id}', {json.dumps(log_data): timestamp})

        # Execute all commands
        pipe.execute()

        return user_id
    except Exception as e:
        # Redis doesn't have transactions in the same way as SQLite,
        # but we can at least raise the error
        raise e


def get_user_by_username(username):
    """Get a user by username."""
    db = get_db()

    # Get user_id from username
    user_id = db.get(f'username:{username}')
    if not user_id:
        return None

    # Get user data
    user_data = db.hgetall(f'user:{user_id}')
    return redis_hash_to_dict(user_data)


def get_user_by_id(user_id):
    """Get a user by id."""
    db = get_db()

    user_data = db.hgetall(f'user:{user_id}')
    return redis_hash_to_dict(user_data)


def get_character_by_user_id(user_id):
    """Get a character by user_id."""
    db = get_db()

    # Get character_id from user_id
    character_id = db.get(f'user_character:{user_id}')
    if not character_id:
        return None

    # Get character data
    character_data = db.hgetall(f'character:{character_id}')
    return redis_hash_to_dict(character_data)


def update_character_position(character_id, x, y, inside_building):
    """Update a character's position."""
    db = get_db()

    # Update specific fields
    db.hmset(f'character:{character_id}', {
        'x': x,
        'y': y,
        'inside_building': 1 if inside_building else 0
    })


def update_character_stats(character_id, health=None, mp=None, ap=None, experience=None):
    """Update a character's stats."""
    db = get_db()

    # Get current character data
    character_data = redis_hash_to_dict(db.hgetall(f'character:{character_id}'))
    if not character_data:
        return

    # Prepare updates
    updates = {}

    if health is not None:
        updates['health'] = min(health, character_data['max_health'])

    if mp is not None:
        updates['mp'] = min(mp, character_data['max_mp'])

    if ap is not None:
        updates['ap'] = min(ap, character_data['max_ap'])

    if experience is not None:
        updates['experience'] = experience

    # Apply updates if any
    if updates:
        db.hmset(f'character:{character_id}', dict_to_redis_hash(updates))


def add_action_log(character_id, action_type, message):
    """Add an action log entry."""
    db = get_db()

    # Create log entry
    log_id = get_next_id('action_logs')
    log_data = {
        'id': log_id,
        'character_id': character_id,
        'action_type': action_type,
        'message': message,
        'created_at': datetime.now().isoformat()
    }

    # Add to sorted set with current timestamp as score
    timestamp = time.time()
    db.zadd(f'action_logs:{character_id}', {json.dumps(log_data): timestamp})


def get_action_logs(character_id, limit=10):
    """Get recent action logs for a character."""
    db = get_db()

    # Get the most recent logs from the sorted set
    log_entries = db.zrevrange(f'action_logs:{character_id}', 0, limit - 1)

    # Parse JSON strings back to dictionaries
    logs = [json.loads(entry) for entry in log_entries]

    return logs