let lastUrl = location.href;

// Create a MutationObserver to detect changes in the DOM
const observer = new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        // Notify the background script of the URL change
        chrome.runtime.sendMessage({ type: "URL_CHANGED", url });
    }
});

// Start observing the document for changes (subtree and child list)
observer.observe(document, { subtree: true, childList: true });

// Notify the background script when the page initially loads
chrome.runtime.sendMessage({ type: "URL_CHANGED", url: location.href });

// Additional listener for history state changes (e.g., when navigating via JavaScript)
window.addEventListener('popstate', () => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        chrome.runtime.sendMessage({ type: "URL_CHANGED", url });
    }
});

// Listen for pushState and replaceState (for navigation in single-page applications like YouTube)
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function() {
    originalPushState.apply(this, arguments);
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        chrome.runtime.sendMessage({ type: "URL_CHANGED", url });
    }
};

history.replaceState = function() {
    originalReplaceState.apply(this, arguments);
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        chrome.runtime.sendMessage({ type: "URL_CHANGED", url });
    }
};
