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

// Enter manualyy

function setManualBlockedLists(sites, channels, pornSites) {
    chrome.storage.sync.set({
        blockedSites: sites,
        blockedChannels: channels,
        pornSites: pornSites
    }, () => {
        console.log("Blocked lists updated manually!");
    });
}


/* setManualBlockedLists(
    ["www.facebook.com", "www.tiktok.com", "www.instagram.com", "www.tinder.com", "www.x.com", "www.messenger.com",
     "www.pessmokepatch.com", "www.watchseries.pe", "www.watchseries.bar", "omegle.onl",
     "www.netflix.com", "www.twitch.tv", "ww4.123moviesfree.net", "www.chatroulette.com",  "www.chatrandom.com",
    "omegle.life", "omegle.fun", "4chan.com", "4chan.org"],  // Blocked sites

    ["waffloos", "keegzn", "souhaillhfit", "Chanqaoui", "RawSoueelt", "canal+sport", "zozvlogs", "lennybarn", "Treyten", "Treytenextra"], // Blocked YouTube channels
    ["pornhub.com", "xnxx.com", "xvideos.com", "youporn.com", "redtube.com", "8tube.xxx", "onlyfans.com", "Brazzers.com", "sex.com"] // Blocked adult sites
); */



// Check if the current URL should be blocked
function checkAndBlockUrl(url, tabId) {
    
    let isYoutubeUrl = false;
    
    chrome.storage.sync.get({ blockedSites: [], blockedChannels: [], pornSites: [] }, (data) => {
        const blockedSites = data.blockedSites;
        const blockedYoutubeChannels = data.blockedChannels;
        const pornSites = data.pornSites;

        let shouldBlock = false;
        
        if (url.includes("youtube.com")) {
            isYoutubeUrl = true;
            
            if (url.includes("/shorts/")) { // Block shors
                chrome.tabs.update(tabId, { url: chrome.runtime.getURL("/redirect.html?msg=Short is blocked") });
                return;
            }
            
            // User search for channel that contains space
            const urlParams = new URLSearchParams(new URL(url).search);
            const searchQuery = urlParams.get('search_query'); // will always be the same as we put in search bar, even if it contains spaces

            // Channel searched
            if(url.includes("search_query")){
                let modifiedStr = searchQuery.replace(/\s+/g, "");

                if(blockedYoutubeChannels.includes(modifiedStr)){
                    chrome.tabs.update(tabId, { 
                        url: chrome.runtime.getURL(`/redirect.html?msg=${encodeURIComponent(modifiedStr + " is blockesd")}`) 
                    });
                    return;
                }
            }
            // Video clicked
            else{
                let matchedChannel = null;
            
                shouldBlock = blockedYoutubeChannels.some(site => {
                    const regexPattern = site.replace(/\+/g, '\\+').replace(/\*/g, '.*').replace(/\s+/g, '\\s+');
                    const decodedUrl = decodeURIComponent(url);
                    const regex = new RegExp(regexPattern, 'i');
                    const result = regex.test(decodedUrl);
                    
                    if(result){
                        matchedChannel = site;
                    }
                    return result;
                });
                
        
                if (shouldBlock) {
                    chrome.tabs.update(tabId, { 
                        url: chrome.runtime.getURL(`/redirect.html?msg=${encodeURIComponent(matchedChannel + " is blocked")}`) 
                    });
                    
                    return;
                }
            }
            
        }
        let blockedSite = null;
        
        if (!isYoutubeUrl) {
            shouldBlock = blockedSites.some(site => {
                const regex = new RegExp(site.replace(/\*/g, '.*'), 'i');
                const result = regex.test(url);
                
                if(result){
                    blockedSite = site;
                }
                return result;
            });
            
    
            

            // Blocking regular website
            if (shouldBlock) {
                chrome.tabs.update(tabId, { 
                    url: chrome.runtime.getURL(`/redirect.html?msg=${encodeURIComponent(blockedSite + " is blocked")}`)
                });
                return;
            }
    
            // Now check adult sites AFTER storage finishes
            shouldBlock = pornSites.some(site => {
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
