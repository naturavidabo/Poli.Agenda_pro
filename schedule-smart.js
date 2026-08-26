(()=>{
'use strict';
const V='2.17.0';
function e(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function mins(t){const m=String(t||'').match(/(\d{1,2}):(\d{2})/);return m?+m[1]*60 + +m[2]:9999}
function smartStatus(){
  try{
    const day=typeof currentDayKey==='function'?currentDayKey():'lunes';
    const rows=typeof getBlocksForDay==='function'?getBlocksForDay(day):[];
    const now=new Date(), n=now.getHours()*60+now.getMinutes();
    const usable=rows.filter(b=>!(typeof isNonLectiveBlock==='function'&&isNonLectiveBlock(b))&&!/descanso/i.test(b.materia||''));
    const current=usable.find(b=>n>=mins(b.inicio)&&n<mins(b.fin));
    const next=usable.find(b=>mins(b.inicio)>n);
    return {current,next};
  }catch{return {current:null,next:null}}
}
function strip(){
  const meta=state.scheduleMeta||scheduleTemplateMeta()||{},view=state.scheduleView||'dia';
  const active=activeScheduleCatalog(),selected=state.selectedScheduleId||active[0]?.id||'';
  const s=smartStatus(), now=new Date();
  const date=new Intl.DateTimeFormat('es-BO',{weekday:'long',day:'numeric',month:'short'}).format(now);
  const clock=now.toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'});
  const focus=s.current||s.next;
  const focusLabel=s.current?'AHORA':s.next?'PRÓXIMA':'HOY';
  return `<section class="smart-schedule-v217"><div class="smart-schedule-top"><div><span class="smart-date">${e(date)} · ${e(clock)}</span><h2>Horario</h2><small>${e(meta.institucion||'Escuela Superior de Policías — Filial Sucre')}</small></div><button class="smart-more" onclick="openScheduleMetaForm()" aria-label="Opciones">⋮</button></div>${active.length>1?`<select class="smart-profile" onchange="selectScheduleProfile(this.value)">${active.map(x=>`<option value="${e(x.id)}" ${String(selected)===String(x.id)?'selected':''}>${e(x.etiqueta||x.id)}</option>`).join('')}</select>`:''}${focus?`<div class="smart-now ${s.current?'current':''}" onclick="openClassDetail('${e(focus.id)}')"><span>${focusLabel}</span><b>${e(focus.materia||'Actividad')}</b><small>${e(focus.inicio)}–${e(focus.fin)}${focus.docente?' · '+e(focus.docente):''}</small></div>`:''}<div class="smart-switch"><button class="${view==='dia'?'active':''}" onclick="setScheduleView('dia')">Día</button><button class="${view==='semana'?'active':''}" onclick="setScheduleView('semana')">Semana</button></div>${view==='semana'?renderWeeklySchedule():renderDailySchedule()}</section>`;
}
function install(){
  if(typeof window.renderHorario==='function')window.renderHorario=strip;
  // El + global no debe tapar el horario: se oculta solo en esta vista mediante clase de body.
  const oldRender=window.render;
  if(typeof oldRender==='function'&&!oldRender.__v217){
    const wrapped=function(){const r=oldRender.apply(this,arguments);requestAnimationFrame(()=>document.body.classList.toggle('smart-horario-active',state?.view==='horario'));return r};
    wrapped.__v217=true;window.render=wrapped;
  }
  document.body.classList.toggle('smart-horario-active',window.state?.view==='horario');
}
window.addEventListener('DOMContentLoaded',()=>{install();setInterval(()=>{if(window.state?.view==='horario'){const el=document.querySelector('.smart-date');if(el){const n=new Date();el.textContent=new Intl.DateTimeFormat('es-BO',{weekday:'long',day:'numeric',month:'short'}).format(n)+' · '+n.toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'})}},60000)});
window.AgendaScheduleSmart={version:V,install};
})();