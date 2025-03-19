document.addEventListener("DOMContentLoaded", function () {
  const status = document.getElementById("status");
  const toggleButton = document.getElementById("toggleButton");

  if (window.browser) {
    // Firefox: Use Promise-based APIs

    // Get the current active tab
    window.browser.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => {
        const tab = tabs[0];
        const url = new URL(tab.url);
        const domain = url.hostname;

        // Get the list of activated domains (Promise style)
        return window.browser.storage.sync.get(["activatedDomains"]).then(
          (result) => {
            let activatedDomains = result.activatedDomains || [];

            // Update status and toggle button text
            if (activatedDomains.includes(domain)) {
              status.textContent = "Plugin is ACTIVE on this domain.";
              toggleButton.textContent = "Deactivate for this Domain";
            } else {
              status.textContent = "Plugin is INACTIVE on this domain.";
              toggleButton.textContent = "Activate for this Domain";
            }

            // Handle the button click
            toggleButton.addEventListener("click", function () {
              if (activatedDomains.includes(domain)) {
                // Deactivate the domain
                activatedDomains = activatedDomains.filter((d) => d !== domain);
                status.textContent = "Plugin is INACTIVE on this domain.";
                toggleButton.textContent = "Activate for this Domain";
              } else {
                // Activate the domain
                activatedDomains.push(domain);
                status.textContent = "Plugin is ACTIVE on this domain.";
                toggleButton.textContent = "Deactivate for this Domain";
              }

              // Save the updated list (Promise style)
              window.browser.storage.sync
                .set({ activatedDomains })
                .then(() => window.browser.tabs.reload(tab.id))
                .catch((error) => console.error("Storage set error:", error));
            });
          },
          (error) => console.error("Storage get error:", error)
        );
      })
      .catch((error) => console.error("Tabs query error:", error));
  } else {
    // Chrome: Use callback-based APIs

    // Get the current active tab
    window.chrome.tabs.query(
      { active: true, currentWindow: true },
      function (tabs) {
        const tab = tabs[0];
        const url = new URL(tab.url);
        const domain = url.hostname;

        // Get the list of activated domains using a callback
        window.chrome.storage.sync.get(["activatedDomains"], function (result) {
          let activatedDomains = result.activatedDomains || [];

          // Update status and toggle button text
          if (activatedDomains.includes(domain)) {
            status.textContent = "Plugin is ACTIVE on this domain.";
            toggleButton.textContent = "Deactivate for this Domain";
          } else {
            status.textContent = "Plugin is INACTIVE on this domain.";
            toggleButton.textContent = "Activate for this Domain";
          }

          // Handle the button click
          toggleButton.addEventListener("click", function () {
            if (activatedDomains.includes(domain)) {
              // Deactivate the domain
              activatedDomains = activatedDomains.filter((d) => d !== domain);
              status.textContent = "Plugin is INACTIVE on this domain.";
              toggleButton.textContent = "Activate for this Domain";
            } else {
              // Activate the domain
              activatedDomains.push(domain);
              status.textContent = "Plugin is ACTIVE on this domain.";
              toggleButton.textContent = "Deactivate for this Domain";
            }

            // Save the updated list using a callback and then reload the tab
            window.chrome.storage.sync.set({ activatedDomains }, function () {
              window.chrome.tabs.reload(tab.id);
            });
          });
        });
      }
    );
  }
});
