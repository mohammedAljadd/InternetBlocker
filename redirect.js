console.log("Hello");
// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const message = urlParams.get('msg') || "Access denied";

// Display the message
document.getElementById("message_to_show").textContent = message;

