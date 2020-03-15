importScripts('https://storage.googleapis.com/workbox-cdn/releases/3.0.0/workbox-sw.js')
importScripts('https://cdn.jsdelivr.net/npm/localforage@1.7.3/dist/localforage.min.js')

workbox.precaching.precacheAndRoute([
    {url:'/index.html', revision: 1}
])

workbox.routing.registerRoute(
    /.*\.(?:js|css)/,
    workbox.strategies.staleWhileRevalidate({
        cacheName: 'workbox:css',
    })
)

workbox.routing.registerRoute(
    /.*\.png/,
    workbox.strategies.cacheFirst({
        cacheName: 'workbox:image',
        plugins: [
            new workbox.expiration.Plugin({
                maxEntries: 20,
                maxAgeSeconds: 7 * 24 * 60 * 60,
            })
        ],
    })
)

let notification_alert_check = () => {
    return new Promise((resolve, reject) => {
        setInterval(() => {
            localforage.getItem('notification').then(value => {
                if (value) {
                    let reload = value
                    value.map(item => {
                        let now = new Date().getTime()
                        console.log("now", now)
                        console.log("Task", item.time)
                        if (item.time <= now) {
                            self.registration.showNotification(item.title)
                            reload = reload.filter(i => i.id !== item.id)
                        }
                    })
                    localforage.setItem('notification', reload)
                }
            })
        }, 10*1000)
        // reject(new Error("not yet"))
    })
}

self.addEventListener('sync', function (e) {
    console.log(`service worker tag: ${e.tag}`)
    if (e.tag === 'notification_sync') {
        e.waitUntil(notification_alert_check())
    }
})