from flask_socketio import SocketIO, emit, join_room, leave_room
from flask import request, session
import json
from game_logic import process_action
from models import get_character_by_user_id, get_action_logs

# Create SocketIO instance - use simpler configuration
# We'll initialize it later with the app
socketio = SocketIO(cors_allowed_origins="*", async_mode='threading')

# Active user rooms mapping
user_rooms = {}


@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    if 'user_id' in session:
        user_id = session['user_id']
        # Join a room specific to this user
        join_room(f'user_{user_id}')
        user_rooms[request.sid] = f'user_{user_id}'

        # Send initial data
        character = get_character_by_user_id(user_id)
        emit('character_update', character)

        # Fetch recent logs
        logs = get_action_logs(character['id'])
        emit('logs_update', logs)

        print(f"User {user_id} connected with socket ID {request.sid}")
    else:
        print("Anonymous connection - not authenticated")


@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    sid = request.sid
    if sid in user_rooms:
        room = user_rooms[sid]
        leave_room(room)
        del user_rooms[sid]
        print(f"User in room {room} disconnected")


@socketio.on('perform_action')
def handle_action(data):
    """Handle game actions via WebSocket"""
    if 'user_id' not in session:
        emit('error', {'message': 'Not authenticated'})
        return

    user_id = session['user_id']
    action_type = data.get('action_type')
    action_data = data.get('action_data', {})

    if not action_type:
        emit('error', {'message': 'Action type is required'})
        return

    # Process the action
    result = process_action(user_id, action_type, action_data)

    # Emit updates to the user
    if result.get('success', False):
        room = f'user_{user_id}'

        # Character update
        if 'character' in result:
            emit('character_update', result['character'], room=room)

        # Location update
        if 'location' in result:
            emit('location_update', result['location'], room=room)

        # Actions update
        if 'available_actions' in result:
            emit('actions_update', result['available_actions'], room=room)

        # Logs update
        if 'logs' in result:
            emit('logs_update', result['logs'], room=room)

        # Message
        if 'message' in result:
            emit('message', {'text': result['message']}, room=room)
    else:
        # Error handling
        emit('error', {'message': result.get('message', 'Action failed')})