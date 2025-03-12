document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const errorMessage = document.getElementById('error-message');
    
    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            // Validate input
            if (!username || !password) {
                showError('Please enter both username and password');
                return;
            }
            
            // Send login request
            fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = data.redirect || '/game';
                } else {
                    showError(data.message || 'Login failed');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showError('An error occurred. Please try again.');
            });
        });
    }
    
    // Handle signup form submission
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const characterName = document.getElementById('character-name').value;
            
            // Validate input
            if (!username || !password || !confirmPassword || !characterName) {
                showError('Please fill in all fields');
                return;
            }
            
            if (password !== confirmPassword) {
                showError('Passwords do not match');
                return;
            }
            
            if (password.length < 6) {
                showError('Password must be at least 6 characters long');
                return;
            }
            
            // Send signup request
            fetch('/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password,
                    character_name: characterName
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = data.redirect || '/game';
                } else {
                    showError(data.message || 'Account creation failed');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showError('An error occurred. Please try again.');
            });
        });
    }
    
    // Helper to show error messages
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.add('show');
        
        // Hide after 5 seconds
        setTimeout(() => {
            errorMessage.classList.remove('show');
        }, 5000);
    }
});
