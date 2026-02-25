/**
 * SewaHive Service Worker
 * Handles offline support, caching strategy, and background sync
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `sewahive-${CACHE_VERSION}`;
const API_CACHE_NAME = `sewahive-api-${CACHE_VERSION}`;
const IMAGE_CACHE_NAME = `sewahive-images-${CACHE_VERSION}`;

// Files to cache on install (essential assets for offline support)
const ESSENTIAL_ASSETS = [
  '/',
  '/index.html',
  '/src/main.jsx',
  '/src/index.css',
];

// Routes to pre-cache (landing pages that work offline)
const OFFLINE_PAGES = [
  '/',
  '/login',
  '/signup',
];

/**
 * Install Event: Cache essential assets
 */
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...', CACHE_NAME);
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching essential assets');
      return cache.addAll(ESSENTIAL_ASSETS).catch((err) => {
        console.warn('Some assets failed to cache:', err);
        // Don't fail install if some assets can't be cached
      });
    })
  );

  // Skip waiting - activate new service worker immediately
  self.skipWaiting();
});

/**
 * Activate Event: Clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old cache versions
          if (
            cacheName !== CACHE_NAME &&
            cacheName !== API_CACHE_NAME &&
            cacheName !== IMAGE_CACHE_NAME &&
            cacheName.startsWith('sewahive-')
          ) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  // Claim all clients immediately
  self.clients.claim();
});

/**
 * Fetch Event: Implement caching strategies
 * - Cache First for static assets (JS, CSS, images)
 * - Network First for API calls
 * - Offline fallback for HTML
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const { url, method, destination } = request;

  // Skip non-GET requests
  if (method !== 'GET') {
    return;
  }

  // Skip chrome extensions and external URLs (in some cases)
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // API calls - Network First
  if (url.includes('/api/') || url.includes('/notifications')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Images - Cache First
  if (destination === 'image') {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE_NAME));
    return;
  }

  // JavaScript, CSS, fonts - Cache First
  if (
    destination === 'script' ||
    destination === 'style' ||
    destination === 'font' ||
    destination === 'manifest'
  ) {
    event.respondWith(cacheFirstStrategy(request, CACHE_NAME));
    return;
  }

  // HTML documents - Network First with cache fallback
  if (destination === 'document' || destination === '') {
    event.respondWith(htmlStrategy(request));
    return;
  }

  // Default - Network with cache fallback
  event.respondWith(networkWithCacheFallback(request));
});

/**
 * Cache First Strategy
 * Try cache first, fall back to network
 */
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    const response = await fetch(request);

    // Only cache successful responses
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('Cache First Strategy Error:', error);
    return getOfflineFallback(request);
  }
}

/**
 * Network First Strategy
 * Try network first, fall back to cache
 * Useful for API calls that need fresh data
 */
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);

    // Cache successful API responses for offline use
    if (response && response.status === 200) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.warn('Network request failed, using cache:', error);
    const cached = await caches.match(request);
    
    if (cached) {
      return cached;
    }

    // Return offline response for failed API calls
    return new Response(
      JSON.stringify({
        error: 'offline',
        message: 'You are offline. Please check your connection.',
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * HTML Strategy
 * Network first for HTML, with cache fallback
 * Ensures latest content is shown when online
 */
async function htmlStrategy(request) {
  try {
    const response = await fetch(request);
    
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.warn('HTML network request failed:', error);
    
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Return offline page
    return caches.match('/');
  }
}

/**
 * Network with Cache Fallback
 */
async function networkWithCacheFallback(request) {
  try {
    return await fetch(request);
  } catch (error) {
    console.warn('Network request failed:', error);
    
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    return getOfflineFallback(request);
  }
}

/**
 * Get offline fallback response
 */
function getOfflineFallback(request) {
  if (request.destination === 'document') {
    return caches.match('/').then((response) => {
      return response || new Response('Offline - Please check your connection');
    });
  }

  return new Response('Offline - Resource not available');
}

/**
 * Handle messages from clients
 * Allows the app to send commands to the service worker
 */
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.startsWith('sewahive-'))
            .map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

/**
 * Handle push notifications (for future use)
 */
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  const data = event.data.json();
  const options = {
    body: data.message || 'New notification from SewaHive',
    icon: '/logo-192.png',
    badge: '/logo-192.png',
    tag: data.type || 'notification',
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Open',
      },
      {
        action: 'close',
        title: 'Close',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'SewaHive', options)
  );
});

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.tag ? `/notifications` : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if app is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (
          client.url === urlToOpen &&
          'focus' in client
        ) {
          return client.focus();
        }
      }
      // Open app if not already open
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

console.log('Service Worker loaded successfully');
