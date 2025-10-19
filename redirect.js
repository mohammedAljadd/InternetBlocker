// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const message = urlParams.get('msg') || "----------";
const blockedUrl = urlParams.get('blocked_url') || "";

// Display the message
document.getElementById("message_to_show").textContent = message;

// Function to go back safely
function goBackSafely() {
    try {
        // For YouTube Shorts specifically, go to YouTube home
        if (blockedUrl.includes('/shorts/')) {
            window.location.replace('https://www.youtube.com/');
            return;
        }
        
        // For other YouTube content, go to YouTube home
        if (blockedUrl.includes('youtube.com')) {
            window.location.replace('https://www.youtube.com/');
            return;
        }
        
        // For other sites, try different approaches
        if (window.history.length > 2) {
            // Go back 2 steps to skip the blocked URL
            window.history.go(-2);
        } else if (window.history.length > 1) {
            // Replace current page and go back
            window.history.replaceState(null, null, window.location.href);
            setTimeout(() => {
                window.history.back();
            }, 100);
        } else {
            // No history available, go to a search page
            window.location.replace('https://www.google.com/');
        }
    } catch (error) {
        // Fallback: go to Google
        window.location.replace('https://www.google.com/');
    }
}

// Function to go to YouTube home
function goToYouTubeHome() {
    window.location.replace('https://www.youtube.com/');
}

// Function to close the current tab
function closeTab() {
    try {
        // Try multiple methods to close the tab
        if (window.history.length <= 1) {
            // If this is the only page in history, replace with blank
            window.location.replace('about:blank');
        } else {
            // Go to previous page
            window.history.back();
        }
    } catch (error) {
        // If all else fails, go to a minimal page
        window.location.replace('data:text/html,<html><body><h1>Tab Closed</h1><p>You can now close this tab manually.</p></body></html>');
    }
}

// Automatically handle the redirect after a short delay
document.addEventListener('DOMContentLoaded', function() {
    // Clear the history entry to prevent back button loops
    if (window.history.replaceState) {
        window.history.replaceState(null, null, window.location.href);
    }
    
    // Auto-redirect for YouTube Shorts after 3 seconds
    if (blockedUrl.includes('/shorts/')) {
        let countdown = 3;
        const countdownElement = document.createElement('p');
        countdownElement.style.cssText = 'color: #666; font-size: 14px; margin-top: 10px;';
        countdownElement.textContent = `Redirecting to YouTube home in ${countdown} seconds...`;
        document.querySelector('.container:last-child').appendChild(countdownElement);
        
        const countdownTimer = setInterval(() => {
            countdown--;
            countdownElement.textContent = `Redirecting to YouTube home in ${countdown} seconds...`;
            
            if (countdown <= 0) {
                clearInterval(countdownTimer);
                goToYouTubeHome();
            }
        }, 1000);
        
        // Allow user to cancel auto-redirect by clicking any button
        document.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                clearInterval(countdownTimer);
                countdownElement.remove();
            });
        });
    }
});

// Handle browser back button to prevent loops
window.addEventListener('popstate', function(event) {
    event.preventDefault();
    goBackSafely();
});

// Prevent right-click context menu to avoid "Back" option
document.addEventListener('contextmenu', function(event) {
    event.preventDefault();
});

// Add keyboard shortcuts
document.addEventListener('keydown', function(event) {
    switch(event.key) {
        case 'Escape':
            closeTab();
            break;
        case 'Backspace':
        case 'ArrowLeft':
            if (event.altKey) {
                event.preventDefault();
                goBackSafely();
            }
            break;
        case 'h':
        case 'H':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                goToYouTubeHome();
            }
            break;
    }
});