from functools import wraps
from flask import session, redirect, url_for, jsonify, request
import time

def login_required(f):
    """Decorator to ensure the user is logged in."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            if request.headers.get('Accept') == 'application/json':
                return jsonify({'success': False, 'message': 'Authentication required'}), 401
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def rate_limiter(f):
    """Basic rate limiter to prevent abuse."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        req_key = f"{request.remote_addr}:{request.path}"
        current_time = time.time()
        
        # This would normally be stored in Redis/Memcached in a production system
        if hasattr(rate_limiter, 'cache'):
            last_request_time = rate_limiter.cache.get(req_key, 0)
            if current_time - last_request_time < 1:  # 1 second limit
                return jsonify({'success': False, 'message': 'Rate limit exceeded'}), 429
        else:
            rate_limiter.cache = {}
        
        rate_limiter.cache[req_key] = current_time
        return f(*args, **kwargs)
    return decorated_function
