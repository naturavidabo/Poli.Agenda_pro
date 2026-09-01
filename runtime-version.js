(()=>{
'use strict';
const FALLBACK='2.21.3';let version=FALLBACK;
const OLD=/\bv?2\.(?:14\.1|16\.\d+|17\.\d+|18\.\d+|19\.\d+|20\.\d+|21\.[012])\b/g;
function patchText(root=document.body){if(!root)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];let n;while((n=walker.nextNode())){OLD.lastIndex=0;if(OLD.test(n.nodeValue||''))nodes.push(n)}for(const node of nodes){OLD.lastIndex=0;node.nodeValue=(node.nodeValue||'').replace(OLD,m=>m.startsWith('v')?'v'+version:version)}}
async function sync(){try{const r=await fetch('./version.json?ts='+Date.now(),{cache:'no-store'});if(r.ok){const j=await r.json();version=j.appVersion||j.version||FALLBACK}}catch{}window.AGENDA_RUNTIME_VERSION=version;patchText()}
window.addEventListener('DOMContentLoaded',()=>{sync();let pending=false;const obs=new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;patchText()})});obs.observe(document.body,{childList:true,subtree:true,characterData:true})});
})();