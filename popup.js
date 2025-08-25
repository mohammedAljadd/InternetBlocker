document.addEventListener("DOMContentLoaded", function () {
    // Initialize extension state
    updateExtensionState();
    
    // Extension toggle functionality
    document.getElementById("extension-toggle").addEventListener("click", function() {
        chrome.storage.sync.get({ extensionEnabled: true }, function(data) {
            const newState = !data.extensionEnabled;
            chrome.storage.sync.set({ extensionEnabled: newState }, function() {
                updateExtensionState();
                showMessage(newState ? "Extension enabled!" : "Extension disabled!", newState ? "green" : "orange");
            });
        });
    });

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
                    showMessage(`${domain} is blocked!`, "red");
                });
            } else {
                showMessage(`${domain} is already blocked!`, "orange");
            }
        });
    });

    // Block YouTube channel manually
    document.getElementById("block-channel").addEventListener("click", function () {
        let channelName = document.getElementById("channel-name").value.trim();
        if (!channelName) {
            showMessage("Please enter a channel name.", "red");
            return;
        }
        
        let normalizedChannel = channelName.replace(/\s+/g, '').toLowerCase();

        chrome.storage.sync.get({ blockedChannels: [] }, function (data) {
            let blockedChannels = data.blockedChannels;
            if (!blockedChannels.includes(normalizedChannel)) {
                blockedChannels.push(normalizedChannel);
                chrome.storage.sync.set({ blockedChannels: blockedChannels }, function () {
                    console.log("Channel blocked:", normalizedChannel);
                    showMessage(`YouTube channel "${channelName}" is blocked!`, "red");
                    document.getElementById("channel-name").value = "";
                });
            } else {
                showMessage(`YouTube channel "${channelName}" is already blocked!`, "orange");
            }
        });
    });

    // Block adult website manually
    document.getElementById("block-adult-site").addEventListener("click", function () {
        let siteInput = document.getElementById("adult-site-name");
        let site = siteInput.value.trim();

        if (!site) {
            showMessage("Please enter a site.", "red");
            return;
        }

        chrome.storage.sync.get({ pornSites: [] }, function (data) {
            let pornSites = data.pornSites;
            if (!pornSites.includes(site)) {
                pornSites.push(site);
                chrome.storage.sync.set({ pornSites: pornSites }, function () {
                    console.log("Adult site blocked:", site);
                    showMessage(`Blocked: ${site}`, "red");
                    siteInput.value = "";
                });
            } else {
                showMessage("Site is already blocked!", "orange");
            }
        });
    });

    // Redirect to the unblock page
    document.getElementById("manage-blocked").addEventListener("click", function () {
        chrome.tabs.create({ url: chrome.runtime.getURL("unblock.html") });
    });

    // Save blocked data
    document.getElementById("save-blocked-data").addEventListener("click", function () {
        chrome.storage.sync.get({ blockedSites: [], blockedChannels: [], pornSites: [] }, function (data) {
            let blockedSites = data.blockedSites;
            let blockedChannels = data.blockedChannels;
            let pornSites = data.pornSites;
            
            let textContent = "Blocked Sites:\n\n" + blockedSites.join("\n") + "\n\n";
            textContent += "Blocked YouTube Channels:\n\n" + blockedChannels.join("\n") + "\n\n";
            textContent += "Blocked Adult Sites:\n\n" + pornSites.join("\n");

            let blob = new Blob([textContent], { type: 'text/plain' });
            let url = URL.createObjectURL(blob);
            let link = document.createElement("a");
            link.href = url;
            link.download = "blocked_data.txt";
            link.click();
            URL.revokeObjectURL(url);
            
            showMessage("Data saved successfully!", "green");
        });
    });

    // Load blocked data
    document.getElementById("load-blocked-data").addEventListener("click", function () {
        document.getElementById("file-upload").click();
    });
      
    document.getElementById("file-upload").addEventListener("change", function(event) {
        const file = event.target.files[0];
        
        if (file && file.type === "text/plain") {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const fileContent = e.target.result;
                const lines = fileContent.split(/\r?\n/);
                
                let blockedSites = [];
                let blockedChannels = [];
                let pornSites = [];
                let currentSection = null;

                lines.forEach((line) => {
                    line = line.trim();
                    
                    if (line.startsWith("Blocked Sites:")) {
                        currentSection = "blockedSites";
                    } else if (line.startsWith("Blocked YouTube Channels:")) {
                        currentSection = "blockedChannels";
                    } else if (line.startsWith("Blocked Adult Sites:")) {
                        currentSection = "pornSites";
                    } else {
                        if (currentSection === "blockedSites" && line) {
                            blockedSites.push(line);
                        } else if (currentSection === "blockedChannels" && line) {
                            blockedChannels.push(line);
                        } else if (currentSection === "pornSites" && line) {
                            pornSites.push(line);
                        }
                    }
                });
                
                chrome.storage.sync.set({
                    blockedSites: blockedSites,
                    blockedChannels: blockedChannels,
                    pornSites: pornSites
                }, function() {
                    showMessage("Data loaded successfully!", "green");
                    console.log("Blocked sites, channels, and adult sites saved to Chrome storage.");
                });
            };
            
            reader.readAsText(file);
        } else {
            showMessage("Please upload a valid .txt file.", "red");
        }
    });
});

function updateExtensionState() {
    chrome.storage.sync.get({ extensionEnabled: true }, function(data) {
        const isEnabled = data.extensionEnabled;
        const toggle = document.getElementById("extension-toggle");
        const statusIndicator = document.getElementById("status-indicator");
        const buttons = document.querySelectorAll("button:not(#extension-toggle)");
        const inputs = document.querySelectorAll("input[type='text']");
        
        // Update toggle appearance
        if (isEnabled) {
            toggle.classList.add("enabled");
            statusIndicator.textContent = "Extension is Enabled";
            statusIndicator.className = "status-indicator status-enabled";
        } else {
            toggle.classList.remove("enabled");
            statusIndicator.textContent = "Extension is Disabled";
            statusIndicator.className = "status-indicator status-disabled";
        }
        
        // Enable/disable controls
        buttons.forEach(button => {
            button.disabled = !isEnabled;
        });
        inputs.forEach(input => {
            input.disabled = !isEnabled;
        });
    });
}

function showMessage(text, color) {
    const messageElement = document.getElementById("message");
    if (messageElement) {
        messageElement.textContent = text;
        messageElement.style.color = color;
        
        // Clear message after 3 seconds
        setTimeout(() => {
            messageElement.textContent = "";
        }, 3000);
    }
}

// Update blocking rules dynamically (kept for compatibility with your existing code)
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
                    messageElement.style.color = "red";
                }
            });
        });
    });
}