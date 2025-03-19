(function () {
  // Determine if this script is running in the top-level document.
  const isTopLevel = window.top === window;
  // Determine if this frame appears to be part of Disqus (e.g. disq.us or disqus.com).
  const isDisqusFrame = window.location.hostname.includes("disq.us") ||
    window.location.hostname.includes("disqus.com");

  // If this frame is neither the top-level nor a known Disqus frame, skip processing.
  if (!isTopLevel && !isDisqusFrame) {
    console.log("Skipping frame because it is not top-level or a Disqus frame.");
    return;
  }

  var global_activation = false;

  if (isTopLevel) {
    console.log("Plugin script running in top-level document.");
    // Top-level logic: check if the domain is activated before waiting for Disqus.
    const url = new URL(window.location.href);
    const domain = url.hostname;
    console.log("Current domain:", domain);

    const browserAPI = browser;
    if (!browserAPI) {
      console.error("No browser API available.");
      return;
    }

    browserAPI.storage.sync.get(["activatedDomains"], function (result) {
      console.log("storage.sync.get result:", result);
      const activatedDomains = result.activatedDomains || [];
      console.log("Activated domains:", activatedDomains);

      if (activatedDomains.includes(domain)) {
        console.log(`Domain "${domain}" is activated. Waiting for Disqus container...`);
        global_activation = true;
        waitForDisqusContainer();
      } else {
        console.log(`Domain "${domain}" is not activated. Exiting.`);
      }
    });

    function waitForDisqusContainer() {
      console.log("waitForDisqusContainer called.");
      const container = document.querySelector("#disqus_thread");
      if (container) {
        console.log("Found #disqus_thread container in top-level.");
        // The top-level container only holds the iframe.
        // We cannot access its inner links here if the iframe is cross-origin.
        // The BlueSky links will be processed by the content script running inside the iframe.
      } else {
        console.log("No #disqus_thread container found. Retrying in 1 second...");
        setTimeout(waitForDisqusContainer, 1000);
      }
    }
  } else if (isDisqusFrame) {
    console.log("Plugin script running inside Disqus iframe.");
    // In the Disqus iframe, directly wait for BlueSky links.
    waitForBlueSkyLinksInFrame();
  }

  // Helper: Extract the real BlueSky URL in case it is wrapped by Disqus.
  function extractDirectURL(href) {
    try {
      if (href.includes("disq.us/url?url=")) {
        const urlObj = new URL(href);
        let realUrlEncoded = urlObj.searchParams.get("url");
        if (realUrlEncoded) {
          realUrlEncoded = decodeURIComponent(realUrlEncoded);
          // Remove part after the last semicolon if present
          const lastSemicolonIndex = realUrlEncoded.lastIndexOf(":");
          if (lastSemicolonIndex !== -1) {
            realUrlEncoded = realUrlEncoded.substring(0, lastSemicolonIndex);
          }
          return realUrlEncoded;
        }
      }
    } catch (e) {
      console.error("Error extracting direct URL from:", href, e);
    }
    return href;
  }

  // In a Disqus iframe, wait until BlueSky links appear in the document.
  function waitForBlueSkyLinksInFrame() {
    console.log("waitForBlueSkyLinksInFrame called.");
    let links = document.querySelectorAll('a[href*="bsky.app"]');
    if (links.length > 0) {
      processBlueSkyLinks(document);
    } else {
      console.log("No BlueSky links found in Disqus iframe yet. Setting up MutationObserver.");
      const observer = new MutationObserver((mutations, obs) => {
        let links = document.querySelectorAll('a[href*="bsky.app"]');
        if (links && links.length > 0) {
          console.log("Found BlueSky links in Disqus iframe via MutationObserver.");
          obs.disconnect();
          processBlueSkyLinks(document);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  // Process and replace valid BlueSky links with preview elements.
  function processBlueSkyLinks(root) {
    const linkElements = Array.from(root.querySelectorAll("a[href*='bsky.app']"));
    console.log(`Found ${linkElements.length} potential BlueSky link(s) in Disqus iframe.`);

    // Revised regex: allow an optional colon and extra characters after the post ID.
    const bskyUrlPattern = /^https:\/\/bsky\.app\/profile\/[^\/]+\/post\/[^\/]+(.*)?$/;

    const filteredLinks = linkElements
      .map(link => {
        const directUrl = extractDirectURL(link.href);
        console.log("Extracted URL:", directUrl, "from link href:", link.href);
        return { link, directUrl };
      })
      .filter(item => {
        console.log("testing link: ", item.directUrl);
        const isValid = bskyUrlPattern.test(item.directUrl);
        if (!isValid) {
          console.log("Filtered out non-matching URL:", item.directUrl);
        } else {
          console.log("Valid BlueSky URL found:", item.directUrl);
        }
        return isValid;
      });

    console.log(`After filtering, ${filteredLinks.length} valid BlueSky link(s) remain in Disqus iframe.`);

    filteredLinks.forEach(item => {
      console.log("Processing BlueSky URL:", item.directUrl);
      const previewElement = createPreviewElement(item.directUrl);
      console.log("Replacing original link with preview element.");
      item.link.parentNode.replaceChild(previewElement, item.link);
    });
  }

  // Create a preview element by fetching embed data from BlueSky.
  function createPreviewElement(bskyUrl) {
    console.log("Creating preview element for URL:", bskyUrl);
    const previewContainer = document.createElement("div");
    previewContainer.style.cssText =
      "border: 1px solid #ccc; padding: 10px; margin: 10px 0; background-color: #f9f9f9; border-radius: 5px;";

    fetch(`https://embed.bsky.app/oembed?url=${encodeURIComponent(bskyUrl)}&maxwidth=300`)
      .then(response => {
        console.log('Response object:', response);

        // Check if the response status indicates success
        if (!response.ok) {
          console.error(`Error: HTTP status ${response.status}`);
          const errorMessage = document.createElement('p');
          errorMessage.textContent = `Failed to fetch preview: HTTP ${response.status}`;
          previewContainer.appendChild(errorMessage);
          return; // Stop further processing
        }

        // Attempt to parse JSON
        return response.json().catch(error => {
          console.error('Error parsing JSON:', error);
          return null; // Return null if JSON parsing fails
        });
      })
      .then(data => {
        if (!data) {
          const errorMessage = document.createElement('p');
          errorMessage.textContent = 'Error loading preview data.';
          previewContainer.appendChild(errorMessage);
          return;
        }
  
        console.log('Parsed embed data:', data);
  
        // Render the returned HTML embed snippet
        if (data.html) {
          previewContainer.innerHTML = data.html;
  
          // Optionally ensure embedded script tags (e.g., for Bluesky) are executed
          const scriptTags = previewContainer.querySelectorAll('script');
          scriptTags.forEach(script => {
            const newScript = document.createElement('script');
            newScript.src = script.src;
            newScript.async = script.async;
            newScript.charset = script.charset;
            document.body.appendChild(newScript);
          });
        } else {
          const fallbackMessage = document.createElement('p');
          fallbackMessage.textContent = 'No preview available.';
          previewContainer.appendChild(fallbackMessage);
        }
      })
      .catch(error => {
        console.error("Error fetching preview for URL", bskyUrl, error);
        const errorMessage = document.createElement("p");
        errorMessage.textContent = "Error loading preview";
        previewContainer.appendChild(errorMessage);
      });

    return previewContainer;
  }
})();
