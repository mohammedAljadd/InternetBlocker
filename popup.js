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
        
        let normalizedChannel = channelName.replace(/\s+/g, '').toLowerCase(); // channel names saved without space
        

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

        chrome.storage.sync.get({ pornSites: [] }, function (data) {
            let pornSites = data.pornSites;
            if (!pornSites.includes(site)) {
                pornSites.push(site);
                chrome.storage.sync.set({ pornSites: pornSites }, function () {
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


document.getElementById("save-blocked-data").addEventListener("click", function () {
    // Fetch blocked data from storage
    chrome.storage.sync.get({ blockedSites: [], blockedChannels: [], pornSites: [] }, function (data) {
        let blockedSites = data.blockedSites;
        let blockedChannels = data.blockedChannels;
        let pornSites = data.pornSites;
        
        // Prepare the text content for the file
        let textContent = "Blocked Sites:\n\n" + blockedSites.join("\n") + "\n\n";
        textContent += "Blocked YouTube Channels:\n\n" + blockedChannels.join("\n") + "\n\n";
        textContent += "Blocked Adult Sites:\n\n" + pornSites.join("\n");

        // Create a Blob (representing the file data)
        let blob = new Blob([textContent], { type: 'text/plain' });

        // Create a URL for the Blob and trigger a download
        let url = URL.createObjectURL(blob);
        let link = document.createElement("a");
        link.href = url;
        link.download = "blocked_data.txt"; // The name of the file

        // Programmatically click the link to download the file
        link.click();

        // Release the Blob URL
        URL.revokeObjectURL(url);
    });
});



// Load data

document.getElementById("load-blocked-data").addEventListener("click", function () {
    document.getElementById("file-upload").click();
    console.log("Said");
    }

);
  

document.getElementById("file-upload").addEventListener("change", function(event) {
    const file = event.target.files[0];  // Get the uploaded file
    
    if (file && file.type === "text/plain") {  // Check if the file is a .txt file
        const reader = new FileReader();
        
        // When the file is read
        reader.onload = function(e) {
            const fileContent = e.target.result;  // Get the content of the file
            const lines = fileContent.split(/\r?\n/);  // Split content into lines
            
            // Initialize the data arrays
            let blockedSites = [];
            let blockedChannels = [];
            let pornSites = [];
            
            // Variable to track the current section
            let currentSection = null;

            // Loop through each line in the file
            lines.forEach((line) => {
                line = line.trim();  // Trim whitespace and newline characters
                
                // Handle the headers to identify the sections
                if (line.startsWith("Blocked Sites:")) {
                    currentSection = "blockedSites";
                } else if (line.startsWith("Blocked YouTube Channels:")) {
                    currentSection = "blockedChannels";
                } else if (line.startsWith("Blocked Adult Sites:")) {
                    currentSection = "pornSites";
                } else {
                    // Add the line to the appropriate section
                    if (currentSection === "blockedSites" && line) {
                        blockedSites.push(line);
                    } else if (currentSection === "blockedChannels" && line) {
                        blockedChannels.push(line);
                    } else if (currentSection === "pornSites" && line) {
                        pornSites.push(line);
                    }
                }
            });
            
            // Now save the data into Chrome storage
            chrome.storage.sync.set({
                blockedSites: blockedSites,
                blockedChannels: blockedChannels,
                pornSites: pornSites
            }, function() {
                const messageElement = document.getElementById("message");
                if (messageElement) {
                    messageElement.textContent = "Blocked sites, channels, and porn sites loaded!";
                    messageElement.style.color = "green";
                }
                
                console.log("Blocked sites, channels, and adult sites saved to Chrome storage.");
            });
        };
        
        // Read the file as text
        reader.readAsText(file);
    } else {
        alert("Please upload a valid .txt file.");
    }
});
