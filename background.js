let blockedSites = [];

// Listen for changes to blocked sites
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "sync" && changes.blockedSites) {
        blockedSites = changes.blockedSites.newValue;
        updateBlockRules(blockedSites);
    }
});

// Listen for URL changes from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "URL_CHANGED") {
        checkAndBlockUrl(message.url, sender.tab.id);
    }
});

// Check if the current URL should be blocked
function checkAndBlockUrl(url, tabId) {
    
    let isYoutubeUrl = false;

    chrome.storage.sync.get({ blockedSites: [], blockedChannels: [], adultSites: [] }, (data) => {
        const blockedSites = data.blockedSites;
        const blockedYoutubeChannels = data.blockedChannels;
        const adultSites = data.adultSites;

        let shouldBlock = false;
    
        if (url.includes("youtube.com")) {
            isYoutubeUrl = true;
    
            if (url.includes("/shorts/")) { // Block shors
                chrome.tabs.update(tabId, { url: chrome.runtime.getURL("/redirect.html") });
                return;
            }
            
            // User search for channel that contains space
            const urlParams = new URLSearchParams(new URL(url).search);
            const searchQuery = urlParams.get('search_query');

            if(url.includes("search_query")){

                let modifiedStr = searchQuery.replace(/\s+/g, "");
                if(blockedYoutubeChannels.includes(modifiedStr)){
                    chrome.tabs.update(tabId, { url: chrome.runtime.getURL("/redirect.html") });
                    return;
                }
            }

            shouldBlock = blockedYoutubeChannels.some(site => {
                const regexPattern = site.replace(/\*/g, '.*').replace(/\s+/g, '\\s+');
                const regex = new RegExp(regexPattern, 'i');
                return regex.test(url);
            });
    
            if (shouldBlock) {
                chrome.tabs.update(tabId, { url: chrome.runtime.getURL("/redirect.html") });
                return;
            }
        }
    
        if (!isYoutubeUrl) {
            
            shouldBlock = blockedSites.some(site => {
                const regex = new RegExp(site.replace(/\*/g, '.*'), 'i');
                return regex.test(url);
            });
    
            if (shouldBlock) {
                chrome.tabs.update(tabId, { url: chrome.runtime.getURL("/redirect.html") });
                return;
            }
    
            // Now check adult sites AFTER storage finishes
            shouldBlock = adultSites.some(site => {
                const regex = new RegExp(site.replace(/\*/g, '.*'), 'i');
                return regex.test(url);
                
            });
            
            if(shouldBlock){
                chrome.tabs.update(tabId, { url: chrome.runtime.getURL("/redirect.html") });
            }
        }
    });
    
}    

// Update blocking rules dynamically
function updateBlockRules(blockedSites) {
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
