document.addEventListener("DOMContentLoaded", function () {
    // Initialize
    updateExtensionState();
    
    // Main extension toggle
    document.getElementById("main-toggle").addEventListener("click", function() {
        chrome.storage.sync.get({ extensionEnabled: true }, function(data) {
            const newState = !data.extensionEnabled;
            chrome.storage.sync.set({ extensionEnabled: newState }, function() {
                updateExtensionState();
                showMessage(newState ? "Extension enabled!" : "Extension disabled!", 
                          newState ? "success" : "warning");
            });
        });
    });

    // YouTube Shorts toggle
    document.getElementById("shorts-toggle").addEventListener("click", function() {
        chrome.storage.sync.get({ extensionEnabled: true, shortsBlocked: true }, function(data) {
            if (!data.extensionEnabled) return;
            
            const newState = !data.shortsBlocked;
            chrome.storage.sync.set({ shortsBlocked: newState }, function() {
                updateShortsToggle();
                showMessage(newState ? "YouTube Shorts blocked!" : "YouTube Shorts allowed!", 
                          newState ? "success" : "warning");
            });
        });
    });

    // Facebook Groups Only toggle
    document.getElementById("facebook-toggle").addEventListener("click", function() {
        chrome.storage.sync.get({ extensionEnabled: true, facebookGroupsOnly: false }, function(data) {
            if (!data.extensionEnabled) return;
            
            const newState = !data.facebookGroupsOnly;
            chrome.storage.sync.set({ facebookGroupsOnly: newState }, function() {
                updateFacebookToggle();
                showMessage(newState ? "Facebook limited to Groups only!" : "Facebook fully accessible!", 
                          newState ? "success" : "warning");
            });
        });
    });

    // Block current site
    document.getElementById("block-site").addEventListener("click", async function () {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.url) return;
    
        let url = new URL(tab.url);
        let domain = url.hostname.replace(/^www\./, '');
    
        chrome.storage.sync.get({ blockedSites: [] }, function (data) {
            let blockedSites = data.blockedSites;
            if (!blockedSites.includes(domain)) {
                blockedSites.push(domain);
                chrome.storage.sync.set({ blockedSites: blockedSites }, function () {
                    showMessage(`${domain} blocked successfully!`, "success");
                });
            } else {
                showMessage(`${domain} is already blocked!`, "warning");
            }
        });
    });

    // Add YouTube channel
    document.getElementById("add-channel").addEventListener("click", function () {
        let channelName = document.getElementById("channel-input").value.trim();
        if (!channelName) {
            showMessage("Please enter a channel name.", "error");
            return;
        }
        
        let normalizedChannel = channelName.replace(/\s+/g, '').toLowerCase();

        chrome.storage.sync.get({ blockedChannels: [] }, function (data) {
            let blockedChannels = data.blockedChannels;
            if (!blockedChannels.includes(normalizedChannel)) {
                blockedChannels.push(normalizedChannel);
                chrome.storage.sync.set({ blockedChannels: blockedChannels }, function () {
                    showMessage(`Channel "${channelName}" blocked!`, "success");
                    document.getElementById("channel-input").value = "";
                });
            } else {
                showMessage(`Channel "${channelName}" already blocked!`, "warning");
            }
        });
    });

    // Add adult site
    document.getElementById("add-adult").addEventListener("click", function () {
        let site = document.getElementById("adult-input").value.trim();

        if (!site) {
            showMessage("Please enter a website URL.", "error");
            return;
        }

        // Clean the URL
        site = site.replace(/^https?:\/\//, '').replace(/^www\./, '');

        chrome.storage.sync.get({ pornSites: [] }, function (data) {
            let pornSites = data.pornSites;
            if (!pornSites.includes(site)) {
                pornSites.push(site);
                chrome.storage.sync.set({ pornSites: pornSites }, function () {
                    showMessage(`${site} blocked!`, "success");
                    document.getElementById("adult-input").value = "";
                });
            } else {
                showMessage("Site already blocked!", "warning");
            }
        });
    });

    // Manage blocked content
    document.getElementById("manage-blocked").addEventListener("click", function () {
        chrome.tabs.create({ url: chrome.runtime.getURL("unblock.html") });
    });

    // Export data
    document.getElementById("export-data").addEventListener("click", function () {
        chrome.storage.sync.get({ 
            blockedSites: [], 
            blockedChannels: [], 
            pornSites: [],
            shortsBlocked: true,
            facebookGroupsOnly: false,
            extensionEnabled: true
        }, function (data) {
            const exportData = {
                ...data,
                exportDate: new Date().toISOString(),
                version: '3.0.0'
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `internetguard-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);
            
            showMessage("Data exported successfully!", "success");
        });
    });

    // Import data
    document.getElementById("import-data").addEventListener("click", function () {
        document.getElementById("file-upload").click();
    });
      
    document.getElementById("file-upload").addEventListener("change", function(event) {
        const file = event.target.files[0];
        
        if (file) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    const importData = {
                        blockedSites: data.blockedSites || [],
                        blockedChannels: data.blockedChannels || [],
                        pornSites: data.pornSites || [],
                        shortsBlocked: data.shortsBlocked !== undefined ? data.shortsBlocked : true,
                        facebookGroupsOnly: data.facebookGroupsOnly !== undefined ? data.facebookGroupsOnly : false,
                        extensionEnabled: data.extensionEnabled !== undefined ? data.extensionEnabled : true
                    };
                    
                    chrome.storage.sync.set(importData, function() {
                        updateExtensionState();
                        updateShortsToggle();
                        updateFacebookToggle();
                        showMessage("Data imported successfully!", "success");
                    });
                } catch (error) {
                    showMessage("Invalid file format!", "error");
                }
            };
            
            reader.readAsText(file);
        }
        event.target.value = '';
    });

    // Initialize toggle states
    updateShortsToggle();
    updateFacebookToggle();

    // Enable Enter key for inputs
    document.getElementById("channel-input").addEventListener("keypress", function(e) {
        if (e.key === "Enter") {
            document.getElementById("add-channel").click();
        }
    });

    document.getElementById("adult-input").addEventListener("keypress", function(e) {
        if (e.key === "Enter") {
            document.getElementById("add-adult").click();
        }
    });
});

function updateExtensionState() {
    chrome.storage.sync.get({ extensionEnabled: true }, function(data) {
        const isEnabled = data.extensionEnabled;
        const mainToggle = document.getElementById("main-toggle");
        const statusBadge = document.getElementById("status-badge");
        const inputs = document.querySelectorAll("input[type='text']");
        const buttons = document.querySelectorAll("button:not(#main-toggle)");
        const shortsToggle = document.getElementById("shorts-toggle");
        const facebookToggle = document.getElementById("facebook-toggle");
        
        // Update main toggle
        if (isEnabled) {
            mainToggle.classList.add("enabled");
            statusBadge.textContent = "Extension Enabled";
            statusBadge.className = "status-badge status-enabled";
        } else {
            mainToggle.classList.remove("enabled");
            statusBadge.textContent = "Extension Disabled";
            statusBadge.className = "status-badge status-disabled";
        }
        
        // Enable/disable controls
        inputs.forEach(input => input.disabled = !isEnabled);
        buttons.forEach(button => button.disabled = !isEnabled);
        
        // Update feature toggles availability
        [shortsToggle, facebookToggle].forEach(toggle => {
            if (isEnabled) {
                toggle.style.opacity = "1";
                toggle.style.pointerEvents = "auto";
            } else {
                toggle.style.opacity = "0.5";
                toggle.style.pointerEvents = "none";
            }
        });
    });
}

function updateShortsToggle() {
    chrome.storage.sync.get({ shortsBlocked: true }, function(data) {
        const shortsToggle = document.getElementById("shorts-toggle");
        if (data.shortsBlocked) {
            shortsToggle.classList.add("enabled");
        } else {
            shortsToggle.classList.remove("enabled");
        }
    });
}

function updateFacebookToggle() {
    chrome.storage.sync.get({ facebookGroupsOnly: false }, function(data) {
        const facebookToggle = document.getElementById("facebook-toggle");
        if (data.facebookGroupsOnly) {
            facebookToggle.classList.add("enabled");
        } else {
            facebookToggle.classList.remove("enabled");
        }
    });
}

function showMessage(text, type) {
    const messageElement = document.getElementById("message");
    messageElement.textContent = text;
    messageElement.className = `message ${type}`;
    messageElement.classList.add("show");
    
    setTimeout(() => {
        messageElement.classList.remove("show");
    }, 3000);
}