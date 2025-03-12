import sqlite3
import os
from flask import g

DATABASE_PATH = 'game.db'

def get_db():
    """Get database connection for the current request."""
    if 'db' not in g:
        g.db = sqlite3.connect(DATABASE_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db

def close_db(e=None):
    """Close database connection at the end of request."""
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db():
    """Initialize the database with schema."""
    if os.path.exists(DATABASE_PATH):
        return  # Database already exists
    
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
    CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Create characters table
    cursor.execute('''
    CREATE TABLE characters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        health INTEGER DEFAULT 100,
        max_health INTEGER DEFAULT 100,
        mp INTEGER DEFAULT 100,
        max_mp INTEGER DEFAULT 100,
        ap INTEGER DEFAULT 10,
        max_ap INTEGER DEFAULT 10,
        experience INTEGER DEFAULT 0,
        x INTEGER DEFAULT 1,
        y INTEGER DEFAULT 1,
        inside_building BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    
    # Create locations table
    cursor.execute('''
    CREATE TABLE locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        has_building BOOLEAN DEFAULT 0,
        building_name TEXT,
        building_description TEXT,
        UNIQUE(x, y)
    )
    ''')
    
    # Create action logs table
    cursor.execute('''
    CREATE TABLE action_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL,
        action_type TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (character_id) REFERENCES characters (id)
    )
    ''')
    
    conn.commit()
    conn.close()

def init_app(app):
    """Register database functions with the Flask app."""
    app.teardown_appcontext(close_db)
