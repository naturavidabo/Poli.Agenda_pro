(()=>{
'use strict';
const VERSION='2.22.1';
function installStyle(){
  if(document.getElementById('birthdayCapsuleGuard2221'))return;
  document.getElementById('birthdayCapsuleGuard22122')?.remove();
  const s=document.createElement('style');
  s.id='birthdayCapsuleGuard2221';
  s.textContent=`
#apBirthdayCard.ap-bday-card{appearance:none!important;-webkit-appearance:none!important;width:calc(100% - 24px)!important;box-sizing:border-box!important;margin:9px 12px 13px!important;padding:7px 8px 7px 9px!important;min-height:50px!important;height:auto!important;border:1px solid rgba(166,139,57,.42)!important;border-radius:999px!important;background:linear-gradient(135deg,rgba(255,252,238,.96),rgba(239,247,238,.98))!important;display:grid!important;grid-template-columns:34px minmax(0,1fr) 34px!important;gap:9px!important;align-items:center!important;text-align:left!important;color:#24422d!important;box-shadow:0 5px 15px rgba(25,55,34,.07)!important;overflow:hidden!important;position:relative!important;line-height:normal!important;pointer-events:auto!important;touch-action:manipulation!important;cursor:pointer!important;z-index:2!important}
#apBirthdayCard.ap-bday-card .ico{width:34px!important;height:34px!important;min-width:34px!important;min-height:34px!important;border-radius:50%!important;display:grid!important;place-items:center!important;background:linear-gradient(145deg,#fff1c0,#f8e5a5)!important;font-size:18px!important;box-shadow:inset 0 0 0 1px rgba(174,138,38,.12)!important;pointer-events:none!important}
#apBirthdayCard.ap-bday-card .copy{display:block!important;min-width:0!important;overflow:hidden!important;pointer-events:none!important}
#apBirthdayCard.ap-bday-card .eyebrow{display:block!important;font-size:8px!important;line-height:1.1!important;font-weight:900!important;letter-spacing:.12em!important;color:#99741e!important;text-transform:uppercase!important;margin:0 0 2px!important}
#apBirthdayCard.ap-bday-card b{display:block!important;margin:0!important;padding:0!important;font-size:12px!important;line-height:1.2!important;font-weight:800!important;color:#24422d!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
#apBirthdayCard.ap-bday-card small{display:block!important;margin:2px 0 0!important;padding:0!important;font-size:10px!important;line-height:1.15!important;color:#788079!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
#apBirthdayCard.ap-bday-card .open{width:34px!important;height:34px!important;min-width:34px!important;min-height:34px!important;border:0!important;border-radius:50%!important;background:#214f32!important;color:#fff!important;font-size:22px!important;line-height:1!important;display:grid!important;place-items:center!important;padding:0!important;box-shadow:0 4px 10px rgba(30,78,48,.18)!important;pointer-events:none!important}
`;
  document.head.appendChild(s);
}
function repair(){
  installStyle();
  const card=document.getElementById('apBirthdayCard');
  if(!card)return;
  card.classList.add('ap-bday-card');
  if(card.hasAttribute('style'))card.removeAttribute('style');
  const profile=document.querySelector('.online-profile');
  if(profile&&card.previousElementSibling!==profile)profile.insertAdjacentElement('afterend',card);
}
function boot(){
  installStyle();
  repair();
  window.addEventListener('pageshow',repair);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)repair()});
  setTimeout(repair,250);
  setTimeout(repair,900);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.AgendaBirthdayCapsuleGuard={version:VERSION,repair};
})();