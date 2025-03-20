browser.runtime.onMessage.addListener((message) => {
    console.log("got message:", message);
    if (message.action === "injectHTML") {
        // Use the ID passed in the message instead of a hardcoded value.
        const placeholder = document.getElementById(message.targetId);
        if (placeholder) {
            const parser = new DOMParser();
            const parsedDoc = parser.parseFromString(message.html, 'text/html');

            const previewWrapper = document.createElement('div');
            Array.from(parsedDoc.body.childNodes).forEach((node) => {
                previewWrapper.appendChild(document.importNode(node, true));
            });

            // Replace the placeholder with your preview.
            placeholder.replaceWith(previewWrapper);

            // Process any scripts.
            const scripts = parsedDoc.querySelectorAll('script');
            scripts.forEach((script) => {
                const newScript = document.createElement('script');
                if (script.src) {
                    newScript.src = script.src;
                } else {
                    newScript.textContent = script.textContent;
                }
                previewWrapper.appendChild(newScript);
            });
        }
    }
});
