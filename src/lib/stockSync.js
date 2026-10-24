// Cross-tab and in-memory stock synchronization utility
// Uses native BroadcastChannel with fallback to localStorage event for older browsers

const CHANNEL_NAME = 'lekha_stock_sync_channel';
const STORAGE_KEY = 'ls_stock_sync_ping';

const listeners = new Set();
let channel = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event) => {
      const payload = event?.data;
      listeners.forEach((cb) => {
        try { cb(payload); } catch (e) { console.warn('Sync listener error:', e); }
      });
    };
  } catch (err) {
    console.warn('BroadcastChannel initialization failed, falling back to storage events:', err);
  }
}

// Fallback listener for storage events
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const payload = JSON.parse(e.newValue);
        listeners.forEach((cb) => {
          try { cb(payload); } catch (err) { console.warn('Sync listener error:', err); }
        });
      } catch {}
    }
  });
}

/**
 * Broadcasts a stock change event to all open tabs and windows
 * @param {string} type - Action type e.g. 'CHECKOUT', 'RETURN', 'BATCH_UPDATED'
 * @param {object} detail - Optional metadata
 */
export function broadcastStockChange(type = 'STOCK_CHANGED', detail = {}) {
  const payload = { type, detail, timestamp: Date.now() };

  // 1. Notify same-tab listeners
  listeners.forEach((cb) => {
    try { cb(payload); } catch (e) { console.warn('Local sync listener error:', e); }
  });

  // 2. Notify other tabs via BroadcastChannel
  if (channel) {
    try {
      channel.postMessage(payload);
    } catch (e) {
      console.warn('BroadcastChannel postMessage error:', e);
    }
  }

  // 3. Fallback to localStorage trigger
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {}
}

/**
 * Subscribes a callback to stock change events
 * @param {function} callback
 * @returns {function} unsubscribe function
 */
export function onStockChange(callback) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
