let blockedSites = [];

// Listen for changes to blocked sites
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "sync" && changes.blockedSites) {
        blockedSites = changes.blockedSites.newValue;
    }
});

// Listen for URL changes from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "URL_CHANGED") {
        checkAndBlockUrl(message.url, sender.tab.id);
    }
});


// Manually set blocked lists
function setManualBlockedLists(sites, channels, pornSites) {
    chrome.storage.sync.set({
        blockedSites: sites,
        blockedChannels: channels,
        pornSites: pornSites
    }, () => {
        console.log("Blocked lists updated manually!");
    });
}

// Check if the current URL should be blocked
function checkAndBlockUrl(url, tabId) {
    let isYoutubeUrl = false;

    chrome.storage.sync.get({ blockedSites: [], blockedChannels: [], pornSites: [] }, (data) => {
        const blockedSites = data.blockedSites;
        const blockedYoutubeChannels = data.blockedChannels;
        const pornSites = data.pornSites;

        let shouldBlock = false;
        console.log(url);
        if (url.includes("youtube.com")) {
            isYoutubeUrl = true;

            if (url.includes("/shorts/")) { // Block YouTube Shorts
                chrome.tabs.update(tabId, { url: chrome.runtime.getURL("/redirect.html?msg=Shorts is blocked") });
                return;
            }

            // Handle YouTube channel searches
            const urlParams = new URLSearchParams(new URL(url).search);
            const searchQuery = urlParams.get('search_query');

            if (url.includes("search_query")) {
                let modifiedStr = searchQuery.replace(/\s+/g, "");

                if (blockedYoutubeChannels.includes(modifiedStr)) {
                    chrome.tabs.update(tabId, {
                        url: chrome.runtime.getURL(`/redirect.html?msg=${encodeURIComponent(modifiedStr + " is blocked")}`)
                    });
                    return;
                }
            }
            // Handle YouTube video URLs
            else {
                let matchedChannel = null;

                shouldBlock = blockedYoutubeChannels.some(site => {
                    const regexPattern = site.replace(/\+/g, '\\+').replace(/\*/g, '.*').replace(/\s+/g, '\\s+');
                    const decodedUrl = decodeURIComponent(url);
                    const regex = new RegExp(regexPattern, 'i');
                    const result = regex.test(decodedUrl);

                    if (result) {
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

        if (!isYoutubeUrl) {
            let matchedwebsite = null;
            // Block regular websites
            shouldBlock = blockedSites.some(site => {
                const regex = new RegExp(site.replace(/\*/g, '.*'), 'i');
                const result = regex.test(url);

                    if (result) {
                        matchedwebsite = site;
                    }
                    return result;
            });

            if (shouldBlock) {
                console.log("matchedwebsite : "+matchedwebsite);
                chrome.tabs.update(tabId, {
                    url: chrome.runtime.getURL(`/redirect.html?msg=${encodeURIComponent(matchedwebsite+" is blocked")}`)
                });
                return;
            }

            // Block adult websites
            shouldBlock = pornSites.some(site => {
                const regex = new RegExp(site.replace(/\*/g, '.*'), 'i');
                return regex.test(url);
            });

            if (shouldBlock) {
                chrome.tabs.update(tabId, {
                    url: chrome.runtime.getURL(`/redirect.html?msg=${encodeURIComponent("This site is blocked")}`)
                });
            }
        }
    });
}