let cursor = null;
let rotation = 0;
let clickAudio = null;
let loopAudio = null;
let isEnabled = false;
let isLoopPlaying = false;

// Preload assets
const cursorURL = chrome.runtime.getURL('assets/default.png');
const clickAudioURL = chrome.runtime.getURL('assets/tuck.wav');
const loopAudioURL = chrome.runtime.getURL('assets/ukazka.wav');

function createCursor() {
  if (cursor) return; // Prevent multiple cursors
  
  cursor = document.createElement('div');
  cursor.className = 'rofl-cursor';
  cursor.style.backgroundImage = `url(${cursorURL})`;
  document.body.appendChild(cursor);

  // Create audio elements
  clickAudio = new Audio(clickAudioURL);
  loopAudio = new Audio(loopAudioURL);
  
  // Configure loop audio
  loopAudio.loop = true;
  loopAudio.volume = 1.0; // Ensure full volume
  
  // Add error handling for audio loading
  loopAudio.addEventListener('error', (e) => {
    console.error('Loop audio error:', e);
  });

  // Enable audio
  clickAudio.load();
  loopAudio.load();

  // Log to verify URLs
  console.log('Loop audio URL:', loopAudioURL);
  console.log('Click audio URL:', clickAudioURL);
}

function updateCursorPosition(e) {
  if (!cursor || !isEnabled) return;
  // Adjust position to account for the larger cursor size
  cursor.style.left = `${e.clientX - 12}px`;
  cursor.style.top = `${e.clientY}px`;
}

async function playLoopSound() {
  if (!loopAudio || isLoopPlaying) return;
  
  try {
    isLoopPlaying = true;
    await loopAudio.play();
  } catch (error) {
    console.error('Failed to play loop sound:', error);
    isLoopPlaying = false;
  }
}

function stopLoopSound() {
  if (!loopAudio) return;
  
  loopAudio.pause();
  loopAudio.currentTime = 0;
  isLoopPlaying = false;
}

async function handleMouseDown(e) {
  if (!cursor || !isEnabled || e.button !== 0) return;
  
  rotation = 10; // Positive rotation for backwards tilt
  cursor.style.transform = `scaleX(-1) rotate(${rotation}deg)`;
  
  // Play click sound
  if (clickAudio) {
    clickAudio.currentTime = 0;
    try {
      await clickAudio.play();
    } catch (error) {
      console.error('Failed to play click sound:', error);
    }
  }

  // Start loop sound
  playLoopSound();
}

function handleMouseUp() {
  if (!cursor || !isEnabled) return;
  
  rotation = 0;
  cursor.style.transform = `scaleX(-1) rotate(${rotation}deg)`;
  
  // Stop the loop sound
  stopLoopSound();
}

function toggleCursor(enabled) {
  isEnabled = enabled;
  
  if (isEnabled) {
    createCursor();
    document.body.style.cursor = 'none';
    if (cursor) cursor.style.display = 'block';
  } else {
    document.body.style.cursor = 'auto';
    if (cursor) {
      cursor.style.display = 'none';
      stopLoopSound();
    }
  }
}

// Initialize
function init() {
  // Check initial state
  chrome.storage.local.get(['isEnabled'], function(result) {
    if (result.isEnabled) {
      toggleCursor(true);
    }
  });

  // Listen for messages from the extension
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggle') {
      toggleCursor(!isEnabled);
      sendResponse({ success: true });
    }
    return true; // Keep the message channel open for sendResponse
  });

  // Add event listeners
  document.addEventListener('mousemove', updateCursorPosition, { passive: true });
  document.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mouseup', handleMouseUp);
}

// Clean up function to stop sounds when the page is hidden or closed
function cleanup() {
  stopLoopSound();
}

// Ensure the script runs as soon as possible
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Re-run initialization when document becomes visible
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible') {
    init();
  } else {
    cleanup();
  }
});

// Clean up when the window is closed
window.addEventListener('beforeunload', cleanup); 