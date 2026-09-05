(()=>{
'use strict';
const VERSION='2.22.1';
const session=()=>{try{return JSON.parse(localStorage.getItem('agenda-academic-session')||'null')}catch{return null}};
const currentSession=session();

// Limpieza única de cachés heredados: un perfil no administrativo nunca conserva la unidad específica.
try{
  if(currentSession?.role!=='administrador_general'){
    Object.keys(localStorage).filter(k=>k.startsWith('agenda-service-contacts-')&&!k.endsWith('v2221')).forEach(k=>{
      try{
        const data=JSON.parse(localStorage.getItem(k)||'{}');
        if(data&&typeof data==='object')Object.values(data).forEach(v=>{if(v&&typeof v==='object')v.unit=''});
        localStorage.setItem(k,JSON.stringify(data));
      }catch{localStorage.removeItem(k)}
    });
  }
  if(!currentSession){
    Object.keys(sessionStorage).filter(k=>k.startsWith('agenda-birthdays-')).forEach(k=>sessionStorage.removeItem(k));
  }
}catch{}

// Compatibilidad temporal: login antiguo -> login multi-curso y directorio privado del administrador.
if(typeof window.academicRPC==='function'&&!window.__agendaSecureRpcWrapped){
  const baseRPC=window.academicRPC;
  window.academicRPC=async function(fn,body={}){
    const s=session();
    if(fn==='academic_login')return baseRPC('academic_login_v2',body);
    if(fn==='academic_personnel_directory'&&s?.role==='administrador_general'&&s?.session_token){
      return baseRPC('academic_personnel_directory_admin',{
        p_token:s.session_token,
        p_course_code:body?.p_course_code??null,
        p_department:body?.p_department??null,
        p_search:body?.p_search??null
      });
    }
    return baseRPC(fn,body);
  };
  window.__agendaSecureRpcWrapped=true;
}

// Sustituye únicamente la función antigua de subida. Ya no se intercepta window.fetch globalmente.
try{
  window.uploadAcademicFile=async function(file){
    if(!file)return null;
    const s=session();
    if(!s?.session_token)throw new Error('Sesión académica requerida para adjuntar archivos');
    const cfg=typeof ONLINE_CFG!=='undefined'?ONLINE_CFG:null;
    if(!cfg?.url||!cfg?.anonKey||!cfg?.bucket)throw new Error('Almacenamiento académico no disponible');
    const safeName=`${Date.now()}-${String(file.name||'archivo').replace(/[^a-zA-Z0-9._-]/g,'_')}`;
    const objectName=`${s.session_token}/${safeName}`;
    const response=await fetch(`${cfg.url}/storage/v1/object/${cfg.bucket}/${objectName}`,{
      method:'POST',
      headers:{apikey:cfg.anonKey,Authorization:`Bearer ${cfg.anonKey}`,'x-upsert':'false','Content-Type':file.type||'application/octet-stream'},
      body:file
    });
    if(!response.ok)throw new Error(await response.text());
    return`${cfg.url}/storage/v1/object/public/${cfg.bucket}/${objectName}`;
  };
}catch(e){console.warn('No se pudo instalar el cargador seguro de archivos',e)}

window.AgendaSecurityAdapter={version:VERSION};
})();