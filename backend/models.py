from database import get_db
import sqlite3
from datetime import datetime

def dict_factory(cursor, row):
    """Convert database row objects to dictionaries."""
    fields = [column[0] for column in cursor.description]
    return {key: value for key, value in zip(fields, row)}

def create_user(username, password_hash, character_name):
    """Create a new user and character."""
    db = get_db()
    db.row_factory = sqlite3.Row
    
    try:
        # Insert the user
        cursor = db.execute(
            'INSERT INTO users (username, password_hash) VALUES (?, ?)',
            (username, password_hash)
        )
        user_id = cursor.lastrowid
        
        # Create a character for the user
        db.execute(
            'INSERT INTO characters (user_id, name) VALUES (?, ?)',
            (user_id, character_name)
        )
        
        # Create initial action log
        character_cursor = db.execute('SELECT id FROM characters WHERE user_id = ?', (user_id,))
        character_id = character_cursor.fetchone()['id']
        
        db.execute(
            'INSERT INTO action_logs (character_id, action_type, message) VALUES (?, ?, ?)',
            (character_id, 'SIGNUP', f'Created character {character_name}')
        )
        
        db.commit()
        return user_id
    except Exception as e:
        db.rollback()
        raise e

def get_user_by_username(username):
    """Get a user by username."""
    db = get_db()
    db.row_factory = sqlite3.Row
    
    cursor = db.execute('SELECT * FROM users WHERE username = ?', (username,))
    return cursor.fetchone()

def get_user_by_id(user_id):
    """Get a user by id."""
    db = get_db()
    db.row_factory = sqlite3.Row
    
    cursor = db.execute('SELECT * FROM users WHERE id = ?', (user_id,))
    return cursor.fetchone()

def get_character_by_user_id(user_id):
    """Get a character by user_id."""
    db = get_db()
    db.row_factory = dict_factory
    
    cursor = db.execute('SELECT * FROM characters WHERE user_id = ?', (user_id,))
    return cursor.fetchone()

def update_character_position(character_id, x, y, inside_building):
    """Update a character's position."""
    db = get_db()
    
    db.execute(
        'UPDATE characters SET x = ?, y = ?, inside_building = ? WHERE id = ?',
        (x, y, inside_building, character_id)
    )
    db.commit()

def update_character_stats(character_id, health=None, mp=None, ap=None, experience=None):
    """Update a character's stats."""
    db = get_db()
    db.row_factory = sqlite3.Row
    
    # Get current stats
    cursor = db.execute('SELECT * FROM characters WHERE id = ?', (character_id,))
    character = cursor.fetchone()
    
    # Update only provided stats
    new_health = health if health is not None else character['health']
    new_mp = mp if mp is not None else character['mp']
    new_ap = ap if ap is not None else character['ap']
    new_exp = experience if experience is not None else character['experience']
    
    # Ensure values don't exceed max
    new_health = min(new_health, character['max_health'])
    new_mp = min(new_mp, character['max_mp'])
    new_ap = min(new_ap, character['max_ap'])
    
    # Update database
    db.execute(
        'UPDATE characters SET health = ?, mp = ?, ap = ?, experience = ? WHERE id = ?',
        (new_health, new_mp, new_ap, new_exp, character_id)
    )
    db.commit()

def add_action_log(character_id, action_type, message):
    """Add an action log entry."""
    db = get_db()
    
    db.execute(
        'INSERT INTO action_logs (character_id, action_type, message) VALUES (?, ?, ?)',
        (character_id, action_type, message)
    )
    db.commit()

def get_action_logs(character_id, limit=10):
    """Get recent action logs for a character."""
    db = get_db()
    db.row_factory = dict_factory
    
    cursor = db.execute(
        'SELECT * FROM action_logs WHERE character_id = ? ORDER BY created_at DESC LIMIT ?',
        (character_id, limit)
    )
    return cursor.fetchall()
