import redis
import json
from flask import g
import os

# Redis configuration
REDIS_HOST = os.environ.get('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.environ.get('REDIS_PORT', 6379))
REDIS_DB = int(os.environ.get('REDIS_DB', 0))
REDIS_PASSWORD = os.environ.get('REDIS_PASSWORD', None)


def get_db():
    """Get Redis connection for the current request."""
    if 'redis_db' not in g:
        g.redis_db = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            db=REDIS_DB,
            password=REDIS_PASSWORD,
            decode_responses=True  # Return strings instead of bytes
        )
    return g.redis_db


def close_db(e=None):
    """Close Redis connection at the end of request."""
    redis_db = g.pop('redis_db', None)
    # Redis handles connection pooling, no need to explicitly close


def database_exists():
    """Check if database has been initialized by checking for a specific key."""
    r = get_db()
    return r.exists('database:initialized')


def init_db():
    """Initialize the Redis database with initial data."""
    if database_exists():
        return  # Database already initialized

    r = get_db()

    # Set a flag to indicate database is initialized
    r.set('database:initialized', '1')

    # Set ID counters for each entity type
    r.set('id:users', '0')
    r.set('id:characters', '0')
    r.set('id:action_logs', '0')

    # Initialize world data will be handled in world_data.py
    # No need to create schemas as Redis is schemaless


def get_next_id(entity_type):
    """Get the next ID for a given entity type."""
    r = get_db()
    return r.incr(f'id:{entity_type}')


def dict_to_redis_hash(dictionary):
    """Convert a dictionary to a format suitable for Redis hash storage.
    Handles non-string values by converting them to strings."""
    result = {}
    for key, value in dictionary.items():
        if isinstance(value, (dict, list)):
            result[key] = json.dumps(value)
        elif value is None:
            result[key] = ''
        else:
            result[key] = str(value)
    return result


def redis_hash_to_dict(hash_dict):
    """Convert a Redis hash dictionary back to a Python dictionary with proper types."""
    if not hash_dict:
        return None

    result = {}
    for key, value in hash_dict.items():
        if key.endswith('_id') or key in (
        'id', 'x', 'y', 'health', 'max_health', 'mp', 'max_mp', 'ap', 'max_ap', 'experience'):
            # Convert numeric fields
            result[key] = int(value) if value else 0
        elif key in ('inside_building', 'has_building'):
            # Convert boolean fields
            result[key] = bool(int(value)) if value else False
        elif value.startswith('{') or value.startswith('['):
            # Try to convert JSON strings
            try:
                result[key] = json.loads(value)
            except (json.JSONDecodeError, TypeError):
                result[key] = value
        else:
            result[key] = value
    return result


def init_app(app):
    """Register database functions with the Flask app."""
    app.teardown_appcontext(close_db)