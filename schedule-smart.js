(()=>{
'use strict';
const V='2.17.2';
function e(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]))}
function mins(t){const m=String(t||'').match(/(\d{1,2}):(\d{2})/);return m?+m[1]*60 + +m[2]:9999}
function smartStatus(){
  try{
    const day=typeof currentDayKey==='function'?currentDayKey():'lunes';
    const rows=typeof getBlocksForDay==='function'?getBlocksForDay(day):[];
    const now=new Date(),n=now.getHours()*60+now.getMinutes();
    const usable=rows.filter(b=>!(typeof isNonLectiveBlock==='function'&&isNonLectiveBlock(b))&&!/descanso/i.test(b.materia||''));
    return {current:usable.find(b=>n>=mins(b.inicio)&&n<mins(b.fin))||null,next:usable.find(b=>mins(b.inicio)>n)||null};
  }catch{return {current:null,next:null}}
}
function compactFocusHtml(){
  const s=smartStatus(),focus=s.current||s.next;if(!focus)return'';
  const label=s.current?'AHORA':'PRÓXIMA';
  return `<div class="schedule-clean-focus ${s.current?'current':''}" data-smart-focus onclick="openClassDetail('${e(focus.id)}')"><span>${label}</span><b>${e(focus.materia||'Actividad')}</b><small>${e(focus.inicio)}–${e(focus.fin)}${focus.docente?' · '+e(focus.docente):''}</small></div>`;
}
function cleanLegacy(){
  const picker=document.querySelector('.schedule-picker');
  if(!picker)return;
  const section=picker.closest('section');if(!section)return;
  section.classList.add('schedule-clean-v2172');
  document.body.classList.add('smart-horario-active');
  const daily=section.querySelector('.daily-schedule,.schedule-table-wrap');
  let focus=section.querySelector('[data-smart-focus]');
  if(!focus&&daily){daily.insertAdjacentHTML('beforebegin',compactFocusHtml())}
  else if(focus){const fresh=compactFocusHtml();if(fresh){const box=document.createElement('div');box.innerHTML=fresh;focus.replaceWith(box.firstElementChild)}}
}
function strip(){
  const meta=state.scheduleMeta||scheduleTemplateMeta()||{},view=state.scheduleView||'dia';
  const active=activeScheduleCatalog(),selected=state.selectedScheduleId||active[0]?.id||'';
  const s=smartStatus(),now=new Date();
  const date=new Intl.DateTimeFormat('es-BO',{weekday:'long',day:'numeric',month:'short'}).format(now);
  const clock=now.toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'});
  const focus=s.current||s.next,focusLabel=s.current?'AHORA':s.next?'PRÓXIMA':'HOY';
  return `<section class="smart-schedule-v217"><div class="smart-schedule-top"><div><span class="smart-date">${e(date)} · ${e(clock)}</span><h2>Horario</h2><small>${e(meta.institucion||'Escuela Superior de Policías — Filial Sucre')}</small></div></div>${active.length>1?`<select class="smart-profile" onchange="selectScheduleProfile(this.value)">${active.map(x=>`<option value="${e(x.id)}" ${String(selected)===String(x.id)?'selected':''}>${e(x.etiqueta||x.id)}</option>`).join('')}</select>`:''}${focus?`<div class="smart-now ${s.current?'current':''}" onclick="openClassDetail('${e(focus.id)}')"><span>${focusLabel}</span><b>${e(focus.materia||'Actividad')}</b><small>${e(focus.inicio)}–${e(focus.fin)}${focus.docente?' · '+e(focus.docente):''}</small></div>`:''}<div class="smart-switch"><button class="${view==='dia'?'active':''}" onclick="setScheduleView('dia')">Día</button><button class="${view==='semana'?'active':''}" onclick="setScheduleView('semana')">Semana</button></div>${view==='semana'?renderWeeklySchedule():renderDailySchedule()}</section>`;
}
function install(){
  try{if(typeof window.renderHorario==='function')window.renderHorario=strip}catch{}
  cleanLegacy();
  const observer=new MutationObserver(()=>{clearTimeout(observer._t);observer._t=setTimeout(cleanLegacy,20)});
  observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
}
window.addEventListener('DOMContentLoaded',()=>{install();setInterval(()=>{cleanLegacy()},60000)});
window.AgendaScheduleSmart={version:V,install,cleanLegacy};
})();