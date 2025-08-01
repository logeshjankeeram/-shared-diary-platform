// Service Worker for Shared Diary Platform

const CACHE_NAME = 'burner-diary-v1.1.4';
const urlsToCache = [
    '/',
    '/index.html?v=1.1.4',
    '/css/style.css?v=1.1.4',
    '/js/main.js?v=1.1.4',
    '/js/diary.js?v=1.1.4',
    '/js/supabase.js?v=1.1.4',
    '/js/tunnel-bear.js?v=1.1.4',
    '/assets/forest.png?v=1.1.4',
    '/assets/phone.png?v=1.1.4',
    '/manifest.json?v=1.1.4'
];

// Install event
self.addEventListener('install', event => {
    event.waitUntil(
        // Clear all existing caches first
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    console.log('Clearing old cache:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        }).then(() => {
            // Then open new cache and add URLs
            return caches.open(CACHE_NAME);
        }).then(cache => {
            console.log('Opened new cache:', CACHE_NAME);
            return cache.addAll(urlsToCache);
        })
    );
});

// Fetch event
self.addEventListener('fetch', event => {
    // Completely bypass external resources to avoid CORS issues
    if (event.request.url.includes('fonts.googleapis.com') ||
        event.request.url.includes('fonts.gstatic.com') ||
        event.request.url.includes('cdn.tailwindcss.com') ||
        event.request.url.includes('cdnjs.cloudflare.com') ||
        event.request.url.includes('unpkg.com') ||
        event.request.url.includes('jsdelivr.net')) {
        // Let the browser handle external resources directly
        return;
    }

    // Only handle same-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    // Mobile-specific handling
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    event.respondWith(
        fetch(event.request, {
            // Mobile-specific fetch options
            cache: isMobile ? 'no-cache' : 'default'
        })
            .then(response => {
                // Only cache successful GET responses (exclude POST, PUT, DELETE)
                if (response.status === 200 && event.request.method === 'GET') {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Fallback to cache if network fails (only for GET requests)
                if (event.request.method === 'GET') {
                    return caches.match(event.request);
                }
                // For non-GET requests, just return the error
                return new Response('Network error', { status: 503 });
            })
    );
});

// Activate event
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Push notification event
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'Time to write your diary entry!',
        icon: '/assets/icon.svg',
        badge: '/assets/icon.svg',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Open Diary',
                icon: '/assets/icon.svg'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/assets/icon.svg'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('Shared Diary Reminder', options)
    );
});

// Notification click event
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
}); 