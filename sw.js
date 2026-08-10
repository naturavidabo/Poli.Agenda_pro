const CACHE='agenda-policial-v2.12.0';
const CORE_REQUIRED=['./','./index.html','./styles.css','./online.css','./app.js','./online.js','./manifest.webmanifest','./version.json','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png','./assets/escudo-policia.png'];
const CORE_OPTIONAL=['./assets/horario-segundo-semestre-2026.png','./assets/rol-examenes-primer-parcial-2026.jpg','./assets/horario-suboficial-segundo-f-2026.jpg','./assets/horario-sargento-segundo-a-2026.jpg','./assets/horario-capitanes-b-2026.jpg','./assets/reglamento-comision-sumaria-unipol.pdf','./data/reglamento-uniformes.json','./data/reglamento-sumario-unipol.json','./data/horario-base.json','./data/biblioteca-catalogo.json','./data/academic-users.json','./data/ley-777.json','./data/ley-101.json','./data/ley-organica-policia.json','./data/ley-004.json','./data/ley-348.json','https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js','https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js','https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js','https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js','https://cdn.jsdelivr.net/npm/docx-preview@0.4.0/dist/docx-preview.min.js'];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    // Si falta un archivo esencial, la versión nueva NO reemplaza a la estable anterior.
    await cache.addAll(CORE_REQUIRED);
    await Promise.allSettled(CORE_OPTIONAL.map(url=>cache.add(url)));
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
    if(response&&response.ok){const cache=await caches.open(CACHE);cache.put(request,response.clone()).catch(()=>{});}
    return response;
  }catch(error){
    const cached=await caches.match(request);
    return cached || (await caches.match('./index.html')) || Response.error();
  }
}

async function cacheFirst(request,htmlFallback=true){
  const cached=await caches.match(request);
  if(cached) return cached;
  try{
    const response=await fetch(request);
    if(response&&(response.ok||response.type==='opaque')){const cache=await caches.open(CACHE);cache.put(request,response.clone()).catch(()=>{});}
    return response;
  }catch(error){
    if(htmlFallback) return (await caches.match('./index.html')) || Response.error();
    return Response.error();
  }
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  const sameOrigin=url.origin===self.location.origin;
  if(!sameOrigin){event.respondWith(cacheFirst(event.request,false));return;}
  const path=url.pathname;
  const isCore=path.endsWith('/')||path.endsWith('/index.html')||path.endsWith('/app.js')||path.endsWith('/online.js')||path.endsWith('/styles.css')||path.endsWith('/online.css')||path.endsWith('/manifest.webmanifest')||path.endsWith('/version.json')||path.endsWith('/sw.js');
  if(event.request.mode==='navigate'||isCore){event.respondWith(networkFirst(event.request));return;}
  event.respondWith(cacheFirst(event.request,true));
});
