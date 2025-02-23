document.addEventListener("DOMContentLoaded", function () {
    displayBlockedList();
});

// Display the list of blocked websites
function displayBlockedList() {
    chrome.storage.sync.get({ blockedSites: [] }, function (data) {
        let blockedSites = data.blockedSites;
        let listElement = document.getElementById("blocked-list");
        listElement.innerHTML = "";

        blockedSites.forEach(site => {
            let listItem = document.createElement("li");
            listItem.textContent = site;

            let unblockButton = document.createElement("button");
            unblockButton.textContent = "Unblock";
            unblockButton.addEventListener("click", function () {
                unblockSite(site);
            });

            listItem.appendChild(unblockButton);
            listElement.appendChild(listItem);
        });
    });
}

// Unblock a website
function unblockSite(site) {
    chrome.storage.sync.get({ blockedSites: [] }, function (data) {
        let blockedSites = data.blockedSites.filter(blockedSite => blockedSite !== site);
        chrome.storage.sync.set({ blockedSites: blockedSites }, function () {
            displayBlockedList(); // Refresh the list
            updateBlockingRules(); // Update the blocking rules
        });
    });
}

// Update blocking rules dynamically
function updateBlockingRules() {
    chrome.storage.sync.get({ blockedSites: [] }, function (data) {
        let blockedSites = data.blockedSites;
        
        
        chrome.declarativeNetRequest.getDynamicRules((existingRules) => {
            const removeIds = existingRules.map((rule) => rule.id);
            const newRules = [];
            let ruleId = 1;

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

            chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: removeIds,
                addRules: newRules,
            });
        });
    });
}