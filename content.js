(function () {
  // Determine if this script is running in the top-level document.
  const isTopLevel = window.top === window;
  const isDisqusFrame = window.location.hostname.includes("disq.us") ||
    window.location.hostname.includes("disqus.com");

  if (!isTopLevel && !isDisqusFrame) {
    console.log("bskqus extension: Skipping frame because it is not top-level or a Disqus frame.");
    return;
  }

  var global_activation = false;

  if (isTopLevel) {
    console.log("bskqus extension: Plugin script running in top-level document.");
    const url = new URL(window.location.href);
    const domain = url.hostname;

    const browserAPI = browser;
    if (!browserAPI) {
      console.error("bskqus extension: No browser API available.");
      return;
    }

    browserAPI.storage.sync.get(["activatedDomains"], function (result) {
      const activatedDomains = result.activatedDomains || [];
      if (activatedDomains.includes(domain)) {
        global_activation = true;
        waitForDisqusContainer();
      }
    });

    function waitForDisqusContainer() {
      const container = document.querySelector("#disqus_thread");
      if (container) {
        console.log("bskqus extension: Found #disqus_thread container.");
      } else {
        setTimeout(waitForDisqusContainer, 1000);
      }
    }
  } else if (isDisqusFrame) {
    console.log("bskqus extension: Plugin script running inside Disqus iframe.");
    waitForBlueSkyLinksInFrame();
  }

  function extractDirectURL(href) {
    try {
      if (href.includes("disq.us/url?url=")) {
        const urlObj = new URL(href);
        let realUrlEncoded = urlObj.searchParams.get("url");
        if (realUrlEncoded) {
          realUrlEncoded = decodeURIComponent(realUrlEncoded);
          const lastSemicolonIndex = realUrlEncoded.lastIndexOf(":");
          if (lastSemicolonIndex !== -1) {
            realUrlEncoded = realUrlEncoded.substring(0, lastSemicolonIndex);
          }
          return realUrlEncoded;
        }
      }
    } catch (e) {
      console.error("bskqus extension: Error extracting direct URL from:", href, e);
    }
    return href;
  }

  function waitForBlueSkyLinksInFrame() {
    let links = document.querySelectorAll('a[href*="bsky.app"]');
    if (links.length > 0) {
      processBlueSkyLinks(document);
    } else {
      const observer = new MutationObserver((mutations, obs) => {
        let links = document.querySelectorAll('a[href*="bsky.app"]');
        if (links && links.length > 0) {
          obs.disconnect();
          processBlueSkyLinks(document);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  function processBlueSkyLinks(root) {
    const linkElements = Array.from(root.querySelectorAll("a[href*='bsky.app']"));
    console.log(`bskqus extension: Found ${linkElements.length} potential BlueSky link(s) in Disqus iframe.`);

    const bskyUrlPattern = /^https:\/\/bsky\.app\/profile\/[^\/]+\/post\/[^\/]+(.*)?$/;

    const filteredLinks = linkElements
      .map(link => {
        const directUrl = extractDirectURL(link.href);
        console.log("bskqus extension: Extracted URL:", directUrl, "from link href:", link.href);
        return { link, directUrl };
      })
      .filter(item => {
        const isValid = bskyUrlPattern.test(item.directUrl);
        if (isValid) {
          console.log("bskqus extension: Valid BlueSky URL found:", item.directUrl);
        } else {
          console.log("bskqus extension: Filtered out non-matching URL:", item.directUrl);
        }
        return isValid;
      });

    console.log(`bskqus extension: After filtering, ${filteredLinks.length} valid BlueSky link(s) remain in Disqus iframe.`);

    filteredLinks.forEach(item => {
      console.log("bskqus extension: Processing BlueSky URL:", item.directUrl);

      // Create a placeholder element to replace the link
      const previewElement = createPreviewElement(item.directUrl);

      // Replace the original link directly
      item.link.parentNode.replaceChild(previewElement, item.link);
      console.log("bskqus extension: Successfully replaced link with preview element.");
    });
  }

  function createPreviewElement(bskyUrl) {
    const previewContainer = document.createElement("div");
    // Assign a unique ID so the injected HTML can target this element later.
    previewContainer.id = "bskqus-preview-" + Math.random().toString(36).slice(2, 9);

    fetch(`https://embed.bsky.app/oembed?url=${encodeURIComponent(bskyUrl)}&maxwidth=300`)
      .then(response => {
        if (!response.ok) {
          const errorMessage = document.createElement('p');
          errorMessage.textContent = `Failed to fetch preview: HTTP ${response.status}`;
          previewContainer.appendChild(errorMessage);
          return;
        }
        return response.json().catch(error => null);
      })
      .then(data => {
        if (!data) {
          const errorMessage = document.createElement('p');
          errorMessage.textContent = 'Error loading preview data.';
          previewContainer.appendChild(errorMessage);
          return;
        }
        if (data.html) {
          // Send targetId along with the HTML so that the injection knows where to put it
          browser.runtime.sendMessage({
            action: "injectHTML",
            html: data.html,
            targetId: previewContainer.id
          });
        } else {
          const fallbackMessage = document.createElement('p');
          fallbackMessage.textContent = 'No preview available.';
          previewContainer.appendChild(fallbackMessage);
        }
      })
      .catch(error => {
        const errorMessage = document.createElement("p");
        errorMessage.textContent = "Error loading preview";
        previewContainer.appendChild(errorMessage);
      });

    return previewContainer;
  }

})();
