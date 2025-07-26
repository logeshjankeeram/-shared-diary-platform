// Service Worker for Shared Diary Platform

const CACHE_NAME = 'burner-diary-v1.0.4';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/style.css?v=1.0.4',
    '/js/main.js?v=1.0.4',
    '/js/diary.js?v=1.0.4',
    '/js/supabase.js?v=1.0.4',
    '/js/tunnel-bear.js?v=1.0.4',
    '/assets/icon.svg',
    '/manifest.json'
];

// Install event
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Fetch event
self.addEventListener('fetch', event => {
    // Mobile-specific handling
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    event.respondWith(
        fetch(event.request, {
            // Mobile-specific fetch options
            cache: isMobile ? 'no-cache' : 'default',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        })
            .then(response => {
                // Always fetch from network first, then cache
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Fallback to cache if network fails
                return caches.match(event.request);
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