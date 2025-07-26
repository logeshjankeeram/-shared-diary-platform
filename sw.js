// Service Worker for Shared Diary Platform

const CACHE_NAME = 'shared-diary-v1.0.1';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/style.css?v=1.0.1',
    '/css/critter.css?v=1.0.1',
    '/js/main.js?v=1.0.1',
    '/js/diary.js?v=1.0.1',
    '/js/supabase.js?v=1.0.1',
    '/js/critter.js?v=1.0.1',
    '/assets/icon.svg'
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
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                if (response) {
                    return response;
                }
                return fetch(event.request);
            }
            )
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