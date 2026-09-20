const C='enruta-0-5';

self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(C).then(c=>
      c.addAll([
        './',
        './index.html',
        './styles.css',
        './app.js',
        './manifest.webmanifest'
      ])
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>
      Promise.all(
        keys
          .filter(k=>k!==C)
          .map(k=>caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch',e=>{
  e.respondWith(
    fetch(e.request)
      .then(response=>{
        const copy=response.clone();
        caches.open(C).then(c=>c.put(e.request,copy));
        return response;
      })
      .catch(()=>caches.match(e.request))
  );
});
