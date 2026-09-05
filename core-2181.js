(()=>{
'use strict';
const VERSION='2.22.0';
function activeNavLabel(){return (document.querySelector('.bottom-nav .nav-btn.active')?.textContent||'').trim().toLowerCase()}
function isHorario(){return activeNavLabel().includes('horario')||/Horario/i.test(document.querySelector('main h2,.section-title')?.textContent||'')}
function ensureSentinel(){let s=document.getElementById('serviceGroupsTile');if(s&&!s.dataset.sgSentinel){s.remove();s=null}if(!s){s=document.createElement('span');s.id='serviceGroupsTile';s.dataset.sgSentinel='1';s.hidden=true;document.body.appendChild(s)}}
function removeLegacyAccess(){document.getElementById('serviceGroupsQuick')?.remove();document.querySelectorAll('.sg-quick,#serviceGroupsHomeAccess').forEach(x=>x.remove())}
function hideHorarioFab(){if(!isHorario())return;document.querySelectorAll('button').forEach(b=>{const t=(b.textContent||'').trim(),cs=getComputedStyle(b),r=b.getBoundingClientRect(),floating=cs.position==='fixed'||cs.position==='absolute';if(floating&&(t==='+'||/agregar|nuevo/i.test((b.getAttribute('aria-label')||'')+' '+(b.title||'')))&&r.width>=45&&r.height>=45)b.style.setProperty('display','none','important')})}
function findHorarioAnchor(main){return main.querySelector('.smart-profile')||[...main.querySelectorAll('select')].find(x=>/capitanes|turno|horario/i.test((x.value||'')+' '+(x.options?.[x.selectedIndex]?.textContent||'')))||main.querySelector('.smart-schedule-top')||[...main.querySelectorAll('h2')].find(x=>/^horario$/i.test((x.textContent||'').trim()))}
function installHorarioGroupAccess(){const old=document.getElementById('serviceGroupsHorarioAccess');if(!isHorario()){old?.remove();return}if(typeof window.AgendaServiceGroups?.open!=='function')return;const main=document.querySelector('.app>main,main');if(!main)return;const anchor=findHorarioAnchor(main);if(!anchor)return;if(old&&old.isConnected){if(old.previousElementSibling!==anchor)anchor.insertAdjacentElement('afterend',old);return}const card=document.createElement('button');card.id='serviceGroupsHorarioAccess';card.type='button';card.className='service-groups-horario-access';card.innerHTML='<span class="sgha-icon" aria-hidden="true">👥</span><span class="sgha-copy"><b>Mi grupo de servicio</b><small>Alfa y Bravo · nómina completa · offline</small></span><span class="sgha-arrow" aria-hidden="true">›</span>';card.onclick=()=>window.AgendaServiceGroups.open();anchor.insertAdjacentElement('afterend',card)}
function styleGroupPage(){const modal=document.getElementById('serviceGroupsModal');document.body.classList.toggle('sg-page-open',!!modal);if(!modal)return;const close=modal.querySelector('.sg-close');if(close){close.textContent='←';close.setAttribute('aria-label','Volver')}const panel=modal.querySelector('.sg-panel');if(panel)panel.classList.add('sg-page-panel')}
function maintain(){ensureSentinel();removeLegacyAccess();hideHorarioFab();installHorarioGroupAccess();styleGroupPage();document.body.classList.toggle('core-horario-2181',isHorario())}
window.addEventListener('DOMContentLoaded',()=>{
  maintain();
  let queued=false;
  new MutationObserver(mutations=>{
    if(queued)return;
    if(!mutations.some(m=>m.type==='childList'&&(m.addedNodes.length||m.removedNodes.length)))return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;maintain()});
  }).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
},{once:true});
window.AgendaCore2181={version:VERSION,refresh:maintain};
})();
