importScripts('https://storage.googleapis.com/workbox-cdn/releases/3.0.0/workbox-sw.js')
importScripts('https://cdn.jsdelivr.net/npm/localforage@1.7.3/dist/localforage.min.js')

workbox.setConfig({ debug: true })

workbox.precaching.precacheAndRoute([
    {url:'/index.html', revision: 5}
])

workbox.routing.registerRoute(
    /.*\.(?:js|css)/,
    new workbox.strategies.NetworkFirst({
        cacheName: 'workbox:css',
    })
)

workbox.routing.registerRoute(
    /.*\.ttf/,
    new workbox.strategies.CacheFirst({
      cacheName: 'wworkbox:font',
    })
)

workbox.routing.registerRoute(
    /.*\.png/,
    new workbox.strategies.CacheFirst({
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
                        console.log(item)
                        let now = new Date().getTime()
                        if (item.time <= now) {
                            self.registration.showNotification(item.title, {
                                body: '記的寫(抄)作業'
                            })
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