// browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
//     if (message.action === "injectHTML") {
//         browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
//             browser.tabs.sendMessage(tabs[0].id, { action: "injectHTML", html: message.html });
//         });
//     }
// });

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Received message:", message);

    if (message.action === "injectHTML") {
        console.log("Action is injectHTML. Querying active tab...");

        browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
            console.log("Tabs queried. Found tabs:", tabs);

            if (tabs.length === 0) {
                console.error("No active tabs found!");
                return;
            }

            console.log("Sending message to content script in tab:", tabs[0].id);
            browser.tabs.sendMessage(tabs[0].id, { action: "injectHTML", html: message.html, targetId: message.targetId }).then(() => {
                console.log("Message sent successfully.");
            }).catch((error) => {
                console.error("Error sending message to content script:", error);
            });
        }).catch((error) => {
            console.error("Error querying tabs:", error);
        });
    }
});
