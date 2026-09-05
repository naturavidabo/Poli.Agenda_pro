(()=>{
'use strict';
const VERSION='2.22.0';
const session=()=>{try{return JSON.parse(localStorage.getItem('agenda-academic-session')||'null')}catch{return null}};

// Mantiene compatibilidad del frontend, pero usa las RPC consolidadas cuando existe una versión segura.
if(typeof window.academicRPC==='function'&&!window.__agendaSecureRpcWrapped){
  const baseRPC=window.academicRPC;
  window.academicRPC=async function(fn,body={}){
    const s=session();
    if(fn==='academic_login'){
      return baseRPC('academic_login_v2',body);
    }
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

if(!window.__agendaSecureFetchWrapped){
  const baseFetch=window.fetch.bind(window);
  window.__agendaBaseFetch=baseFetch;
  window.fetch=async function(input,init){
    let url=typeof input==='string'?input:(input?.url||'');
    const opts=init?{...init}:{};
    const method=String(opts.method||'GET').toUpperCase();
    const s=session();

    // Cumpleaños: el módulo antiguo queda conectado a la RPC autenticada sin romper compatibilidad.
    if(method==='POST'&&/\/rest\/v1\/rpc\/academic_birthdays(?:\?|$)/.test(url)&&s?.session_token){
      url=url.replace('/rest/v1/rpc/academic_birthdays','/rest/v1/rpc/academic_birthdays_v2');
      let body={};
      try{body=opts.body?JSON.parse(opts.body):{}}catch{}
      body.p_token=s.session_token;
      opts.body=JSON.stringify(body);
      input=url;
    }
    return baseFetch(input,opts);
  };
  window.__agendaSecureFetchWrapped=true;
}

// Sustituye la subida antigua por una ruta ligada a la sesión. El servidor valida token y rol.
try{
  window.uploadAcademicFile=async function(file){
    if(!file)return null;
    const s=session();
    if(!s?.session_token)throw new Error('Sesión académica requerida para adjuntar archivos');
    const cfg=typeof ONLINE_CFG!=='undefined'?ONLINE_CFG:null;
    if(!cfg?.url||!cfg?.anonKey||!cfg?.bucket)throw new Error('Almacenamiento académico no disponible');
    const safeName=`${Date.now()}-${String(file.name||'archivo').replace(/[^a-zA-Z0-9._-]/g,'_')}`;
    const objectName=`${s.session_token}/${safeName}`;
    const fetcher=window.__agendaBaseFetch||window.fetch.bind(window);
    const response=await fetcher(`${cfg.url}/storage/v1/object/${cfg.bucket}/${objectName}`,{
      method:'POST',
      headers:{
        apikey:cfg.anonKey,
        Authorization:`Bearer ${cfg.anonKey}`,
        'x-upsert':'false',
        'Content-Type':file.type||'application/octet-stream'
      },
      body:file
    });
    if(!response.ok)throw new Error(await response.text());
    return `${cfg.url}/storage/v1/object/public/${cfg.bucket}/${objectName}`;
  };
}catch(e){console.warn('No se pudo instalar el cargador seguro de archivos',e)}

window.AgendaSecurityAdapter={version:VERSION};
})();
