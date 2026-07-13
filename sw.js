const CACHE='agenda-policial-v2.4.5';
const CORE=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./version.json','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png','./assets/escudo-policia.png','./data/reglamento-uniformes.json','./data/reglamento-sumario-unipol.json','./data/horario-base.json','./data/biblioteca-catalogo.json'];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await Promise.allSettled(CORE.map(url=>cache.add(url)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE&&k.startsWith('agenda-policial')).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message',event=>{
  if(event.data&&event.data.type==='SKIP_WAITING') self.skipWaiting();
  if(event.data&&event.data.type==='CLEAR_AGENDA_CACHES'){
    event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('agenda-policial')).map(k=>caches.delete(k)))));
  }
});

async function networkFirst(request){
  try{
    const response=await fetch(request,{cache:'no-store'});
    const cache=await caches.open(CACHE);
    cache.put(request,response.clone()).catch(()=>{});
    return response;
  }catch(error){
    const cached=await caches.match(request);
    return cached || (await caches.match('./index.html')) || Response.error();
  }
}

async function cacheFirst(request){
  const cached=await caches.match(request);
  if(cached) return cached;
  try{
    const response=await fetch(request);
    const cache=await caches.open(CACHE);
    cache.put(request,response.clone()).catch(()=>{});
    return response;
  }catch(error){
    return (await caches.match('./index.html')) || Response.error();
  }
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  const path=url.pathname;
  const isCore=path.endsWith('/')||path.endsWith('/index.html')||path.endsWith('/app.js')||path.endsWith('/styles.css')||path.endsWith('/manifest.webmanifest')||path.endsWith('/version.json')||path.endsWith('/sw.js');
  if(event.request.mode==='navigate'||isCore){
    event.respondWith(networkFirst(event.request));
    return;
  }
  event.respondWith(cacheFirst(event.request));
});
