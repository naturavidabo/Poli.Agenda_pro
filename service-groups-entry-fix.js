(()=>{
'use strict';
const VERSION='2.21.15';
function ensureStyles(){
  if(document.getElementById('serviceGroupsEntryFixStyles'))return;
  const s=document.createElement('style');
  s.id='serviceGroupsEntryFixStyles';
  s.textContent=`
  .sg-home-entry{width:calc(100% - 28px);margin:12px 14px 4px;border:1px solid #b9cbbd;border-radius:18px;background:linear-gradient(135deg,#123f2a,#23633d);color:#fff;padding:15px;display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:11px;align-items:center;text-align:left;box-shadow:0 10px 25px rgba(18,63,42,.16);font:inherit}
  .sg-home-entry .sg-he-icon{width:44px;height:44px;border-radius:14px;background:rgba(255,255,255,.14);display:grid;place-items:center;font-size:22px}
  .sg-home-entry .sg-he-copy{min-width:0;display:block}.sg-home-entry b{display:block;font-size:14px;color:#fff}.sg-home-entry small{display:block;opacity:.82;margin-top:3px;font-size:10px;color:#fff}.sg-home-entry strong{font-size:21px;color:#fff}
  `;
  document.head.appendChild(s);
}
function isHome(){
  try{return typeof state!=='undefined'&&state.view==='inicio'&&!!document.querySelector('main')}
  catch{return !!document.querySelector('main')}
}
function install(){
  ensureStyles();
  const old=document.getElementById('serviceGroupsHomeEntry');
  if(!isHome()){old?.remove();return}
  if(old)return;
  const main=document.querySelector('main');
  if(!main)return;
  const b=document.createElement('button');
  b.id='serviceGroupsHomeEntry';
  b.className='sg-home-entry';
  b.type='button';
  b.innerHTML='<span class="sg-he-icon">👥</span><span class="sg-he-copy"><b>Grupos de servicio</b><small>Alfa · Bravo · contactos · acceso offline</small></span><strong>›</strong>';
  b.addEventListener('click',()=>{
    if(window.AgendaServiceGroups?.open)window.AgendaServiceGroups.open();
    else window.toast?.('Cargando grupos de servicio…');
  });
  main.appendChild(b);
}
window.addEventListener('DOMContentLoaded',()=>{
  install();
  let pending=false;
  new MutationObserver(()=>{
    if(pending)return;
    pending=true;
    requestAnimationFrame(()=>{pending=false;install()});
  }).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
});
window.AgendaServiceGroupsEntry={version:VERSION,install};
})();
