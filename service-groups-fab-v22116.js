(()=>{
'use strict';
const VERSION='2.21.16';
function styles(){
 if(document.getElementById('sgFab22116Style'))return;
 const s=document.createElement('style');s.id='sgFab22116Style';
 s.textContent=`.fab.sg-service-fab{width:66px!important;height:66px!important;border-radius:22px!important;background:linear-gradient(145deg,#174f32,#2f713e)!important;color:#fff!important;border:1px solid rgba(255,255,255,.24)!important;box-shadow:0 13px 28px rgba(7,54,31,.30)!important;font-size:0!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:1px!important;padding:5px!important}.fab.sg-service-fab .sgf-icon{font-size:23px;line-height:24px}.fab.sg-service-fab .sgf-label{font-size:8px;line-height:9px;font-weight:900;letter-spacing:.02em;text-align:center;color:#fff}.fab.sg-service-fab:active{transform:scale(.96)}#serviceGroupsHomeEntry,#serviceGroupsQuick,#serviceGroupsTile:not([data-sg-sentinel]){display:none!important}`;
 document.head.appendChild(s);
}
function candidate(){
 const fabs=[...document.querySelectorAll('button.fab,.fab')].filter(x=>x instanceof HTMLElement);
 if(fabs.length)return fabs[0];
 return [...document.querySelectorAll('button')].find(b=>{const r=b.getBoundingClientRect(),cs=getComputedStyle(b),t=(b.textContent||'').trim();return (cs.position==='fixed'||cs.position==='absolute')&&t==='+'&&r.width>=45&&r.height>=45;})||null;
}
function install(){
 styles();
 const b=candidate();if(!b)return;
 if(b.dataset.sgServiceFab==='1')return;
 b.dataset.sgServiceFab='1';b.classList.add('sg-service-fab');
 b.innerHTML='<span class="sgf-icon" aria-hidden="true">👥</span><span class="sgf-label">GRUPOS<br>SERVICIO</span>';
 b.title='Grupos de servicio Alfa y Bravo';b.setAttribute('aria-label','Abrir grupos de servicio Alfa y Bravo');
 b.onclick=e=>{e.preventDefault();e.stopPropagation();if(typeof window.AgendaServiceGroups?.open==='function')window.AgendaServiceGroups.open();else window.toast?.('Cargando grupos de servicio…')};
}
window.addEventListener('DOMContentLoaded',()=>{install();let q=false;new MutationObserver(()=>{if(q)return;q=true;requestAnimationFrame(()=>{q=false;install()})}).observe(document.getElementById('app')||document.body,{childList:true,subtree:true})});
window.AgendaServiceGroupsFab={version:VERSION,install};
})();
