/**
 * Client-side script for handling logout redirect on external login page
 * This script should be embedded on http://localhost:3030/login page
 */

(function() {
    // Check if we're on the login page with signed_out message
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    const redirectTo = urlParams.get('redirect_to');
    
    if (message === 'signed_out' && redirectTo) {
        console.log('User successfully signed out, redirecting to homepage in 10 seconds...');
        
        // Show a message to the user
        const messageDiv = document.createElement('div');
        messageDiv.id = 'logout-redirect-message';
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #10b981;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 14px;
            font-weight: 500;
            text-align: center;
            max-width: 400px;
            line-height: 1.4;
        `;
        
        let countdown = 10;
        
        function updateMessage() {
            messageDiv.innerHTML = `
                <div>✅ Successfully signed out!</div>
                <div style="margin-top: 8px; font-size: 13px; opacity: 0.9;">
                    Redirecting to homepage in ${countdown} seconds...
                </div>
            `;
        }
        
        updateMessage();
        document.body.appendChild(messageDiv);
        
        // Countdown timer
        const countdownInterval = setInterval(() => {
            countdown--;
            updateMessage();
            
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                // Redirect to the homepage
                window.location.href = redirectTo;
            }
        }, 1000);
        
        // Allow user to click to redirect immediately
        messageDiv.style.cursor = 'pointer';
        messageDiv.addEventListener('click', () => {
            clearInterval(countdownInterval);
            window.location.href = redirectTo;
        });
        
        // Add hover effect
        messageDiv.addEventListener('mouseenter', () => {
            messageDiv.style.background = '#059669';
        });
        
        messageDiv.addEventListener('mouseleave', () => {
            messageDiv.style.background = '#10b981';
        });
    }
})();