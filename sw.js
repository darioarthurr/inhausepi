const VERSION="1.3.4";
const CACHE="gestao-epi-gps-"+VERSION+"-release";
const ASSETS=["./","./index.html","./styles.css","./config.js","./app.js","./manifest.webmanifest","./assets/icons/icon-192.png","./assets/icons/icon-512.png"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener("message",event=>{if(event.data&&event.data.type==="SKIP_WAITING")self.skipWaiting();});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("gestao-epi-gps-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;
  const url=new URL(request.url);
  const scopePath=new URL(self.registration.scope).pathname;
  if(url.origin!==self.location.origin||!url.pathname.startsWith(scopePath))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const response=await fetch(request);
      if(response&&response.ok){cache.put(request,response.clone()).catch(()=>{});}
      return response;
    }catch(error){
      const cached=await caches.match(request);
      if(cached)return cached;
      if(request.mode==="navigate"){
        const shell=await caches.match(new URL("./index.html",self.registration.scope).href);
        if(shell)return shell;
      }
      return new Response("Recurso indisponível no momento. Verifique sua conexão e tente novamente.",{status:503,statusText:"Service Unavailable",headers:{"Content-Type":"text/plain;charset=UTF-8"}});
    }
  })());
});
