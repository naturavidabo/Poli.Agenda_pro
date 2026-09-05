(()=>{
'use strict';
const VERSION='2.23.2';
let queued=false;
function openDiscipline(event){
  event?.preventDefault?.();event?.stopPropagation?.();
  if(window.AgendaDisciplineQuick?.open)return window.AgendaDisciplineQuick.open();
  try{window.toast?.('Disciplina todavía está cargando. Intente nuevamente.')}catch{}
}
function patchNav(root=document){
  root.querySelectorAll?.('.dq-launch').forEach(x=>x.remove());
  const navs=root.matches?.('.academic-text-nav')?[root]:[...root.querySelectorAll?.('.academic-text-nav')||[]];
  navs.forEach(nav=>{
    const buttons=[...nav.querySelectorAll('button')];
    const exam=buttons.find(b=>/exámenes|examenes|rol de examen/i.test(b.textContent||'')||/setAcademicTab\(['\"]examenes['\"]\)/.test(b.getAttribute('onclick')||''));
    if(!exam)return;
    exam.classList.remove('active');exam.classList.add('tone-disciplina','discipline-nav-slot-v2232');
    exam.setAttribute('aria-label','Abrir Disciplina');exam.title='Disciplina · listas rápidas y designaciones';
    exam.removeAttribute('onclick');exam.onclick=openDiscipline;
    const icon=exam.querySelector('span');if(icon)icon.textContent='📋';
    const label=exam.querySelector('b');if(label)label.textContent='Disciplina';
  });
}
function patchExamRoleCards(root=document){
  const cards=root.matches?.('.exam-role-card-v278')?[root]:[...root.querySelectorAll?.('.exam-role-card-v278')||[]];
  cards.forEach(card=>{
    if(card.dataset.disciplineSlot==='1')return;
    card.dataset.disciplineSlot='1';
    card.classList.add('discipline-role-replacement-v2232');
    card.innerHTML=`<div class="discipline-slot-copy-v2232"><span class="discipline-slot-icon-v2232">📋</span><div><span class="eyebrow">Gestión del paralelo</span><h3>Disciplina</h3><p>Listas rápidas, designaciones y publicaciones.</p></div></div><button class="btn academic-main-btn discipline-slot-open-v2232" type="button">Abrir Disciplina</button>`;
    card.querySelector('.discipline-slot-open-v2232').onclick=openDiscipline;
  });
}
function installStyle(){
  if(document.getElementById('disciplineNavSlot2232Style'))return;
  const s=document.createElement('style');s.id='disciplineNavSlot2232Style';s.textContent=`
.academic-text-nav .discipline-nav-slot-v2232{position:relative}.academic-text-nav .discipline-nav-slot-v2232 span{filter:none}.academic-text-nav .discipline-nav-slot-v2232 b{white-space:nowrap}
.discipline-role-replacement-v2232{border-color:#cad9cd!important;background:linear-gradient(145deg,#f7fbf7,#eef5ef)!important}.discipline-slot-copy-v2232{display:flex;align-items:center;gap:12px}.discipline-slot-copy-v2232 h3{margin:2px 0 3px!important;color:#173f2b!important}.discipline-slot-copy-v2232 p{margin:0!important;color:#637168!important}.discipline-slot-icon-v2232{width:44px;height:44px;flex:0 0 44px;border-radius:14px;display:grid;place-items:center;background:#194c31;color:#fff;font-size:21px}.discipline-slot-open-v2232{width:100%;margin-top:11px!important}
`;
  document.head.appendChild(s);
}
function patch(root=document){installStyle();patchNav(root);patchExamRoleCards(root);document.querySelectorAll('.dq-launch').forEach(x=>x.remove())}
function boot(){patch();const target=document.getElementById('app')||document.body;new MutationObserver(muts=>{if(queued)return;if(!muts.some(m=>m.addedNodes?.length))return;queued=true;requestAnimationFrame(()=>{queued=false;patch(target)})}).observe(target,{childList:true,subtree:true});window.addEventListener('pageshow',()=>patch(target));}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.AgendaDisciplineNavSlot={version:VERSION,patch,open:openDiscipline};
})();