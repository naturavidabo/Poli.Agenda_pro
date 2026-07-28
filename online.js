/* Agenda Policial Online v2.6.8 — conexión real con Supabase */
const ONLINE_CFG = {
  url: 'https://lkwrulzrulmbfypwywmo.supabase.co',
  anonKey: 'sb_publishable_vtek6lVCGZkmyicgAPqDMw_8EOTFrRU',
  bucket: 'academic-files'
};

const ACADEMIC_ROSTER_URL = './data/academic-users.json';
const ACADEMIC_USERS_STORAGE = 'agenda-academic-users-v263';
const ACADEMIC_POSTS_STORAGE = 'agenda-academic-posts-v263';
const ACADEMIC_SESSION_STORAGE = 'agenda-academic-session';
const ACADEMIC_TEST_CREDENTIAL = '0000';
const ACADEMIC_ROLE_CHANNEL = 'agenda-academic-role-sync-v268';

const ACADEMIC_TYPES = {
  examenes: {
    label: 'Exámenes',
    icon: '📝',
    help: 'Materia, fecha, hora, lugar, comunicado y archivo.'
  },
  formaciones: {
    label: 'Formaciones',
    icon: '🛡️',
    help: 'Formación general o servicio extraordinario, con control y parte.'
  },
  tareas: {
    label: 'Tareas',
    icon: '✅',
    help: 'Materia, instrucciones, fecha de entrega y archivo.'
  },
  resumenes: {
    label: 'Resúmenes',
    icon: '📚',
    help: 'Materia, tema, texto escrito y archivos de estudio.'
  }
};

const ACADEMIC_ROLES = [
  'encargado_curso',
  'administrador_academico',
  'asistente_academico',
  'lector'
];

let academicSession = JSON.parse(localStorage.getItem(ACADEMIC_SESSION_STORAGE) || 'null');
let academicTab = 'panel';
let academicUsersCache = [];
let academicRosterCache = null;

function onlineConfigured() {
  return Boolean(ONLINE_CFG.url && ONLINE_CFG.anonKey);
}

function academicCredential(value) {
  return String(value || '').replace(/\D/g, '');
}

function academicRemoteTokenIsValid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function academicHeaders(extra = {}) {
  return {
    apikey: ONLINE_CFG.anonKey,
    Authorization: `Bearer ${ONLINE_CFG.anonKey}`,
    'Content-Type': 'application/json',
    ...extra
  };
}

async function academicRPC(fn, body = {}) {
  const response = await fetch(`${ONLINE_CFG.url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: academicHeaders(),
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(await response.text());
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function loadPreloadedAcademicRoster(force = false) {
  if (academicRosterCache && !force) return academicRosterCache;
  try {
    const response = await fetch(`${ACADEMIC_ROSTER_URL}?v=${APP_VERSION}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('No se pudo cargar la nómina preinstalada');
    const payload = await response.json();
    academicRosterCache = (payload.users || []).map(user => ({
      ...user,
      id: user.id || `cap-a-${String(user.roster_number || '').padStart(3, '0')}`,
      ci: String(user.ci || ''),
      phone: String(user.phone || ''),
      role: user.role || 'lector',
      active: Boolean(user.active)
    }));
    return academicRosterCache;
  } catch (error) {
    console.error(error);
    academicRosterCache = [];
    return academicRosterCache;
  }
}

function academicRoleLabel(role) {
  return ({
    administrador_general: 'Administrador general',
    encargado_curso: 'Encargado de curso',
    administrador_academico: 'Administrador académico',
    asistente_academico: 'Asistente académico',
    lector: 'Lector'
  })[role] || 'Lector';
}

function academicInitials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'AP';
}

function academicCanPublish() {
  return [
    'administrador_general',
    'encargado_curso',
    'administrador_academico',
    'asistente_academico'
  ].includes(academicSession?.role);
}

function academicCanManageUsers() {
  return academicSession?.role === 'administrador_general';
}

function academicLocalStorageUsers() {
  try {
    const current = JSON.parse(localStorage.getItem(ACADEMIC_USERS_STORAGE) || 'null');
    if (Array.isArray(current)) return { users: current, legacy: false };
    const legacy = JSON.parse(localStorage.getItem('agenda-demo-users') || 'null');
    return Array.isArray(legacy) ? { users: legacy, legacy: true } : { users: null, legacy: false };
  } catch {
    return { users: null, legacy: false };
  }
}

function academicSaveLocalUsers(users) {
  localStorage.setItem(ACADEMIC_USERS_STORAGE, JSON.stringify(users));
  localStorage.removeItem('agenda-demo-users');
}

async function academicLocalUsers() {
  const preloaded = await loadPreloadedAcademicRoster();
  const storedState = academicLocalStorageUsers();
  const stored = storedState.users;
  if (!stored?.length) {
    const initialized = preloaded.map(user => ({ ...user }));
    academicSaveLocalUsers(initialized);
    return initialized;
  }

  const byRoster = new Map(stored.filter(u => u.roster_number).map(u => [Number(u.roster_number), u]));
  const byCi = new Map(stored.filter(u => u.ci).map(u => [academicCredential(u.ci), u]));
  const merged = preloaded.map(base => {
    const previous = byRoster.get(Number(base.roster_number)) || byCi.get(academicCredential(base.ci));
    let result;
    if (previous && !storedState.legacy) {
      result = {
        ...base,
        ...previous,
        id: base.id,
        ci: previous.ci || base.ci,
        phone: previous.phone || base.phone,
        full_name: previous.full_name || base.full_name,
        department: previous.department || base.department
      };
    } else {
      result = { ...base };
    }
    if (base.role === 'administrador_general') {
      result.role = 'administrador_general';
      result.active = true;
    }
    result.ci = String(result.ci || '');
    result.phone = String(result.phone || '');
    return result;
  });

  stored.forEach(user => {
    const legacyDemo = String(user.id) === 'demo-admin' || (academicCredential(user.ci) === '0000' && academicCredential(user.phone) === '0000');
    if (legacyDemo) return;
    const exists = merged.some(item =>
      String(item.id) === String(user.id) ||
      (item.roster_number && Number(item.roster_number) === Number(user.roster_number)) ||
      (item.ci && academicCredential(item.ci) === academicCredential(user.ci))
    );
    if (!exists && user.full_name) merged.push(user);
  });

  merged.sort((a, b) => (Number(a.roster_number) || 9999) - (Number(b.roster_number) || 9999));
  academicSaveLocalUsers(merged);
  return merged;
}

async function academicLocalLogin(ci, phone) {
  const ciKey = academicCredential(ci);
  const phoneKey = academicCredential(phone);
  if (ciKey === ACADEMIC_TEST_CREDENTIAL && phoneKey === ACADEMIC_TEST_CREDENTIAL) {
    return {
      session_token: 'local:test-user',
      user_id: 'test-user',
      full_name: 'Administrador del sistema',
      role: 'administrador_general',
      roster_number: 0,
      storage_mode: 'test_local'
    };
  }
  const users = await academicLocalUsers();
  const user = users.find(item =>
    item.active &&
    item.ci &&
    item.phone &&
    academicCredential(item.ci) === ciKey &&
    academicCredential(item.phone) === phoneKey
  );
  if (!user) return null;
  return {
    session_token: `local:${user.id}`,
    user_id: user.id,
    full_name: user.full_name,
    role: user.role,
    roster_number: user.roster_number,
    storage_mode: 'local_roster'
  };
}

async function academicLogin() {
  const ci = $('#academicCi')?.value.trim();
  const phone = $('#academicPhone')?.value.trim();
  if (!ci || !phone) return toast('Ingrese usuario y contraseña');

  let user;
  try {
    if (onlineConfigured()) {
      user = await academicRPC('academic_login', { p_ci: ci, p_phone: phone });
      if (Array.isArray(user)) user = user[0];
    } else {
      user = await academicLocalLogin(ci, phone);
    }
  } catch (error) {
    console.error('Error de conexión académica:', error);
    return toast('No se pudo conectar con Supabase. Revise internet e intente nuevamente');
  }

  if (!user?.session_token) return toast('Usuario o contraseña incorrectos, o acceso inactivo');

  academicSession = user;
  academicTab = 'panel';
  localStorage.setItem(ACADEMIC_SESSION_STORAGE, JSON.stringify(user));
  toast('Acceso académico habilitado');

  // Recarga limpia para evitar que restos de la interfaz anterior interrumpan el ingreso.
  setTimeout(() => {
    location.replace(`./index.html?online=1&v=2.6.8&r=${Date.now()}`);
  }, 180);
}

async function academicLogout(silent = false) {
  const token = academicSession?.session_token;
  academicSession = null;
  academicTab = 'panel';
  localStorage.removeItem(ACADEMIC_SESSION_STORAGE);
  render();
  if (onlineConfigured() && token) {
    academicRPC('academic_logout', { p_token: token }).catch(() => {});
  }
  if (!silent) toast('Sesión académica cerrada');
}

function onlineLoginView() {
  return `
    <section class="online-page">
      <div class="online-login-hero">
        <div class="online-lock">◉</div>
        <span class="eyebrow">Acceso reservado al curso</span>
        <h2>Área académica online</h2>
        <p>Los integrantes registrados acceden con su C.I. y número de celular. La biblioteca y las funciones generales continúan disponibles sin este acceso.</p>
        <div class="online-preview-grid">
          ${Object.values(ACADEMIC_TYPES).map(item => `
            <div><span>${item.icon}</span><b>${item.label}</b></div>
          `).join('')}
        </div>
      </div>
      <div class="card academic-login">
        <h3>Identificación del integrante</h3>
        <p class="subtle">Usuario: número de carnet. Contraseña: número de celular.</p>
        <label>Número de carnet
          <input id="academicCi" inputmode="numeric" autocomplete="username" placeholder="Ingrese su C.I.">
        </label>
        <label>Número de celular
          <input id="academicPhone" inputmode="tel" autocomplete="current-password" placeholder="Ingrese su celular" type="password">
        </label>
        <button class="btn academic-main-btn" onclick="academicLogin()">Ingresar al contenido online</button>
        ${!onlineConfigured() ? `
          <div class="online-setup-note">
            <b>Nómina preinstalada</b>
            <span>Esta versión ya reconoce a los integrantes con datos completos. La sincronización entre celulares se habilitará al conectar Supabase.</span>
          </div>
        ` : ''}
      </div>
    </section>
  `;
}

function academicProfileHeader() {
  const statusLabel = onlineConfigured() ? 'Sincronizado' : 'Nómina local';
  return `
    <div class="online-profile">
      <div class="online-avatar">${esc(academicInitials(academicSession.full_name))}</div>
      <div class="online-profile-copy">
        <span class="eyebrow">Área académica activa</span>
        <h2>${esc(academicSession.full_name || 'Usuario')}</h2>
        <div class="online-profile-meta">
          <span>${esc(academicRoleLabel(academicSession.role))}</span>
          <span class="sync-pill ${onlineConfigured() ? 'on' : 'prep'}">${statusLabel}</span>
        </div>
      </div>
      <button class="online-logout" onclick="academicLogout()">Salir</button>
    </div>
  `;
}

function academicDashboard() {
  const manage = academicCanManageUsers() ? `
    <button class="academic-manage-card" onclick="setAcademicTab('usuarios')">
      <span class="manage-icon">👥</span>
      <span>
        <b>Integrantes y roles</b>
        <small>Designar encargado de curso, administrador académico, asistentes y lectores.</small>
      </span>
      <strong>Administrar</strong>
    </button>
  ` : '';

  return `
    ${academicProfileHeader()}
    <div class="online-section-heading">
      <div><span class="eyebrow">Panel principal</span><h3>Contenido académico</h3></div>
    </div>
    <div class="academic-module-grid">
      ${Object.entries(ACADEMIC_TYPES).map(([key, item]) => `
        <button onclick="setAcademicTab('${key}')">
          <span class="module-icon">${item.icon}</span>
          <b>${item.label}</b>
          <small>${item.help}</small>
          <strong>Abrir</strong>
        </button>
      `).join('')}
    </div>
    ${manage}
    <div class="card online-information">
      <b>Acceso independiente</b>
      <p>Al concluir el periodo académico se pueden desactivar los accesos y retirar el contenido online, conservando la biblioteca y las funciones offline.</p>
    </div>
  `;
}

function academicSubnav() {
  return `
    <div class="academic-subnav">
      <button onclick="setAcademicTab('panel')">‹ Panel</button>
      ${Object.entries(ACADEMIC_TYPES).map(([key, item]) => `
        <button class="${academicTab === key ? 'active' : ''}" onclick="setAcademicTab('${key}')">${item.icon} ${item.label}</button>
      `).join('')}
      ${academicCanManageUsers() ? `
        <button class="${academicTab === 'usuarios' ? 'active' : ''}" onclick="setAcademicTab('usuarios')">👥 Roles</button>
      ` : ''}
    </div>
  `;
}

function academicModuleView() {
  const info = ACADEMIC_TYPES[academicTab];
  return `
    ${academicProfileHeader()}
    ${academicSubnav()}
    <div class="online-module-head">
      <div>
        <span class="module-big-icon">${info.icon}</span>
        <div><span class="eyebrow">Módulo académico</span><h3>${info.label}</h3><p>${info.help}</p></div>
      </div>
      ${academicCanPublish() ? `
        <button class="btn academic-main-btn" onclick="openAcademicPostForm('${academicTab}')">Nueva publicación</button>
      ` : ''}
    </div>
    <div id="academicPosts"><div class="card small"><p>Cargando contenido…</p></div></div>
  `;
}

function academicUsersView() {
  return `
    ${academicProfileHeader()}
    ${academicSubnav()}
    <div class="online-module-head">
      <div>
        <span class="module-big-icon">👥</span>
        <div>
          <span class="eyebrow">Administrador general</span>
          <h3>Integrantes y asignación de roles</h3>
          <p>Seleccione una persona para activar su acceso o designar su función.</p>
        </div>
      </div>
      <button class="btn academic-main-btn" onclick="openAcademicUserForm()">Agregar integrante</button>
    </div>
    <div class="roster-actions">
      <label class="roster-search">Buscar integrante
        <input id="academicUserSearch" placeholder="Apellido, C.I. o departamento" oninput="filterAcademicUsers()">
      </label>
      <label class="roster-filter">Rol
        <select id="academicRoleFilter" onchange="filterAcademicUsers()">
          <option value="">Todos</option>
          <option value="administrador_general">Administrador general</option>
          <option value="encargado_curso">Encargado de curso</option>
          <option value="administrador_academico">Administrador académico</option>
          <option value="asistente_academico">Asistente académico</option>
          <option value="lector">Lectores</option>
        </select>
      </label>
      <button class="btn secondary" onclick="openRosterImport()">Importar CSV</button>
    </div>
    <div id="academicUsersSummary" class="roster-summary"></div>
    <div id="academicUsersList"><div class="card small"><p>Cargando nómina…</p></div></div>
  `;
}

function renderOnline() {
  if (!academicSession) return onlineLoginView();
  if (academicTab === 'panel') return `<section class="online-page">${academicDashboard()}</section>`;
  if (academicTab === 'usuarios' && academicCanManageUsers()) return `<section class="online-page">${academicUsersView()}</section>`;
  if (!ACADEMIC_TYPES[academicTab]) academicTab = 'panel';
  return `<section class="online-page">${academicModuleView()}</section>`;
}

async function setAcademicTab(tab) {
  academicTab = tab;
  render();
  setTimeout(() => {
    if (ACADEMIC_TYPES[tab]) loadAcademicPosts();
    if (tab === 'usuarios') loadAcademicUsers();
  }, 0);
}

function academicLocalPosts() {
  try {
    const current = JSON.parse(localStorage.getItem(ACADEMIC_POSTS_STORAGE) || 'null');
    if (Array.isArray(current)) return current;
    const legacy = JSON.parse(localStorage.getItem('agenda-demo-posts') || '[]');
    if (Array.isArray(legacy)) {
      localStorage.setItem(ACADEMIC_POSTS_STORAGE, JSON.stringify(legacy));
      localStorage.removeItem('agenda-demo-posts');
      return legacy;
    }
  } catch {}
  return [];
}

function academicSaveLocalPosts(posts) {
  localStorage.setItem(ACADEMIC_POSTS_STORAGE, JSON.stringify(posts));
}

async function loadAcademicPosts() {
  const box = $('#academicPosts');
  if (!box || !academicSession) return;
  try {
    let posts;
    if (onlineConfigured()) {
      posts = await academicRPC('academic_get_posts', {
        p_token: academicSession.session_token,
        p_type: academicTab
      });
    } else {
      posts = academicLocalPosts().filter(post => post.post_type === academicTab && !post.archived);
    }
    box.innerHTML = posts?.length
      ? posts.map(academicPostCard).join('')
      : '<div class="card small empty-online"><span>📭</span><p>No existen publicaciones en esta sección.</p></div>';
  } catch (error) {
    console.error(error);
    box.innerHTML = '<div class="card small warn-card"><p>No fue posible sincronizar el contenido.</p></div>';
  }
}

function academicFileName(url = '') {
  if (url.startsWith('data:')) return 'Archivo adjunto';
  try {
    return decodeURIComponent(url.split('/').pop().split('?')[0]) || 'Archivo adjunto';
  } catch {
    return 'Archivo adjunto';
  }
}

function academicPostCard(post) {
  const fields = post.fields || {};
  let meta = '';

  if (post.post_type === 'formaciones') {
    meta = `
      <div class="formation-meta">
        <span>📅 ${esc(fields.date || 'Sin fecha')}</span>
        <span>📍 ${esc(fields.place || 'Sin lugar')}</span>
        <span>🕘 Control: ${esc(fields.control_time || '-')}</span>
        <span>🕙 Parte: ${esc(fields.report_time || '-')}</span>
      </div>
      ${fields.uniform ? `<p><b>Uniforme:</b> ${esc(fields.uniform)}</p>` : ''}
      ${fields.observations ? `<p><b>Observaciones:</b> ${esc(fields.observations)}</p>` : ''}
    `;
  }

  if (post.post_type === 'resumenes') {
    meta = `<p><b>Materia:</b> ${esc(fields.subject || '')} · <b>Tema:</b> ${esc(fields.topic || '')}</p>`;
  }

  if (post.post_type === 'tareas') {
    meta = `<p><b>Materia:</b> ${esc(fields.subject || '')} · <b>Entrega:</b> ${esc(fields.due_date || 'Sin fecha')}</p>`;
  }

  if (post.post_type === 'examenes') {
    meta = `<p><b>Materia:</b> ${esc(fields.subject || '')} · <b>Fecha:</b> ${esc(fields.date || '')} ${esc(fields.time || '')} · <b>Lugar:</b> ${esc(fields.place || '')}</p>`;
  }

  return `
    <article class="card academic-post">
      <div class="row between">
        <span class="tag">${esc(ACADEMIC_TYPES[post.post_type]?.label || post.post_type)}</span>
        <small>${esc(post.author_name || '')}</small>
      </div>
      <h3>${esc(post.title || 'Publicación académica')}</h3>
      ${meta}
      ${post.body ? `<p class="academic-post-body">${esc(post.body)}</p>` : ''}
      ${post.file_url ? `<a class="academic-file-link" href="${esc(post.file_url)}" target="_blank" rel="noopener">📎 ${esc(academicFileName(post.file_url))}</a>` : ''}
    </article>
  `;
}

function openAcademicPostForm(type) {
  const labels = ACADEMIC_TYPES[type];
  if (!labels || !academicCanPublish()) return toast('No tiene permiso para publicar');

  let fields = '';
  if (type === 'formaciones') {
    fields = `
      <label>Tipo
        <select name="formation_type" required>
          <option>Formación general</option>
          <option>Servicio extraordinario</option>
        </select>
      </label>
      <div class="two-col">
        <label>Fecha<input name="date" type="date" required value="${todayISO()}"></label>
        <label>Lugar<input name="place" required></label>
      </div>
      <div class="two-col">
        <label>Hora de control<input name="control_time" type="time" required></label>
        <label>Hora del parte<input name="report_time" type="time" required></label>
      </div>
      <label>Uniforme<input name="uniform" required></label>
      <label>Texto del comunicado<textarea name="body" rows="7" required></textarea></label>
      <label>Observaciones<textarea name="observations" rows="3"></textarea></label>
    `;
  } else if (type === 'resumenes') {
    fields = `
      <label>Materia<input name="subject" required></label>
      <label>Tema<input name="topic" required></label>
      <label>Texto escrito en la aplicación<textarea name="body" rows="9"></textarea></label>
    `;
  } else if (type === 'tareas') {
    fields = `
      <label>Materia<input name="subject" required></label>
      <label>Título<input name="title" required></label>
      <label>Fecha límite<input name="due_date" type="date" required></label>
      <label>Instrucciones<textarea name="body" rows="8" required></textarea></label>
    `;
  } else {
    fields = `
      <label>Materia<input name="subject" required></label>
      <label>Título del examen<input name="title" required></label>
      <div class="two-col">
        <label>Fecha<input name="date" type="date" required></label>
        <label>Hora<input name="time" type="time" required></label>
      </div>
      <label>Lugar<input name="place"></label>
      <label>Comunicado o temario<textarea name="body" rows="7"></textarea></label>
    `;
  }

  showModal(`
    <button class="icon-btn close" onclick="closeModal()">×</button>
    <h2>Nueva publicación · ${labels.label}</h2>
    <form id="academicPostForm" class="form">
      ${fields}
      <label>Archivo opcional (Word, PDF o imagen)
        <input id="academicFile" type="file" accept=".doc,.docx,.pdf,image/*">
      </label>
      ${!onlineConfigured() ? '<p class="subtle">En la prueba local los archivos deben ser pequeños. Con Supabase se guardarán en el almacenamiento online.</p>' : ''}
      <div class="form-actions">
        <button class="btn academic-main-btn" type="submit">Publicar</button>
        <button class="btn secondary" type="button" onclick="closeModal()">Cancelar</button>
      </div>
    </form>
  `);
  $('#academicPostForm').onsubmit = event => saveAcademicPost(event, type);
}

async function uploadAcademicFile(file) {
  if (!file) return null;
  if (!onlineConfigured()) {
    if (file.size > 1_250_000) throw new Error('En la prueba local use archivos menores a 1,25 MB');
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return `data:${file.type || 'application/octet-stream'};base64,${btoa(binary)}`;
  }

  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const response = await fetch(`${ONLINE_CFG.url}/storage/v1/object/${ONLINE_CFG.bucket}/${safeName}`, {
    method: 'POST',
    headers: {
      apikey: ONLINE_CFG.anonKey,
      Authorization: `Bearer ${ONLINE_CFG.anonKey}`,
      'x-upsert': 'false',
      'Content-Type': file.type || 'application/octet-stream'
    },
    body: file
  });
  if (!response.ok) throw new Error(await response.text());
  return `${ONLINE_CFG.url}/storage/v1/object/public/${ONLINE_CFG.bucket}/${safeName}`;
}

async function saveAcademicPost(event, type) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const values = Object.fromEntries(formData.entries());
  let title = values.title || '';
  const body = values.body || '';
  delete values.title;
  delete values.body;

  if (type === 'formaciones') title = `${values.formation_type || 'Formación'} · ${values.date || 'sin fecha'}`;
  if (type === 'resumenes') title = `${values.subject || 'Resumen'} — ${values.topic || 'Tema'}`;

  try {
    const file = $('#academicFile')?.files?.[0];
    const fileUrl = await uploadAcademicFile(file);
    if (onlineConfigured()) {
      await academicRPC('academic_create_post', {
        p_token: academicSession.session_token,
        p_type: type,
        p_title: title,
        p_body: body,
        p_fields: values,
        p_file_url: fileUrl,
        p_file_name: file?.name || null,
        p_file_mime: file?.type || null,
        p_file_size: file?.size || null
      });
    } else {
      const posts = academicLocalPosts();
      posts.unshift({
        id: uid(),
        post_type: type,
        title,
        body,
        fields: values,
        file_url: fileUrl,
        author_name: academicSession.full_name,
        created_at: new Date().toISOString(),
        archived: false
      });
      academicSaveLocalPosts(posts);
    }
    closeModal();
    loadAcademicPosts();
    toast('Publicación guardada');
  } catch (error) {
    console.error(error);
    toast(error.message || 'No se pudo guardar la publicación');
  }
}

async function loadAcademicUsers() {
  const list = $('#academicUsersList');
  if (!list || !academicCanManageUsers()) return;
  try {
    academicUsersCache = onlineConfigured()
      ? await academicRPC('academic_get_users', { p_token: academicSession.session_token })
      : await academicLocalUsers();
    renderAcademicUsers(academicUsersCache);
  } catch (error) {
    console.error(error);
    list.innerHTML = '<div class="card warn-card"><p>No fue posible cargar la nómina.</p></div>';
  }
}

function renderAcademicUsers(users) {
  const list = $('#academicUsersList');
  const summary = $('#academicUsersSummary');
  if (!list || !summary) return;

  const active = users.filter(user => user.active).length;
  const ready = users.filter(user => user.ci && user.phone).length;
  const pending = users.filter(user => !user.ci || !user.phone).length;
  summary.innerHTML = `
    <div><b>${users.length}</b><span>Integrantes</span></div>
    <div><b>${ready}</b><span>Con acceso completo</span></div>
    <div><b>${pending}</b><span>Pendientes</span></div>
    <div><b>${active}</b><span>Activos</span></div>
  `;

  list.innerHTML = users.length ? `
    <div class="academic-user-list">
      ${users.map(user => {
        const accessState = user.ci && user.phone ? 'Acceso configurado' : 'Falta carnet o celular';
        const issue = user.data_status === 'revisar' ? ' · Verificar dato' : '';
        const search = normalize(`${user.full_name || ''} ${user.department || ''} ${user.ci || ''}`);
        return `
          <button class="academic-user-row" data-role="${esc(user.role)}" data-search="${esc(search)}" onclick="openAcademicUserForm('${esc(user.id)}')">
            <span class="user-number">${esc(user.roster_number || '—')}</span>
            <span class="user-main">
              <b>${esc(user.full_name)}</b>
              <small>${esc(user.department || 'Sin departamento')} · ${accessState}${issue}</small>
            </span>
            <span class="user-role ${esc(user.role)}">${esc(academicRoleLabel(user.role))}</span>
            <span class="user-state ${user.active ? 'on' : 'off'}">${user.active ? 'Activo' : 'Inactivo'}</span>
          </button>
        `;
      }).join('')}
    </div>
  ` : '<div class="card small"><p>No hay integrantes cargados.</p></div>';
}

function filterAcademicUsers() {
  const query = normalize($('#academicUserSearch')?.value || '');
  const role = $('#academicRoleFilter')?.value || '';
  $$('.academic-user-row').forEach(element => {
    const matchesText = !query || element.dataset.search.includes(query);
    const matchesRole = !role || element.dataset.role === role;
    element.hidden = !(matchesText && matchesRole);
  });
}

function openAcademicUserForm(id = '') {
  const user = id
    ? academicUsersCache.find(item => String(item.id) === String(id))
    : { id: '', roster_number: '', full_name: '', department: '', ci: '', phone: '', role: 'lector', active: false };
  if (!user) return;

  const isSelf = String(user.id) === String(academicSession.user_id);
  showModal(`
    <button class="icon-btn close" onclick="closeModal()">×</button>
    <h2>${id ? 'Editar integrante' : 'Agregar integrante'}</h2>
    <form id="academicUserForm" class="form">
      <div class="two-col">
        <label>N.º de lista<input name="roster_number" inputmode="numeric" value="${esc(user.roster_number || '')}"></label>
        <label>Departamento<input name="department" value="${esc(user.department || '')}"></label>
      </div>
      <label>Apellidos y nombres<input name="full_name" required value="${esc(user.full_name || '')}"></label>
      <div class="two-col">
        <label>Número de carnet<input name="ci" inputmode="numeric" value="${esc(user.ci || '')}"></label>
        <label>Número de celular<input name="phone" inputmode="tel" value="${esc(user.phone || '')}"></label>
      </div>
      <label>Rol
        <select name="role" ${isSelf ? 'disabled' : ''}>
          ${['administrador_general', ...ACADEMIC_ROLES].map(role => `
            <option value="${role}" ${user.role === role ? 'selected' : ''}>${academicRoleLabel(role)}</option>
          `).join('')}
        </select>
      </label>
      ${isSelf ? '<input type="hidden" name="role" value="administrador_general"><p class="subtle">Su cuenta permanece como administrador general.</p>' : ''}
      <label class="check-line"><input name="active" type="checkbox" ${user.active ? 'checked' : ''}> Acceso académico activo</label>
      <div class="form-actions">
        <button class="btn academic-main-btn" type="submit">Guardar</button>
        <button class="btn secondary" type="button" onclick="closeModal()">Cancelar</button>
      </div>
    </form>
  `);
  $('#academicUserForm').onsubmit = event => saveAcademicUser(event, user.id);
}

async function saveAcademicUser(event, id) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const data = Object.fromEntries(formData.entries());
  data.active = formData.has('active');
  data.roster_number = data.roster_number ? Number(data.roster_number) : null;
  data.ci = String(data.ci || '').trim();
  data.phone = String(data.phone || '').trim();
  if (data.active && (!data.ci || !data.phone)) {
    data.active = false;
    toast('El acceso queda inactivo hasta completar carnet y celular');
  }

  try {
    if (onlineConfigured()) {
      if (id) {
        await academicRPC('academic_update_user', {
          p_token: academicSession.session_token,
          p_user_id: id,
          p_roster_number: data.roster_number,
          p_full_name: data.full_name,
          p_department: data.department,
          p_ci: data.ci || null,
          p_phone: data.phone || null,
          p_role: data.role,
          p_active: data.active
        });
      } else {
        await academicRPC('academic_create_user', {
          p_token: academicSession.session_token,
          p_roster_number: data.roster_number,
          p_full_name: data.full_name,
          p_department: data.department,
          p_ci: data.ci || null,
          p_phone: data.phone || null,
          p_role: data.role,
          p_active: data.active
        });
      }
    } else {
      const users = await academicLocalUsers();
      if (id) {
        const user = users.find(item => String(item.id) === String(id));
        if (!user) throw new Error('Integrante no encontrado');
        if (user.role === 'administrador_general') data.role = 'administrador_general';
        Object.assign(user, data);
      } else {
        users.push({ ...data, id: uid(), data_status: data.ci && data.phone ? 'completo' : 'pendiente' });
      }
      academicSaveLocalUsers(users);
      notifyAcademicRoleChange(id || '', data);
    }
    closeModal();
    loadAcademicUsers();
    toast('Integrante actualizado');
  } catch (error) {
    console.error(error);
    toast('No se pudo actualizar el integrante');
  }
}

function openRosterImport() {
  showModal(`
    <button class="icon-btn close" onclick="closeModal()">×</button>
    <h2>Importar nómina</h2>
    <p>Use un archivo CSV con estas columnas:</p>
    <pre class="roster-format">numero;nombre_completo;departamento;ci;celular;rol;activo</pre>
    <p class="subtle">La nómina principal ya viene preinstalada. Esta opción servirá para completar datos o incorporar nuevos integrantes.</p>
    <label class="file-drop">Seleccionar archivo CSV
      <input id="academicRosterFile" type="file" accept=".csv,text/csv">
    </label>
    <div class="form-actions">
      <button class="btn academic-main-btn" onclick="importAcademicRosterFile()">Importar</button>
      <button class="btn secondary" onclick="closeModal()">Cancelar</button>
    </div>
  `);
}

function parseCSV(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim());
  if (!lines.length) return [];
  const delimiter = (lines[0].split(';').length > lines[0].split(',').length) ? ';' : ',';
  const headers = lines.shift().split(delimiter).map(normalize);

  return lines.map(line => {
    const cells = line.split(delimiter).map(value => value.trim().replace(/^"|"$/g, ''));
    const raw = {};
    headers.forEach((header, index) => { raw[header] = cells[index] || ''; });
    const stateValue = raw.activo || raw.estado || '';
    return {
      roster_number: Number(raw.numero || raw.n || raw.lista) || null,
      full_name: raw.nombre_completo || raw.nombre || raw.apellidos_y_nombres || '',
      department: raw.departamento || '',
      ci: raw.ci || raw.carnet || raw.usuario_ci || '',
      phone: raw.celular || raw.telefono || raw.password_celular || '',
      role: raw.rol || 'lector',
      active: /^(1|true|si|sí|activo)$/i.test(stateValue)
    };
  }).filter(row => row.full_name);
}

async function importAcademicRosterFile() {
  const file = $('#academicRosterFile')?.files?.[0];
  if (!file) return toast('Seleccione el archivo CSV');

  try {
    const rows = parseCSV(await file.text());
    if (!rows.length) return toast('La nómina no contiene registros válidos');

    if (onlineConfigured()) {
      await academicRPC('academic_import_users', {
        p_token: academicSession.session_token,
        p_rows: rows
      });
    } else {
      const existing = await academicLocalUsers();
      const byRoster = new Map(existing.filter(item => item.roster_number).map(item => [Number(item.roster_number), item]));
      const byCi = new Map(existing.filter(item => item.ci).map(item => [academicCredential(item.ci), item]));
      rows.forEach(row => {
        const current = byRoster.get(Number(row.roster_number)) || byCi.get(academicCredential(row.ci));
        if (current) {
          if (current.role === 'administrador_general') row.role = 'administrador_general';
          Object.assign(current, row);
        } else {
          existing.push({ ...row, id: uid(), data_status: row.ci && row.phone ? 'completo' : 'pendiente' });
        }
      });
      academicSaveLocalUsers(existing);
    }

    closeModal();
    loadAcademicUsers();
    toast(`${rows.length} integrantes procesados`);
  } catch (error) {
    console.error(error);
    toast('No se pudo importar la nómina');
  }
}

async function validateAcademicLocalSession() {
  if (!academicSession) return;

  if (onlineConfigured()) {
    // Versiones anteriores guardaban tokens como "local:cap-a-017".
    // Esos valores no son UUID de Supabase y deben limpiarse sin generar error.
    if (!academicRemoteTokenIsValid(academicSession.session_token)) {
      academicSession = null;
      localStorage.removeItem(ACADEMIC_SESSION_STORAGE);
      return;
    }

    try {
      const refreshed = await academicRPC('academic_refresh_session', {
        p_token: academicSession.session_token
      });
      const user = Array.isArray(refreshed) ? refreshed[0] : refreshed;

      if (!user?.session_token || user.module_enabled === false) {
        throw new Error('Sesión inactiva');
      }

      academicSession = user;
      localStorage.setItem(ACADEMIC_SESSION_STORAGE, JSON.stringify(user));
      return;
    } catch (error) {
      console.warn('Sesión académica cerrada:', error);
      academicSession = null;
      localStorage.removeItem(ACADEMIC_SESSION_STORAGE);
      return;
    }
  }

  if (!String(academicSession.session_token || '').startsWith('local:')) {
    academicSession = null;
    localStorage.removeItem(ACADEMIC_SESSION_STORAGE);
    return;
  }

  const users = await academicLocalUsers();
  const user = users.find(item => String(item.id) === String(academicSession.user_id));
  if (!user?.active) {
    academicSession = null;
    localStorage.removeItem(ACADEMIC_SESSION_STORAGE);
    return;
  }

  academicSession.full_name = user.full_name;
  academicSession.role = user.role;
  localStorage.setItem(ACADEMIC_SESSION_STORAGE, JSON.stringify(academicSession));
}

const _renderOriginal = render;
render = function renderWithAcademicModule() {
  _renderOriginal();
  if (state.activated && state.mode && state.view === 'online') {
    setTimeout(() => {
      if (ACADEMIC_TYPES[academicTab]) loadAcademicPosts();
      if (academicTab === 'usuarios') loadAcademicUsers();
    }, 0);
  }
};

window.addEventListener('DOMContentLoaded', () => {
  validateAcademicLocalSession()
    .then(() => {
      if (state.activated && state.mode) render();
    })
    .catch(error => {
      console.error('Recuperación académica:', error);
      academicSession = null;
      localStorage.removeItem(ACADEMIC_SESSION_STORAGE);
      if (state.activated && state.mode) render();
    });
});

/* =========================================================
   Agenda Policial Online v2.6.8 — panel académico pulido
   Inspirado en una vista rápida por pendientes y materias,
   conservando la identidad institucional de Agenda Policial.
   ========================================================= */
const ACADEMIC_TASK_STATUS_STORAGE = 'agenda-academic-task-status-v264';
let academicFilter = 'all';
let academicViewMode = 'general';
let academicCalendarCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

function academicConnectionState() {
  if (!onlineConfigured()) return { label: 'Preparado local', cls: 'prep', detail: 'Pendiente de conectar Supabase' };
  if (!navigator.onLine) return { label: 'Sin conexión', cls: 'off', detail: 'Mostrando información disponible' };
  return { label: 'Conectado', cls: 'on', detail: 'Sincronización disponible' };
}

function academicProfileHeader() {
  const connection = academicConnectionState();
  return `
    <div class="online-profile">
      <div class="online-avatar">${esc(academicInitials(academicSession.full_name))}</div>
      <div class="online-profile-copy">
        <span class="eyebrow">Área académica · Capitanes A</span>
        <h2>${esc(academicSession.full_name || 'Usuario')}</h2>
        <div class="online-profile-meta">
          <span>${esc(academicRoleLabel(academicSession.role))}</span>
          <span class="sync-pill ${connection.cls}">${connection.label}</span>
        </div>
      </div>
      <button class="online-logout" onclick="academicLogout()" aria-label="Cerrar sesión académica">Salir</button>
    </div>
  `;
}

function academicGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function academicDateOnly(post) {
  const fields = post?.fields || {};
  if (post?.post_type === 'formaciones') return fields.date || '';
  if (post?.post_type === 'tareas') return fields.due_date || '';
  if (post?.post_type === 'examenes') return fields.date || '';
  return String(post?.created_at || '').slice(0, 10);
}

function academicTimeOnly(post) {
  const fields = post?.fields || {};
  if (post?.post_type === 'formaciones') return fields.control_time || fields.report_time || '';
  if (post?.post_type === 'examenes') return fields.time || '';
  return '';
}

function academicDateObject(post) {
  const date = academicDateOnly(post);
  if (!date) return null;
  const time = academicTimeOnly(post) || '12:00';
  const parsed = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function academicDayDifference(dateString) {
  if (!dateString) return null;
  const today = new Date(`${todayISO()}T00:00:00`);
  const target = new Date(`${dateString}T00:00:00`);
  return Math.round((target - today) / 86400000);
}

function academicDateLabel(post) {
  const date = academicDateOnly(post);
  if (!date) return 'Sin fecha';
  const diff = academicDayDifference(date);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff === -1) return 'Ayer';
  return fmtDate(date);
}

function academicTaskStatusMap() {
  try {
    const all = JSON.parse(localStorage.getItem(ACADEMIC_TASK_STATUS_STORAGE) || '{}');
    const userKey = String(academicSession?.user_id || 'anonymous');
    return all[userKey] || {};
  } catch {
    return {};
  }
}

function academicTaskIsDone(postId) {
  return Boolean(academicTaskStatusMap()[postId]);
}

function toggleAcademicTask(postId) {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(ACADEMIC_TASK_STATUS_STORAGE) || '{}'); } catch {}
  const userKey = String(academicSession?.user_id || 'anonymous');
  const mine = { ...(all[userKey] || {}) };
  mine[postId] = !mine[postId];
  all[userKey] = mine;
  localStorage.setItem(ACADEMIC_TASK_STATUS_STORAGE, JSON.stringify(all));
  loadAcademicPosts();
  toast(mine[postId] ? 'Tarea marcada como cumplida' : 'Tarea marcada como pendiente');
}

async function academicFetchPosts(type = null) {
  if (onlineConfigured()) {
    if (type) {
      const rows = await academicRPC('academic_get_posts', {
        p_token: academicSession.session_token,
        p_type: type
      });
      return Array.isArray(rows) ? rows : [];
    }
    const result = await Promise.all(Object.keys(ACADEMIC_TYPES).map(async key => {
      try {
        const rows = await academicRPC('academic_get_posts', {
          p_token: academicSession.session_token,
          p_type: key
        });
        return Array.isArray(rows) ? rows : [];
      } catch {
        return [];
      }
    }));
    return result.flat();
  }
  return academicLocalPosts().filter(post => !post.archived && (!type || post.post_type === type));
}

function academicDashboard() {
  const manage = academicCanManageUsers() ? `
    <button class="academic-manage-card" onclick="setAcademicTab('usuarios')">
      <span class="manage-icon">👥</span>
      <span>
        <b>Integrantes y funciones</b>
        <small>Asignar encargado de curso, administrador académico, asistentes y lectores.</small>
      </span>
      <strong>Administrar</strong>
    </button>
  ` : '';

  return `
    ${academicProfileHeader()}
    <section class="academic-welcome">
      <div>
        <span class="eyebrow">${academicGreeting()}</span>
        <h2>Panel académico</h2>
        <p id="academicTodayText">Revisando la actividad de hoy…</p>
      </div>
      <button class="academic-calendar-shortcut" onclick="setAcademicTab('calendario')">
        <span>📅</span><b>Agenda</b><small>Ver mes</small>
      </button>
    </section>

    <div class="academic-summary-grid" id="academicSummaryGrid">
      ${['Formación','Tareas','Examen','Resúmenes'].map(label => `<div class="academic-summary-card loading"><span>—</span><b>${label}</b><small>Cargando…</small></div>`).join('')}
    </div>

    <section class="academic-today-card">
      <div class="online-section-heading compact">
        <div><span class="eyebrow">Información prioritaria</span><h3>Hoy y próximos días</h3></div>
        <button class="text-btn" onclick="setAcademicTab('calendario')">Ver agenda</button>
      </div>
      <div id="academicUpcomingList" class="academic-timeline"><div class="academic-loading-line"></div></div>
    </section>

    <div class="online-section-heading">
      <div><span class="eyebrow">Accesos rápidos</span><h3>Contenido académico</h3></div>
      ${academicCanPublish() ? `<button class="text-btn" onclick="openAcademicPublishMenu()">+ Publicar</button>` : ''}
    </div>
    <div class="academic-module-grid refined">
      ${Object.entries(ACADEMIC_TYPES).map(([key, item]) => `
        <button onclick="setAcademicTab('${key}')">
          <span class="module-icon">${item.icon}</span>
          <span class="module-copy"><b>${item.label}</b><small>${item.help}</small></span>
          <strong>Ver →</strong>
        </button>
      `).join('')}
    </div>

    <section class="academic-recent-card">
      <div class="online-section-heading compact">
        <div><span class="eyebrow">Actualizaciones</span><h3>Actividad reciente</h3></div>
      </div>
      <div id="academicRecentList"><div class="academic-loading-line"></div></div>
    </section>
    ${manage}
  `;
}

function academicDashboardSummaryCard(iconValue, value, label, detail, tab, tone = '') {
  return `
    <button class="academic-summary-card ${tone}" onclick="setAcademicTab('${tab}')">
      <span class="summary-icon">${iconValue}</span>
      <strong>${esc(String(value))}</strong>
      <b>${esc(label)}</b>
      <small>${esc(detail)}</small>
    </button>
  `;
}

function academicEventKind(post) {
  return ACADEMIC_TYPES[post.post_type]?.label || 'Actividad';
}

function academicEventRow(post) {
  const fields = post.fields || {};
  const subject = fields.subject || fields.formation_type || academicEventKind(post);
  const place = fields.place ? ` · ${fields.place}` : '';
  const time = academicTimeOnly(post) ? ` · ${academicTimeOnly(post)}` : '';
  return `
    <button class="academic-timeline-row" onclick="setAcademicTab('${post.post_type}')">
      <span class="timeline-date"><b>${esc(academicDateLabel(post))}</b><small>${esc(time.replace(' · ', '') || academicEventKind(post))}</small></span>
      <span class="timeline-dot ${esc(post.post_type)}"></span>
      <span class="timeline-copy"><b>${esc(post.title || academicEventKind(post))}</b><small>${esc(subject + place)}</small></span>
      <span class="timeline-arrow">›</span>
    </button>
  `;
}

async function loadAcademicDashboard() {
  if (!academicSession || academicTab !== 'panel') return;
  try {
    const posts = await academicFetchPosts();
    if (academicTab !== 'panel') return;
    const today = todayISO();
    const taskDone = academicTaskStatusMap();
    const formations = posts.filter(p => p.post_type === 'formaciones');
    const tasks = posts.filter(p => p.post_type === 'tareas');
    const exams = posts.filter(p => p.post_type === 'examenes');
    const summaries = posts.filter(p => p.post_type === 'resumenes');
    const future = post => academicDateOnly(post) && academicDateOnly(post) >= today;
    const byDate = (a,b) => (academicDateObject(a)?.getTime() || Infinity) - (academicDateObject(b)?.getTime() || Infinity);
    const nextFormation = formations.filter(future).sort(byDate)[0];
    const pendingTasks = tasks.filter(post => !taskDone[post.id]);
    const nextExam = exams.filter(future).sort(byDate)[0];
    const recentSummaries = summaries.filter(post => {
      const diff = academicDayDifference(String(post.created_at || '').slice(0,10));
      return diff !== null && diff >= -7;
    });

    const summary = $('#academicSummaryGrid');
    if (summary) summary.innerHTML = [
      academicDashboardSummaryCard('🛡️', nextFormation ? academicDateLabel(nextFormation) : '—', 'Próxima formación', nextFormation?.title || 'Sin publicación', 'formaciones', 'formation-tone'),
      academicDashboardSummaryCard('✓', pendingTasks.length, 'Tareas pendientes', pendingTasks.length ? 'Revisar entregas' : 'Sin pendientes', 'tareas', pendingTasks.length ? 'task-tone' : ''),
      academicDashboardSummaryCard('📝', nextExam ? academicDateLabel(nextExam) : '—', 'Próximo examen', nextExam?.title || 'Sin cronograma', 'examenes', 'exam-tone'),
      academicDashboardSummaryCard('📚', recentSummaries.length, 'Resúmenes nuevos', recentSummaries.length ? 'Últimos 7 días' : 'Sin novedades', 'resumenes', 'summary-tone')
    ].join('');

    const todayItems = posts.filter(post => academicDateOnly(post) === today);
    const todayText = $('#academicTodayText');
    if (todayText) todayText.textContent = todayItems.length
      ? `${todayItems.length} actividad${todayItems.length === 1 ? '' : 'es'} programada${todayItems.length === 1 ? '' : 's'} para hoy.`
      : 'No hay actividad registrada para hoy. Revise los próximos días.';

    const upcoming = posts
      .filter(post => ['formaciones','tareas','examenes'].includes(post.post_type) && future(post))
      .sort(byDate)
      .slice(0, 6);
    const upcomingBox = $('#academicUpcomingList');
    if (upcomingBox) upcomingBox.innerHTML = upcoming.length
      ? upcoming.map(academicEventRow).join('')
      : '<div class="empty-academic-line"><span>✓</span><p>No hay actividades próximas registradas.</p></div>';

    const recent = [...posts].sort((a,b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))).slice(0, 5);
    const recentBox = $('#academicRecentList');
    if (recentBox) recentBox.innerHTML = recent.length
      ? recent.map(post => `
          <button class="academic-recent-row" onclick="setAcademicTab('${post.post_type}')">
            <span>${ACADEMIC_TYPES[post.post_type]?.icon || '•'}</span>
            <span><b>${esc(post.title || academicEventKind(post))}</b><small>${esc(academicEventKind(post))} · ${esc(post.author_name || 'Curso')}</small></span>
            <time>${esc(String(post.created_at || '').slice(0,10) ? fmtDate(String(post.created_at || '').slice(0,10)) : '')}</time>
          </button>
        `).join('')
      : '<div class="empty-academic-line"><span>📭</span><p>Todavía no existen publicaciones.</p></div>';
  } catch (error) {
    console.error(error);
    const upcomingBox = $('#academicUpcomingList');
    if (upcomingBox) upcomingBox.innerHTML = '<div class="empty-academic-line warning"><span>!</span><p>No se pudo cargar la actividad académica.</p></div>';
  }
}

function academicDefaultFilter(tab) {
  return ({ formaciones: 'next', tareas: 'pending', examenes: 'upcoming', resumenes: 'recent' })[tab] || 'all';
}

function academicFilterOptions(tab) {
  return ({
    formaciones: [['next','Próximas'],['current','Vigentes'],['previous','Anteriores'],['all','Todas']],
    tareas: [['pending','Pendientes'],['urgent','Urgentes'],['completed','Completadas'],['all','Todas']],
    examenes: [['upcoming','Próximos'],['past','Realizados'],['all','Todos']],
    resumenes: [['recent','Recientes'],['file','Con archivo'],['text','Solo texto'],['all','Todos']]
  })[tab] || [['all','Todos']];
}

function academicFilterBar() {
  const options = academicFilterOptions(academicTab);
  const supportsSubject = ['tareas','examenes','resumenes'].includes(academicTab);
  return `
    <div class="academic-list-controls">
      <div class="academic-filter-chips">
        ${options.map(([key,label]) => `<button class="${academicFilter === key ? 'active' : ''}" onclick="setAcademicFilter('${key}')">${label}</button>`).join('')}
      </div>
      ${supportsSubject ? `
        <div class="academic-view-switch" aria-label="Cambiar vista">
          <button class="${academicViewMode === 'general' ? 'active' : ''}" onclick="setAcademicViewMode('general')">General</button>
          <button class="${academicViewMode === 'subject' ? 'active' : ''}" onclick="setAcademicViewMode('subject')">Por materia</button>
        </div>
      ` : ''}
    </div>
  `;
}

function academicSubnav() {
  return `
    <div class="academic-subnav">
      <button onclick="setAcademicTab('panel')">‹ Panel</button>
      <button class="${academicTab === 'calendario' ? 'active' : ''}" onclick="setAcademicTab('calendario')">📅 Agenda</button>
      ${Object.entries(ACADEMIC_TYPES).map(([key, item]) => `
        <button class="${academicTab === key ? 'active' : ''}" onclick="setAcademicTab('${key}')">${item.icon} ${item.label}</button>
      `).join('')}
      ${academicCanManageUsers() ? `
        <button class="${academicTab === 'usuarios' ? 'active' : ''}" onclick="setAcademicTab('usuarios')">👥 Roles</button>
      ` : ''}
    </div>
  `;
}

function academicModuleView() {
  const info = ACADEMIC_TYPES[academicTab];
  return `
    ${academicProfileHeader()}
    ${academicSubnav()}
    <div class="online-module-head refined">
      <div>
        <span class="module-big-icon">${info.icon}</span>
        <div><span class="eyebrow">Módulo académico</span><h3>${info.label}</h3><p>${info.help}</p></div>
      </div>
      ${academicCanPublish() ? `<button class="btn academic-main-btn" onclick="openAcademicPostForm('${academicTab}')">Nueva publicación</button>` : ''}
    </div>
    ${academicFilterBar()}
    <div id="academicPosts"><div class="card small"><p>Cargando contenido…</p></div></div>
  `;
}

async function setAcademicTab(tab) {
  academicTab = tab;
  academicFilter = academicDefaultFilter(tab);
  academicViewMode = 'general';
  render();
  setTimeout(() => {
    if (ACADEMIC_TYPES[tab]) loadAcademicPosts();
    if (tab === 'usuarios') loadAcademicUsers();
    if (tab === 'panel') loadAcademicDashboard();
    if (tab === 'calendario') loadAcademicCalendar();
  }, 0);
}

function setAcademicFilter(filter) {
  academicFilter = filter;
  render();
  setTimeout(loadAcademicPosts, 0);
}

function setAcademicViewMode(mode) {
  academicViewMode = mode;
  render();
  setTimeout(loadAcademicPosts, 0);
}

function academicPostMatchesFilter(post) {
  if (ACADEMIC_TYPES[academicTab] && post.post_type !== academicTab) return false;
  const date = academicDateOnly(post);
  const diff = academicDayDifference(date);
  if (academicTab === 'formaciones') {
    if (academicFilter === 'next') return diff !== null && diff >= 0;
    if (academicFilter === 'current') return diff !== null && diff >= 0 && diff <= 7;
    if (academicFilter === 'previous') return diff !== null && diff < 0;
  }
  if (academicTab === 'tareas') {
    const done = academicTaskIsDone(post.id);
    if (academicFilter === 'pending') return !done;
    if (academicFilter === 'completed') return done;
    if (academicFilter === 'urgent') return !done && diff !== null && diff <= 2;
  }
  if (academicTab === 'examenes') {
    if (academicFilter === 'upcoming') return diff !== null && diff >= 0;
    if (academicFilter === 'past') return diff !== null && diff < 0;
  }
  if (academicTab === 'resumenes') {
    if (academicFilter === 'recent') {
      const createdDiff = academicDayDifference(String(post.created_at || '').slice(0,10));
      return createdDiff !== null && createdDiff >= -14;
    }
    if (academicFilter === 'file') return Boolean(post.file_url);
    if (academicFilter === 'text') return Boolean(post.body) && !post.file_url;
  }
  return true;
}

function academicPostSort(a, b) {
  if (['formaciones','tareas','examenes'].includes(academicTab)) {
    const da = academicDateObject(a)?.getTime() || Infinity;
    const db = academicDateObject(b)?.getTime() || Infinity;
    return da - db;
  }
  return String(b.created_at || '').localeCompare(String(a.created_at || ''));
}

function academicSubjectName(post) {
  const fields = post.fields || {};
  return fields.subject || 'Sin materia especificada';
}

function academicGroupedPosts(posts) {
  const groups = new Map();
  posts.forEach(post => {
    const subject = academicSubjectName(post);
    if (!groups.has(subject)) groups.set(subject, []);
    groups.get(subject).push(post);
  });
  return [...groups.entries()].sort((a,b) => a[0].localeCompare(b[0], 'es')).map(([subject, items]) => `
    <section class="academic-subject-group">
      <header><span>📚</span><div><h3>${esc(subject)}</h3><small>${items.length} publicación${items.length === 1 ? '' : 'es'}</small></div></header>
      <div class="academic-subject-posts">${items.map(academicPostCard).join('')}</div>
    </section>
  `).join('');
}

async function loadAcademicPosts() {
  const box = $('#academicPosts');
  if (!box || !academicSession || !ACADEMIC_TYPES[academicTab]) return;
  try {
    const rows = await academicFetchPosts(academicTab);
    const posts = rows.filter(academicPostMatchesFilter).sort(academicPostSort);
    if (!posts.length) {
      box.innerHTML = '<div class="card small empty-online"><span>📭</span><p>No existen publicaciones con este filtro.</p></div>';
      return;
    }
    box.innerHTML = academicViewMode === 'subject' && ['tareas','examenes','resumenes'].includes(academicTab)
      ? academicGroupedPosts(posts)
      : posts.map(academicPostCard).join('');
  } catch (error) {
    console.error(error);
    box.innerHTML = '<div class="card small warn-card"><p>No fue posible sincronizar el contenido.</p></div>';
  }
}

function academicPostCard(post) {
  const fields = post.fields || {};
  let meta = '';
  let status = '';
  const dateLabel = academicDateLabel(post);
  const diff = academicDayDifference(academicDateOnly(post));

  if (post.post_type === 'formaciones') {
    meta = `
      <div class="formation-meta">
        <span>📅 ${esc(fields.date || 'Sin fecha')}</span>
        <span>📍 ${esc(fields.place || 'Sin lugar')}</span>
        <span>🕘 Control: ${esc(fields.control_time || '-')}</span>
        <span>🕙 Parte: ${esc(fields.report_time || '-')}</span>
      </div>
      ${fields.uniform ? `<p><b>Uniforme:</b> ${esc(fields.uniform)}</p>` : ''}
      ${fields.observations ? `<p><b>Observaciones:</b> ${esc(fields.observations)}</p>` : ''}
    `;
    status = diff === 0 ? '<span class="academic-status urgent">Hoy</span>' : (diff !== null && diff > 0 ? '<span class="academic-status upcoming">Próxima</span>' : '<span class="academic-status neutral">Concluida</span>');
  }

  if (post.post_type === 'resumenes') {
    meta = `<p><b>Materia:</b> ${esc(fields.subject || '')} · <b>Tema:</b> ${esc(fields.topic || '')}</p>`;
    status = post.file_url ? '<span class="academic-status file">Con archivo</span>' : '<span class="academic-status neutral">Texto</span>';
  }

  if (post.post_type === 'tareas') {
    const done = academicTaskIsDone(post.id);
    meta = `<p><b>Materia:</b> ${esc(fields.subject || '')} · <b>Entrega:</b> ${esc(fields.due_date || 'Sin fecha')}</p>`;
    status = done
      ? '<span class="academic-status done">Cumplida</span>'
      : (diff !== null && diff <= 2 ? '<span class="academic-status urgent">Urgente</span>' : '<span class="academic-status pending">Pendiente</span>');
  }

  if (post.post_type === 'examenes') {
    meta = `<p><b>Materia:</b> ${esc(fields.subject || '')} · <b>Fecha:</b> ${esc(fields.date || '')} ${esc(fields.time || '')} · <b>Lugar:</b> ${esc(fields.place || '')}</p>`;
    status = diff !== null && diff >= 0 ? '<span class="academic-status exam">Próximo</span>' : '<span class="academic-status neutral">Realizado</span>';
  }

  const taskAction = post.post_type === 'tareas' ? `
    <button class="academic-task-toggle ${academicTaskIsDone(post.id) ? 'done' : ''}" onclick="toggleAcademicTask('${esc(post.id)}')">
      ${academicTaskIsDone(post.id) ? '✓ Cumplida' : 'Marcar cumplida'}
    </button>
  ` : '';

  return `
    <article class="card academic-post ${esc(post.post_type)}">
      <div class="academic-post-top">
        <div class="academic-post-tags"><span class="tag">${esc(ACADEMIC_TYPES[post.post_type]?.label || post.post_type)}</span>${status}</div>
        <time>${esc(dateLabel)}</time>
      </div>
      <h3>${esc(post.title || 'Publicación académica')}</h3>
      ${meta}
      ${post.body ? `<p class="academic-post-body">${esc(post.body)}</p>` : ''}
      ${post.file_url ? `<a class="academic-file-link" href="${esc(post.file_url)}" target="_blank" rel="noopener">📎 ${esc(academicFileName(post.file_url))}</a>` : ''}
      <footer class="academic-post-footer">
        <small>Publicado por ${esc(post.author_name || 'Curso')}</small>
        ${taskAction}
      </footer>
    </article>
  `;
}

function academicCalendarView() {
  const month = academicCalendarCursor.toLocaleDateString('es-BO', { month: 'long', year: 'numeric' });
  return `
    ${academicProfileHeader()}
    ${academicSubnav()}
    <div class="online-module-head refined calendar-head">
      <div>
        <span class="module-big-icon">📅</span>
        <div><span class="eyebrow">Agenda académica</span><h3>${esc(month.charAt(0).toUpperCase() + month.slice(1))}</h3><p>Formaciones, tareas y exámenes en una sola vista.</p></div>
      </div>
      <div class="calendar-nav-buttons"><button onclick="changeAcademicMonth(-1)">‹</button><button onclick="changeAcademicMonth(0)">Hoy</button><button onclick="changeAcademicMonth(1)">›</button></div>
    </div>
    <div id="academicCalendar" class="academic-calendar"><div class="card small"><p>Cargando agenda…</p></div></div>
  `;
}

function changeAcademicMonth(delta) {
  if (delta === 0) academicCalendarCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  else academicCalendarCursor = new Date(academicCalendarCursor.getFullYear(), academicCalendarCursor.getMonth() + delta, 1);
  render();
  setTimeout(loadAcademicCalendar, 0);
}

function academicCalendarBadge(post) {
  const title = post.title || academicEventKind(post);
  return `<button class="calendar-event ${esc(post.post_type)}" onclick="setAcademicTab('${post.post_type}')" title="${esc(title)}">${esc(title)}</button>`;
}

async function loadAcademicCalendar() {
  const box = $('#academicCalendar');
  if (!box || academicTab !== 'calendario') return;
  try {
    const posts = (await academicFetchPosts()).filter(post => ['formaciones','tareas','examenes'].includes(post.post_type) && academicDateOnly(post));
    const year = academicCalendarCursor.getFullYear();
    const month = academicCalendarCursor.getMonth();
    const first = new Date(year, month, 1);
    const days = new Date(year, month + 1, 0).getDate();
    const startOffset = (first.getDay() + 6) % 7;
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push('<div class="calendar-day outside"></div>');
    for (let day = 1; day <= days; day++) {
      const date = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const dayPosts = posts.filter(post => academicDateOnly(post) === date).sort(academicPostSort);
      const todayClass = date === todayISO() ? ' today' : '';
      cells.push(`
        <div class="calendar-day${todayClass}">
          <span class="calendar-number">${day}</span>
          <div class="calendar-events">${dayPosts.slice(0,3).map(academicCalendarBadge).join('')}${dayPosts.length > 3 ? `<small>+${dayPosts.length - 3} más</small>` : ''}</div>
        </div>
      `);
    }
    while (cells.length % 7) cells.push('<div class="calendar-day outside"></div>');
    box.innerHTML = `
      <div class="calendar-weekdays">${['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => `<b>${d}</b>`).join('')}</div>
      <div class="calendar-grid">${cells.join('')}</div>
      <div class="calendar-legend"><span class="formaciones">Formaciones</span><span class="tareas">Tareas</span><span class="examenes">Exámenes</span></div>
    `;
  } catch (error) {
    console.error(error);
    box.innerHTML = '<div class="card warn-card"><p>No fue posible cargar la agenda académica.</p></div>';
  }
}

function openAcademicPublishMenu() {
  if (!academicCanPublish()) return toast('No tiene permiso para publicar');
  showModal(`
    <button class="icon-btn close" onclick="closeModal()">×</button>
    <span class="eyebrow">Publicación académica</span>
    <h2>¿Qué desea publicar?</h2>
    <div class="academic-publish-grid">
      ${Object.entries(ACADEMIC_TYPES).map(([key,item]) => `
        <button onclick="closeModal();openAcademicPostForm('${key}')">
          <span>${item.icon}</span><b>${item.label}</b><small>${item.help}</small>
        </button>
      `).join('')}
    </div>
  `);
}

function renderOnline() {
  if (!academicSession) return onlineLoginView();
  if (academicTab === 'panel') return `<section class="online-page">${academicDashboard()}</section>`;
  if (academicTab === 'usuarios' && academicCanManageUsers()) return `<section class="online-page">${academicUsersView()}</section>`;
  if (academicTab === 'calendario') return `<section class="online-page">${academicCalendarView()}</section>`;
  if (!ACADEMIC_TYPES[academicTab]) academicTab = 'panel';
  return `<section class="online-page">${academicModuleView()}</section>`;
}

const _renderAcademicV263 = render;
render = function renderWithAcademicDashboardV264() {
  _renderAcademicV263();
  if (state.activated && state.mode && state.view === 'online') {
    setTimeout(() => {
      if (academicTab === 'panel') loadAcademicDashboard();
      if (academicTab === 'calendario') loadAcademicCalendar();
    }, 0);
  }
};

window.addEventListener('online', () => {
  if (state?.view === 'online' && academicSession) render();
});
window.addEventListener('offline', () => {
  if (state?.view === 'online' && academicSession) render();
});


/* =========================================================
   Agenda Policial Online v2.6.8 — interfaz clara y roles
   ========================================================= */
let academicRoleBus = null;
try { academicRoleBus = 'BroadcastChannel' in window ? new BroadcastChannel(ACADEMIC_ROLE_CHANNEL) : null; } catch {}

function academicIsTestSession() {
  return Boolean(
    academicSession?.is_test ||
    academicSession?.storage_mode === 'test_online' ||
    (academicSession?.storage_mode === 'test_local' && academicSession?.session_token === 'local:test-user')
  );
}

function refreshAcademicSessionFromLocalStore() {
  if (!academicSession || onlineConfigured() || academicIsTestSession()) return false;
  const stored = academicLocalStorageUsers().users || [];
  const user = stored.find(item => String(item.id) === String(academicSession.user_id));
  if (!user || !user.active) {
    academicSession = null;
    localStorage.removeItem(ACADEMIC_SESSION_STORAGE);
    return true;
  }
  const changed = academicSession.role !== user.role || academicSession.full_name !== user.full_name;
  academicSession.role = user.role || 'lector';
  academicSession.full_name = user.full_name || academicSession.full_name;
  localStorage.setItem(ACADEMIC_SESSION_STORAGE, JSON.stringify(academicSession));
  return changed;
}

function notifyAcademicRoleChange(userId, data = {}) {
  const payload = { type: 'academic-user-updated', userId: String(userId || ''), role: data.role || '', active: data.active, at: Date.now() };
  try { localStorage.setItem('agenda-academic-role-event-v265', JSON.stringify(payload)); } catch {}
  try { academicRoleBus?.postMessage(payload); } catch {}
}

function handleAcademicRoleEvent(event) {
  const payload = event?.data || event;
  if (!payload || payload.type !== 'academic-user-updated') return;
  const changed = refreshAcademicSessionFromLocalStore();
  if (state?.view === 'online' && (changed || String(payload.userId) === String(academicSession?.user_id))) render();
}
try { academicRoleBus?.addEventListener('message', handleAcademicRoleEvent); } catch {}
window.addEventListener('storage', event => {
  if (event.key === ACADEMIC_USERS_STORAGE || event.key === 'agenda-academic-role-event-v265') {
    let payload = { type: 'academic-user-updated' };
    try { if (event.newValue && event.key === 'agenda-academic-role-event-v265') payload = JSON.parse(event.newValue); } catch {}
    handleAcademicRoleEvent(payload);
  }
});

onlineLoginView = function onlineLoginViewV265() {
  return `
    <section class="online-page online-login-clean">
      <div class="online-login-hero clean">
        <span class="eyebrow">Acceso reservado al curso</span>
        <h2>Área académica online</h2>
        <p>Ingrese con las credenciales asignadas. El resto de la aplicación continúa disponible sin conexión.</p>
      </div>
      <div class="card academic-login clean">
        <h3>Iniciar sesión</h3>
        <label>Usuario
          <input id="academicCi" inputmode="numeric" autocomplete="username" placeholder="Ingrese su usuario">
        </label>
        <label>Contraseña
          <input id="academicPhone" inputmode="tel" autocomplete="current-password" placeholder="Ingrese su contraseña" type="password">
        </label>
        <button class="btn academic-main-btn" onclick="academicLogin()">Ingresar</button>
        <p class="academic-credential-note">Usuario del curso: C.I. · Contraseña: número de celular.</p>
        
        ${!onlineConfigured() ? `<div class="online-setup-note"><b>Modo local de preparación</b><span>Los roles se conservan en este dispositivo. La sincronización entre celulares comenzará al conectar un proyecto Supabase exclusivo para Agenda Policial.</span></div>` : ''}
      </div>
    </section>
  `;
};

function academicTextNav() {
  return `
    <nav class="academic-text-nav" aria-label="Secciones académicas">
      <button class="${academicTab === 'panel' ? 'active' : ''}" onclick="setAcademicTab('panel')">Panel</button>
      <button class="${academicTab === 'formaciones' ? 'active' : ''}" onclick="setAcademicTab('formaciones')">Formaciones</button>
      <button class="${academicTab === 'tareas' ? 'active' : ''}" onclick="setAcademicTab('tareas')">Tareas</button>
      <button class="${academicTab === 'examenes' ? 'active' : ''}" onclick="setAcademicTab('examenes')">Exámenes</button>
      <button class="${academicTab === 'resumenes' ? 'active' : ''}" onclick="setAcademicTab('resumenes')">Resúmenes</button>
      <button class="${academicTab === 'calendario' ? 'active' : ''}" onclick="setAcademicTab('calendario')">Agenda</button>
      ${academicCanManageUsers() ? `<button class="${academicTab === 'usuarios' ? 'active' : ''}" onclick="setAcademicTab('usuarios')">Roles</button>` : ''}
    </nav>
  `;
}

academicSubnav = function academicSubnavV265() { return academicTextNav(); };

academicProfileHeader = function academicProfileHeaderV265() {
  refreshAcademicSessionFromLocalStore();
  const connection = academicConnectionState();
  const test = academicIsTestSession();
  return `
    <div class="online-profile compact-profile">
      <div class="online-avatar">${esc(academicInitials(academicSession?.full_name || 'AP'))}</div>
      <div class="online-profile-copy">
        <span class="eyebrow">Área académica · Capitanes A</span>
        <h2>${esc(academicSession?.full_name || 'Usuario')}</h2>
        <div class="online-profile-meta">
          <span>${esc(academicRoleLabel(academicSession?.role))}</span>
          <span class="sync-pill ${test ? 'prep' : connection.cls}">${test ? 'Prueba local' : connection.label}</span>
        </div>
      </div>
      <button class="online-logout" onclick="academicLogout()">Salir</button>
    </div>
  `;
};

academicDashboard = function academicDashboardV265() {
  const manage = academicCanManageUsers() ? `
    <button class="academic-manage-card clean-manage" onclick="setAcademicTab('usuarios')">
      <span><b>Integrantes y roles</b><small>Asignar las funciones del curso y activar accesos.</small></span>
      <strong>Abrir</strong>
    </button>` : '';
  return `
    ${academicProfileHeader()}
    ${academicTextNav()}
    <section class="academic-welcome clean-welcome">
      <div><span class="eyebrow">${academicGreeting()}</span><h2>Panel académico</h2><p id="academicTodayText">Revisando la actividad de hoy…</p></div>
    </section>
    <div class="academic-summary-grid" id="academicSummaryGrid">
      ${['Formación','Tareas','Examen','Resúmenes'].map(label => `<div class="academic-summary-card loading"><strong>—</strong><b>${label}</b><small>Cargando…</small></div>`).join('')}
    </div>
    <section class="academic-today-card">
      <div class="online-section-heading compact"><div><span class="eyebrow">Información prioritaria</span><h3>Hoy y próximos días</h3></div><button class="text-btn" onclick="setAcademicTab('calendario')">Ver agenda</button></div>
      <div id="academicUpcomingList" class="academic-timeline"><div class="academic-loading-line"></div></div>
    </section>
    <section class="academic-recent-card">
      <div class="online-section-heading compact"><div><span class="eyebrow">Actualizaciones</span><h3>Actividad reciente</h3></div>${academicCanPublish() ? `<button class="text-btn" onclick="openAcademicPublishMenu()">Publicar</button>` : ''}</div>
      <div id="academicRecentList"><div class="academic-loading-line"></div></div>
    </section>
    ${manage}
  `;
};

academicModuleView = function academicModuleViewV265() {
  const info = ACADEMIC_TYPES[academicTab];
  return `
    ${academicProfileHeader()}
    ${academicTextNav()}
    <div class="online-module-head refined clean-module-head">
      <div><div><span class="eyebrow">Módulo académico</span><h3>${info.label}</h3><p>${info.help}</p></div></div>
      ${academicCanPublish() ? `<button class="btn academic-main-btn" onclick="openAcademicPostForm('${academicTab}')">Nueva publicación</button>` : ''}
    </div>
    ${academicFilterBar()}
    <div id="academicPosts"><div class="card small"><p>Cargando contenido…</p></div></div>
  `;
};

const _academicUsersViewV264 = academicUsersView;
academicUsersView = function academicUsersViewV265() {
  return _academicUsersViewV264().replace(academicSubnav(), academicTextNav()).replace('<span class="module-big-icon">👥</span>', '');
};

const _academicCalendarViewV264 = academicCalendarView;
academicCalendarView = function academicCalendarViewV265() {
  return _academicCalendarViewV264().replace(academicSubnav(), academicTextNav()).replace('<span class="module-big-icon">📅</span>', '');
};

const _renderOnlineV264 = renderOnline;
renderOnline = function renderOnlineV265() {
  refreshAcademicSessionFromLocalStore();
  return _renderOnlineV264();
};


/* =========================================================
   Agenda Policial Online v2.6.8 — sesión persistente y tareas
   ========================================================= */
const ACADEMIC_POST_CACHE_STORAGE='agenda-academic-post-cache-v268';
const ACADEMIC_TASK_QUEUE_STORAGE='agenda-academic-task-queue-v268';
let academicSubjectExpanded=new Set();

function academicDisplayName(){return academicIsTestSession()?'Administrador del sistema':(academicSession?.full_name||'Usuario')}
function academicIsNetworkError(error){return !navigator.onLine||error?.name==='TypeError'||error?.code==='NETWORK_ERROR'||error?.status===0||/failed to fetch|network|internet|abort/i.test(String(error?.message||''))}
function academicPostCache(){try{return JSON.parse(localStorage.getItem(ACADEMIC_POST_CACHE_STORAGE)||'{}')}catch{return {}}}
function saveAcademicPostCache(cache){localStorage.setItem(ACADEMIC_POST_CACHE_STORAGE,JSON.stringify(cache))}
function academicCacheKey(type){return `${academicSession?.course_code||'curso'}:${type||'all'}`}
function academicCachedPosts(type){return academicPostCache()[academicCacheKey(type)]?.rows||[]}
function academicStorePosts(type,rows){const cache=academicPostCache();cache[academicCacheKey(type)]={rows:Array.isArray(rows)?rows:[],saved_at:new Date().toISOString()};saveAcademicPostCache(cache)}

academicRPC=async function academicRPCV268(fn,body={}){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
  try{
    const response=await fetch(`${ONLINE_CFG.url}/rest/v1/rpc/${fn}`,{method:'POST',headers:academicHeaders(),body:JSON.stringify(body),signal:controller.signal});
    const text=await response.text();
    if(!response.ok){const error=new Error(text||`Error ${response.status}`);error.status=response.status;throw error}
    return text?JSON.parse(text):null;
  }catch(error){if(error?.name==='AbortError'){const timeout=new Error('Tiempo de conexión agotado');timeout.code='NETWORK_ERROR';throw timeout}throw error}
  finally{clearTimeout(timer)}
};

validateAcademicLocalSession=async function validateAcademicSessionV268(){
  if(!academicSession)return;
  if(onlineConfigured()){
    if(!academicRemoteTokenIsValid(academicSession.session_token)){academicSession=null;localStorage.removeItem(ACADEMIC_SESSION_STORAGE);return}
    if(!navigator.onLine){academicSession.offline_cached=true;localStorage.setItem(ACADEMIC_SESSION_STORAGE,JSON.stringify(academicSession));return}
    try{
      const refreshed=await academicRPC('academic_refresh_session',{p_token:academicSession.session_token});const user=Array.isArray(refreshed)?refreshed[0]:refreshed;
      if(!user?.session_token||user.module_enabled===false){academicSession=null;localStorage.removeItem(ACADEMIC_SESSION_STORAGE);return}
      academicSession={...academicSession,...user,offline_cached:false,last_validated_at:new Date().toISOString()};localStorage.setItem(ACADEMIC_SESSION_STORAGE,JSON.stringify(academicSession));return;
    }catch(error){
      if(academicIsNetworkError(error)){academicSession.offline_cached=true;localStorage.setItem(ACADEMIC_SESSION_STORAGE,JSON.stringify(academicSession));return}
      console.warn('Sesión académica inválida:',error);academicSession=null;localStorage.removeItem(ACADEMIC_SESSION_STORAGE);return;
    }
  }
  if(!String(academicSession.session_token||'').startsWith('local:')){academicSession=null;localStorage.removeItem(ACADEMIC_SESSION_STORAGE);return}
  const users=await academicLocalUsers();const user=users.find(item=>String(item.id)===String(academicSession.user_id));if(!user?.active){academicSession=null;localStorage.removeItem(ACADEMIC_SESSION_STORAGE);return}
  academicSession.full_name=user.full_name;academicSession.role=user.role;localStorage.setItem(ACADEMIC_SESSION_STORAGE,JSON.stringify(academicSession));
};

academicLogin=async function academicLoginV268(){
  const ci=$('#academicCi')?.value.trim(),phone=$('#academicPhone')?.value.trim();if(!ci||!phone)return toast('Ingrese usuario y contraseña');
  try{
    let user=onlineConfigured()?await academicRPC('academic_login',{p_ci:ci,p_phone:phone}):await academicLocalLogin(ci,phone);if(Array.isArray(user))user=user[0];
    if(!user?.session_token)return toast('Usuario o contraseña incorrectos, o acceso inactivo');
    academicSession={...user,offline_cached:false,last_validated_at:new Date().toISOString()};academicTab='panel';localStorage.setItem(ACADEMIC_SESSION_STORAGE,JSON.stringify(academicSession));toast('Acceso académico habilitado');setTimeout(()=>location.replace(`./index.html?online=1&v=2.6.8&r=${Date.now()}`),120);
  }catch(error){console.error(error);toast(academicIsNetworkError(error)?'Sin conexión. Intente nuevamente cuando tenga internet':'No fue posible validar las credenciales')}
};

onlineLoginView=function onlineLoginViewV268(){return `<section class="online-page online-login-clean"><div class="online-login-hero clean"><span class="eyebrow">Acceso reservado al curso</span><h2>Área académica online</h2><p>Ingrese con las credenciales asignadas. El resto de la aplicación continúa disponible sin conexión.</p></div><div class="card academic-login clean"><h3>Iniciar sesión</h3><label>Usuario<input id="academicCi" inputmode="numeric" autocomplete="username" placeholder="Ingrese su usuario"></label><label>Contraseña<input id="academicPhone" inputmode="tel" autocomplete="current-password" placeholder="Ingrese su contraseña" type="password"></label><button class="btn academic-main-btn" onclick="academicLogin()">Ingresar</button><p class="academic-credential-note">Utilice las credenciales asignadas para el curso.</p></div></section>`};

academicProfileHeader=function academicProfileHeaderV268(){
  const connection=academicConnectionState();const name=academicDisplayName();return `<div class="online-profile compact-profile"><div class="online-avatar">${esc(academicInitials(name))}</div><div class="online-profile-copy"><span class="eyebrow">Área académica · Capitanes A</span><h2>${esc(name)}</h2><div class="online-profile-meta"><span>${esc(academicRoleLabel(academicSession?.role))}</span><span class="sync-pill ${connection.cls}">${connection.label}</span></div></div><button class="online-logout" onclick="academicLogout()">Salir</button></div>`;
};

academicFetchPosts=async function academicFetchPostsV268(type=null){
  if(onlineConfigured()){
    if(type){
      if(navigator.onLine){try{const rows=await academicRPC('academic_get_posts',{p_token:academicSession.session_token,p_type:type});const list=Array.isArray(rows)?rows:[];academicStorePosts(type,list);return list}catch(error){if(!academicIsNetworkError(error))throw error}}
      return academicCachedPosts(type);
    }
    const all=[];for(const key of Object.keys(ACADEMIC_TYPES))all.push(...await academicFetchPosts(key));return all;
  }
  return academicLocalPosts().filter(post=>!post.archived&&(!type||post.post_type===type));
};

function academicTaskRawMap(){try{const all=JSON.parse(localStorage.getItem(ACADEMIC_TASK_STATUS_STORAGE)||'{}');return all}catch{return {}}}
function academicSaveTaskMap(mine){const all=academicTaskRawMap();all[String(academicSession?.user_id||'anonymous')]=mine;localStorage.setItem(ACADEMIC_TASK_STATUS_STORAGE,JSON.stringify(all))}
academicTaskStatusMap=function academicTaskStatusMapV268(){const all=academicTaskRawMap();const raw=all[String(academicSession?.user_id||'anonymous')]||{};const out={};Object.entries(raw).forEach(([id,value])=>out[id]=value===true?'entregada':value===false?'pendiente':String(value||'pendiente'));return out};
academicTaskIsDone=function academicTaskIsDoneV268(postId){return academicTaskStatusMap()[postId]==='entregada'};
function academicTaskQueue(){try{return JSON.parse(localStorage.getItem(ACADEMIC_TASK_QUEUE_STORAGE)||'[]')}catch{return []}}
function academicQueueTaskProgress(postId,status){const queue=academicTaskQueue().filter(x=>x.post_id!==postId);queue.push({post_id:postId,status,at:Date.now()});localStorage.setItem(ACADEMIC_TASK_QUEUE_STORAGE,JSON.stringify(queue))}
async function academicSyncTaskProgress(){
  if(!academicSession||!onlineConfigured()||!navigator.onLine||academicIsTestSession())return;
  try{const rows=await academicRPC('academic_get_task_progress',{p_token:academicSession.session_token});const mine=academicTaskStatusMap();(rows||[]).forEach(row=>mine[row.post_id]=row.status);academicSaveTaskMap(mine)}catch(error){if(!academicIsNetworkError(error))console.warn(error)}
}
async function flushAcademicTaskQueue(){
  if(!academicSession||!onlineConfigured()||!navigator.onLine||academicIsTestSession())return;const queue=academicTaskQueue();if(!queue.length)return;const pending=[];
  for(const row of queue){try{await academicRPC('academic_set_task_progress',{p_token:academicSession.session_token,p_post_id:row.post_id,p_status:row.status})}catch(error){pending.push(row)}}
  localStorage.setItem(ACADEMIC_TASK_QUEUE_STORAGE,JSON.stringify(pending));
}
toggleAcademicTask=async function toggleAcademicTaskV268(postId){
  const mine=academicTaskStatusMap();const next=mine[postId]==='entregada'?'pendiente':'entregada';mine[postId]=next;academicSaveTaskMap(mine);loadAcademicPosts();toast(next==='entregada'?'Tarea marcada como entregada':'Tarea marcada como pendiente');
  if(onlineConfigured()&&!academicIsTestSession()){
    if(navigator.onLine){try{await academicRPC('academic_set_task_progress',{p_token:academicSession.session_token,p_post_id:postId,p_status:next});return}catch(error){console.warn(error)}}
    academicQueueTaskProgress(postId,next);
  }
};

function academicTaskState(post){
  const fields=post.fields||{},explicit=normalize(fields.status||fields.estado||'');if(academicTaskIsDone(post.id)||/entregada|cumplida|completada/.test(explicit))return 'entregada';if(/finalizada|cancelada|archivada/.test(explicit))return 'finalizada';const diff=academicDayDifference(academicDateOnly(post));if(diff!==null&&diff<0)return 'vencida';if(diff!==null&&diff<=2)return 'urgente';return 'pendiente';
}
function academicTaskStateLabel(state){return ({pendiente:'Pendiente',urgente:'Urgente',entregada:'Entregada',vencida:'Vencida',finalizada:'Finalizada'})[state]||'Pendiente'}
function academicTaskPending(post){return ['pendiente','urgente'].includes(academicTaskState(post))}
academicFilterOptions=function academicFilterOptionsV268(tab){return ({formaciones:[['next','Próximas'],['current','Vigentes'],['previous','Anteriores'],['all','Todas']],tareas:[['pending','Pendientes'],['urgent','Urgentes'],['completed','Entregadas'],['expired','Vencidas'],['all','Todas']],examenes:[['upcoming','Próximos'],['past','Realizados'],['all','Todos']],resumenes:[['recent','Recientes'],['file','Con archivo'],['text','Solo texto'],['all','Todos']]})[tab]||[['all','Todos']]};
academicPostMatchesFilter=function academicPostMatchesFilterV268(post){
  if(ACADEMIC_TYPES[academicTab]&&post.post_type!==academicTab)return false;const date=academicDateOnly(post),diff=academicDayDifference(date);
  if(academicTab==='formaciones'){if(academicFilter==='next')return diff!==null&&diff>=0;if(academicFilter==='current')return diff!==null&&diff>=0&&diff<=7;if(academicFilter==='previous')return diff!==null&&diff<0}
  if(academicTab==='tareas'){const state=academicTaskState(post);if(academicFilter==='pending')return ['pendiente','urgente'].includes(state);if(academicFilter==='urgent')return state==='urgente';if(academicFilter==='completed')return state==='entregada';if(academicFilter==='expired')return state==='vencida'}
  if(academicTab==='examenes'){if(academicFilter==='upcoming')return diff!==null&&diff>=0;if(academicFilter==='past')return diff!==null&&diff<0}
  if(academicTab==='resumenes'){if(academicFilter==='recent'){const createdDiff=academicDayDifference(String(post.created_at||'').slice(0,10));return createdDiff!==null&&createdDiff>=-14}if(academicFilter==='file')return Boolean(post.file_url);if(academicFilter==='text')return Boolean(post.body)&&!post.file_url}
  return true;
};
function academicSubjectKey(subject){return normalize(subject||'sin materia').replace(/[^a-z0-9]+/g,'-')||'sin-materia'}
function toggleAcademicSubjectGroup(key){academicSubjectExpanded.has(key)?academicSubjectExpanded.delete(key):academicSubjectExpanded.add(key);loadAcademicPosts()}
academicGroupedPosts=function academicGroupedPostsV268(posts){
  if(academicTab!=='tareas'){
    const groups=new Map();posts.forEach(post=>{const subject=academicSubjectName(post);if(!groups.has(subject))groups.set(subject,[]);groups.get(subject).push(post)});return [...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0],'es')).map(([subject,items])=>`<section class="academic-subject-group subject-coded" ${subjectStyleAttr(subject)}><header><div><h3>${esc(subject)}</h3><small>${items.length} publicación${items.length===1?'':'es'}</small></div></header><div class="academic-subject-posts">${items.map(academicPostCard).join('')}</div></section>`).join('');
  }
  const groups=new Map();const subjects=[...new Set([...scheduleSubjects(),...posts.map(academicSubjectName)])].sort((a,b)=>a.localeCompare(b,'es'));posts.forEach(post=>{const subject=academicSubjectName(post);if(!groups.has(subject))groups.set(subject,[]);groups.get(subject).push(post)});
  if(subjects.length&&!academicSubjectExpanded.size){const firstWithPending=subjects.find(subject=>(groups.get(subject)||[]).some(academicTaskPending));const firstWithItems=firstWithPending||subjects.find(subject=>(groups.get(subject)||[]).length)||subjects[0];academicSubjectExpanded.add(academicSubjectKey(firstWithItems))}
  return subjects.map(subject=>{const items=(groups.get(subject)||[]).sort(academicPostSort),key=academicSubjectKey(subject),open=academicSubjectExpanded.has(key),pending=items.filter(academicTaskPending).length,delivered=items.filter(p=>academicTaskState(p)==='entregada').length,expired=items.filter(p=>academicTaskState(p)==='vencida').length,teacher=teacherForSubject(subject)||'Docente no consignado';
    return `<section class="academic-subject-card subject-coded ${open?'open':''}" ${subjectStyleAttr(subject)}><button class="academic-subject-toggle" onclick="toggleAcademicSubjectGroup('${key}')" aria-expanded="${open}"><span class="subject-color-dot"></span><span class="subject-card-copy"><b>${esc(subject)}</b><small>${esc(teacher)}</small></span><span class="subject-count ${pending?'has-pending':'empty'}">${pending?`${pending} pendiente${pending===1?'':'s'}`:'Sin tareas'}</span><span class="subject-chevron">⌄</span></button>${open?`<div class="academic-subject-summary"><span>${items.length} total</span><span>${delivered} entregada${delivered===1?'':'s'}</span><span>${expired} vencida${expired===1?'':'s'}</span></div><div class="academic-subject-posts">${items.length?items.map(academicPostCard).join(''):'<div class="subject-empty-state">No existen tareas publicadas para esta materia.</div>'}</div>`:''}</section>`}).join('');
};

academicPostCard=function academicPostCardV268(post){
  const fields=post.fields||{},subject=fields.subject||'',visual=subjectStyleAttr(subject||post.title||post.post_type),date=academicDateOnly(post);let meta='',status='';
  if(post.post_type==='formaciones'){const diff=academicDayDifference(date);meta=`<div class="formation-meta"><span>Fecha: ${esc(fields.date||'Sin fecha')}</span><span>Lugar: ${esc(fields.place||'Sin lugar')}</span><span>Control: ${esc(fields.control_time||'-')}</span><span>Parte: ${esc(fields.report_time||'-')}</span></div>${fields.uniform?`<p><b>Uniforme:</b> ${esc(fields.uniform)}</p>`:''}${fields.observations?`<p><b>Observaciones:</b> ${esc(fields.observations)}</p>`:''}`;status=diff===0?'<span class="academic-status urgent">Hoy</span>':diff!==null&&diff>0?'<span class="academic-status upcoming">Próxima</span>':'<span class="academic-status neutral">Concluida</span>'}
  if(post.post_type==='resumenes'){meta=`<p><b>Materia:</b> ${esc(subject)} · <b>Tema:</b> ${esc(fields.topic||'')}</p>`;status=post.file_url?'<span class="academic-status file">Con archivo</span>':'<span class="academic-status neutral">Texto</span>'}
  if(post.post_type==='tareas'){const taskState=academicTaskState(post);meta=`<p><b>Materia:</b> ${esc(subject||'Sin materia')} · <b>Entrega:</b> ${esc(fields.due_date||'Sin fecha')}</p>${fields.teacher?`<p><b>Docente:</b> ${esc(fields.teacher)}</p>`:''}`;status=`<span class="academic-status ${taskState}">${academicTaskStateLabel(taskState)}</span>`}
  if(post.post_type==='examenes'){const diff=academicDayDifference(date);meta=`<p><b>Materia:</b> ${esc(subject)} · <b>Fecha:</b> ${esc(fields.date||'')} ${esc(fields.time||'')} · <b>Lugar:</b> ${esc(fields.place||'')}</p>`;status=diff!==null&&diff>=0?'<span class="academic-status exam">Próximo</span>':'<span class="academic-status neutral">Realizado</span>'}
  const taskAction=post.post_type==='tareas'?`<button class="academic-task-toggle ${academicTaskState(post)==='entregada'?'done':''}" onclick="toggleAcademicTask('${esc(post.id)}')">${academicTaskState(post)==='entregada'?'✓ Entregada':'Marcar entregada'}</button>`:'';
  return `<article class="card academic-post subject-coded" ${visual}><div class="row between"><span class="tag">${esc(ACADEMIC_TYPES[post.post_type]?.label||post.post_type)}</span>${status}</div><h3>${esc(post.title||'Publicación académica')}</h3>${meta}${post.body?`<p class="academic-post-body">${esc(post.body)}</p>`:''}${post.file_url?`<a class="academic-file-link" href="${esc(post.file_url)}" target="_blank" rel="noopener">Abrir archivo adjunto</a>`:''}<div class="academic-post-footer"><small>${esc(post.author_name||'')}</small>${taskAction}</div></article>`;
};

loadAcademicPosts=async function loadAcademicPostsV268(){
  const box=$('#academicPosts');if(!box||!academicSession||!ACADEMIC_TYPES[academicTab])return;
  try{if(academicTab==='tareas'){await flushAcademicTaskQueue();await academicSyncTaskProgress()}const rows=await academicFetchPosts(academicTab);const posts=rows.filter(academicPostMatchesFilter).sort(academicPostSort);
    if(academicViewMode==='subject'&&['tareas','examenes','resumenes'].includes(academicTab)){box.innerHTML=academicGroupedPosts(posts);return}
    box.innerHTML=posts.length?posts.map(academicPostCard).join(''):'<div class="card small empty-online"><p>No existen publicaciones con este filtro.</p></div>';
  }catch(error){console.error(error);const cached=academicCachedPosts(academicTab);box.innerHTML=cached.length?cached.filter(academicPostMatchesFilter).sort(academicPostSort).map(academicPostCard).join(''):'<div class="card small warn-card"><p>No fue posible sincronizar y todavía no hay contenido guardado en este dispositivo.</p></div>'}
};

academicModuleView=function academicModuleViewV268(){
  const info=ACADEMIC_TYPES[academicTab];const taskIntro=academicTab==='tareas'?'<p class="module-guidance">Cambie entre la vista general y la vista por materia. Los estados y contadores se actualizan con las tareas reales.</p>':'';
  return `${academicProfileHeader()}${academicTextNav()}<div class="online-module-head refined clean-module-head"><div><div><span class="eyebrow">Módulo académico</span><h3>${info.label}</h3><p>${info.help}</p></div></div>${academicCanPublish()?`<button class="btn academic-main-btn" onclick="openAcademicPostForm('${academicTab}')">Nueva publicación</button>`:''}</div>${taskIntro}${academicFilterBar()}<div id="academicPosts"><div class="card small"><p>Cargando contenido…</p></div></div>`;
};

function academicGroupedTimeline(posts){
  const groups=new Map();posts.forEach(p=>{const date=academicDateOnly(p)||'sin-fecha';if(!groups.has(date))groups.set(date,[]);groups.get(date).push(p)});
  return [...groups.entries()].map(([date,items],i)=>`<section class="online-day-group tone-${i%2}"><header>${date==='sin-fecha'?'SIN FECHA':esc(agendaDayTitle(date))}</header><div>${items.map(academicEventRow).join('')}</div></section>`).join('');
}
loadAcademicDashboard=async function loadAcademicDashboardV268(){
  if(!academicSession||academicTab!=='panel')return;
  try{await flushAcademicTaskQueue();await academicSyncTaskProgress();const posts=await academicFetchPosts();if(academicTab!=='panel')return;const today=todayISO(),formations=posts.filter(p=>p.post_type==='formaciones'),tasks=posts.filter(p=>p.post_type==='tareas'),exams=posts.filter(p=>p.post_type==='examenes'),summaries=posts.filter(p=>p.post_type==='resumenes'),future=p=>academicDateOnly(p)&&academicDateOnly(p)>=today,byDate=(a,b)=>(academicDateObject(a)?.getTime()||Infinity)-(academicDateObject(b)?.getTime()||Infinity),nextFormation=formations.filter(future).sort(byDate)[0],pendingTasks=tasks.filter(academicTaskPending),nextExam=exams.filter(future).sort(byDate)[0],recentSummaries=summaries.filter(p=>{const diff=academicDayDifference(String(p.created_at||'').slice(0,10));return diff!==null&&diff>=-7});
    const summary=$('#academicSummaryGrid');if(summary)summary.innerHTML=[academicDashboardSummaryCard('',nextFormation?academicDateLabel(nextFormation):'—','Próxima formación',nextFormation?.title||'Sin publicación','formaciones','formation-tone'),academicDashboardSummaryCard('',pendingTasks.length,'Tareas pendientes',pendingTasks.length?'Revisar entregas':'Sin pendientes','tareas',pendingTasks.length?'task-tone':''),academicDashboardSummaryCard('',nextExam?academicDateLabel(nextExam):'—','Próximo examen',nextExam?.title||'Sin cronograma','examenes','exam-tone'),academicDashboardSummaryCard('',recentSummaries.length,'Resúmenes nuevos',recentSummaries.length?'Últimos 7 días':'Sin novedades','resumenes','summary-tone')].join('');
    const todayItems=posts.filter(p=>academicDateOnly(p)===today),todayText=$('#academicTodayText');if(todayText)todayText.textContent=todayItems.length?`${todayItems.length} actividad${todayItems.length===1?'':'es'} programada${todayItems.length===1?'':'s'} para hoy.`:'No hay actividad registrada para hoy. Revise los próximos días.';
    const upcoming=posts.filter(p=>['formaciones','tareas','examenes'].includes(p.post_type)&&future(p)).sort(byDate).slice(0,8),upcomingBox=$('#academicUpcomingList');if(upcomingBox)upcomingBox.innerHTML=upcoming.length?academicGroupedTimeline(upcoming):'<div class="empty-academic-line"><p>No hay actividades próximas registradas.</p></div>';
    const recent=[...posts].sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||''))).slice(0,5),recentBox=$('#academicRecentList');if(recentBox)recentBox.innerHTML=recent.length?recent.map(post=>`<button class="academic-recent-row subject-coded" ${subjectStyleAttr(academicSubjectName(post))} onclick="setAcademicTab('${post.post_type}')"><span><b>${esc(post.title||academicEventKind(post))}</b><small>${esc(academicEventKind(post))} · ${esc(post.author_name||'Curso')}</small></span><time>${esc(String(post.created_at||'').slice(0,10)?fmtDate(String(post.created_at||'').slice(0,10)):'')}</time></button>`).join(''):'<div class="empty-academic-line"><p>Todavía no existen publicaciones.</p></div>';
  }catch(error){console.error(error);const upcomingBox=$('#academicUpcomingList');if(upcomingBox)upcomingBox.innerHTML='<div class="empty-academic-line warning"><p>Sin conexión. Se conservará la sesión y se reintentará automáticamente.</p></div>'}
};

window.addEventListener('online',()=>{flushAcademicTaskQueue().then(()=>{if(state?.view==='online'&&academicSession){validateAcademicLocalSession().then(()=>render())}})});


/* =========================================================
   Agenda Policial Online v2.6.9 — sesión estable
   ========================================================= */
validateAcademicLocalSession=async function validateAcademicSessionV269(){
  if(!academicSession)return;
  if(onlineConfigured()){
    if(!academicRemoteTokenIsValid(academicSession.session_token)){academicSession=null;localStorage.removeItem(ACADEMIC_SESSION_STORAGE);return}
    if(!navigator.onLine){academicSession.offline_cached=true;localStorage.setItem(ACADEMIC_SESSION_STORAGE,JSON.stringify(academicSession));return}
    try{
      const refreshed=await academicRPC('academic_refresh_session',{p_token:String(academicSession.session_token)}),user=Array.isArray(refreshed)?refreshed[0]:refreshed;
      if(!user?.session_token||user.module_enabled===false){academicSession=null;localStorage.removeItem(ACADEMIC_SESSION_STORAGE);return}
      academicSession={...academicSession,...user,offline_cached:false,sync_error:false,last_validated_at:new Date().toISOString()};localStorage.setItem(ACADEMIC_SESSION_STORAGE,JSON.stringify(academicSession));return;
    }catch(error){
      console.warn('No se pudo renovar la sesión; se conserva localmente:',error);
      academicSession.offline_cached=true;academicSession.sync_error=true;localStorage.setItem(ACADEMIC_SESSION_STORAGE,JSON.stringify(academicSession));return;
    }
  }
  if(!String(academicSession.session_token||'').startsWith('local:')){academicSession=null;localStorage.removeItem(ACADEMIC_SESSION_STORAGE);return}
  const users=await academicLocalUsers(),user=users.find(item=>String(item.id)===String(academicSession.user_id));
  if(!user?.active){academicSession=null;localStorage.removeItem(ACADEMIC_SESSION_STORAGE);return}
  academicSession.full_name=user.full_name;academicSession.role=user.role;localStorage.setItem(ACADEMIC_SESSION_STORAGE,JSON.stringify(academicSession));
};
academicLogin=async function academicLoginV269(){
  const ci=$('#academicCi')?.value.trim(),phone=$('#academicPhone')?.value.trim();if(!ci||!phone)return toast('Ingrese usuario y contraseña');
  try{
    let user=onlineConfigured()?await academicRPC('academic_login',{p_ci:ci,p_phone:phone}):await academicLocalLogin(ci,phone);if(Array.isArray(user))user=user[0];
    if(!user?.session_token)return toast('Usuario o contraseña incorrectos, o acceso inactivo');
    academicSession={...user,offline_cached:false,sync_error:false,last_validated_at:new Date().toISOString()};academicTab='panel';localStorage.setItem(ACADEMIC_SESSION_STORAGE,JSON.stringify(academicSession));toast('Acceso académico habilitado');render();setTimeout(()=>{if(academicTab==='panel')loadAcademicDashboard()},0);
  }catch(error){console.error(error);toast(academicIsNetworkError(error)?'Sin conexión. Intente nuevamente cuando tenga internet':'No fue posible validar las credenciales')}
};

/* =========================================================
   Agenda Policial Online v2.7.0 — resúmenes con múltiples archivos y panel pulido
   ========================================================= */
ACADEMIC_TYPES.resumenes.label = 'Resúmenes y material académico';
ACADEMIC_TYPES.resumenes.help = 'Materia, tema, descripción y uno o varios archivos de apoyo.';

function academicNormalizeAttachments(list) {
  return Array.isArray(list)
    ? list.filter(item => item && (item.url || item.file_url)).map(item => ({
        url: item.url || item.file_url,
        name: item.name || item.file_name || academicFileName(item.url || item.file_url),
        type: item.type || item.file_mime || '',
        size: item.size || item.file_size || 0
      }))
    : [];
}

function academicPostAttachments(post) {
  const fields = post?.fields || {};
  const attachments = academicNormalizeAttachments(fields.attachments);
  if (attachments.length) return attachments;
  if (post?.file_url) {
    return [{
      url: post.file_url,
      name: post.file_name || academicFileName(post.file_url),
      type: post.file_mime || '',
      size: post.file_size || 0
    }];
  }
  return [];
}

function academicAttachmentLinks(post) {
  const attachments = academicPostAttachments(post);
  if (!attachments.length) return '';
  return `
    <div class="academic-attachments">
      ${attachments.map((file, index) => `
        <a class="academic-file-link multi" href="${esc(file.url)}" target="_blank" rel="noopener">
          <span class="file-index">${index + 1}</span>
          <span class="file-copy">
            <b>${esc(file.name || 'Archivo adjunto')}</b>
            <small>${esc(file.type ? file.type.replace(/^application\//,'').replace(/^image\//,'imagen/') : 'Archivo')}</small>
          </span>
          <span class="file-arrow">↗</span>
        </a>
      `).join('')}
    </div>
  `;
}

async function uploadAcademicFiles(files) {
  const entries = [];
  for (const file of Array.from(files || [])) {
    const url = await uploadAcademicFile(file);
    entries.push({
      url,
      name: file.name || 'archivo',
      type: file.type || '',
      size: file.size || 0
    });
  }
  return entries;
}

openAcademicPostForm = function openAcademicPostFormV270(type) {
  const labels = ACADEMIC_TYPES[type];
  if (!labels || !academicCanPublish()) return toast('No tiene permiso para publicar');

  let fields = '';
  let fileLabel = 'Archivo opcional';
  let fileHelp = 'Puede adjuntar Word, PDF o imagen.';

  if (type === 'formaciones') {
    fields = `
      <label>Tipo
        <select name="formation_type" required>
          <option>Formación general</option>
          <option>Servicio extraordinario</option>
        </select>
      </label>
      <div class="two-col">
        <label>Fecha<input name="date" type="date" required value="${todayISO()}"></label>
        <label>Lugar<input name="place" required></label>
      </div>
      <div class="two-col">
        <label>Hora de control<input name="control_time" type="time" required></label>
        <label>Hora del parte<input name="report_time" type="time" required></label>
      </div>
      <label>Uniforme<input name="uniform" required></label>
      <label>Texto del comunicado<textarea name="body" rows="7" required></textarea></label>
      <label>Observaciones<textarea name="observations" rows="3"></textarea></label>
    `;
  } else if (type === 'resumenes') {
    fileLabel = 'Archivos académicos';
    fileHelp = 'Puede seleccionar uno o varios archivos Word, PDF o imagen dentro de la misma publicación.';
    fields = `
      <label>Materia<input name="subject" required></label>
      <label>Tema<input name="topic" required></label>
      <label>Descripción del contenido<textarea name="body" rows="7" placeholder="Detalle breve del resumen, contenido académico o lista de documentos."></textarea></label>
    `;
  } else if (type === 'tareas') {
    fields = `
      <label>Materia<input name="subject" required></label>
      <label>Título<input name="title" required></label>
      <label>Fecha límite<input name="due_date" type="date" required></label>
      <label>Instrucciones<textarea name="body" rows="8" required></textarea></label>
    `;
  } else {
    fields = `
      <label>Materia<input name="subject" required></label>
      <label>Título del examen<input name="title" required></label>
      <div class="two-col">
        <label>Fecha<input name="date" type="date" required></label>
        <label>Hora<input name="time" type="time" required></label>
      </div>
      <label>Lugar<input name="place"></label>
      <label>Comunicado o temario<textarea name="body" rows="7"></textarea></label>
    `;
  }

  showModal(`
    <button class="icon-btn close" onclick="closeModal()">×</button>
    <h2>Nueva publicación · ${labels.label}</h2>
    <form id="academicPostForm" class="form">
      ${fields}
      <label>${fileLabel}
        <input id="academicFiles" type="file" ${type === 'resumenes' ? 'multiple' : ''} accept=".doc,.docx,.pdf,image/*">
      </label>
      <p class="subtle">${fileHelp}</p>
      ${!onlineConfigured() ? '<p class="subtle">En la prueba local los archivos deben ser pequeños. Con Supabase se guardarán en el almacenamiento online.</p>' : ''}
      <div id="academicSelectedFiles" class="selected-files-note"></div>
      <div class="form-actions">
        <button class="btn academic-main-btn" type="submit">Publicar</button>
        <button class="btn secondary" type="button" onclick="closeModal()">Cancelar</button>
      </div>
    </form>
  `);
  const input = $('#academicFiles');
  const preview = $('#academicSelectedFiles');
  if (input && preview) {
    input.addEventListener('change', () => {
      const files = Array.from(input.files || []);
      preview.innerHTML = files.length
        ? `<div class="selected-files-list">${files.map(file => `<span>${esc(file.name)}</span>`).join('')}</div>`
        : '';
    });
  }
  $('#academicPostForm').onsubmit = event => saveAcademicPost(event, type);
};

saveAcademicPost = async function saveAcademicPostV270(event, type) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const values = Object.fromEntries(formData.entries());
  let title = values.title || '';
  const body = values.body || '';
  delete values.title;
  delete values.body;

  if (type === 'formaciones') title = `${values.formation_type || 'Formación'} · ${values.date || 'sin fecha'}`;
  if (type === 'resumenes') title = `${values.subject || 'Resumen'} — ${values.topic || 'Tema'}`;

  try {
    const files = Array.from($('#academicFiles')?.files || []);
    if (type !== 'resumenes' && files.length > 1) {
      return toast('En este módulo solo se permite un archivo por publicación');
    }
    const attachments = await uploadAcademicFiles(files);
    const primary = attachments[0] || null;
    const payloadFields = { ...values };
    if (attachments.length) payloadFields.attachments = attachments;

    if (onlineConfigured()) {
      await academicRPC('academic_create_post', {
        p_token: academicSession.session_token,
        p_type: type,
        p_title: title,
        p_body: body,
        p_fields: payloadFields,
        p_file_url: primary?.url || null,
        p_file_name: primary?.name || null,
        p_file_mime: primary?.type || null,
        p_file_size: primary?.size || null
      });
    } else {
      const posts = academicLocalPosts();
      posts.unshift({
        id: uid(),
        post_type: type,
        title,
        body,
        fields: payloadFields,
        file_url: primary?.url || null,
        file_name: primary?.name || null,
        file_mime: primary?.type || null,
        file_size: primary?.size || null,
        author_name: academicSession.full_name,
        created_at: new Date().toISOString(),
        archived: false
      });
      academicSaveLocalPosts(posts);
    }
    closeModal();
    await loadAcademicPosts();
    if (academicTab === 'panel') await loadAcademicDashboard();
    toast('Publicación guardada');
  } catch (error) {
    console.error(error);
    toast(error.message || 'No se pudo guardar la publicación');
  }
};

academicFilterOptions = function academicFilterOptionsV270(tab) {
  return ({
    formaciones: [['next','Próximas'],['current','Vigentes'],['previous','Anteriores'],['all','Todas']],
    tareas: [['pending','Pendientes'],['urgent','Urgentes'],['completed','Completadas'],['all','Todas']],
    examenes: [['upcoming','Próximos'],['past','Realizados'],['all','Todos']],
    resumenes: [['recent','Recientes'],['file','Con archivos'],['text','Solo texto'],['all','Todos']]
  })[tab] || [['all','Todos']];
};

academicPostMatchesFilter = function academicPostMatchesFilterV270(post) {
  if (ACADEMIC_TYPES[academicTab] && post.post_type !== academicTab) return false;
  const date = academicDateOnly(post), diff = academicDayDifference(date);
  if (academicTab === 'formaciones') { if (academicFilter === 'next') return diff !== null && diff >= 0; if (academicFilter === 'current') return diff !== null && diff >= 0 && diff <= 7; if (academicFilter === 'previous') return diff !== null && diff < 0; }
  if (academicTab === 'tareas') { const state = academicTaskState(post); if (academicFilter === 'pending') return ['pendiente','urgente'].includes(state); if (academicFilter === 'urgent') return state === 'urgente'; if (academicFilter === 'completed') return state === 'entregada'; if (academicFilter === 'expired') return state === 'vencida'; }
  if (academicTab === 'examenes') { if (academicFilter === 'upcoming') return diff !== null && diff >= 0; if (academicFilter === 'past') return diff !== null && diff < 0; }
  if (academicTab === 'resumenes') {
    const attachments = academicPostAttachments(post);
    if (academicFilter === 'recent') { const createdDiff = academicDayDifference(String(post.created_at || '').slice(0,10)); return createdDiff !== null && createdDiff >= -14; }
    if (academicFilter === 'file') return attachments.length > 0;
    if (academicFilter === 'text') return Boolean(post.body) && attachments.length === 0;
  }
  return true;
};

academicPostCard = function academicPostCardV270(post) {
  const fields = post.fields || {};
  const subject = fields.subject || '';
  const visual = subjectStyleAttr(subject || post.title || post.post_type);
  const date = academicDateOnly(post);
  const attachments = academicPostAttachments(post);
  let meta = '', status = '';
  if (post.post_type === 'formaciones') {
    const diff = academicDayDifference(date);
    meta = `<div class="formation-meta"><span>Fecha: ${esc(fields.date || 'Sin fecha')}</span><span>Lugar: ${esc(fields.place || 'Sin lugar')}</span><span>Control: ${esc(fields.control_time || '-')}</span><span>Parte: ${esc(fields.report_time || '-')}</span></div>${fields.uniform ? `<p><b>Uniforme:</b> ${esc(fields.uniform)}</p>` : ''}${fields.observations ? `<p><b>Observaciones:</b> ${esc(fields.observations)}</p>` : ''}`;
    status = diff === 0 ? '<span class="academic-status urgent">Hoy</span>' : diff !== null && diff > 0 ? '<span class="academic-status upcoming">Próxima</span>' : '<span class="academic-status neutral">Concluida</span>';
  }
  if (post.post_type === 'resumenes') {
    meta = `<p><b>Materia:</b> ${esc(subject || 'Sin materia')} · <b>Tema:</b> ${esc(fields.topic || '')}</p>`;
    status = attachments.length ? `<span class="academic-status file">${attachments.length} archivo${attachments.length === 1 ? '' : 's'}</span>` : '<span class="academic-status neutral">Solo texto</span>';
  }
  if (post.post_type === 'tareas') {
    const taskState = academicTaskState(post);
    meta = `<p><b>Materia:</b> ${esc(subject || 'Sin materia')} · <b>Entrega:</b> ${esc(fields.due_date || 'Sin fecha')}</p>${fields.teacher ? `<p><b>Docente:</b> ${esc(fields.teacher)}</p>` : ''}`;
    status = `<span class="academic-status ${taskState}">${academicTaskStateLabel(taskState)}</span>`;
  }
  if (post.post_type === 'examenes') {
    const diff = academicDayDifference(date);
    meta = `<p><b>Materia:</b> ${esc(subject || 'Sin materia')} · <b>Fecha:</b> ${esc(fields.date || '')} ${esc(fields.time || '')} · <b>Lugar:</b> ${esc(fields.place || '')}</p>`;
    status = diff !== null && diff >= 0 ? '<span class="academic-status exam">Próximo</span>' : '<span class="academic-status neutral">Realizado</span>';
  }
  const taskAction = post.post_type === 'tareas'
    ? `<button class="academic-task-toggle ${academicTaskState(post) === 'entregada' ? 'done' : ''}" onclick="toggleAcademicTask('${esc(post.id)}')">${academicTaskState(post) === 'entregada' ? '✓ Entregada' : 'Marcar entregada'}</button>`
    : '';
  return `<article class="card academic-post subject-coded" ${visual}><div class="row between"><span class="tag">${esc(ACADEMIC_TYPES[post.post_type]?.label || post.post_type)}</span>${status}</div><h3>${esc(post.title || 'Publicación académica')}</h3>${meta}${post.body ? `<p class="academic-post-body">${esc(post.body)}</p>` : ''}${academicAttachmentLinks(post)}<div class="academic-post-footer"><small>${esc(post.author_name || '')}</small>${taskAction}</div></article>`;
};

function academicQuickModules() {
  const items = [
    { key: 'formaciones', label: 'Formaciones', desc: 'Comunicados, lugar y horas', icon: '🛡️', tone: 'formation' },
    { key: 'tareas', label: 'Tareas', desc: 'Pendientes por materia', icon: '📘', tone: 'tasks' },
    { key: 'examenes', label: 'Exámenes', desc: 'Cronograma y avisos', icon: '📝', tone: 'exams' },
    { key: 'resumenes', label: 'Resúmenes y material académico', desc: 'Archivos y contenidos de estudio', icon: '📚', tone: 'summaries' }
  ];
  if (academicCanManageUsers()) items.push({ key: 'usuarios', label: 'Roles', desc: 'Integrantes y funciones', icon: '👥', tone: 'roles' });
  return `<section class="academic-shortcuts-panel"><div class="online-section-heading compact"><div><span class="eyebrow">Acceso directo</span><h3>Módulos académicos</h3></div></div><div class="academic-shortcuts-grid">${items.map(item => `<button class="academic-shortcut-card ${item.tone}" onclick="setAcademicTab('${item.key}')"><span class="shortcut-icon">${item.icon}</span><span class="shortcut-copy"><b>${item.label}</b><small>${item.desc}</small></span><span class="shortcut-arrow">›</span></button>`).join('')}</div></section>`;
}

academicTextNav = function academicTextNavV270() {
  return `
    <nav class="academic-text-nav academic-text-nav-polished" aria-label="Secciones académicas">
      <button class="${academicTab === 'panel' ? 'active' : ''}" onclick="setAcademicTab('panel')">Panel</button>
      <button class="${academicTab === 'formaciones' ? 'active' : ''}" onclick="setAcademicTab('formaciones')">Formaciones</button>
      <button class="${academicTab === 'tareas' ? 'active' : ''}" onclick="setAcademicTab('tareas')">Tareas</button>
      <button class="${academicTab === 'examenes' ? 'active' : ''}" onclick="setAcademicTab('examenes')">Exámenes</button>
      <button class="${academicTab === 'resumenes' ? 'active' : ''}" onclick="setAcademicTab('resumenes')">Material académico</button>
      ${academicCanManageUsers() ? `<button class="${academicTab === 'usuarios' ? 'active' : ''}" onclick="setAcademicTab('usuarios')">Roles</button>` : ''}
    </nav>
  `;
};
academicSubnav = function academicSubnavV270() { return academicTextNav(); };

academicDashboard = function academicDashboardV270() {
  return `
    ${academicProfileHeader()}
    ${academicTextNav()}
    <section class="academic-welcome clean-welcome">
      <div><span class="eyebrow">${academicGreeting()}</span><h2>Panel académico</h2><p id="academicTodayText">Revisando la actividad de hoy…</p></div>
    </section>
    <div class="academic-summary-grid" id="academicSummaryGrid">
      ${['Formación','Tareas','Examen','Material'].map(label => `<div class="academic-summary-card loading"><strong>—</strong><b>${label}</b><small>Cargando…</small></div>`).join('')}
    </div>
    ${academicQuickModules()}
    <section class="academic-today-card">
      <div class="online-section-heading compact"><div><span class="eyebrow">Información prioritaria</span><h3>Hoy y próximos días</h3></div></div>
      <div id="academicUpcomingList" class="academic-timeline"><div class="academic-loading-line"></div></div>
    </section>
    <section class="academic-recent-card">
      <div class="online-section-heading compact"><div><span class="eyebrow">Actualizaciones</span><h3>Actividad reciente</h3></div>${academicCanPublish() ? `<button class="text-btn" onclick="openAcademicPublishMenu()">Publicar</button>` : ''}</div>
      <div id="academicRecentList"><div class="academic-loading-line"></div></div>
    </section>
  `;
};

function academicRecentRow(post) {
  const kind = academicEventKind(post);
  const subject = academicSubjectName(post);
  const created = String(post.created_at || '').slice(0,10);
  return `
    <button class="academic-recent-row polished subject-coded" ${subjectStyleAttr(subject)} onclick="setAcademicTab('${post.post_type}')">
      <div class="recent-main">
        <span class="recent-label">${esc(kind)}</span>
        <b>${esc(post.title || kind)}</b>
        <small>${esc(subject)} · ${esc(post.author_name || 'Curso')}</small>
      </div>
      <time>${esc(created ? fmtDate(created) : '')}</time>
    </button>
  `;
}

loadAcademicDashboard = async function loadAcademicDashboardV270() {
  if (!academicSession || academicTab !== 'panel') return;
  try {
    await flushAcademicTaskQueue();
    await academicSyncTaskProgress();
    const posts = await academicFetchPosts();
    if (academicTab !== 'panel') return;
    const today = todayISO();
    const formations = posts.filter(p => p.post_type === 'formaciones');
    const tasks = posts.filter(p => p.post_type === 'tareas');
    const exams = posts.filter(p => p.post_type === 'examenes');
    const summaries = posts.filter(p => p.post_type === 'resumenes');
    const future = p => academicDateOnly(p) && academicDateOnly(p) >= today;
    const byDate = (a,b) => (academicDateObject(a)?.getTime() || Infinity) - (academicDateObject(b)?.getTime() || Infinity);
    const nextFormation = formations.filter(future).sort(byDate)[0];
    const pendingTasks = tasks.filter(academicTaskPending);
    const nextExam = exams.filter(future).sort(byDate)[0];
    const recentSummaries = summaries.filter(p => {
      const diff = academicDayDifference(String(p.created_at || '').slice(0,10));
      return diff !== null && diff >= -7;
    });

    const summary = $('#academicSummaryGrid');
    if (summary) summary.innerHTML = [
      academicDashboardSummaryCard('🛡️', nextFormation ? academicDateLabel(nextFormation) : '—', 'Próxima formación', nextFormation?.title || 'Sin publicación', 'formaciones', 'formation-tone'),
      academicDashboardSummaryCard('📘', pendingTasks.length, 'Tareas pendientes', pendingTasks.length ? 'Revisar entregas' : 'Sin pendientes', 'tareas', pendingTasks.length ? 'task-tone' : ''),
      academicDashboardSummaryCard('📝', nextExam ? academicDateLabel(nextExam) : '—', 'Próximo examen', nextExam?.title || 'Sin cronograma', 'examenes', 'exam-tone'),
      academicDashboardSummaryCard('📚', recentSummaries.length, 'Material nuevo', recentSummaries.length ? 'Últimos 7 días' : 'Sin novedades', 'resumenes', 'summary-tone')
    ].join('');

    const todayItems = posts.filter(p => academicDateOnly(p) === today);
    const todayText = $('#academicTodayText');
    if (todayText) todayText.textContent = todayItems.length
      ? `${todayItems.length} actividad${todayItems.length === 1 ? '' : 'es'} programada${todayItems.length === 1 ? '' : 's'} para hoy.`
      : 'No hay actividad registrada para hoy. Revise los próximos días.';

    const upcoming = posts.filter(p => ['formaciones','tareas','examenes'].includes(p.post_type) && future(p)).sort(byDate).slice(0,8);
    const upcomingBox = $('#academicUpcomingList');
    if (upcomingBox) upcomingBox.innerHTML = upcoming.length ? academicGroupedTimeline(upcoming) : '<div class="empty-academic-line"><p>No hay actividades próximas registradas.</p></div>';

    const recent = [...posts].sort((a,b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))).slice(0,6);
    const recentBox = $('#academicRecentList');
    if (recentBox) recentBox.innerHTML = recent.length ? recent.map(academicRecentRow).join('') : '<div class="empty-academic-line"><p>Todavía no existen publicaciones.</p></div>';
  } catch (error) {
    console.error(error);
    const upcomingBox = $('#academicUpcomingList');
    if (upcomingBox) upcomingBox.innerHTML = '<div class="empty-academic-line warning"><p>Sin conexión. Se conservará la sesión y se reintentará automáticamente.</p></div>';
  }
};
