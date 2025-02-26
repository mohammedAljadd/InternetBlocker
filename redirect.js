// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const message = urlParams.get('msg') || "----------";

// Display the message
document.getElementById("message_to_show").textContent = message;