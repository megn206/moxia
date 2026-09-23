/* 墨匣 · PWA Service Worker —— 仅缓存本站静态资源，跨域请求（如 OCR 引擎 CDN）不拦截 */
const CACHE = 'moxia-v5';
const ASSETS = [
  './',
  './index.html',
  './plaza.html',
  './manifest.json',
  './icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (e) {
  var url = e.request.url;
  if (e.request.method !== 'GET') return;
  if (url.indexOf(self.location.origin) !== 0) return;   // 跨域直接走网络
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      }).catch(function () {
        return caches.match('./index.html');             // 离线兜底
      });
    })
  );
});
