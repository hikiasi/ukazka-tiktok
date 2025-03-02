document.addEventListener('DOMContentLoaded', function() {
  const toggleSwitch = document.getElementById('toggleCursor');

  // Get current state from storage and update UI
  chrome.storage.local.get(['isEnabled'], function(result) {
    toggleSwitch.checked = result.isEnabled || false;
  });

  // Function to check if URL is injectable
  function isInjectablePage(url) {
    return url && !url.startsWith('chrome://') && 
           !url.startsWith('chrome-extension://') && 
           !url.startsWith('edge://') &&
           !url.startsWith('about:') &&
           !url.startsWith('chrome-error://');
  }

  // Function to send message to content script
  async function toggleCursor(isEnabled) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !isInjectablePage(tab.url)) {
        console.log('Cannot modify cursor on this page');
        return;
      }

      // Try to send message to content script
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'toggle' });
      } catch (error) {
        // If content script is not ready, inject it
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        // Try sending the message again after injection
        await chrome.tabs.sendMessage(tab.id, { action: 'toggle' });
      }
    } catch (error) {
      console.error('Error:', error);
      // Reset toggle if we couldn't apply the change
      toggleSwitch.checked = !toggleSwitch.checked;
    }
  }

  // Handle toggle changes
  toggleSwitch.addEventListener('change', async function() {
    const isEnabled = toggleSwitch.checked;
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !isInjectablePage(tab.url)) {
        alert('Custom cursor cannot be used on this page. Please try on a regular webpage.');
        toggleSwitch.checked = !isEnabled;
        return;
      }

      // Save state to storage
      await chrome.storage.local.set({ isEnabled: isEnabled });

      // Toggle cursor
      await toggleCursor(isEnabled);
    } catch (error) {
      console.error('Error:', error);
      toggleSwitch.checked = !isEnabled;
    }
  });
}); 