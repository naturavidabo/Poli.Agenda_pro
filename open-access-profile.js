(()=>{
'use strict';
const VERSION='2.21.14';
const PROFILE_KEY='agenda-user-identity-v2213';
const DEVICE_KEY='agenda-open-device-id-v2212';
function deviceId(){let id=localStorage.getItem(DEVICE_KEY);if(!id){id='ap_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,12);localStorage.setItem(DEVICE_KEY,id)}return id}
function openAccess(){try{localStorage.setItem('agenda-policial-activated','true');localStorage.setItem('agenda-policial-activation-type','open-access-2026');if(typeof state!=='undefined'){state.activated=true;save?.().catch?.(()=>{})}}catch{}}
function identity(){try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||'null')}catch{return null}}
function identityComplete(){const p=identity();return !!(p?.grade&&p?.full_name&&p?.phone)}
function onlineSession(){try{return JSON.parse(localStorage.getItem('agenda-academic-session')||'null')}catch{return null}}
function onlineIdentityActive(){const s=onlineSession();if(!s)return false;if(s.active===false||s.module_enabled===false)return false;const token=String(s.session_token||'');return /^local:/.test(token)||/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)}
/* v2.21.14: Servicios y directorio operativo quedan liberados. La identificación ya no es requisito. */
function serviceAuthorized(){return true}
function openIdentityForm(){window.toast?.('La identificación ya no es obligatoria para consultar servicios y contactos.')}
async function syncIdentity(){return false}
function removeLegacyPrompt(){document.getElementById('openProfileAccessV2212')?.remove();document.getElementById('openProfileSheetV2212')?.remove()}
openAccess();
window.AgendaIdentity={version:VERSION,identity,identityComplete,onlineIdentityActive,serviceAuthorized,openIdentityForm,syncIdentity,deviceId};
window.addEventListener('DOMContentLoaded',()=>{openAccess();removeLegacyPrompt();setTimeout(()=>{try{render?.()}catch{}removeLegacyPrompt()},120);new MutationObserver(removeLegacyPrompt).observe(document.body,{childList:true,subtree:true})});
})();