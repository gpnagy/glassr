// This script is injected into the page to handle the selection UI.
// It waits for a message from the background script to start.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'START_SELECTION') {
    // Ensure we don't run multiple instances.
    if (window.isLiquidGlassActive) return;

    window.isLiquidGlassActive = true;
    const { aspectRatio } = request.payload;

    let startX, startY, selectionBox, overlay;

    function init() {
      document.body.classList.add('liquid-glass-selecting');

      overlay = document.createElement('div');
      overlay.id = 'liquid-glass-overlay';
      document.body.appendChild(overlay);

      selectionBox = document.createElement('div');
      selectionBox.id = 'liquid-glass-selection-box';
      document.body.appendChild(selectionBox);

      document.addEventListener('mousedown', onMouseDown, { once: true });
      document.addEventListener('keydown', onKeyDown);
    }

    function onMouseDown(e) {
      e.preventDefault();
      startX = e.clientX;
      startY = e.clientY;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp, { once: true });
    }

    function onMouseMove(e) {
      let currentX = e.clientX;
      let currentY = e.clientY;

      let width = Math.abs(currentX - startX);
      let height = Math.abs(currentY - startY);
      let left = Math.min(startX, currentX);
      let top = Math.min(startY, currentY);

      if (aspectRatio !== 'auto') {
        const ratioParts = aspectRatio.split(':').map(Number);
        const ratio = ratioParts[0] / ratioParts[1];

        // Adjust height based on width to maintain aspect ratio
        height = width / ratio;

        // If dragging upwards, the top position needs to be adjusted
        if (currentY < startY) {
          top = startY - height;
        }
      }

      selectionBox.style.left = `${left}px`;
      selectionBox.style.top = `${top}px`;
      selectionBox.style.width = `${width}px`;
      selectionBox.style.height = `${height}px`;
    }

    function onMouseUp(e) {
      const finalLeft = parseFloat(selectionBox.style.left);
      const finalTop = parseFloat(selectionBox.style.top);
      const finalWidth = parseFloat(selectionBox.style.width);
      const finalHeight = parseFloat(selectionBox.style.height);

      if (finalWidth > 0 && finalHeight > 0) {
        chrome.runtime.sendMessage({
          type: 'CAPTURE',
          payload: {
            left: finalLeft,
            top: finalTop,
            width: finalWidth,
            height: finalHeight,
            devicePixelRatio: window.devicePixelRatio
          }
        });
      }
      cleanup();
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        cleanup();
      }
    }

    function cleanup() {
      document.body.classList.remove('liquid-glass-selecting');
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (selectionBox && selectionBox.parentNode) selectionBox.parentNode.removeChild(selectionBox);

      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('keydown', onKeyDown);

      window.isLiquidGlassActive = false;
    }

    init();
  }
  return true; // Keep listener active for other messages
});
