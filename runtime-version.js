(()=>{
'use strict';
const FALLBACK='2.22.0';
async function sync(){
  let version=FALLBACK;
  try{
    const r=await fetch('./version.json?ts='+Date.now(),{cache:'no-store'});
    if(r.ok){const j=await r.json();version=j.appVersion||j.version||FALLBACK}
  }catch{}
  window.AGENDA_RUNTIME_VERSION=version;
  document.documentElement.dataset.agendaVersion=version;
  window.dispatchEvent(new CustomEvent('agenda:version-ready',{detail:{version}}));
}
window.addEventListener('DOMContentLoaded',sync,{once:true});
window.addEventListener('online',sync);
window.AgendaRuntimeVersion={version:FALLBACK,sync};
})();
