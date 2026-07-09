'use strict';
const CORE_CACHE='poliagenda-core-v2.1.0';
const MEDIA_CACHE='poliagenda-media-v1';
const CORE=[
  './','./index.html','./styles.css','./app.js','./manifest.webmanifest',
  './icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png',
  './assets/escudo-policia.png','./assets/horario-referencia.webp','./version.json',
  './assets/uniformes/uniforme-3a-estandar.webp','./assets/uniformes/uniforme-3a-tropical.webp','./assets/uniformes/uniforme-3b-estandar.webp','./assets/uniformes/uniforme-3b-tropical.webp','./assets/uniformes/uniforme-4-estandar.webp','./assets/uniformes/uniforme-4-tropical.webp',
  './data/reglamento-uniformes.json','./data/reglamento-sumario-unipol.json','./data/horario-base.json'
];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CORE_CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('poliagenda')&&k!==CORE_CACHE&&k!==MEDIA_CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==location.origin)return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(resp=>{const copy=resp.clone();caches.open(CORE_CACHE).then(c=>c.put('./index.html',copy));return resp;}).catch(()=>caches.match('./index.html')));
    return;
  }
  if(/\/assets\/pages\/|\.pdf(?:$|\?)/i.test(url.pathname)){
    event.respondWith(caches.open(MEDIA_CACHE).then(cache=>cache.match(req).then(cached=>cached||fetch(req).then(resp=>{if(resp.ok)cache.put(req,resp.clone());return resp;}))));
    return;
  }
  event.respondWith(caches.match(req).then(cached=>{
    const network=fetch(req).then(resp=>{if(resp.ok){const copy=resp.clone();caches.open(CORE_CACHE).then(c=>c.put(req,copy));}return resp;}).catch(()=>cached);
    return cached||network;
  }));
});
