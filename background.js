// This script listens for the keyboard shortcut command.

chrome.commands.onCommand.addListener((command) => {
  // Check if the command is the one we defined in manifest.json
  if (command === "take-screenshot") {
    console.log("Screenshot shortcut triggered.");
    // Get the active tab to inject the content script.
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab) {
        // Inject the content script and CSS into the active tab.
        chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          files: ['content.js']
        });
        chrome.scripting.insertCSS({
          target: { tabId: activeTab.id },
          files: ['content.css']
        });
      } else {
        console.error("No active tab found.");
      }
    });
  }
});

chrome.runtime.onInstalled.addListener(() => {
    console.log("Keyboard Screenshot extension installed.");
});

// Listen for the message from the content script.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'CAPTURE_REGION') {
    const { left, top, width, height, devicePixelRatio } = request.payload;

    // Use an async function to handle the asynchronous capture and crop process.
    (async () => {
      try {
        // 1. Capture the visible tab.
        const dataUrl = await chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' });

        // 2. Convert the data URL to an ImageBitmap for use in a canvas.
        const blob = await fetch(dataUrl).then(res => res.blob());
        const imageBitmap = await createImageBitmap(blob);

        // 3. Calculate scaled dimensions for high-DPI screens.
        const sx = left * devicePixelRatio;
        const sy = top * devicePixelRatio;
        const sWidth = width * devicePixelRatio;
        const sHeight = height * devicePixelRatio;

        // 4. Use OffscreenCanvas to perform the crop in the background.
        const canvas = new OffscreenCanvas(sWidth, sHeight);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imageBitmap, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);

        // 5. Convert the cropped canvas to a blob.
        const croppedBlob = await canvas.convertToBlob({ type: 'image/png' });

        // 6. Open the blob in a new tab.
        const newTabUrl = URL.createObjectURL(croppedBlob);
        chrome.tabs.create({ url: newTabUrl });

      } catch (error) {
        console.error('Error during capture and crop:', error);
      }
    })();

    return true; // Indicates that the response is sent asynchronously.
  }
});
