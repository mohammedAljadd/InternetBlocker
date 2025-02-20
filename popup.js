document.addEventListener("DOMContentLoaded", function () {
    displayBlockedLists();

    // Block current site
    document.getElementById("block-site").addEventListener("click", async function () {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.url) return;

        let url = new URL(tab.url);
        let domain = url.hostname;

        chrome.storage.sync.get({ blockedSites: [] }, function (data) {
            let blockedSites = data.blockedSites;
            if (!blockedSites.includes(domain)) {
                blockedSites.push(domain);
                chrome.storage.sync.set({ blockedSites: blockedSites }, updateBlockingRules);
            }
        });
    });

    // Block YouTube channel manually
    document.getElementById("block-channel").addEventListener("click", function () {
        let channelName = document.getElementById("channel-name").value.trim();
        if (!channelName) return;

        let normalizedChannel = channelName.replace(/\s+/g, '').toLowerCase();

        chrome.storage.sync.get({ blockedSites: [] }, function (data) {
            let blockedSites = data.blockedSites;
            if (!blockedSites.includes(normalizedChannel)) {
                blockedSites.push(normalizedChannel);
                chrome.storage.sync.set({ blockedSites: blockedSites }, updateBlockingRules);
            }
        });
    });

    // Block adult website manually (CANNOT be unblocked)
    document.getElementById("block-adult-site").addEventListener("click", function () {
        let siteInput = document.getElementById("adult-site-name");
        let site = siteInput.value.trim();
        let messageElement = document.getElementById("message"); // Add a message element in popup.html
    
        if (!site) {
            messageElement.textContent = "Please enter a site.";
            messageElement.style.color = "red";
            return;
        }
    
        chrome.storage.sync.get({ adultSites: [] }, function (data) {
            let adultSites = data.adultSites;
            if (!adultSites.includes(site)) {
                adultSites.push(site);
                chrome.storage.sync.set({ adultSites: adultSites }, () => {
                    console.log("Adult site added:", site);
    
                    // Show message in popup
                    messageElement.textContent = `Blocked: ${site}`;
                    messageElement.style.color = "red";
    
                    // Clear input field
                    siteInput.value = "";
    
                    // Refresh blocked list
                    displayBlockedLists();
                });
            } else {
                messageElement.textContent = "Site is already blocked!";
                messageElement.style.color = "orange";
            }
        });
    });
    
    
});

// Display all blocked lists
function displayBlockedLists() {
    chrome.storage.sync.get({ blockedSites: [] }, function (data) {
        let blockedSites = data.blockedSites;
        let listElement = document.getElementById("blocked-list");
        listElement.innerHTML = "";

        blockedSites.forEach(site => {
            let listItem = document.createElement("li");
            listItem.textContent = site.replace(/\+/g, ' ');

            let unblockButton = document.createElement("button");
            unblockButton.textContent = "Unblock";
            unblockButton.addEventListener("click", function () {
                unblockSite(site);
            });

            listItem.appendChild(unblockButton);
            listElement.appendChild(listItem);
        });
    });

    // Load adult sites (NO UNBLOCK BUTTONS)
    chrome.storage.sync.get({ adultSites: [] }, function (data) {
        let adultSites = data.adultSites;
        let listElement = document.getElementById("adult-blocked-list");
        listElement.innerHTML = "";

        adultSites.forEach(site => {
            let listItem = document.createElement("li");
            listItem.textContent = site.replace(/\+/g, ' ');
            listElement.appendChild(listItem);
        });
    });
}

// Unblock a site
function unblockSite(site) {
    chrome.storage.sync.get({ blockedSites: [] }, function (data) {
        let blockedSites = data.blockedSites.filter(blockedSite => blockedSite !== site);
        chrome.storage.sync.set({ blockedSites: blockedSites }, updateBlockingRules);
    });
}

// Update blocking rules dynamically
function updateBlockingRules() {
    chrome.storage.sync.get({ blockedSites: [] }, function (data) {
        let blockedSites = data.blockedSites;

        chrome.storage.local.get({ adultSites: [] }, function (data2) {
            let adultSites = data2.adultSites;

            chrome.declarativeNetRequest.getDynamicRules((existingRules) => {
                const removeIds = existingRules.map((rule) => rule.id);
                const newRules = [];
                let ruleId = 1;

                // Block regular sites & YouTube channels
                blockedSites.forEach((site) => {
                    newRules.push({
                        id: ruleId++,
                        priority: 1,
                        action: { type: "redirect", redirect: { extensionPath: "/redirect.html" } },
                        condition: {
                            urlFilter: `*://${site}/*`,
                            resourceTypes: ["main_frame"]
                        }
                    });
                });

                // Block adult sites (cannot be unblocked)
                adultSites.forEach((site) => {
                    newRules.push({
                        id: ruleId++,
                        priority: 1,
                        action: { type: "redirect", redirect: { extensionPath: "/redirect2.html" } },
                        condition: {
                            urlFilter: `*://${site}/*`,
                            resourceTypes: ["main_frame"]
                        }
                    });
                });

                chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: removeIds,
                    addRules: newRules,
                });

                displayBlockedLists(); // Refresh the UI after updating rules
            });
        });
    });
}
