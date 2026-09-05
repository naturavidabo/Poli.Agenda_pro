(()=>{
'use strict';
const VERSION='2.23.2';
function installStyle(){
  document.getElementById('birthdayCapsuleGuard2221')?.remove();
  document.getElementById('birthdayCapsuleGuard22122')?.remove();
  if(document.getElementById('birthdayCapsuleGuard2232'))return;
  const s=document.createElement('style');
  s.id='birthdayCapsuleGuard2232';
  s.textContent=`
#apBirthdayCard.ap-bday-card{appearance:none!important;-webkit-appearance:none!important;width:calc(100% - 24px)!important;max-width:none!important;box-sizing:border-box!important;margin:10px 12px 14px!important;padding:9px 10px!important;min-height:64px!important;height:auto!important;border:1px solid rgba(166,139,57,.42)!important;border-radius:34px!important;background:linear-gradient(135deg,rgba(255,252,238,.98),rgba(239,247,238,.99))!important;display:grid!important;grid-template-columns:38px minmax(0,1fr) 38px!important;gap:10px!important;align-items:center!important;text-align:left!important;color:#24422d!important;box-shadow:0 6px 18px rgba(25,55,34,.09)!important;overflow:hidden!important;position:relative!important;line-height:normal!important;pointer-events:auto!important;touch-action:manipulation!important;cursor:pointer!important;z-index:2!important;flex:none!important;align-self:stretch!important;transform:none!important}
#apBirthdayCard.ap-bday-card .ico{width:38px!important;height:38px!important;min-width:38px!important;min-height:38px!important;border-radius:50%!important;display:grid!important;place-items:center!important;background:linear-gradient(145deg,#fff1c0,#f8e5a5)!important;font-size:19px!important;box-shadow:inset 0 0 0 1px rgba(174,138,38,.12)!important;pointer-events:none!important}
#apBirthdayCard.ap-bday-card .copy{display:flex!important;flex-direction:column!important;justify-content:center!important;min-width:0!important;min-height:42px!important;overflow:hidden!important;pointer-events:none!important}
#apBirthdayCard.ap-bday-card .eyebrow{display:block!important;font-size:8px!important;line-height:1.15!important;font-weight:900!important;letter-spacing:.12em!important;color:#99741e!important;text-transform:uppercase!important;margin:0 0 3px!important}
#apBirthdayCard.ap-bday-card b{display:block!important;margin:0!important;padding:0!important;font-size:12px!important;line-height:1.25!important;font-weight:850!important;color:#24422d!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
#apBirthdayCard.ap-bday-card small{display:block!important;margin:3px 0 0!important;padding:0!important;font-size:10px!important;line-height:1.2!important;color:#788079!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
#apBirthdayCard.ap-bday-card .open{width:38px!important;height:38px!important;min-width:38px!important;min-height:38px!important;border:0!important;border-radius:50%!important;background:#214f32!important;color:#fff!important;font-size:23px!important;line-height:1!important;display:grid!important;place-items:center!important;padding:0!important;box-shadow:0 4px 11px rgba(30,78,48,.2)!important;pointer-events:none!important}
@media(max-width:380px){#apBirthdayCard.ap-bday-card{min-height:60px!important;padding:8px 9px!important;grid-template-columns:36px minmax(0,1fr) 36px!important}#apBirthdayCard.ap-bday-card .ico,#apBirthdayCard.ap-bday-card .open{width:36px!important;height:36px!important;min-width:36px!important;min-height:36px!important}}
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
  installStyle();repair();
  window.addEventListener('pageshow',repair);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)repair()});
  setTimeout(repair,180);setTimeout(repair,700);setTimeout(repair,1500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.AgendaBirthdayCapsuleGuard={version:VERSION,repair};
})();