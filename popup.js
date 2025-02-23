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
                chrome.storage.sync.set({ adultSites: adultSites }, () => {
                    messageElement.textContent = `Blocked: ${site}`;
                    messageElement.style.color = "red";
                    siteInput.value = "";
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