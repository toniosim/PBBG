from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from flask_cors import CORS
import json
import os
from werkzeug.security import generate_password_hash, check_password_hash
import uuid
from datetime import datetime, timedelta

# Import other modules
from database import init_db, get_db
from models import create_user, get_user_by_username, get_character_by_user_id
from game_logic import process_action, get_available_actions
from world_data import initialize_world, get_location_info
from auth import login_required

app = Flask(__name__,
            static_folder='../frontend/static',
            template_folder='../frontend/templates')
CORS(app)

# Configure session
app.secret_key = os.urandom(24)
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)

# Import socketio after app is created
from socketio_events import socketio

socketio.init_app(app)  # Initialize socketio with the app


# Initialize database and world
@app.before_first_request
def setup():
    init_db()
    initialize_world()


# Auth routes
@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('game'))
    return redirect(url_for('login'))


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return render_template('login.html')

    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = get_user_by_username(username)

    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

    session.permanent = True
    session['user_id'] = user['id']

    return jsonify({'success': True, 'redirect': '/game'})


@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'GET':
        return render_template('signup.html')

    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    character_name = data.get('character_name')

    if not username or not password or not character_name:
        return jsonify({'success': False, 'message': 'All fields are required'}), 400

    existing_user = get_user_by_username(username)
    if existing_user:
        return jsonify({'success': False, 'message': 'Username already exists'}), 400

    password_hash = generate_password_hash(password)
    try:
        user_id = create_user(username, password_hash, character_name)

        session.permanent = True
        session['user_id'] = user_id

        return jsonify({'success': True, 'redirect': '/game'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))


# Game routes
@app.route('/game')
@login_required
def game():
    # Check for a query parameter to use the Vue version
    use_vue = request.args.get('vue', '1') == '1'
    if use_vue:
        return render_template('vue-game.html')
    else:
        return render_template('game.html')


@app.route('/api/character')
@login_required
def get_character():
    user_id = session['user_id']
    character = get_character_by_user_id(user_id)
    return jsonify(character)


@app.route('/api/location')
@login_required
def get_location():
    user_id = session['user_id']
    character = get_character_by_user_id(user_id)
    location_info = get_location_info(character['x'], character['y'], character['inside_building'])
    return jsonify(location_info)


@app.route('/api/actions')
@login_required
def get_actions():
    user_id = session['user_id']
    character = get_character_by_user_id(user_id)
    actions = get_available_actions(character['x'], character['y'], character['inside_building'])
    return jsonify(actions)


@app.route('/api/action', methods=['POST'])
@login_required
def perform_action():
    user_id = session['user_id']
    data = request.get_json()
    action_type = data.get('action_type')

    if not action_type:
        return jsonify({'success': False, 'message': 'Action type is required'}), 400

    result = process_action(user_id, action_type, data.get('action_data', {}))
    return jsonify(result)


@app.route('/api/logs')
@login_required
def get_logs():
    user_id = session['user_id']
    # Get logs from database (implement in game_logic.py)
    # For now, return dummy data
    logs = [
        {'timestamp': datetime.now().isoformat(), 'message': 'You entered the game.'}
    ]
    return jsonify(logs)


if __name__ == '__main__':
    # Run the app with socketio
    socketio.run(app, debug=True, port=5000)