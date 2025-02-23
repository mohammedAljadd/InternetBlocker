document.addEventListener("DOMContentLoaded", function () {
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
                chrome.storage.sync.set({ blockedSites: blockedSites }, function () {
                    console.log("Site blocked:", domain);
                    updateBlockingRules(domain); // This will handle the message
                });
            } else {
                const messageElement = document.getElementById("message");
                if (messageElement) {
                    messageElement.textContent = `${domain} is already blocked!`;
                    messageElement.style.color = "orange";
                }
            }
        });
    });

    // Block YouTube channel manually
    document.getElementById("block-channel").addEventListener("click", function () {
        let channelName = document.getElementById("channel-name").value.trim();
        if (!channelName) return;
    
        let normalizedChannel = channelName.replace(/\s+/g, '').toLowerCase();
    
        chrome.storage.sync.get({ blockedChannels: [] }, function (data) {
            let blockedChannels = data.blockedChannels;
            if (!blockedChannels.includes(normalizedChannel)) {
                blockedChannels.push(normalizedChannel);
                chrome.storage.sync.set({ blockedChannels: blockedChannels }, function () {
                    console.log("Channel blocked:", normalizedChannel);
                    updateBlockingRules(normalizedChannel); // This will handle the message
                });
            } else {
                const messageElement = document.getElementById("message");
                if (messageElement) {
                    messageElement.textContent = `YouTube channel "${channelName}" is already blocked!`;
                    messageElement.style.color = "orange";
                }
            }
        });
    });

    // Block adult website manually
    document.getElementById("block-adult-site").addEventListener("click", function () {
        let siteInput = document.getElementById("adult-site-name");
        let site = siteInput.value.trim();
        let messageElement = document.getElementById("message");

        if (!site) {
            messageElement.textContent = "Please enter a site.";
            messageElement.style.color = "red";
            return;
        }

        chrome.storage.sync.get({ adultSites: [] }, function (data) {
            let adultSites = data.adultSites;
            if (!adultSites.includes(site)) {
                adultSites.push(site);
                chrome.storage.sync.set({ adultSites: adultSites }, function () {
                    console.log("Adult site blocked:", site);
                    messageElement.textContent = `Blocked: ${site}`;
                    messageElement.style.color = "red";
                    siteInput.value = "";
                    updateBlockingRules(site); // Ensure this is called after updating storage
                });
            } else {
                messageElement.textContent = "Site is already blocked!";
                messageElement.style.color = "orange";
            }
        });
    });

    // Redirect to the unblock page
    document.getElementById("manage-blocked").addEventListener("click", function () {
        chrome.tabs.create({ url: chrome.runtime.getURL("unblock.html") });
    });
});

// Update blocking rules dynamically
function updateBlockingRules(website) {
    chrome.storage.sync.get({ blockedSites: [] }, function (data) {
        let blockedSites = data.blockedSites;

        chrome.declarativeNetRequest.getDynamicRules((existingRules) => {
            const removeIds = existingRules.map((rule) => rule.id);
            const newRules = [];
            let ruleId = 1;

            // Add rules for blocked sites
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

            // Update the dynamic rules
            chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: removeIds,
                addRules: newRules,
            }, () => {
                console.log("Blocking rules updated:", newRules);

                // Display a message in the popup
                const messageElement = document.getElementById("message");
                if (messageElement) {
                    messageElement.textContent = `${website} is blocked!`;
                    messageElement.style.color = "red"; // Optional: Change color
                }
            });
        });
    });
}