(()=>{
'use strict';
const VERSION='2.21.6';

function forceAcademicMode(){
  try{
    if(typeof state!=='undefined'&&state){
      if(state.mode!=='academico') state.mode='academico';
      if(!state.view) state.view='inicio';
    }
  }catch{}
}

// Evita que aparezca la pantalla Académico / Institucional mientras el modo institucional no esté listo.
try{
  if(typeof render==='function'){
    const baseRender=render;
    render=function(){forceAcademicMode();return baseRender.apply(this,arguments)};
  }
}catch{}
try{
  if(typeof renderMode==='function'){
    renderMode=function(){forceAcademicMode();try{save?.().catch?.(()=>{})}catch{};try{render?.()}catch{}};
  }
}catch{}
forceAcademicMode();

function polishOnlinePanel(){
  const main=document.querySelector('main');
  if(!main)return;
  const grid=main.querySelector('.academic-module-grid,.academic-visual-modules');
  if(grid)grid.classList.add('agenda-future-grid-v2216');
  const formationCard=[...main.querySelectorAll('.online-module-head')].find(x=>/formaciones/i.test(x.textContent||''));
  if(formationCard)formationCard.classList.add('agenda-formation-head-v2216');
}

window.addEventListener('DOMContentLoaded',()=>{
  forceAcademicMode();
  try{save?.().catch?.(()=>{})}catch{}
  polishOnlinePanel();
  let queued=false;
  new MutationObserver(()=>{
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{queued=false;forceAcademicMode();polishOnlinePanel()});
  }).observe(document.body,{childList:true,subtree:true});
});

window.AgendaStabilityV2216={version:VERSION,forceAcademicMode,polishOnlinePanel};
})();