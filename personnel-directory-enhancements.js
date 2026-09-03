(()=>{
'use strict';
const VERSION='2.21.11';
let cache=null,pending=null;
const norm=v=>String(v??'').replace(/\s+/g,' ').trim().toLocaleUpperCase('es');
const digits=v=>String(v??'').replace(/\D/g,'');
const intl=v=>{const d=digits(v);return d.startsWith('591')?d:(d.length===8?'591'+d:d)};
async function directory(){
  if(cache)return cache;
  if(pending)return pending;
  pending=(async()=>{
    if(typeof window.academicRPC!=='function'||!navigator.onLine)return [];
    const rows=await window.academicRPC('academic_personnel_directory',{p_course_code:null,p_department:null,p_search:null})||[];
    cache=rows;return rows;
  })().catch(e=>{console.warn('Directorio no disponible',e);return []}).finally(()=>{pending=null});
  return pending;
}
function addContact(row,person){
  if(row.dataset.personnelContact==='1')return;
  const phone=digits(person?.phone);if(phone.length<7)return;
  const status=row.querySelector('.gps-roster-status');if(!status)return;
  row.dataset.personnelContact='1';
  const box=document.createElement('div');box.className='ap-personnel-actions';
  const wa=intl(phone);
  box.innerHTML=`<a class="ap-personnel-call" href="tel:${phone}" aria-label="Llamar">☎</a><a class="ap-personnel-wa" href="https://wa.me/${wa}" target="_blank" rel="noopener" aria-label="WhatsApp">WA</a>`;
  status.appendChild(box);
}
function installTools(box){
  if(box.dataset.personnelTools==='1')return;
  const list=box.querySelector('.gps-roster-list');if(!list)return;
  box.dataset.personnelTools='1';
  const tool=document.createElement('div');tool.className='ap-personnel-tools';
  tool.innerHTML='<input type="search" class="ap-personnel-search" placeholder="Buscar nombre o procedencia…"><div class="ap-personnel-depts"></div>';
  const filters=box.querySelector('.gps-roster-filters');filters?.insertAdjacentElement('beforebegin',tool);
  const rows=[...box.querySelectorAll('.gps-roster-row')];
  const depts=[...new Set(rows.map(r=>norm(r.querySelector('.gps-roster-name small')?.textContent)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
  const strip=d=>d.replace(/^📍\s*/,'').trim();
  const deptBox=tool.querySelector('.ap-personnel-depts');
  deptBox.innerHTML='<button type="button" data-dept="" class="active">Todos</button>'+depts.map(d=>`<button type="button" data-dept="${strip(d)}">${strip(d)}</button>`).join('');
  let dept='';
  const apply=()=>{const q=norm(tool.querySelector('.ap-personnel-search').value);rows.forEach(r=>{const name=norm(r.querySelector('.gps-roster-name b')?.textContent),rd=strip(norm(r.querySelector('.gps-roster-name small')?.textContent));r.style.display=((!q||(name+' '+rd).includes(q))&&(!dept||rd===dept))?'':'none'})};
  tool.querySelector('.ap-personnel-search').addEventListener('input',apply);
  deptBox.querySelectorAll('button').forEach(b=>b.onclick=()=>{dept=norm(b.dataset.dept);deptBox.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));apply()});
}
async function enhance(box){
  if(!box||box.hidden)return;
  installTools(box);
  const people=await directory();if(!people.length)return;
  const map=new Map(people.map(p=>[norm(p.full_name),p]));
  box.querySelectorAll('.gps-roster-row').forEach(row=>{const name=norm(row.querySelector('.gps-roster-name b')?.textContent);addContact(row,map.get(name))});
}
function scan(){document.querySelectorAll('.gps-roster').forEach(enhance)}
function styles(){if(document.getElementById('apPersonnelEnhancementStyles'))return;const s=document.createElement('style');s.id='apPersonnelEnhancementStyles';s.textContent=`.ap-personnel-tools{padding:9px;background:#fbfcfa;border-bottom:1px solid #edf0eb}.ap-personnel-search{width:100%;box-sizing:border-box;border:1px solid #cad6c7;border-radius:12px;padding:10px 12px;background:#fff;font-size:12px}.ap-personnel-depts{display:flex;gap:6px;overflow-x:auto;margin-top:8px}.ap-personnel-depts button{white-space:nowrap;border:1px solid #ccd7c8;background:#fff;color:#355441;border-radius:999px;padding:6px 9px;font-size:10px;font-weight:800}.ap-personnel-depts button.active{background:#173f2b;color:#fff;border-color:#173f2b}.ap-personnel-actions{display:flex;justify-content:flex-end;gap:5px;margin-top:6px}.ap-personnel-actions a{display:inline-flex;align-items:center;justify-content:center;min-width:30px;height:27px;border-radius:9px;text-decoration:none;font-size:10px;font-weight:900;border:1px solid #cbd7c8}.ap-personnel-call{background:#f6f8f5;color:#23472f}.ap-personnel-wa{background:#e7f5e8;color:#17602c}`;document.head.appendChild(s)}
window.AgendaPersonnelDirectory={version:VERSION,refresh:()=>{cache=null;return directory()}};
window.addEventListener('DOMContentLoaded',()=>{styles();setTimeout(scan,900);let q=false;new MutationObserver(()=>{if(q)return;q=true;requestAnimationFrame(()=>{q=false;scan()})}).observe(document.getElementById('app')||document.body,{childList:true,subtree:true})});
})();