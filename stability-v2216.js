(()=>{
'use strict';
const VERSION='2.22.0';
function forceAcademicMode(){
  try{
    if(typeof state!=='undefined'&&state){
      if(state.mode!=='academico') state.mode='academico';
      if(!state.view) state.view='inicio';
    }
  }catch{}
}
function polishOnlinePanel(){
  const main=document.querySelector('main');
  if(!main)return;
  const grid=main.querySelector('.academic-module-grid,.academic-visual-modules');
  if(grid)grid.classList.add('agenda-future-grid-v2216');
  const formationCard=[...main.querySelectorAll('.online-module-head')].find(x=>/formaciones/i.test(x.textContent||''));
  if(formationCard)formationCard.classList.add('agenda-formation-head-v2216');
}
try{
  if(typeof render==='function'&&!window.__agendaStableRenderWrapped){
    const baseRender=render;
    render=function(){
      forceAcademicMode();
      const out=baseRender.apply(this,arguments);
      requestAnimationFrame(polishOnlinePanel);
      return out;
    };
    window.__agendaStableRenderWrapped=true;
  }
}catch{}
try{
  if(typeof renderMode==='function'){
    renderMode=function(){forceAcademicMode();try{save?.().catch?.(()=>{})}catch{};try{render?.()}catch{}};
  }
}catch{}
window.addEventListener('DOMContentLoaded',()=>{forceAcademicMode();requestAnimationFrame(polishOnlinePanel)},{once:true});
window.AgendaStabilityV2216={version:VERSION,forceAcademicMode,polishOnlinePanel};
})();
