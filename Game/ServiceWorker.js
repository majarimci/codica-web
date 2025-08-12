const cacheName = "Academy_Hamrah-Codica-2.0.7";
const contentToCache = [
    "Build/bb0d9ecdb05db3e84da20bd14a4f84dc.loader.js",
    "Build/c6cb37354805ea2183b38f02ff250d14.framework.js",
    "Build/49d5a33cc9a794257ce003de9c2149e4.data",
    "Build/0dabd8b99e2c5ac32e2a35a55daedd70.wasm",
    // Enhanced template CSS files
    "TemplateData/style.css",
    "TemplateData/orientation.css",
    "TemplateData/loading.css",
    "TemplateData/mobile.css",
    // Unity graphics
    "TemplateData/unity-logo-dark.png",
    "TemplateData/unity-logo-light.png",
    "TemplateData/progress-bar-empty-dark.png",
    "TemplateData/progress-bar-empty-light.png",
    "TemplateData/progress-bar-full-dark.png",
    "TemplateData/progress-bar-full-light.png",
    "TemplateData/favicon.ico",
    // PWA manifest
    "manifest.webmanifest"
];

// Enhanced cache strategy for different resource types
const CACHE_STRATEGIES = {
    unity: 'cache-first',      // Unity build files - cache first
    css: 'stale-while-revalidate', // CSS files - show cached, update in background
    images: 'cache-first',     // Images - cache first
    manifest: 'network-first'  // Manifest - network first for updates
};

self.addEventListener('install', function (e) {
    console.log('[Service Worker] Install - Enhanced Template');
    
    e.waitUntil((async function () {
        try {
            const cache = await caches.open(cacheName);
            console.log('[Service Worker] Caching enhanced template resources');
            
            // Cache core Unity files first
            const unityFiles = contentToCache.filter(file => file.startsWith('Build/'));
            await cache.addAll(unityFiles);
            console.log('[Service Worker] Unity files cached');
            
            // Cache template resources
            const templateFiles = contentToCache.filter(file => 
                file.startsWith('TemplateData/') || file === 'manifest.webmanifest'
            );
            await cache.addAll(templateFiles);
            console.log('[Service Worker] Template files cached');
            
        } catch (error) {
            console.error('[Service Worker] Cache installation failed:', error);
            // Continue without caching if it fails
        }
    })());
    
    // Force activation to ensure new service worker takes control
    self.skipWaiting();
});

self.addEventListener('activate', function(e) {
    console.log('[Service Worker] Activate - Enhanced Template');
    
    e.waitUntil((async function() {
        // Clean up old caches
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(name => 
            name.startsWith('Academy_Hamrah-Codica') && name !== cacheName
        );
        
        await Promise.all(
            oldCaches.map(oldCache => {
                console.log('[Service Worker] Deleting old cache:', oldCache);
                return caches.delete(oldCache);
            })
        );
    })());
    
    // Take control of all clients immediately
    return self.clients.claim();
});

self.addEventListener('fetch', function (e) {
    // Skip non-GET requests
    if (e.request.method !== 'GET') return;
    
    // Skip cross-origin requests unless they're for our resources
    if (!e.request.url.startsWith(self.location.origin)) return;
    
    e.respondWith((async function () {
        const url = new URL(e.request.url);
        const pathname = url.pathname;
        
        try {
            // Determine cache strategy based on resource type
            let strategy = 'network-first';
            
            if (pathname.startsWith('/Build/')) {
                strategy = CACHE_STRATEGIES.unity;
            } else if (pathname.endsWith('.css')) {
                strategy = CACHE_STRATEGIES.css;
            } else if (pathname.match(/\.(png|jpg|jpeg|gif|ico|svg)$/)) {
                strategy = CACHE_STRATEGIES.images;
            } else if (pathname.includes('manifest')) {
                strategy = CACHE_STRATEGIES.manifest;
            }
            
            console.log(`[Service Worker] Fetching ${pathname} with ${strategy} strategy`);
            
            // Execute strategy
            switch (strategy) {
                case 'cache-first':
                    return await cacheFirst(e.request);
                case 'network-first':
                    return await networkFirst(e.request);
                case 'stale-while-revalidate':
                    return await staleWhileRevalidate(e.request);
                default:
                    return await networkFirst(e.request);
            }
            
        } catch (error) {
            console.error('[Service Worker] Fetch error:', error);
            return await cacheFirst(e.request);
        }
    })());
});

// Cache strategies implementation
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        console.log(`[Service Worker] Cache hit: ${request.url}`);
        return cachedResponse;
    }
    
    console.log(`[Service Worker] Cache miss, fetching: ${request.url}`);
    const response = await fetch(request);
    
    if (response.ok) {
        const cache = await caches.open(cacheName);
        cache.put(request, response.clone());
    }
    
    return response;
}

async function networkFirst(request) {
    try {
        const response = await fetch(request);
        
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
            console.log(`[Service Worker] Network success, cached: ${request.url}`);
        }
        
        return response;
    } catch (error) {
        console.log(`[Service Worker] Network failed, trying cache: ${request.url}`);
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        throw error;
    }
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    // Always try to update in the background
    const networkPromise = fetch(request).then(response => {
        if (response.ok) {
            cache.put(request, response.clone());
            console.log(`[Service Worker] Background update: ${request.url}`);
        }
        return response;
    }).catch(error => {
        console.log(`[Service Worker] Background update failed: ${request.url}`);
    });
    
    // Return cached version immediately if available
    if (cachedResponse) {
        console.log(`[Service Worker] Serving stale: ${request.url}`);
        return cachedResponse;
    }
    
    // If no cache, wait for network
    console.log(`[Service Worker] No cache, waiting for network: ${request.url}`);
    return networkPromise;
}

// Handle service worker messages
self.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (e.data && e.data.type === 'GET_CACHE_STATUS') {
        e.ports[0].postMessage({
            cacheName: cacheName,
            cachedResources: contentToCache.length
        });
    }
});

// Background sync for offline capability
self.addEventListener('sync', function(e) {
    if (e.tag === 'background-sync') {
        console.log('[Service Worker] Background sync triggered');
        // Could implement analytics or other background tasks here
    }
});

// Performance monitoring
let performanceData = {
    cacheHits: 0,
    cacheMisses: 0,
    networkErrors: 0
};

// Log performance data periodically
setInterval(() => {
    if (performanceData.cacheHits > 0 || performanceData.cacheMisses > 0) {
        console.log('[Service Worker] Performance:', performanceData);
        // Reset counters
        performanceData = { cacheHits: 0, cacheMisses: 0, networkErrors: 0 };
    }
}, 30000); // Every 30 seconds
