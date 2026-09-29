/* 墨匣 · PWA Service Worker
   策略：
   - 页面请求（HTML）→ 网络优先，断网才回退缓存。这样换 index.html 就能立刻到达用户，
     不会像旧的「纯缓存优先」那样把老版本永久钉在缓存里。
   - 其它静态资源（图标 / manifest）→ 缓存优先，未命中再取网络。
   - 跨域请求（如 OCR 引擎 CDN）不拦截，直接走网络。

   发布提醒：改动本文件后必须把 CACHE 版本号 +1，浏览器才会安装新的 Service Worker。
   仅更换 index.html 时无需改动本文件（页面已经是网络优先）。 */
const CACHE = 'moxia-v69';
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
  var req = e.request;
  if (req.method !== 'GET') return;
  if (req.url.indexOf(self.location.origin) !== 0) return;   // 跨域（如 OCR 引擎 CDN）直接走网络

  var accept = req.headers.get('accept') || '';
  var wantsHTML = req.mode === 'navigate' || accept.indexOf('text/html') >= 0;

  if (wantsHTML) {
    /* 页面：网络优先——保证新版本能到达用户；断网时回退已缓存的页面 */
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match('./index.html');      // 离线兜底
        });
      })
    );
    return;
  }

  /* 静态资源：缓存优先（图标 / manifest 基本不变） */
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match('./index.html');               // 离线兜底
      });
    })
  );
});
