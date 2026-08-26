(()=>{
'use strict';
const FALLBACK='2.17.1';
let version=FALLBACK;
function patchText(root=document.body){
  if(!root)return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes=[];let n;
  while((n=walker.nextNode())){if(/\b2\.14\.1\b|\bv2\.14\.1\b/.test(n.nodeValue||''))nodes.push(n)}
  for(const node of nodes)node.nodeValue=(node.nodeValue||'').replace(/v?2\.14\.1/g,m=>m.startsWith('v')?'v'+version:version);
}
async function sync(){
  try{const r=await fetch('./version.json?ts='+Date.now(),{cache:'no-store'});if(r.ok){const j=await r.json();version=j.appVersion||j.version||FALLBACK}}catch{}
  window.AGENDA_RUNTIME_VERSION=version;
  patchText();
}
window.addEventListener('DOMContentLoaded',()=>{
  sync();
  let pending=false;
  const obs=new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;patchText()})});
  obs.observe(document.body,{childList:true,subtree:true,characterData:true});
});
})();