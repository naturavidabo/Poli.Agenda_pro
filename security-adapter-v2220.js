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

// Compatibilidad segura para módulos existentes: cumpleaños autenticados y subida de archivos con sesión.
if(!window.__agendaSecureFetchWrapped){
  const baseFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    let url=typeof input==='string'?input:(input?.url||'');
    const opts=init?{...init}:{};
    const method=String(opts.method||'GET').toUpperCase();
    const s=session();

    if(method==='POST'&&/\/rest\/v1\/rpc\/academic_birthdays(?:\?|$)/.test(url)&&s?.session_token){
      url=url.replace('/rest/v1/rpc/academic_birthdays','/rest/v1/rpc/academic_birthdays_v2');
      let body={};
      try{body=opts.body?JSON.parse(opts.body):{}}catch{}
      body.p_token=s.session_token;
      opts.body=JSON.stringify(body);
      input=url;
    }

    if(method==='POST'&&s?.session_token&&/\/storage\/v1\/object\/academic-files\//.test(url)){
      const marker='/storage/v1/object/academic-files/';
      const i=url.indexOf(marker);
      if(i>=0){
        const tail=url.slice(i+marker.length);
        if(!tail.startsWith(s.session_token+'/')){
          url=url.slice(0,i+marker.length)+encodeURIComponent(s.session_token)+'/'+tail;
          input=url;
        }
      }
    }
    return baseFetch(input,opts);
  };
  window.__agendaSecureFetchWrapped=true;
}

window.AgendaSecurityAdapter={version:VERSION};
})();
