document.addEventListener("DOMContentLoaded", function () {
    displayBlockedList();
    displayBlockedChannelsList();
    displayBlockedAdultList();
});

// Display the list of blocked websites
function displayBlockedList() {
    chrome.storage.sync.get({ blockedSites: [] }, function (data) {
        let blockedSites = data.blockedSites;
        let listElement = document.getElementById("blocked-list");
        listElement.innerHTML = "";
        
        // Sort blocked sites list
        blockedSites.sort((a, b) => {
            const cleanA = a.replace(/^www\./, ''); // Remove 'www.' if it exists
            const cleanB = b.replace(/^www\./, '');
            return cleanA.localeCompare(cleanB); // Compare the cleaned strings
        });
        

        blockedSites.forEach(site => {
            let listItem = document.createElement("li");
            
            const cleanedSite = site.replace(/^www\./, '');
            listItem.textContent = cleanedSite;

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


function displayBlockedChannelsList() {
    chrome.storage.sync.get({ blockedChannels: [] }, function (data) {
        let blockedChannels = data.blockedChannels;
        let listElement = document.getElementById("blocked-youtube-channel-list");
        listElement.innerHTML = "";

        // Sort blocked channels names list
        blockedChannels.sort((a, b) => a.localeCompare(b));



        blockedChannels.forEach(site => {
            let listItem = document.createElement("li");
            listItem.textContent = site;

            let unblockButton = document.createElement("button");
            unblockButton.textContent = "Unblock";
            unblockButton.addEventListener("click", function () {
                unblockYoutubeChannel(site);
            });

            listItem.appendChild(unblockButton);
            listElement.appendChild(listItem);
        });
    });
}



function displayBlockedAdultList() {
    chrome.storage.sync.get({ adultSites: [] }, function (data) {
        let adultSites = data.adultSites;
        let listElement = document.getElementById("blocked-adult-list");
        listElement.innerHTML = "";

        // Sort blocked channels names list
        adultSites.sort((a, b) => a.localeCompare(b));

        

        adultSites.forEach(site => {
            let listItem = document.createElement("li");
            listItem.textContent = site;

            let unblockButton = document.createElement("button");
            unblockButton.textContent = "Unblock";
            unblockButton.addEventListener("click", function () {
                unblockAdultSite(site);
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
            displayBlockedChannelsList();
            displayBlockedAdultList();
            //updateBlockingRules(); // Update the blocking rules
        });
    });
}

// Unblock youtube channel
function unblockYoutubeChannel(site) {
    chrome.storage.sync.get({ blockedChannels: [] }, function (data) {
        let blockedChannels = data.blockedChannels.filter(blockedSite => blockedSite !== site);
        chrome.storage.sync.set({ blockedChannels: blockedChannels }, function () {
            displayBlockedList(); // Refresh the list
            displayBlockedChannelsList();
            displayBlockedAdultList();
            //updateBlockingRules(); // Update the blocking rules
        });
    });
}

// Unblock adult site
function unblockAdultSite(site) {
    chrome.storage.sync.get({ adultSites: [] }, function (data) {
        let adultSites = data.adultSites.filter(blockedSite => blockedSite !== site);
        chrome.storage.sync.set({ adultSites: adultSites }, function () {
            displayBlockedList(); // Refresh the list
            displayBlockedChannelsList();
            //displayBlockedAdultList();
            //updateBlockingRules(); // Update the blocking rules
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