// This is the background service worker.
// It's the central event handler for the extension.
// It listens for messages from the popup and content scripts,
// and coordinates the screenshot capture process.

chrome.runtime.onInstalled.addListener(() => {
  console.log('Liquid Glass Screenshots extension installed.');
});

// Helper function to convert a blob to a data URL
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Listen for messages from the popup or content scripts.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'INITIATE_CAPTURE') {
    const { aspectRatio } = request.payload;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && activeTab.id) {
        // Inject the CSS first.
        chrome.scripting.insertCSS({
          target: { tabId: activeTab.id },
          files: ['src/content/content.css']
        });

        // Inject the content script.
        chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          files: ['src/content/content.js']
        }).then(() => {
          // After the script is injected, send it a message to start the selection process.
          chrome.tabs.sendMessage(activeTab.id, {
            type: 'START_SELECTION',
            payload: { aspectRatio }
          });
        }).catch(err => {
          console.error("Failed to inject content script:", err);
          // TODO: Notify the user that the page is protected.
        });
      }
    });
  } else if (request.type === 'CAPTURE') {
    const { left, top, width, height, devicePixelRatio } = request.payload;

    // We need to do this asynchronously.
    (async () => {
      try {
        // 1. Capture the visible tab.
        const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });

        // 2. Convert the data URL to an ImageBitmap.
        const blob = await fetch(dataUrl).then(res => res.blob());
        const imageBitmap = await createImageBitmap(blob);

        // 3. Calculate scaled dimensions for cropping.
        const sx = left * devicePixelRatio;
        const sy = top * devicePixelRatio;
        const sWidth = width * devicePixelRatio;
        const sHeight = height * devicePixelRatio;

        // 4. Use OffscreenCanvas to crop the image.
        const canvas = new OffscreenCanvas(sWidth, sHeight);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imageBitmap, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);

        // 5. Convert the cropped canvas to a blob, then to a data URL.
        const croppedBlob = await canvas.convertToBlob({ type: 'image/png' });
        const croppedDataUrl = await blobToDataURL(croppedBlob);

        // 6. Store the result in local storage.
        await chrome.storage.local.set({ 'croppedImage': croppedDataUrl });

        // 7. Open the popup to show the result.
        // This is an indirect way to signal to the user. We'll build the UI for this next.
        // For now, let's just log it.
        console.log('Cropped image saved to storage.');

      } catch (error) {
        console.error('Error during capture and crop:', error);
      }
    })();

    // Return true to indicate we will send a response asynchronously.
    return true;
  } else if (request.type === 'DOWNLOAD_IMAGE') {
    chrome.downloads.download({
      url: request.payload.dataUrl,
      filename: 'liquid-glass-screenshot.png',
      saveAs: true // Ask the user where to save it
    });
  }
});
