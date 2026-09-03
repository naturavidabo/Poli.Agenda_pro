(()=>{
'use strict';
const VERSION='2.21.17';
let loading=false;
function styles(){
 if(document.getElementById('sgFab22116Style'))return;
 const s=document.createElement('style');s.id='sgFab22116Style';
 s.textContent=`.fab.sg-service-fab{width:68px!important;height:68px!important;border-radius:23px!important;background:linear-gradient(145deg,#173f29,#2f6238)!important;color:#f7fbf7!important;border:1px solid rgba(255,255,255,.28)!important;box-shadow:0 13px 28px rgba(7,54,31,.30),inset 0 1px 0 rgba(255,255,255,.16)!important;font-size:0!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:2px!important;padding:6px!important}.fab.sg-service-fab .sgf-icon{width:25px;height:25px;display:block;color:#f5faf5}.fab.sg-service-fab .sgf-icon svg{width:25px;height:25px;display:block;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}.fab.sg-service-fab .sgf-label{font-size:7.5px;line-height:8px;font-weight:850;letter-spacing:.035em;text-align:center;color:#f7fbf7}.fab.sg-service-fab:active{transform:scale(.96)}#serviceGroupsHomeEntry,#serviceGroupsQuick,#serviceGroupsTile:not([data-sg-sentinel]){display:none!important}`;
 document.head.appendChild(s);
}
function candidate(){
 const fabs=[...document.querySelectorAll('button.fab,.fab')].filter(x=>x instanceof HTMLElement);
 if(fabs.length)return fabs[0];
 return [...document.querySelectorAll('button')].find(b=>{const r=b.getBoundingClientRect(),cs=getComputedStyle(b),t=(b.textContent||'').trim();return (cs.position==='fixed'||cs.position==='absolute')&&t==='+'&&r.width>=45&&r.height>=45;})||null;
}
function loadServiceGroupsScript(){
 return new Promise((resolve,reject)=>{
   if(typeof window.AgendaServiceGroups?.open==='function')return resolve();
   const old=document.querySelector('script[data-sg-recovery]');if(old)old.remove();
   const s=document.createElement('script');s.dataset.sgRecovery='1';s.src='./service-groups.js?v='+VERSION+'&r='+Date.now();s.onload=()=>typeof window.AgendaServiceGroups?.open==='function'?resolve():reject(new Error('Módulo no inició'));s.onerror=()=>reject(new Error('No se pudo cargar el módulo'));document.head.appendChild(s);
 });
}
async function launch(){
 if(loading)return;loading=true;
 try{
   if(typeof window.AgendaServiceGroups?.open!=='function')await loadServiceGroupsScript();
   if(typeof window.AgendaServiceGroups?.open!=='function')throw new Error('Módulo no disponible');
   await window.AgendaServiceGroups.open();
 }catch(e){console.error('Grupos de servicio',e);window.toast?.('No se pudo abrir Grupos de servicio. Actualiza la app e intenta nuevamente.');}
 finally{loading=false}
}
function install(){
 styles();const b=candidate();if(!b)return;
 b.dataset.sgServiceFab='1';b.classList.add('sg-service-fab');
 b.innerHTML='<span class="sgf-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8.5 11.2a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2Z"/><path d="M3.3 19c.2-3.1 2.1-5 5.2-5s5 1.9 5.2 5"/><path d="M15.7 10.4a2.5 2.5 0 1 0 0-5"/><path d="M15.4 13.7c3.1 0 4.8 1.7 5 4.5"/></svg></span><span class="sgf-label">GRUPOS<br>SERVICIO</span>';
 b.title='Grupos de servicio Alfa y Bravo';b.setAttribute('aria-label','Abrir grupos de servicio Alfa y Bravo');b.onclick=e=>{e.preventDefault();e.stopPropagation();launch()};
}
window.addEventListener('DOMContentLoaded',()=>{install();let q=false;new MutationObserver(()=>{if(q)return;q=true;requestAnimationFrame(()=>{q=false;install()})}).observe(document.getElementById('app')||document.body,{childList:true,subtree:true})});
window.AgendaServiceGroupsFab={version:VERSION,install,launch};
})();
