(function() {
    const url = new URL(window.location.href);
    const domain = url.hostname;
  
    // Get the list of activated domains
    chrome.storage.sync.get(['activatedDomains'], function(result) {
      const activatedDomains = result.activatedDomains || [];
  
      // Proceed only if the current domain is activated
      if (activatedDomains.includes(domain)) {
        // Wait for Disqus comments to load
        waitForDisqusComments();
      }
    });
  
    function waitForDisqusComments() {
      const checkExist = setInterval(function() {
        const disqusComments = document.querySelector('.disqus-thread');
        if (disqusComments) {
          clearInterval(checkExist);
          processDisqusComments(disqusComments);
        }
      }, 500);
    }
  
    function processDisqusComments(disqusContainer) {
      // Find all links to bsky.app within the Disqus comments
      const links = disqusContainer.querySelectorAll('a[href*="bsky.app"]');
  
      links.forEach(function(link) {
        const bskyUrl = link.href;
  
        // Create an embedded preview element
        const previewElement = createPreviewElement(bskyUrl);
  
        // Replace the link with the preview
        link.parentNode.replaceChild(previewElement, link);
      });
    }
  
    function createPreviewElement(bskyUrl) {
      const previewContainer = document.createElement('div');
      previewContainer.style.border = '1px solid #ccc';
      previewContainer.style.padding = '10px';
      previewContainer.style.margin = '10px 0';
  
      // For now, we can simply display the URL; you can enhance this later
      const previewContent = document.createElement('p');
      previewContent.textContent = `Embedded preview for: ${bskyUrl}`;
  
      previewContainer.appendChild(previewContent);
  
      // Later, you might fetch data from the URL and display it here
  
      return previewContainer;
    }
  })();
  