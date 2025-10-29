let blockedSites = [];
let isExtensionEnabled = true;

// Initialize extension state on startup
chrome.runtime.onStartup.addListener(() => {
    initializeExtension();
});

chrome.runtime.onInstalled.addListener(() => {
    initializeExtension();
});

function initializeExtension() {
    chrome.storage.sync.get({ 
        blockedSites: [], 
        blockedChannels: [], 
        pornSites: [],
        extensionEnabled: true,
        shortsBlocked: true,
        facebookGroupsOnly: false
    }, (data) => {
        blockedSites = data.blockedSites;
        isExtensionEnabled = data.extensionEnabled;
        if (isExtensionEnabled) {
            updateBlockRules(data.blockedSites);
        }
    });
}

// Listen for changes to blocked sites
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "sync") {
        if (changes.blockedSites) {
            blockedSites = changes.blockedSites.newValue;
            if (isExtensionEnabled) {
                updateBlockRules(blockedSites);
            }
        }
        if (changes.extensionEnabled) {
            isExtensionEnabled = changes.extensionEnabled.newValue;
            if (isExtensionEnabled) {
                chrome.storage.sync.get({ blockedSites: [] }, (data) => {
                    updateBlockRules(data.blockedSites);
                });
            } else {
                // Clear all blocking rules when disabled
                clearAllBlockRules();
            }
        }
    }
});

// Listen for URL changes from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "URL_CHANGED") {
        if (isExtensionEnabled) {
            checkAndBlockUrl(message.url, sender.tab.id);
        }
    }
});

// Check if the current URL should be blocked
function checkAndBlockUrl(url, tabId) {
    if (!isExtensionEnabled) return;
    
    let isYoutubeUrl = false;
    
    chrome.storage.sync.get({ 
        blockedSites: [], 
        blockedChannels: [], 
        pornSites: [],
        extensionEnabled: true,
        shortsBlocked: true,
        facebookGroupsOnly: false
    }, (data) => {
        if (!data.extensionEnabled) return;
        
        const blockedSites = data.blockedSites;
        const blockedYoutubeChannels = data.blockedChannels;
        const pornSites = data.pornSites;
        const shortsBlocked = data.shortsBlocked;
        const facebookGroupsOnly = data.facebookGroupsOnly;

        let shouldBlock = false;
        
        // Check Facebook Groups Only feature
        if (facebookGroupsOnly && url.includes("facebook.com")) {
            // Allow if URL contains /groups/
            if (!url.includes("/groups/")) {
                chrome.tabs.update(tabId, { 
                    url: chrome.runtime.getURL("/redirect.html?msg=" + encodeURIComponent("Only Facebook Groups are allowed") + "&blocked_url=" + encodeURIComponent(url))
                });
                return;
            }
        }
        
        if (url.includes("youtube.com")) {
            isYoutubeUrl = true;
            
            // Block YouTube Shorts based on setting
            if (url.includes("/shorts/") && shortsBlocked) {
                // Use chrome.tabs.update with replace: true to avoid back button issues
                chrome.tabs.update(tabId, { 
                    url: chrome.runtime.getURL("/redirect.html?msg=" + encodeURIComponent("YouTube Shorts are blocked") + "&blocked_url=" + encodeURIComponent(url))
                });
                // Execute script to replace history state to prevent back button loop
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: () => {
                        if (window.history.length > 1) {
                            // Try to go back to previous page, but if not possible, go to YouTube home
                            window.history.replaceState(null, '', window.location.href);
                        }
                    }
                }).catch(() => {}); // Ignore errors if script injection fails
                return;
            }
            
            // Handle YouTube search queries
            try {
                const urlObj = new URL(url);
                const urlParams = new URLSearchParams(urlObj.search);
                const searchQuery = urlParams.get('search_query');

                if (searchQuery && url.includes("search_query")) {
                    let modifiedStr = searchQuery.replace(/\s+/g, "").toLowerCase();

                    if (blockedYoutubeChannels.some(channel => channel.toLowerCase() === modifiedStr)) {
                        chrome.tabs.update(tabId, { 
                            url: chrome.runtime.getURL(`/redirect.html?msg=${encodeURIComponent(searchQuery + " is blocked")}&blocked_url=${encodeURIComponent(url)}`) 
                        });
                        return;
                    }
                }
                
                // Check for blocked channels in video URLs
                let matchedChannel = null;
                shouldBlock = blockedYoutubeChannels.some(channel => {
                    const regexPattern = channel.replace(/\+/g, '\\+').replace(/\*/g, '.*').replace(/\s+/g, '');
                    const decodedUrl = decodeURIComponent(url.toLowerCase());
                    const regex = new RegExp(regexPattern, 'i');
                    const result = regex.test(decodedUrl);
                    
                    if (result) {
                        matchedChannel = channel;
                    }
                    return result;
                });
                
                if (shouldBlock) {
                    chrome.tabs.update(tabId, { 
                        url: chrome.runtime.getURL(`/redirect.html?msg=${encodeURIComponent(matchedChannel + " is blocked")}&blocked_url=${encodeURIComponent(url)}`) 
                    });
                    return;
                }
            } catch (e) {
                console.error('Error parsing YouTube URL:', e);
            }
        }
        
        // Check regular websites (non-YouTube)
        if (!isYoutubeUrl) {
            let blockedSite = null;

            shouldBlock = blockedSites.some(site => {
                const regex = new RegExp(site.replace(/\*/g, '.*'), 'i');
                const result = regex.test(url);
                
                if (result) {
                    blockedSite = site;
                }
                return result;
            });

            if (shouldBlock) {
                console.log("Blocking site:", blockedSite);
                chrome.tabs.update(tabId, { 
                    url: chrome.runtime.getURL(`/redirect.html?msg=${encodeURIComponent(blockedSite + " is blocked")}&blocked_url=${encodeURIComponent(url)}`)
                });
                return;
            }

            // Check adult sites
            shouldBlock = pornSites.some(site => {
                const regex = new RegExp(site.replace(/\*/g, '.*'), 'i');
                return regex.test(url);
            });
            
            if (shouldBlock) {
                chrome.tabs.update(tabId, { 
                    url: chrome.runtime.getURL("/redirect.html?msg=" + encodeURIComponent("Adult content is blocked") + "&blocked_url=" + encodeURIComponent(url))
                });
            }
        }
    });
}    

// Update blocking rules dynamically
function updateBlockRules(blockedSites) {
    if (!isExtensionEnabled) return;
    
    chrome.declarativeNetRequest.getDynamicRules((existingRules) => {
        const removeIds = existingRules.map((rule) => rule.id);
        const newRules = [];
        let ruleId = 1;

        // Handle regular blocked sites
        blockedSites.forEach((site) => {
            newRules.push({
                id: ruleId++,
                priority: 1,
                action: { type: "redirect", redirect: { extensionPath: "/redirect.html" } },
                condition: {
                    urlFilter: site.includes('*') ? site : `*://${site}/*`,
                    resourceTypes: ["main_frame"]
                }
            });
        });

        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: removeIds,
            addRules: newRules,
        });
    });
}

// Clear all blocking rules
function clearAllBlockRules() {
    chrome.declarativeNetRequest.getDynamicRules((existingRules) => {
        const removeIds = existingRules.map((rule) => rule.id);
        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: removeIds,
            addRules: [],
        });
    });
}

// Manual blocking function (for testing)
function setManualBlockedLists(sites, channels, pornSites) {
    chrome.storage.sync.set({
        blockedSites: sites,
        blockedChannels: channels,
        pornSites: pornSites
    }, () => {
        console.log("Blocked lists updated manually!");
    });
}