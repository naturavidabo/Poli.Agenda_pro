(()=>{
'use strict';
const VERSION='2.18.1';
const VERSION_RE=/\bv?2\.(?:14\.1|16\.\d+|17\.\d+|18\.0)\b/g;
function patchVersions(root=document.body){
  if(!root)return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let n;const list=[];
  while((n=walker.nextNode())) if(VERSION_RE.test(n.nodeValue||'')){VERSION_RE.lastIndex=0;list.push(n)}
  list.forEach(node=>{VERSION_RE.lastIndex=0;node.nodeValue=(node.nodeValue||'').replace(VERSION_RE,m=>m.startsWith('v')?'v'+VERSION:VERSION)});
  const kicker=document.querySelector('.sg-kicker');if(kicker)kicker.textContent='CONSULTA RÁPIDA · OFFLINE · v'+VERSION;
  try{if(typeof state!=='undefined'){state.settings=state.settings||{};state.settings.appVersion=VERSION}}catch{}
  try{if(window.AgendaServiceGroups)window.AgendaServiceGroups.version=VERSION}catch{}
}
function isHorario(){try{return typeof state!=='undefined'&&state.view==='horario'}catch{return /Horario/i.test(document.querySelector('main h2,.section-title')?.textContent||'')}}
function hideBadFloating(){
  document.getElementById('serviceGroupsQuick')?.remove();
  if(!isHorario())return;
  document.querySelectorAll('button').forEach(b=>{
    const t=(b.textContent||'').trim(),cs=getComputedStyle(b),r=b.getBoundingClientRect();
    const floating=cs.position==='fixed'||cs.position==='absolute';
    if(floating && (t==='+'||/agregar|nuevo/i.test((b.getAttribute('aria-label')||'')+' '+(b.title||''))) && r.width>=45 && r.height>=45){b.style.setProperty('display','none','important')}
  });
}
function installGroupAccess(){
  if(typeof window.AgendaServiceGroups?.open!=='function')return;
  if(document.getElementById('serviceGroupsHomeAccess'))return;
  let home=false;try{home=typeof state!=='undefined'&&state.view==='inicio'}catch{}
  if(!home)return;
  const host=document.querySelector('main section,#app section,main,#app');if(!host)return;
  const btn=document.createElement('button');
  btn.id='serviceGroupsHomeAccess';btn.type='button';btn.className='service-groups-home-access';
  btn.innerHTML='<span class="sgha-icon">👥</span><span><b>Mi grupo de servicio</b><small>Alfa · Bravo · consulta offline</small></span><span class="sgha-arrow">›</span>';
  btn.onclick=()=>window.AgendaServiceGroups.open();
  const anchor=host.querySelector('.home-hero,.dashboard-card,.offline-office-card-v2133');
  if(anchor?.nextSibling)host.insertBefore(btn,anchor.nextSibling);else host.prepend(btn);
}
function maintain(){patchVersions();hideBadFloating();installGroupAccess();document.body.classList.toggle('core-horario-2181',isHorario())}
async function checkVersion(){
  try{
    const r=await fetch('./version.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)return;
    const j=await r.json(),remote=j.appVersion||j.version;
    if(remote&&remote!==VERSION){
      const key='agenda-reload-'+remote;
      if(!sessionStorage.getItem(key)){sessionStorage.setItem(key,'1');location.replace('./index.html?v='+encodeURIComponent(remote)+'&t='+Date.now())}
    }
  }catch{}
}
window.addEventListener('DOMContentLoaded',()=>{
  maintain();checkVersion();
  let queued=false;
  new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;maintain()})}).observe(document.body,{childList:true,subtree:true,characterData:true});
  window.addEventListener('online',checkVersion);
  setInterval(checkVersion,5*60*1000);
});
window.AgendaCore2181={version:VERSION,refresh:maintain,checkVersion};
})();