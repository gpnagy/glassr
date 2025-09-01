// This script handles the on-page screenshot selection UI.

// Prevent the script from running multiple times if the user presses the shortcut again.
if (window.isScreenshotToolActive) {
  // Do nothing if it's already active.
} else {
  window.isScreenshotToolActive = true;

  let startX, startY, selectionBox;

  function init() {
    // Apply the crosshair cursor to the page.
    document.body.classList.add('crosshair-cursor-active');

    // Create and append the selection box element.
    selectionBox = document.createElement('div');
    selectionBox.id = 'screenshot-selection-box';
    document.body.appendChild(selectionBox);

    // Start listening for the user to start drawing.
    document.addEventListener('mousedown', onMouseDown, { once: true });
    // Listen for the escape key to cancel.
    document.addEventListener('keydown', onKeyDown);
  }

  function onMouseDown(e) {
    // Prevent default browser actions like text selection.
    e.preventDefault();

    startX = e.clientX;
    startY = e.clientY;

    // Set the initial position of the box.
    selectionBox.style.left = `${startX}px`;
    selectionBox.style.top = `${startY}px`;
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';

    // Start listening for mouse movement and release.
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp, { once: true });
  }

  function onMouseMove(e) {
    const currentX = e.clientX;
    const currentY = e.clientY;

    // Calculate the dimensions and position of the selection box.
    // This logic handles dragging in all four directions.
    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    selectionBox.style.left = `${left}px`;
    selectionBox.style.top = `${top}px`;
    selectionBox.style.width = `${width}px`;
    selectionBox.style.height = `${height}px`;
  }

  function onMouseUp(e) {
    const finalRect = {
      left: parseFloat(selectionBox.style.left),
      top: parseFloat(selectionBox.style.top),
      width: parseFloat(selectionBox.style.width),
      height: parseFloat(selectionBox.style.height)
    };

    // Check if the selection has a valid size.
    if (finalRect.width > 0 && finalRect.height > 0) {
      // Send the selection data to the background script for capture.
      chrome.runtime.sendMessage({
        type: 'CAPTURE_REGION',
        payload: { ...finalRect, devicePixelRatio: window.devicePixelRatio }
      });
    }

    // Remove all UI and listeners.
    cleanup();
  }

  function onKeyDown(e) {
    // If the user presses 'Escape', cancel the selection.
    if (e.key === 'Escape') {
      console.log('Selection cancelled.');
      cleanup();
    }
  }

  function cleanup() {
    // Remove the cursor styling.
    document.body.classList.remove('crosshair-cursor-active');

    // Remove the selection box from the page.
    if (selectionBox && selectionBox.parentNode) {
      selectionBox.parentNode.removeChild(selectionBox);
    }

    // Remove all event listeners to prevent memory leaks.
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.removeEventListener('keydown', onKeyDown);

    // Reset the global flag.
    window.isScreenshotToolActive = false;
  }

  // Start the process.
  init();
}
