document.addEventListener('DOMContentLoaded', function() {
    const status = document.getElementById('status');
    const toggleButton = document.getElementById('toggleButton');
  
    // Get the current tab
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      const tab = tabs[0];
      const url = new URL(tab.url);
      const domain = url.hostname;
  
      // Get the list of activated domains
      chrome.storage.sync.get(['activatedDomains'], function(result) {
        let activatedDomains = result.activatedDomains || [];
  
        // Check if the current domain is activated
        if (activatedDomains.includes(domain)) {
          status.textContent = 'Plugin is ACTIVE on this domain.';
          toggleButton.textContent = 'Deactivate for this Domain';
        } else {
          status.textContent = 'Plugin is INACTIVE on this domain.';
          toggleButton.textContent = 'Activate for this Domain';
        }
  
        // Handle button click
        toggleButton.addEventListener('click', function() {
          if (activatedDomains.includes(domain)) {
            // Deactivate
            activatedDomains = activatedDomains.filter(d => d !== domain);
            status.textContent = 'Plugin is INACTIVE on this domain.';
            toggleButton.textContent = 'Activate for this Domain';
          } else {
            // Activate
            activatedDomains.push(domain);
            status.textContent = 'Plugin is ACTIVE on this domain.';
            toggleButton.textContent = 'Deactivate for this Domain';
          }
  
          // Save the updated list
          chrome.storage.sync.set({ activatedDomains }, function() {
            // Reload the current tab to apply changes
            chrome.tabs.reload(tab.id);
          });
        });
      });
    });
  });
  