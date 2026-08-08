/* Agenda Policial Online v2.11.1 — conexión real con Supabase */
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

// v2.8: las credenciales académicas viven únicamente en Supabase.
if (onlineConfigured()) {
  try { localStorage.removeItem(ACADEMIC_USERS_STORAGE); localStorage.removeItem('agenda-demo-users'); } catch {}
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
    location.replace(`./index.html?online=1&v=${APP_VERSION}&r=${Date.now()}`);
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
    if (onlineConfigured()) {
      try {
        academicUsersCache = await academicRPC('academic_get_users_v280', { p_token: academicSession.session_token });
      } catch (error) {
        if (!/academic_get_users_v280|function.*not found|404/i.test(String(error?.message || error))) throw error;
        academicUsersCache = await academicRPC('academic_get_users', { p_token: academicSession.session_token });
      }
    } else {
      academicUsersCache = await academicLocalUsers();
    }
    renderAcademicUsers(Array.isArray(academicUsersCache) ? academicUsersCache : []);
  } catch (error) {
    console.error(error);
    list.innerHTML = '<div class="card warn-card"><p>No fue posible cargar la nómina.</p></div>';
  }
}

function academicAccessDateV280(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('es-BO', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function academicUsageStateV280(user) {
  const ready = user.access_ready !== undefined ? Boolean(user.access_ready) : Boolean(user.ci && user.phone);
  if (!ready) return { key:'pending', label:'Datos incompletos', detail:'Falta carnet o celular' };
  if (user.has_logged_in || Number(user.login_count || 0) > 0) {
    return { key:'used', label:'Ya ingresó', detail:user.last_login_at ? `Último ingreso: ${academicAccessDateV280(user.last_login_at)}` : 'Ya utilizó el panel online' };
  }
  return { key:'unused', label:'Sin ingreso', detail:'Acceso configurado · nunca ingresó' };
}

function renderAcademicUsers(users) {
  const list = $('#academicUsersList');
  const summary = $('#academicUsersSummary');
  if (!list || !summary) return;

  const total = users.length;
  const ready = users.filter(user => user.access_ready !== undefined ? user.access_ready : (user.ci && user.phone)).length;
  const used = users.filter(user => (user.has_logged_in || Number(user.login_count || 0) > 0) && (user.access_ready !== false)).length;
  const pending = users.filter(user => !(user.access_ready !== undefined ? user.access_ready : (user.ci && user.phone))).length;
  const unused = Math.max(ready - used, 0);
  const usagePct = total ? Math.round((used / total) * 100) : 0;
  summary.innerHTML = `
    <div><b>${total}</b><span>Integrantes</span></div>
    <div><b>${used} · ${usagePct}%</b><span>Ya ingresaron</span></div>
    <div><b>${unused}</b><span>Sin ingreso</span></div>
    <div><b>${pending}</b><span>Datos incompletos</span></div>
  `;

  list.innerHTML = users.length ? `
    <div class="academic-user-list">
      ${users.map(user => {
        const usage = academicUsageStateV280(user);
        const issue = user.data_status === 'revisar' ? ' · Verificar dato' : '';
        const search = normalize(`${user.full_name || ''} ${user.department || ''} ${user.ci || ''} ${usage.label}`);
        return `
          <button class="academic-user-row" data-role="${esc(user.role)}" data-usage="${usage.key}" data-search="${esc(search)}" onclick="openAcademicUserForm('${esc(user.id)}')">
            <span class="user-number">${esc(user.roster_number || '—')}</span>
            <span class="user-main">
              <b><span class="user-usage-dot ${usage.key}" title="${esc(usage.label)}" aria-label="${esc(usage.label)}"></span>${esc(user.full_name)}</b>
              <small>${esc(user.department || 'Sin departamento')} · ${esc(usage.detail)}${issue}</small>
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
    : { id:'', roster_number:'', full_name:'', department:'', ci:'', phone:'', role:'lector', active:false, access_ready:false, has_logged_in:false, login_count:0 };
  if (!user) return;

  const isSelf = String(user.id) === String(academicSession.user_id);
  const usage = academicUsageStateV280(user);
  const accessInfo = id ? `
    <div class="academic-access-detail ${usage.key}">
      <div><span class="user-usage-dot ${usage.key}"></span><b>${esc(usage.label)}</b></div>
      <small>Primer ingreso: ${esc(user.first_login_at ? academicAccessDateV280(user.first_login_at) : 'Sin registro')}</small>
      <small>Último ingreso: ${esc(user.last_login_at ? academicAccessDateV280(user.last_login_at) : 'Sin registro')}</small>
      <small>Cantidad de ingresos: ${Number(user.login_count || 0)}</small>
    </div>` : '';
  showModal(`
    <button class="icon-btn close" onclick="closeModal()">×</button>
    <h2>${id ? 'Editar integrante' : 'Agregar integrante'}</h2>
    ${accessInfo}
    <form id="academicUserForm" class="form">
      <div class="two-col">
        <label>N.º de lista<input name="roster_number" inputmode="numeric" value="${esc(user.roster_number || '')}"></label>
        <label>Departamento<input name="department" value="${esc(user.department || '')}"></label>
      </div>
      <label>Apellidos y nombres<input name="full_name" required value="${esc(user.full_name || '')}"></label>
      <div class="two-col">
        <label>Número de carnet<input name="ci" inputmode="numeric" autocomplete="off" value="${esc(user.ci || '')}"></label>
        <label>Número de celular<input name="phone" inputmode="tel" autocomplete="off" value="${esc(user.phone || '')}"></label>
      </div>
      <p class="subtle">El C.I. y celular se guardan únicamente en Supabase y se utilizan para el acceso online.</p>
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
        <button class="btn academic-main-btn" type="submit">Guardar cambios</button>
        <button class="btn secondary" type="button" onclick="closeModal()">Cancelar</button>
      </div>
    </form>
  `);
  $('#academicUserForm').onsubmit = event => saveAcademicUser(event, user.id);
}

async function saveAcademicUser(event, id) {
  event.preventDefault();
  const submit = event.submitter || event.target.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;
  const formData = new FormData(event.target);
  const data = Object.fromEntries(formData.entries());
  data.active = formData.has('active');
  data.roster_number = data.roster_number ? Number(data.roster_number) : null;
  data.ci = academicCredential(data.ci || '');
  data.phone = academicCredential(data.phone || '');
  if (!String(data.full_name || '').trim()) { if (submit) submit.disabled=false; return toast('Ingrese apellidos y nombres'); }
  if (data.ci && data.ci.length < 4) { if (submit) submit.disabled=false; return toast('Revise el número de carnet'); }
  if (data.phone && data.phone.length < 7) { if (submit) submit.disabled=false; return toast('Revise el número de celular'); }
  if (data.active && (!data.ci || !data.phone)) {
    data.active = false;
    toast('El acceso queda inactivo hasta completar carnet y celular');
  }

  try {
    if (onlineConfigured()) {
      if (id) {
        const payload = {
          p_token:academicSession.session_token,p_user_id:id,p_roster_number:data.roster_number,
          p_full_name:data.full_name,p_department:data.department,p_ci:data.ci||null,p_phone:data.phone||null,
          p_role:data.role,p_active:data.active
        };
        try { await academicRPC('academic_update_user_v280', payload); }
        catch (error) {
          if (!/academic_update_user_v280|function.*not found|404/i.test(String(error?.message || error))) throw error;
          await academicRPC('academic_update_user', payload);
        }
      } else {
        const payload = {
          p_token:academicSession.session_token,p_roster_number:data.roster_number,p_full_name:data.full_name,
          p_department:data.department,p_ci:data.ci||null,p_phone:data.phone||null,p_role:data.role,p_active:data.active
        };
        try { await academicRPC('academic_create_user_v280', payload); }
        catch (error) {
          if (!/academic_create_user_v280|function.*not found|404/i.test(String(error?.message || error))) throw error;
          await academicRPC('academic_create_user', payload);
        }
      }
    } else {
      const users = await academicLocalUsers();
      if (id) {
        const user = users.find(item => String(item.id) === String(id));
        if (!user) throw new Error('Integrante no encontrado');
        if (user.role === 'administrador_general') data.role = 'administrador_general';
        Object.assign(user, data);
      } else {
        users.push({ ...data, id:uid(), data_status:data.ci && data.phone ? 'completo' : 'pendiente' });
      }
      academicSaveLocalUsers(users);
      notifyAcademicRoleChange(id || '', data);
    }
    closeModal();
    await loadAcademicUsers();
    toast('Integrante actualizado correctamente');
  } catch (error) {
    console.error(error);
    const msg = typeof academicFriendlyError === 'function' ? academicFriendlyError(error,'No se pudo actualizar el integrante') : String(error?.message || 'No se pudo actualizar el integrante');
    toast(msg.replace(/^.*?message\"?:\s*\"?/i,'').replace(/[\"}]+$/,''));
  } finally {
    if (submit) submit.disabled = false;
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

const academicRPCInflightV280=new Map();
academicRPC=async function academicRPCV280(fn,body={}){
  const dedupeFns=new Set(['academic_get_posts','academic_get_task_progress','academic_get_my_courses','academic_bank_list','academic_get_users_v280']);
  const key=dedupeFns.has(fn)?`${fn}:${JSON.stringify(body)}`:'';
  if(key&&academicRPCInflightV280.has(key))return academicRPCInflightV280.get(key);
  const request=(async()=>{
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch(`${ONLINE_CFG.url}/rest/v1/rpc/${fn}`,{method:'POST',headers:academicHeaders(),body:JSON.stringify(body),signal:controller.signal,cache:'no-store'});
      const text=await response.text();
      if(!response.ok){const error=new Error(text||`Error ${response.status}`);error.status=response.status;throw error}
      return text?JSON.parse(text):null;
    }catch(error){if(error?.name==='AbortError'){const timeout=new Error('Tiempo de conexión agotado');timeout.code='NETWORK_ERROR';throw timeout}throw error}
    finally{clearTimeout(timer)}
  })();
  if(key){academicRPCInflightV280.set(key,request);request.finally(()=>academicRPCInflightV280.delete(key)).catch(()=>{});}
  return request;
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
    academicSession={...user,offline_cached:false,last_validated_at:new Date().toISOString()};academicTab='panel';localStorage.setItem(ACADEMIC_SESSION_STORAGE,JSON.stringify(academicSession));toast('Acceso académico habilitado');setTimeout(()=>location.replace(`./index.html?online=1&v=${APP_VERSION}&r=${Date.now()}`),120);
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

/* =========================================================
   Agenda Policial Online v2.7.1 — pulido visual final
   ========================================================= */
function academicVisualModules(counts = {}) {
  const items = [
    { key: 'formaciones', icon: '🛡️', title: 'Formaciones', desc: 'Comunicados, lugar, fecha y horas', tone: 'formation', count: counts.formaciones || 0, caption: counts.formaciones ? `${counts.formaciones} registro${counts.formaciones === 1 ? '' : 's'}` : 'Sin registros' },
    { key: 'tareas', icon: '📘', title: 'Tareas', desc: 'Pendientes, urgentes y entregadas', tone: 'tasks', count: counts.tareas || 0, caption: counts.tareas ? `${counts.tareas} pendiente${counts.tareas === 1 ? '' : 's'}` : 'Sin pendientes' },
    { key: 'examenes', icon: '📝', title: 'Exámenes', desc: 'Cronograma y avisos del curso', tone: 'exams', count: counts.examenes || 0, caption: counts.examenes ? `${counts.examenes} próximo${counts.examenes === 1 ? '' : 's'}` : 'Sin cronograma' },
    { key: 'resumenes', icon: '📚', title: 'Material académico', desc: 'Resúmenes, PDFs, Word e imágenes', tone: 'summaries', count: counts.resumenes || 0, caption: counts.resumenes ? `${counts.resumenes} novedad${counts.resumenes === 1 ? '' : 'es'}` : 'Sin novedades' }
  ];
  if (academicCanManageUsers()) items.push({ key: 'usuarios', icon: '👥', title: 'Roles', desc: 'Integrantes y funciones', tone: 'roles', count: counts.usuarios || 0, caption: `${counts.usuarios || 0} integrante${counts.usuarios === 1 ? '' : 's'}` });
  return `
    <section class="academic-shortcuts-panel visual-final">
      <div class="online-section-heading compact">
        <div><span class="eyebrow">Acceso directo</span><h3>Módulos académicos</h3></div>
      </div>
      <div class="academic-shortcuts-grid polished-grid">
        ${items.map(item => `
          <button class="academic-shortcut-card ${item.tone} tactile" onclick="setAcademicTab('${item.key}')" aria-label="Abrir ${item.title}">
            <span class="shortcut-icon">${item.icon}</span>
            <span class="shortcut-copy">
              <b>${item.title}</b>
              <small>${item.desc}</small>
            </span>
            <span class="shortcut-meta">
              <strong>${item.count}</strong>
              <small>${item.caption}</small>
            </span>
          </button>
        `).join('')}
      </div>
    </section>
  `;
}

function academicMiniGuide() {
  return `
    <section class="academic-mini-guide">
      <div class="guide-pill"><b>1</b><span>Revise el panel</span></div>
      <div class="guide-pill"><b>2</b><span>Entre al módulo correspondiente</span></div>
      <div class="guide-pill"><b>3</b><span>Use “Publicar” si tiene permiso</span></div>
    </section>
  `;
}

function academicRoleTone(role) {
  const map = {
    administrador_general: 'Administrador general',
    encargado_curso: 'Encargado de curso',
    administrador_academico: 'Administrador académico',
    asistente_academico: 'Asistente académico',
    lector: 'Lector'
  };
  return map[role] || academicRoleLabel(role);
}

academicProfileHeader = function academicProfileHeaderV271() {
  const connection = academicConnectionState();
  const name = academicDisplayName();
  return `
    <div class="online-profile premium-profile">
      <div class="online-avatar premium">${esc(academicInitials(name))}</div>
      <div class="online-profile-copy">
        <span class="eyebrow">Área académica · Capitanes A</span>
        <h2>${esc(name)}</h2>
        <div class="online-profile-meta enhanced-meta">
          <span class="role-chip">${esc(academicRoleTone(academicSession?.role))}</span>
          <span class="sync-pill ${connection.cls}">${connection.label}</span>
        </div>
        <small class="profile-helper">${esc(connection.detail || 'Acceso académico disponible')}</small>
      </div>
      <button class="online-logout premium-logout" onclick="academicLogout()">Salir</button>
    </div>
  `;
};

academicTextNav = function academicTextNavV271() {
  const items = [
    ['panel','Panel','◦'],
    ['formaciones','Formaciones','🛡️'],
    ['tareas','Tareas','📘'],
    ['examenes','Exámenes','📝'],
    ['resumenes','Material','📚']
  ];
  if (academicCanManageUsers()) items.push(['usuarios','Roles','👥']);
  return `
    <nav class="academic-text-nav academic-text-nav-premium" aria-label="Secciones académicas">
      ${items.map(([key,label,icon]) => `<button class="${academicTab === key ? 'active' : ''}" onclick="setAcademicTab('${key}')"><span>${icon}</span><b>${label}</b></button>`).join('')}
    </nav>
  `;
};
academicSubnav = function academicSubnavV271() { return academicTextNav(); };

academicDashboard = function academicDashboardV271() {
  return `
    ${academicProfileHeader()}
    ${academicTextNav()}
    <section class="academic-welcome clean-welcome premium-hero">
      <div>
        <span class="eyebrow">${academicGreeting()}</span>
        <h2>Panel académico</h2>
        <p id="academicTodayText">Revisando la actividad de hoy…</p>
      </div>
      <div class="hero-side-note">
        <b>Vista rápida</b>
        <small>Todo el contenido del curso en un solo lugar.</small>
      </div>
    </section>
    ${academicMiniGuide()}
    <div class="academic-summary-grid" id="academicSummaryGrid">
      ${['Formación','Tareas','Examen','Material'].map(label => `<div class="academic-summary-card loading"><strong>—</strong><b>${label}</b><small>Cargando…</small></div>`).join('')}
    </div>
    <div id="academicVisualModulesWrap">${academicVisualModules()}</div>
    <section class="academic-today-card elevated-block">
      <div class="online-section-heading compact"><div><span class="eyebrow">Información prioritaria</span><h3>Hoy y próximos días</h3></div></div>
      <div id="academicUpcomingList" class="academic-timeline"><div class="academic-loading-line"></div></div>
    </section>
    <section class="academic-recent-card elevated-block">
      <div class="online-section-heading compact"><div><span class="eyebrow">Actualizaciones</span><h3>Actividad reciente</h3></div>${academicCanPublish() ? `<button class="text-btn accent" onclick="openAcademicPublishMenu()">Publicar</button>` : ''}</div>
      <div id="academicRecentList"><div class="academic-loading-line"></div></div>
    </section>
  `;
};

academicModuleView = function academicModuleViewV271() {
  const info = ACADEMIC_TYPES[academicTab];
  const labels = {
    formaciones: 'Revise comunicados del curso, horas de control y hora del parte.',
    tareas: 'Cambie entre vista general y por materia para ubicar pendientes más rápido.',
    examenes: 'Consulte fechas, horarios, lugares y avisos de evaluación.',
    resumenes: 'Publique texto, varios archivos y material de apoyo académico.'
  };
  return `
    ${academicProfileHeader()}
    ${academicTextNav()}
    <div class="online-module-head refined clean-module-head premium-module-head">
      <div class="premium-module-copy">
        <span class="module-visual-icon">${info.icon}</span>
        <div>
          <span class="eyebrow">Módulo académico</span>
          <h3>${info.label}</h3>
          <p>${labels[academicTab] || info.help}</p>
        </div>
      </div>
      ${academicCanPublish() ? `<button class="btn academic-main-btn premium-publish" onclick="openAcademicPostForm('${academicTab}')">Nueva publicación</button>` : ''}
    </div>
    ${academicFilterBar()}
    <div id="academicPosts"><div class="card small"><p>Cargando contenido…</p></div></div>
  `;
};

function academicRecentRowV271(post) {
  const kind = academicEventKind(post);
  const subject = academicSubjectName(post);
  const created = String(post.created_at || '').slice(0,10);
  return `
    <button class="academic-recent-row polished subject-coded premium-row" ${subjectStyleAttr(subject)} onclick="setAcademicTab('${post.post_type}')">
      <div class="recent-main premium-main">
        <span class="recent-label">${esc(kind)}</span>
        <b>${esc(post.title || kind)}</b>
        <small>${esc(subject)} · ${esc(post.author_name || 'Curso')}</small>
      </div>
      <time>${esc(created ? fmtDate(created) : '')}</time>
    </button>
  `;
}

loadAcademicDashboard = async function loadAcademicDashboardV271() {
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
      academicDashboardSummaryCard('📘', pendingTasks.length, 'Tareas pendientes', pendingTasks.length ? 'Revise las entregas del curso' : 'Sin pendientes', 'tareas', pendingTasks.length ? 'task-tone' : ''),
      academicDashboardSummaryCard('📝', nextExam ? academicDateLabel(nextExam) : '—', 'Próximo examen', nextExam?.title || 'Sin cronograma', 'examenes', 'exam-tone'),
      academicDashboardSummaryCard('📚', recentSummaries.length, 'Material nuevo', recentSummaries.length ? 'Últimos 7 días' : 'Sin novedades', 'resumenes', 'summary-tone')
    ].join('');

    const moduleWrap = $('#academicVisualModulesWrap');
    if (moduleWrap) moduleWrap.innerHTML = academicVisualModules({
      formaciones: formations.filter(future).length,
      tareas: pendingTasks.length,
      examenes: exams.filter(future).length,
      resumenes: recentSummaries.length,
      usuarios: academicCanManageUsers() ? (academicUsersCache.length || 0) : 0
    });

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
    if (recentBox) recentBox.innerHTML = recent.length ? recent.map(academicRecentRowV271).join('') : '<div class="empty-academic-line"><p>Todavía no existen publicaciones.</p></div>';
  } catch (error) {
    console.error(error);
    const upcomingBox = $('#academicUpcomingList');
    if (upcomingBox) upcomingBox.innerHTML = '<div class="empty-academic-line warning"><p>Sin conexión. Se conservará la sesión y se reintentará automáticamente.</p></div>';
  }
};

onlineLoginView = function onlineLoginViewV271() {
  return `
    <section class="online-page online-login-clean">
      <div class="online-login-hero clean premium-login-hero">
        <span class="eyebrow">Acceso reservado al curso</span>
        <h2>Área académica online</h2>
        <p>Ingrese con las credenciales asignadas para revisar formaciones, tareas, exámenes y material académico.</p>
      </div>
      <div class="card academic-login clean premium-login-card">
        <h3>Iniciar sesión</h3>
        <label>Usuario
          <input id="academicCi" inputmode="numeric" autocomplete="username" placeholder="Ingrese su usuario">
        </label>
        <label>Contraseña
          <input id="academicPhone" inputmode="tel" autocomplete="current-password" placeholder="Ingrese su contraseña" type="password">
        </label>
        <button class="btn academic-main-btn premium-login-btn" onclick="academicLogin()">Ingresar</button>
        <p class="academic-credential-note">Use sus credenciales personales del curso.</p>
      </div>
    </section>
  `;
};


/* =========================================================
   Agenda Policial Online v2.7.2 — revisión funcional
   ========================================================= */
const ACADEMIC_UPLOAD_FUNCTION = 'academic-upload';
const ACADEMIC_MAX_FILES = 8;
const ACADEMIC_MAX_FILE_BYTES = 15 * 1024 * 1024;
const ACADEMIC_MAX_TOTAL_BYTES = 40 * 1024 * 1024;

function academicAllowedTypesForRole(role = academicSession?.role) {
  if (role === 'administrador_general' || role === 'administrador_academico') {
    return ['formaciones','tareas','examenes','resumenes'];
  }
  if (role === 'encargado_curso') return ['formaciones'];
  if (role === 'asistente_academico') return ['tareas','examenes','resumenes'];
  return [];
}

function academicCanPublishType(type) {
  return academicAllowedTypesForRole().includes(type) && !academicIsTestSession();
}

academicCanPublish = function academicCanPublishV272() {
  return academicAllowedTypesForRole().length > 0 && !academicIsTestSession();
};

function academicCanArchivePost() {
  return ['administrador_general','administrador_academico'].includes(academicSession?.role) && !academicIsTestSession();
}

function academicFriendlyError(error, fallback = 'No se pudo completar la operación') {
  const raw = String(error?.message || error || '');
  try {
    const parsed = JSON.parse(raw);
    return parsed.message || parsed.error || parsed.details || fallback;
  } catch {}
  const match = raw.match(/"message"\s*:\s*"([^"]+)"/i) || raw.match(/"error"\s*:\s*"([^"]+)"/i);
  return match?.[1] || raw.replace(/^Error:\s*/,'').slice(0,220) || fallback;
}

function academicValidateFiles(files, type) {
  const list = Array.from(files || []);
  const maximum = type === 'resumenes' ? ACADEMIC_MAX_FILES : 1;
  if (list.length > maximum) {
    throw new Error(type === 'resumenes'
      ? `Puede adjuntar hasta ${ACADEMIC_MAX_FILES} archivos por publicación`
      : 'Este módulo permite un solo archivo por publicación');
  }
  let total = 0;
  for (const file of list) {
    if (file.size <= 0) throw new Error(`El archivo ${file.name} está vacío`);
    if (file.size > ACADEMIC_MAX_FILE_BYTES) throw new Error(`El archivo ${file.name} supera el máximo de 15 MB`);
    total += file.size;
  }
  if (total > ACADEMIC_MAX_TOTAL_BYTES) throw new Error('El conjunto de archivos supera el máximo total de 40 MB');
  return list;
}

uploadAcademicFile = async function uploadAcademicFileV272(file, postType) {
  if (!file) return null;

  if (!onlineConfigured()) {
    if (file.size > 1_250_000) throw new Error('En el modo local use archivos menores a 1,25 MB');
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return {
      url: `data:${file.type || 'application/octet-stream'};base64,${btoa(binary)}`,
      name: file.name,
      type: file.type || '',
      size: file.size
    };
  }

  if (!navigator.onLine) throw new Error('Necesita conexión a internet para subir archivos');
  if (!academicCanPublishType(postType)) throw new Error('Su rol no tiene permiso para adjuntar archivos en este módulo');

  const form = new FormData();
  form.append('session_token', String(academicSession.session_token || ''));
  form.append('post_type', postType);
  form.append('file', file, file.name);

  const response = await fetch(`${ONLINE_CFG.url}/functions/v1/${ACADEMIC_UPLOAD_FUNCTION}`, {
    method: 'POST',
    headers: { apikey: ONLINE_CFG.anonKey },
    body: form
  });
  const text = await response.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch {}
  if (!response.ok) throw new Error(payload.error || text || 'No se pudo subir el archivo');
  return payload;
};

uploadAcademicFiles = async function uploadAcademicFilesV272(files, postType) {
  const validated = academicValidateFiles(files, postType);
  const uploaded = [];
  for (let index = 0; index < validated.length; index += 1) {
    toast(`Subiendo archivo ${index + 1} de ${validated.length}…`);
    uploaded.push(await uploadAcademicFile(validated[index], postType));
  }
  return uploaded;
};

const _openAcademicPostFormV270 = openAcademicPostForm;
openAcademicPostForm = function openAcademicPostFormV272(type) {
  if (!academicCanPublishType(type)) {
    return toast('Su rol no tiene permiso para publicar en este módulo');
  }
  if (onlineConfigured() && !navigator.onLine) {
    return toast('Necesita conexión para publicar contenido online');
  }
  return _openAcademicPostFormV270(type);
};

saveAcademicPost = async function saveAcademicPostV272(event, type) {
  event.preventDefault();
  const form = event.currentTarget;
  if (form.dataset.submitting === '1') return;
  if (!academicCanPublishType(type)) return toast('Su rol no tiene permiso para publicar en este módulo');
  if (onlineConfigured() && !navigator.onLine) return toast('Necesita conexión para publicar');

  const submit = event.submitter || form.querySelector('button[type="submit"]');
  form.dataset.submitting = '1';
  if (submit) {
    submit.disabled = true;
    submit.dataset.originalText = submit.textContent;
    submit.textContent = 'Publicando…';
  }

  try {
    const formData = new FormData(form);
    const values = Object.fromEntries(formData.entries());
    let title = values.title || '';
    const body = String(values.body || '').trim();
    delete values.title;
    delete values.body;

    if (type === 'formaciones') title = `${values.formation_type || 'Formación'} · ${values.date || 'sin fecha'}`;
    if (type === 'resumenes') title = `${values.subject || 'Resumen'} — ${values.topic || 'Tema'}`;

    const files = academicValidateFiles($('#academicFiles')?.files || [], type);
    if (type === 'resumenes' && !body && !files.length) {
      throw new Error('Agregue una descripción o al menos un archivo académico');
    }

    const attachments = await uploadAcademicFiles(files, type);
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
        author_id: academicSession.user_id,
        author_name: academicSession.full_name,
        created_at: new Date().toISOString(),
        archived: false
      });
      academicSaveLocalPosts(posts);
    }

    closeModal();
    academicStorePosts(type, []);
    await loadAcademicPosts();
    toast('Publicación guardada correctamente');
  } catch (error) {
    console.error(error);
    toast(academicFriendlyError(error, 'No se pudo guardar la publicación'));
  } finally {
    form.dataset.submitting = '0';
    if (submit) {
      submit.disabled = false;
      submit.textContent = submit.dataset.originalText || 'Publicar';
    }
  }
};

function academicRemoveCachedPost(postId) {
  const cache = academicPostCache();
  Object.values(cache).forEach(entry => {
    if (Array.isArray(entry?.rows)) entry.rows = entry.rows.filter(row => String(row.id) !== String(postId));
  });
  saveAcademicPostCache(cache);
}

function confirmArchiveAcademicPost(postId, title = 'Publicación académica') {
  if (!academicCanArchivePost()) return toast('Su rol no permite archivar publicaciones');
  showModal(`
    <button class="icon-btn close" onclick="closeModal()">×</button>
    <span class="eyebrow">Confirmación</span>
    <h2>Archivar publicación</h2>
    <p>La publicación <b>${esc(title)}</b> dejará de mostrarse a los lectores. No se eliminarán las demás publicaciones ni los datos del curso.</p>
    <div class="form-actions">
      <button class="btn danger" onclick="archiveAcademicPost('${esc(postId)}')">Archivar</button>
      <button class="btn secondary" onclick="closeModal()">Cancelar</button>
    </div>
  `);
}

async function archiveAcademicPost(postId) {
  if (!academicCanArchivePost()) return toast('Su rol no permite archivar publicaciones');
  try {
    if (onlineConfigured()) {
      if (!navigator.onLine) return toast('Necesita conexión para archivar');
      await academicRPC('academic_archive_post', {
        p_token: academicSession.session_token,
        p_post_id: postId
      });
    } else {
      const posts = academicLocalPosts();
      const target = posts.find(item => String(item.id) === String(postId));
      if (!target) throw new Error('Publicación no encontrada');
      target.archived = true;
      target.updated_at = new Date().toISOString();
      academicSaveLocalPosts(posts);
    }
    academicRemoveCachedPost(postId);
    closeModal();
    await loadAcademicPosts();
    toast('Publicación archivada');
  } catch (error) {
    console.error(error);
    toast(academicFriendlyError(error, 'No se pudo archivar la publicación'));
  }
}

academicPostCard = function academicPostCardV272(post) {
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
  const archiveAction = academicCanArchivePost()
    ? `<button class="academic-post-action archive" onclick="confirmArchiveAcademicPost('${esc(post.id)}','${esc(String(post.title || 'Publicación').replace(/'/g, '’'))}')">Archivar</button>`
    : '';

  return `<article class="card academic-post subject-coded" ${visual}><div class="row between"><span class="tag">${esc(ACADEMIC_TYPES[post.post_type]?.label || post.post_type)}</span>${status}</div><h3>${esc(post.title || 'Publicación académica')}</h3>${meta}${post.body ? `<p class="academic-post-body">${esc(post.body)}</p>` : ''}${academicAttachmentLinks(post)}<div class="academic-post-footer"><small>${esc(post.author_name || '')}</small><div class="academic-post-actions">${taskAction}${archiveAction}</div></div></article>`;
};

openAcademicPublishMenu = function openAcademicPublishMenuV272() {
  const allowed = academicAllowedTypesForRole();
  if (!allowed.length || academicIsTestSession()) return toast('Su rol es únicamente de lectura');
  showModal(`
    <button class="icon-btn close" onclick="closeModal()">×</button>
    <span class="eyebrow">Publicación académica</span>
    <h2>¿Qué desea publicar?</h2>
    <p class="subtle">Solo se muestran los módulos habilitados para su función.</p>
    <div class="academic-publish-grid">
      ${allowed.map(key => {
        const item = ACADEMIC_TYPES[key];
        return `<button onclick="closeModal();openAcademicPostForm('${key}')"><span>${item.icon}</span><b>${item.label}</b><small>${item.help}</small></button>`;
      }).join('')}
    </div>
  `);
};

academicModuleView = function academicModuleViewV272() {
  const info = ACADEMIC_TYPES[academicTab];
  const labels = {
    formaciones: 'Revise comunicados del curso, horas de control y hora del parte.',
    tareas: 'Cambie entre vista general y por materia para ubicar pendientes más rápido.',
    examenes: 'Consulte fechas, horarios, lugares y avisos de evaluación.',
    resumenes: 'Publique texto, varios archivos y material de apoyo académico.'
  };
  const canPublishHere = academicCanPublishType(academicTab);
  return `
    ${academicProfileHeader()}
    ${academicTextNav()}
    <div class="online-module-head refined clean-module-head premium-module-head">
      <div class="premium-module-copy">
        <span class="module-visual-icon">${info.icon}</span>
        <div><span class="eyebrow">Módulo académico</span><h3>${info.label}</h3><p>${labels[academicTab] || info.help}</p></div>
      </div>
      ${canPublishHere ? `<button class="btn academic-main-btn premium-publish" onclick="openAcademicPostForm('${academicTab}')">Nueva publicación</button>` : `<span class="module-readonly-note">Consulta habilitada</span>`}
    </div>
    ${academicFilterBar()}
    <div id="academicPosts"><div class="card small"><p>Cargando contenido…</p></div></div>
  `;
};

function academicPermissionsGuide() {
  return `
    <section class="academic-permission-guide">
      <span class="eyebrow">Permisos por función</span>
      <div class="permission-grid">
        <div><b>Encargado de curso</b><small>Publica formaciones y comunicados operativos.</small></div>
        <div><b>Administrador académico</b><small>Publica en todos los módulos y puede archivar.</small></div>
        <div><b>Asistente académico</b><small>Publica tareas, exámenes y material académico.</small></div>
        <div><b>Lector</b><small>Consulta contenido y marca sus tareas entregadas.</small></div>
      </div>
    </section>
  `;
}

const _academicUsersViewV271 = academicUsersView;
academicUsersView = function academicUsersViewV272() {
  const html = _academicUsersViewV271();
  const marker = '<div class="roster-actions">';
  return html.replace(marker, `${academicPermissionsGuide()}${marker}`);
};


/* =========================================================
   Agenda Policial Online v2.7.3 — pulido visual final
   Panel más claro, sin cápsulas de guía y navegación oliva-dorado.
   ========================================================= */
function academicCourseLabelV273(){
  return academicSession?.course_name || 'Capitanes A';
}
academicMiniGuide=function academicMiniGuideV273(){ return ''; };
academicProfileHeader=function academicProfileHeaderV273(){
  const connection=academicConnectionState();
  const name=academicDisplayName();
  return `
    <div class="online-profile premium-profile compact-profile">
      <div class="online-avatar premium compact-avatar">${esc(academicInitials(name))}</div>
      <div class="online-profile-copy compact-copy">
        <span class="eyebrow">Área académica · ${esc(academicCourseLabelV273())}</span>
        <h2 class="profile-name-compact" title="${esc(name)}">${esc(name)}</h2>
        <div class="online-profile-meta enhanced-meta">
          <span class="role-chip">${esc(academicRoleTone(academicSession?.role))}</span>
          <span class="sync-pill ${connection.cls}">${connection.label}</span>
        </div>
        <small class="profile-helper">${esc(connection.detail || 'Sincronización disponible')}</small>
      </div>
      <button class="online-logout premium-logout compact-logout" onclick="academicLogout()">Salir</button>
    </div>
  `;
};
academicTextNav=function academicTextNavV273(){
  const items=[
    ['panel','Panel','◦','tone-panel'],
    ['formaciones','Formaciones','🛡️','tone-formaciones'],
    ['tareas','Tareas','📘','tone-tareas'],
    ['examenes','Exámenes','📝','tone-examenes'],
    ['resumenes','Material','📚','tone-resumenes']
  ];
  if(academicCanManageUsers())items.push(['usuarios','Roles','👥','tone-usuarios']);
  return `<nav class="academic-text-nav academic-text-nav-premium olive-gold-nav" aria-label="Secciones académicas">${items.map(([key,label,icon,tone])=>`<button class="${academicTab===key?'active':''} ${tone}" onclick="setAcademicTab('${key}')"><span>${icon}</span><b>${label}</b></button>`).join('')}</nav>`;
};
academicSubnav=function academicSubnavV273(){ return academicTextNav(); };
academicDashboard=function academicDashboardV273(){
  return `
    ${academicProfileHeader()}
    ${academicTextNav()}
    <section class="academic-welcome clean-welcome premium-hero compact-panel-hero">
      <div>
        <span class="eyebrow">${academicGreeting()}</span>
        <h2>Panel académico</h2>
        <p id="academicTodayText">Revisando la actividad de hoy…</p>
      </div>
      <div class="hero-side-note compact-note">
        <b>Resumen rápido</b>
        <small>Información esencial del curso en una vista más clara.</small>
      </div>
    </section>
    <div class="academic-summary-grid" id="academicSummaryGrid">
      ${['Formación','Tareas','Examen','Material'].map(label => `<div class="academic-summary-card loading"><strong>—</strong><b>${label}</b><small>Cargando…</small></div>`).join('')}
    </div>
    <div id="academicVisualModulesWrap">${academicVisualModules()}</div>
    <section class="academic-today-card elevated-block">
      <div class="online-section-heading compact"><div><span class="eyebrow">Información prioritaria</span><h3>Hoy y próximos días</h3></div></div>
      <div id="academicUpcomingList" class="academic-timeline"><div class="academic-loading-line"></div></div>
    </section>
    <section class="academic-recent-card elevated-block">
      <div class="online-section-heading compact"><div><span class="eyebrow">Actualizaciones</span><h3>Actividad reciente</h3></div>${academicCanPublish()?`<button class="text-btn accent" onclick="openAcademicPublishMenu()">Publicar</button>`:''}</div>
      <div id="academicRecentList"><div class="academic-loading-line"></div></div>
    </section>
  `;
};
academicVisualModules=function academicVisualModulesV273(counts={}){
  const items=[
    { key:'formaciones', icon:'🛡️', title:'Formaciones', desc:'Comunicados del curso y horas de control.', tone:'formaciones', count:counts.formaciones||0, caption:counts.formaciones?`${counts.formaciones} registro${counts.formaciones===1?'':'s'}`:'Sin publicaciones' },
    { key:'tareas', icon:'📘', title:'Tareas', desc:'Pendientes y entregas agrupadas por materia.', tone:'tasks', count:counts.tareas||0, caption:counts.tareas?`${counts.tareas} pendiente${counts.tareas===1?'':'s'}`:'Sin pendientes' },
    { key:'examenes', icon:'📝', title:'Exámenes', desc:'Cronograma y avisos de evaluación.', tone:'exams', count:counts.examenes||0, caption:counts.examenes?`${counts.examenes} próximo${counts.examenes===1?'':'s'}`:'Sin cronograma' },
    { key:'resumenes', icon:'📚', title:'Material', desc:'Resúmenes y archivos académicos.', tone:'summaries', count:counts.resumenes||0, caption:counts.resumenes?`${counts.resumenes} publicación${counts.resumenes===1?'':'es'}`:'Sin material' }
  ];
  if(academicCanManageUsers())items.push({ key:'usuarios', icon:'👥', title:'Roles', desc:'Funciones del curso y accesos.', tone:'roles', count:0, caption:'Administración' });
  return `<section class="academic-visual-modules compact-visual-modules">${items.map(item=>`<button class="academic-shortcut-card tactile olive-card ${item.tone}" onclick="setAcademicTab('${item.key}')"><span class="shortcut-icon">${item.icon}</span><span class="shortcut-main"><b>${item.title}</b><small>${item.desc}</small></span><span class="shortcut-meta"><strong>${item.count||'•'}</strong><small>${item.caption}</small></span></button>`).join('')}</section>`;
};


/* =========================================================
   Agenda Policial Online v2.7.5 — persistencia documental
   La respuesta del servidor nunca se oculta por una falla de caché local.
   ========================================================= */
const ACADEMIC_DURABLE_CACHE_PREFIX = 'academic-post-cache-v275:';
const academicPostMemoryV275 = new Map();
let academicLastSyncErrorV275 = null;
let academicLastSyncAtV275 = null;

function academicDurableKeyV275(type) {
  return `${ACADEMIC_DURABLE_CACHE_PREFIX}${academicSession?.course_code || 'curso'}:${type || 'all'}`;
}
function academicSafeLocalReadV275(type) {
  try {
    const raw = localStorage.getItem(academicDurableKeyV275(type));
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed?.rows) ? parsed.rows : [];
  } catch (error) {
    console.warn('Caché local no legible:', error);
    return [];
  }
}
function academicSafeLocalWriteV275(type, rows) {
  try {
    localStorage.setItem(academicDurableKeyV275(type), JSON.stringify({
      rows: Array.isArray(rows) ? rows : [],
      saved_at: new Date().toISOString()
    }));
    return true;
  } catch (error) {
    // Una cuota llena nunca debe convertir una lectura exitosa del servidor en error.
    console.warn('Caché local llena; se conserva IndexedDB y memoria:', error);
    try { localStorage.removeItem(ACADEMIC_POST_CACHE_STORAGE); } catch {}
    return false;
  }
}
async function academicReadDurableCacheV275(type) {
  const key = academicDurableKeyV275(type);
  if (academicPostMemoryV275.has(key)) return academicPostMemoryV275.get(key);
  try {
    const saved = await store.get(key);
    if (Array.isArray(saved?.rows)) {
      academicPostMemoryV275.set(key, saved.rows);
      return saved.rows;
    }
  } catch (error) {
    console.warn('IndexedDB no disponible para caché académica:', error);
  }
  let local = academicSafeLocalReadV275(type);
  if (!local.length) {
    try {
      const legacy = academicPostCache()[academicCacheKey(type)]?.rows;
      if (Array.isArray(legacy) && legacy.length) {
        local = legacy;
        try { await store.set(key, { rows: legacy, saved_at: new Date().toISOString(), migrated_from: 'legacy' }); } catch {}
      }
    } catch (error) { console.warn('No se pudo migrar la caché anterior:', error); }
  }
  academicPostMemoryV275.set(key, local);
  return local;
}
async function academicWriteDurableCacheV275(type, rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const key = academicDurableKeyV275(type);
  academicPostMemoryV275.set(key, safeRows);
  const value = { rows: safeRows, saved_at: new Date().toISOString() };
  try { await store.set(key, value); } catch (error) { console.warn('No se pudo guardar caché en IndexedDB:', error); }
  academicSafeLocalWriteV275(type, safeRows);
  return safeRows;
}
async function academicMergeDurablePostV275(type, post) {
  if (!post?.id) return;
  const current = await academicReadDurableCacheV275(type);
  const rows = [post, ...current.filter(item => String(item.id) !== String(post.id))]
    .sort((a,b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  await academicWriteDurableCacheV275(type, rows);
}
async function academicRPCWithRetryV275(fn, body = {}, attempts = 2) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try { return await academicRPC(fn, body); }
    catch (error) {
      lastError = error;
      if (!academicIsNetworkError(error) || attempt === attempts) break;
      await new Promise(resolve => setTimeout(resolve, 450 * attempt));
    }
  }
  throw lastError;
}
academicStorePosts = function academicStorePostsV275(type, rows) {
  // Compatibilidad con llamadas antiguas. No arroja errores por cuota.
  academicWriteDurableCacheV275(type, rows).catch(error => console.warn(error));
  return rows;
};
academicCachedPosts = function academicCachedPostsV275(type) {
  const key = academicDurableKeyV275(type);
  return academicPostMemoryV275.get(key) || academicSafeLocalReadV275(type);
};
academicFetchPosts = async function academicFetchPostsV275(type = null) {
  if (!onlineConfigured()) {
    return academicLocalPosts().filter(post => !post.archived && (!type || post.post_type === type));
  }
  if (!type) {
    const all = [];
    for (const key of Object.keys(ACADEMIC_TYPES)) all.push(...await academicFetchPosts(key));
    return all;
  }

  let serverError = null;
  if (navigator.onLine) {
    try {
      const rows = await academicRPCWithRetryV275('academic_get_posts', {
        p_token: academicSession.session_token,
        p_type: type
      }, 2);
      const list = Array.isArray(rows) ? rows : [];
      academicLastSyncErrorV275 = null;
      academicLastSyncAtV275 = new Date().toISOString();
      // La lista se devuelve aunque IndexedDB/localStorage fallen.
      academicWriteDurableCacheV275(type, list).catch(error => console.warn(error));
      return list;
    } catch (error) {
      serverError = error;
      academicLastSyncErrorV275 = error;
      console.error('Fallo de sincronización académica:', error);
    }
  }

  const cached = await academicReadDurableCacheV275(type);
  if (cached.length) return cached;
  if (serverError) throw serverError;
  return [];
};
function academicSyncStateV275() {
  if (!navigator.onLine) return { cls:'offline', label:'Sin conexión', detail:'Mostrando copia guardada en el dispositivo.' };
  if (academicLastSyncErrorV275) return { cls:'warning', label:'Reintentar', detail:'El servidor conserva la información; falta actualizar esta pantalla.' };
  return { cls:'online', label:'Sincronizado', detail: academicLastSyncAtV275 ? `Última revisión: ${new Date(academicLastSyncAtV275).toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'})}` : 'Conectado al servidor académico.' };
}
function academicSyncBannerV275() {
  const state = academicSyncStateV275();
  return `<div class="academic-sync-banner ${state.cls}"><div><b>${state.label}</b><small>${state.detail}</small></div><button onclick="retryAcademicSyncV275()">Actualizar</button></div>`;
}
async function retryAcademicSyncV275() {
  academicLastSyncErrorV275 = null;
  const box = $('#academicPosts');
  if (box) box.innerHTML = '<div class="card small"><p>Actualizando contenido…</p></div>';
  await loadAcademicPosts();
}
loadAcademicPosts = async function loadAcademicPostsV275() {
  const box = $('#academicPosts');
  if (!box || !academicSession || !ACADEMIC_TYPES[academicTab]) return;
  try {
    if (academicTab === 'tareas') { await flushAcademicTaskQueue(); await academicSyncTaskProgress(); }
    const rows = await academicFetchPosts(academicTab);
    const posts = rows.filter(academicPostMatchesFilter).sort(academicPostSort);
    const banner = academicSyncBannerV275();
    if (academicViewMode === 'subject' && ['tareas','examenes','resumenes'].includes(academicTab)) {
      box.innerHTML = banner + (posts.length ? academicGroupedPosts(posts) : '<div class="card small empty-online"><p>No existen publicaciones con este filtro.</p></div>');
      return;
    }
    box.innerHTML = banner + (posts.length ? posts.map(academicPostCard).join('') : '<div class="card small empty-online"><p>No existen publicaciones con este filtro.</p></div>');
  } catch (error) {
    console.error(error);
    const cached = await academicReadDurableCacheV275(academicTab);
    const visible = cached.filter(academicPostMatchesFilter).sort(academicPostSort);
    box.innerHTML = academicSyncBannerV275() + (visible.length
      ? visible.map(academicPostCard).join('')
      : '<div class="card small warn-card"><p>No se pudo actualizar esta pantalla. La documentación guardada en el servidor no fue eliminada.</p><button class="btn secondary" onclick="retryAcademicSyncV275()">Reintentar sincronización</button></div>');
  }
};

saveAcademicPost = async function saveAcademicPostV275(event, type) {
  event.preventDefault();
  const form = event.currentTarget;
  if (form.dataset.submitting === '1') return;
  if (!academicCanPublishType(type)) return toast('Su rol no tiene permiso para publicar en este módulo');
  if (onlineConfigured() && !navigator.onLine) return toast('Necesita conexión para publicar');

  const submit = event.submitter || form.querySelector('button[type="submit"]');
  form.dataset.submitting = '1';
  if (submit) { submit.disabled = true; submit.dataset.originalText = submit.textContent; submit.textContent = 'Guardando…'; }

  try {
    const formData = new FormData(form);
    const values = Object.fromEntries(formData.entries());
    let title = values.title || '';
    const body = String(values.body || '').trim();
    delete values.title; delete values.body;
    if (type === 'formaciones') title = `${values.formation_type || 'Formación'} · ${values.date || 'sin fecha'}`;
    if (type === 'resumenes') title = `${values.subject || 'Resumen'} — ${values.topic || 'Tema'}`;

    const files = academicValidateFiles($('#academicFiles')?.files || [], type);
    if (type === 'resumenes' && !body && !files.length) throw new Error('Agregue una descripción o al menos un archivo académico');

    const attachments = await uploadAcademicFiles(files, type);
    const primary = attachments[0] || null;
    const payloadFields = { ...values };
    if (attachments.length) payloadFields.attachments = attachments;

    if (onlineConfigured()) {
      const created = await academicRPCWithRetryV275('academic_create_post', {
        p_token: academicSession.session_token,
        p_type: type,
        p_title: title,
        p_body: body,
        p_fields: payloadFields,
        p_file_url: primary?.url || null,
        p_file_name: primary?.name || null,
        p_file_mime: primary?.type || null,
        p_file_size: primary?.size || null
      }, 2);
      const postId = typeof created === 'string' ? created : created?.id || created;
      if (!postId) throw new Error('El servidor no confirmó el identificador de la publicación');

      let confirmedPost = null;
      try {
        const verified = await academicRPCWithRetryV275('academic_get_post', {
          p_token: academicSession.session_token,
          p_post_id: postId
        }, 2);
        confirmedPost = Array.isArray(verified) ? verified[0] : verified;
      } catch (verifyError) {
        console.warn('Publicación creada; verificación diferida:', verifyError);
      }
      if (!confirmedPost) {
        confirmedPost = {
          id: postId, post_type: type, title, body, fields: payloadFields,
          file_url: primary?.url || null, file_name: primary?.name || null,
          file_mime: primary?.type || null, file_size: primary?.size || null,
          author_id: academicSession.user_id, author_name: academicSession.full_name,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          sync_pending: true
        };
      }
      await academicMergeDurablePostV275(type, confirmedPost);
      academicLastSyncErrorV275 = null;
      academicLastSyncAtV275 = new Date().toISOString();
    } else {
      const posts = academicLocalPosts();
      const localPost = {
        id: uid(), post_type:type, title, body, fields:payloadFields,
        file_url:primary?.url||null, file_name:primary?.name||null,
        file_mime:primary?.type||null, file_size:primary?.size||null,
        author_id:academicSession.user_id, author_name:academicSession.full_name,
        created_at:new Date().toISOString(), updated_at:new Date().toISOString(), archived:false
      };
      posts.unshift(localPost); academicSaveLocalPosts(posts);
      await academicMergeDurablePostV275(type, localPost);
    }

    closeModal();
    await loadAcademicPosts();
    toast('Publicación confirmada y guardada');
  } catch (error) {
    console.error(error);
    toast(academicFriendlyError(error, 'No se pudo confirmar la publicación'));
  } finally {
    form.dataset.submitting = '0';
    if (submit) { submit.disabled = false; submit.textContent = submit.dataset.originalText || 'Publicar'; }
  }
};

async function academicRecoverAllContentV275() {
  if (!academicSession || !onlineConfigured() || !navigator.onLine) return;
  for (const type of Object.keys(ACADEMIC_TYPES)) {
    try { await academicFetchPosts(type); } catch (error) { console.warn(`Recuperación ${type}:`, error); }
  }
}
window.addEventListener('online', () => academicRecoverAllContentV275());
window.addEventListener('DOMContentLoaded', () => setTimeout(() => academicRecoverAllContentV275(), 1000));


/* =========================================================
   Agenda Policial Online v2.7.6 — mensajes inteligentes
   Análisis local de comunicados y llenado asistido de formularios.
   ========================================================= */
const ACADEMIC_SMART_PARSER_VERSION_V276 = 'agenda-smart-bo-1.0';
const ACADEMIC_DRAFT_STORAGE_V276 = 'agenda-academic-drafts-v276';
let academicSmartCandidatesV276 = [];
let academicDraftTimerV276 = null;

function academicSmartCleanTextV276(value) {
  return String(value || '')
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/^\s*\[\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}[^\]]*\]\s*[^:\n]{1,50}:\s*/gm, '')
    .replace(/^\s*\d{1,2}:\d{2}\s*[-–]\s*[^:\n]{1,50}:\s*/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function academicSmartNormalizeV276(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function academicSmartSplitV276(text) {
  const clean = academicSmartCleanTextV276(text);
  if (!clean) return [];
  const explicit = clean.split(/\n\s*(?:---+|={3,}|mensaje\s+\d+\s*:?)\s*\n/i).map(item => item.trim()).filter(Boolean);
  return explicit.length ? explicit : [clean];
}

function academicSmartISODateV276(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function academicSmartDateV276(text) {
  const raw = academicSmartNormalizeV276(text);
  const now = new Date();
  const addDays = days => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    date.setDate(date.getDate() + days);
    return academicSmartISODateV276(date);
  };
  if (/\bpasado\s+manana\b/.test(raw)) return addDays(2);
  if (/\bmanana\b/.test(raw)) return addDays(1);
  if (/\bhoy\b/.test(raw)) return addDays(0);

  let match = raw.match(/\b(20\d{2})[-\/](\d{1,2})[-\/](\d{1,2})\b/);
  if (match) return `${match[1]}-${String(match[2]).padStart(2,'0')}-${String(match[3]).padStart(2,'0')}`;

  match = raw.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/);
  if (match) {
    let year = match[3] ? Number(match[3]) : now.getFullYear();
    if (year < 100) year += 2000;
    const date = new Date(year, Number(match[2]) - 1, Number(match[1]));
    if (!Number.isNaN(date.getTime())) return academicSmartISODateV276(date);
  }

  const months = {
    enero:0, febrero:1, marzo:2, abril:3, mayo:4, junio:5,
    julio:6, agosto:7, septiembre:8, setiembre:8, octubre:9,
    noviembre:10, diciembre:11
  };
  match = raw.match(/\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+de\s+(20\d{2}))?\b/);
  if (match) {
    const year = match[3] ? Number(match[3]) : now.getFullYear();
    return academicSmartISODateV276(new Date(year, months[match[2]], Number(match[1])));
  }

  const weekdays = { domingo:0, lunes:1, martes:2, miercoles:3, jueves:4, viernes:5, sabado:6 };
  for (const [word, target] of Object.entries(weekdays)) {
    if (new RegExp(`\\b${word}\\b`).test(raw)) {
      const current = now.getDay();
      let difference = (target - current + 7) % 7;
      if (/proxim[oa]/.test(raw) && difference === 0) difference = 7;
      return addDays(difference);
    }
  }
  return '';
}

function academicSmartTimeV276(value) {
  const raw = String(value || '').trim().toLowerCase().replace(/\s/g,'');
  let hours, minutes;
  let match = raw.match(/^(\d{1,2})[:.](\d{2})(am|pm)?$/);
  if (match) {
    hours = Number(match[1]); minutes = Number(match[2]);
    if (match[3] === 'pm' && hours < 12) hours += 12;
    if (match[3] === 'am' && hours === 12) hours = 0;
  } else {
    match = raw.match(/^(\d{1,2})(am|pm)$/);
    if (match) {
      hours = Number(match[1]); minutes = 0;
      if (match[2] === 'pm' && hours < 12) hours += 12;
      if (match[2] === 'am' && hours === 12) hours = 0;
    }
  }
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59) return '';
  return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;
}

function academicSmartLabeledValueV276(text, labels) {
  const lines = String(text || '').split('\n');
  const normalizedLabels = labels.map(academicSmartNormalizeV276);
  for (const line of lines) {
    const normalizedLine = academicSmartNormalizeV276(line);
    for (const label of normalizedLabels) {
      const index = normalizedLine.indexOf(label);
      if (index >= 0) {
        const originalIndex = line.toLowerCase().indexOf(line.toLowerCase().slice(index, index + label.length));
        const after = line.slice(Math.max(0, originalIndex) + label.length).replace(/^\s*[:\-–]\s*/, '').trim();
        if (after) return after;
      }
    }
  }
  const escaped = labels.map(label => label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
  const regex = new RegExp(`(?:${escaped})\\s*(?:[:\\-–]|es)?\\s*([^\\n.;]+)`, 'i');
  return String(text || '').match(regex)?.[1]?.trim() || '';
}

function academicSmartLabeledTimeV276(text, labels) {
  const escaped = labels.map(label => label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
  const regex = new RegExp(`(?:${escaped})\\s*(?:a\\s*horas?|hrs?\\.?|h\\.?|[:\\-–])?\\s*(\\d{1,2}(?:[:.]\\d{2})\\s*(?:am|pm)?)`, 'i');
  const match = String(text || '').match(regex);
  return academicSmartTimeV276(match?.[1] || '');
}

function academicSmartTimesV276(text) {
  const matches = [...String(text || '').matchAll(/\b(?:[01]?\d|2[0-3])[:.][0-5]\d\s*(?:am|pm)?\b/gi)];
  return [...new Set(matches.map(match => academicSmartTimeV276(match[0])).filter(Boolean))];
}

function academicSmartSubjectsV276() {
  const defaultSubjects = [
    'Planificación Estratégica','Procedimientos Especiales','Auditoría Gubernamental',
    'Inteligencia Estratégica','Ciencia Política','Administración General',
    'Metodología de Investigación','Victimología','Criminalística General y de Campo',
    'Disciplinas Criminalísticas','Psicología Criminal y Forense','Perfilación Criminal',
    'Investigación Criminal','Gestión Policial','Administración de Recursos Humanos',
    'Administración Policial y Doctrina de Estado Mayor','Sistemas Organizacionales',
    'Preparación de Proyectos Institucionales','Acondicionamiento Físico','Tiro Policial'
  ];
  const scheduled = Array.isArray(globalThis.state?.scheduleBlocks)
    ? globalThis.state.scheduleBlocks.map(item => item?.materia).filter(Boolean)
    : [];
  return [...new Set([...scheduled, ...defaultSubjects])];
}

function academicSmartSubjectV276(text) {
  const explicit = academicSmartLabeledValueV276(text, ['materia','asignatura']);
  if (explicit) return explicit.replace(/[.;,]+$/,'').trim();
  const normalized = academicSmartNormalizeV276(text);
  return academicSmartSubjectsV276()
    .sort((a,b) => b.length - a.length)
    .find(subject => normalized.includes(academicSmartNormalizeV276(subject))) || '';
}

function academicSmartTeacherV276(text, subject) {
  const explicit = academicSmartLabeledValueV276(text, ['docente','instructor','facilitador']);
  if (explicit) return explicit.replace(/[.;]+$/,'').trim();
  if (subject && Array.isArray(globalThis.state?.scheduleBlocks)) {
    const found = globalThis.state.scheduleBlocks.find(item =>
      academicSmartNormalizeV276(item?.materia) === academicSmartNormalizeV276(subject) &&
      (item?.docente || item?.instructor)
    );
    if (found) return found.docente || found.instructor || '';
  }
  return '';
}

function academicSmartDetectTypeV276(text, forcedType = '') {
  if (ACADEMIC_TYPES[forcedType]) return forcedType;
  const normalized = academicSmartNormalizeV276(text);
  const scores = {
    formaciones: ['formacion','servicio extraordinario','hora de control','hora del parte','uniforme','revista','parte policial'],
    tareas: ['tarea','trabajo practico','actividad','entregar','fecha limite','plazo','presentar','exposicion'],
    examenes: ['examen','evaluacion','prueba','parcial','temario','oral','escrito'],
    resumenes: ['resumen','material academico','documento','archivo','pdf','word','diapositiva','lectura']
  };
  let best = 'resumenes', bestScore = 0;
  for (const [type, words] of Object.entries(scores)) {
    const score = words.reduce((sum, word) => sum + (normalized.includes(word) ? 1 : 0), 0);
    if (score > bestScore) { best = type; bestScore = score; }
  }
  return best;
}

function academicSmartTitleV276(text, type, subject) {
  const explicit = academicSmartLabeledValueV276(text, ['titulo','tema','asunto']);
  if (explicit) return explicit.replace(/[.;]+$/,'').trim().slice(0,120);
  const line = String(text || '').split('\n')
    .map(item => item.trim())
    .find(item => item && !/^(fecha|hora|lugar|materia|docente|uniforme|control|parte)\s*:/i.test(item));
  if (line && line.length <= 120) return line.replace(/^[-•]\s*/,'').trim();
  const defaults = {
    tareas: subject ? `Tarea de ${subject}` : 'Nueva tarea',
    examenes: subject ? `Examen de ${subject}` : 'Nuevo examen',
    resumenes: subject ? `Material de ${subject}` : 'Material académico',
    formaciones: 'Formación general'
  };
  return defaults[type] || 'Publicación académica';
}

function academicSmartRequiredV276(type) {
  return ({
    formaciones: ['date','place','control_time','report_time','uniform'],
    tareas: ['subject','title','due_date','body'],
    examenes: ['subject','title','date','time'],
    resumenes: ['subject','topic']
  })[type] || [];
}

function academicSmartAnalyzeOneV276(message, forcedType = '') {
  const text = academicSmartCleanTextV276(message);
  const type = academicSmartDetectTypeV276(text, forcedType);
  const subject = academicSmartSubjectV276(text);
  const teacher = academicSmartTeacherV276(text, subject);
  const date = academicSmartDateV276(text);
  const times = academicSmartTimesV276(text);
  const place = academicSmartLabeledValueV276(text, ['lugar','punto de reunion','ubicacion','aula','salon']);
  const uniform = academicSmartLabeledValueV276(text, ['uniforme','tenida']);
  const title = academicSmartTitleV276(text, type, subject);
  const priority = /\b(urgente|sin falta|ultimo plazo|obligatorio|prioritario)\b/i.test(text) ? 'urgente' : 'pendiente';

  const fields = { source_text:text, subject, teacher };
  let body = text;
  if (type === 'formaciones') {
    fields.formation_type = /servicio\s+extraordinario/i.test(text) ? 'Servicio extraordinario' : 'Formación general';
    fields.date = date;
    fields.place = place;
    fields.control_time = academicSmartLabeledTimeV276(text, ['hora de control','control']) || times[0] || '';
    fields.report_time = academicSmartLabeledTimeV276(text, ['hora del parte','parte']) || times[1] || '';
    fields.uniform = uniform;
    fields.observations = academicSmartLabeledValueV276(text, ['observaciones','observacion']);
  } else if (type === 'tareas') {
    fields.title = title;
    fields.due_date = date;
    fields.priority = priority;
  } else if (type === 'examenes') {
    fields.title = title;
    fields.date = date;
    fields.time = academicSmartLabeledTimeV276(text, ['hora','inicio']) || times[0] || '';
    fields.place = place;
  } else {
    fields.topic = academicSmartLabeledValueV276(text, ['tema','asunto']) || title;
  }

  const required = academicSmartRequiredV276(type);
  const missing = required.filter(key => !String(key === 'body' ? body : fields[key] || '').trim());
  const detected = required.length - missing.length;
  const confidence = Math.max(20, Math.min(100, Math.round((detected / Math.max(required.length,1)) * 82 + (subject ? 8 : 0) + (date ? 5 : 0) + (teacher ? 5 : 0))));
  const warnings = missing.map(key => ({
    date:'Falta la fecha', place:'Falta el lugar', control_time:'Falta la hora de control',
    report_time:'Falta la hora del parte', uniform:'Falta el uniforme',
    subject:'Falta la materia', title:'Falta el título', due_date:'Falta la fecha límite',
    body:'Falta el contenido', time:'Falta la hora', topic:'Falta el tema'
  })[key] || `Falta ${key}`);

  return {
    type, title, body, fields, confidence, warnings,
    parser_version: ACADEMIC_SMART_PARSER_VERSION_V276
  };
}

function academicAnalyzeTextV276(text, forcedType = '') {
  return academicSmartSplitV276(text).map(message => academicSmartAnalyzeOneV276(message, forcedType));
}

function academicSmartTypeLabelV276(type) {
  return ACADEMIC_TYPES[type]?.label || type;
}

function academicSmartDateTimeLabelV276(candidate) {
  const fields = candidate.fields || {};
  const date = fields.date || fields.due_date || '';
  const time = fields.time || fields.control_time || '';
  return [date, time].filter(Boolean).join(' · ') || 'Por completar';
}

function academicSmartPreviewV276(candidates, mode = 'global') {
  if (!candidates.length) return '<div class="smart-empty">Pegue un mensaje y presione “Analizar”.</div>';
  return `
    <div class="smart-analysis-summary">
      <b>${candidates.length} registro${candidates.length === 1 ? '' : 's'} detectado${candidates.length === 1 ? '' : 's'}</b>
      <small>Revise los datos antes de publicar.</small>
    </div>
    <div class="smart-table-wrap">
      <table class="smart-table">
        <thead><tr><th>Tipo</th><th>Materia / título</th><th>Fecha y hora</th><th>Análisis</th><th></th></tr></thead>
        <tbody>
          ${candidates.map((candidate,index) => `
            <tr>
              <td data-label="Tipo"><span class="smart-type">${esc(academicSmartTypeLabelV276(candidate.type))}</span></td>
              <td data-label="Contenido"><b>${esc(candidate.fields.subject || candidate.title || 'Por completar')}</b><small>${esc(candidate.title || '')}</small></td>
              <td data-label="Fecha">${esc(academicSmartDateTimeLabelV276(candidate))}</td>
              <td data-label="Análisis">
                <span class="smart-confidence ${candidate.confidence >= 80 ? 'high' : candidate.confidence >= 55 ? 'medium' : 'low'}">${candidate.confidence}%</span>
                ${candidate.warnings.length ? `<small>${esc(candidate.warnings.join(' · '))}</small>` : '<small>Datos principales detectados</small>'}
              </td>
              <td><button type="button" class="smart-use-btn" onclick="${mode === 'form' ? `academicApplySmartCandidateV276(${index})` : `academicOpenCandidateFormV276(${index})`}">Usar</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function academicDraftKeyV276(type) {
  return `${academicSession?.user_id || 'local'}:${academicSession?.course_code || 'course'}:${type}`;
}
function academicReadDraftsV276() {
  try { return JSON.parse(localStorage.getItem(ACADEMIC_DRAFT_STORAGE_V276) || '{}'); } catch { return {}; }
}
function academicReadDraftV276(type) {
  return academicReadDraftsV276()[academicDraftKeyV276(type)] || null;
}
function academicSaveDraftV276(type, form) {
  if (!form) return;
  const drafts = academicReadDraftsV276();
  const values = Object.fromEntries(new FormData(form).entries());
  delete values.file;
  drafts[academicDraftKeyV276(type)] = {
    values,
    source_text: $('#academicSmartText')?.value || '',
    smart_meta: form.dataset.smartMeta || '',
    client_request_id: form.dataset.clientRequestId || '',
    saved_at: new Date().toISOString()
  };
  try { localStorage.setItem(ACADEMIC_DRAFT_STORAGE_V276, JSON.stringify(drafts)); } catch (error) { console.warn('Borrador:', error); }
}
function academicClearDraftV276(type) {
  const drafts = academicReadDraftsV276();
  delete drafts[academicDraftKeyV276(type)];
  try { localStorage.setItem(ACADEMIC_DRAFT_STORAGE_V276, JSON.stringify(drafts)); } catch {}
}
function academicScheduleDraftV276(type, form) {
  clearTimeout(academicDraftTimerV276);
  academicDraftTimerV276 = setTimeout(() => academicSaveDraftV276(type, form), 250);
}
function academicRequestIdV276() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function academicValueV276(value) { return esc(String(value || '')); }

function academicSmartPanelV276(type, sourceText = '') {
  return `
    <section class="smart-composer">
      <div class="smart-composer-head">
        <div><span class="eyebrow">Llenado asistido</span><h3>Mensaje inteligente</h3></div>
        <span class="smart-local-chip">Análisis local</span>
      </div>
      <p>Puede pegar un comunicado de WhatsApp o texto académico. La aplicación detectará materia, fecha, hora, lugar y otros datos.</p>
      <textarea id="academicSmartText" rows="6" placeholder="Pegue aquí el mensaje completo…">${academicValueV276(sourceText)}</textarea>
      <div class="smart-actions">
        <button type="button" class="btn smart-analyze-btn" onclick="academicAnalyzeMessageInFormV276('${type}')">Analizar mensaje</button>
        <button type="button" class="btn secondary" onclick="academicClearSmartMessageV276()">Limpiar</button>
      </div>
      <div id="academicSmartPreview"></div>
    </section>
  `;
}

function academicFieldsForTypeV276(type, data = {}) {
  const fields = data.fields || data.values || data || {};
  const body = data.body ?? fields.body ?? '';
  const title = data.title ?? fields.title ?? '';
  const teacher = fields.teacher || '';
  if (type === 'formaciones') {
    return `
      <label>Tipo
        <select name="formation_type" required>
          <option ${fields.formation_type === 'Formación general' ? 'selected' : ''}>Formación general</option>
          <option ${fields.formation_type === 'Servicio extraordinario' ? 'selected' : ''}>Servicio extraordinario</option>
        </select>
      </label>
      <div class="two-col">
        <label>Fecha<input name="date" type="date" required value="${academicValueV276(fields.date || todayISO())}"></label>
        <label>Lugar<input name="place" required value="${academicValueV276(fields.place)}"></label>
      </div>
      <div class="two-col">
        <label>Hora de control<input name="control_time" type="time" required value="${academicValueV276(fields.control_time)}"></label>
        <label>Hora del parte<input name="report_time" type="time" required value="${academicValueV276(fields.report_time)}"></label>
      </div>
      <label>Uniforme<input name="uniform" required value="${academicValueV276(fields.uniform)}"></label>
      <label>Texto del comunicado<textarea name="body" rows="7" required>${academicValueV276(body)}</textarea></label>
      <label>Observaciones<textarea name="observations" rows="3">${academicValueV276(fields.observations)}</textarea></label>
    `;
  }
  if (type === 'resumenes') {
    return `
      <label>Materia<input name="subject" required value="${academicValueV276(fields.subject)}"></label>
      <label>Docente o responsable<input name="teacher" value="${academicValueV276(teacher)}"></label>
      <label>Tema<input name="topic" required value="${academicValueV276(fields.topic || title)}"></label>
      <label>Descripción del contenido<textarea name="body" rows="7" placeholder="Detalle breve del resumen, contenido académico o lista de documentos.">${academicValueV276(body)}</textarea></label>
    `;
  }
  if (type === 'tareas') {
    return `
      <label>Materia<input name="subject" required value="${academicValueV276(fields.subject)}"></label>
      <label>Docente<input name="teacher" value="${academicValueV276(teacher)}"></label>
      <label>Título<input name="title" required value="${academicValueV276(title)}"></label>
      <div class="two-col">
        <label>Fecha límite<input name="due_date" type="date" required value="${academicValueV276(fields.due_date)}"></label>
        <label>Prioridad
          <select name="priority">
            <option value="pendiente" ${fields.priority !== 'urgente' ? 'selected' : ''}>Normal</option>
            <option value="urgente" ${fields.priority === 'urgente' ? 'selected' : ''}>Urgente</option>
          </select>
        </label>
      </div>
      <label>Instrucciones<textarea name="body" rows="8" required>${academicValueV276(body)}</textarea></label>
    `;
  }
  return `
    <label>Materia<input name="subject" required value="${academicValueV276(fields.subject)}"></label>
    <label>Docente<input name="teacher" value="${academicValueV276(teacher)}"></label>
    <label>Título del examen<input name="title" required value="${academicValueV276(title)}"></label>
    <div class="two-col">
      <label>Fecha<input name="date" type="date" required value="${academicValueV276(fields.date)}"></label>
      <label>Hora<input name="time" type="time" required value="${academicValueV276(fields.time)}"></label>
    </div>
    <label>Lugar<input name="place" value="${academicValueV276(fields.place)}"></label>
    <label>Comunicado o temario<textarea name="body" rows="7">${academicValueV276(body)}</textarea></label>
  `;
}

openAcademicPostForm = function openAcademicPostFormV276(type, candidate = null) {
  const labels = ACADEMIC_TYPES[type];
  if (!labels || !academicCanPublishType(type)) return toast('Su rol no tiene permiso para publicar en este módulo');
  if (onlineConfigured() && !navigator.onLine) return toast('Necesita conexión para publicar contenido online');

  const draft = !candidate ? academicReadDraftV276(type) : null;
  const prefill = candidate || (draft ? { values:draft.values, source_text:draft.source_text } : {});
  const fileLabel = type === 'resumenes' ? 'Archivos académicos' : 'Archivo opcional';
  const fileHelp = type === 'resumenes'
    ? 'Puede seleccionar hasta 8 archivos Word, PDF o imagen dentro de la misma publicación.'
    : 'Puede adjuntar un archivo Word, PDF o imagen.';

  showModal(`
    <button class="icon-btn close" onclick="closeModal()">×</button>
    <h2>Nueva publicación · ${labels.label}</h2>
    ${draft && !candidate ? '<div class="draft-recovered"><b>Borrador recuperado</b><span>Se restauró el texto que estaba llenando.</span><button type="button" onclick="academicDiscardDraftV276(\''+type+'\')">Descartar</button></div>' : ''}
    <form id="academicPostForm" class="form smart-academic-form">
      ${academicSmartPanelV276(type, prefill.source_text || prefill.fields?.source_text || '')}
      <div class="structured-fields-title"><span>Datos estructurados</span><small>Revise y corrija antes de publicar.</small></div>
      ${academicFieldsForTypeV276(type, prefill)}
      <label>${fileLabel}
        <input id="academicFiles" type="file" ${type === 'resumenes' ? 'multiple' : ''} accept=".doc,.docx,.pdf,image/*">
      </label>
      <p class="subtle">${fileHelp}</p>
      <div id="academicSelectedFiles" class="selected-files-note"></div>
      <div class="form-actions sticky-actions">
        <button class="btn academic-main-btn" type="submit">Publicar</button>
        <button class="btn secondary" type="button" onclick="closeModal()">Cancelar</button>
      </div>
    </form>
  `);

  const form = $('#academicPostForm');
  form.dataset.clientRequestId = draft?.client_request_id || academicRequestIdV276();
  if (draft?.smart_meta) form.dataset.smartMeta = draft.smart_meta;
  if (candidate) form.dataset.smartMeta = JSON.stringify(candidate);
  form.addEventListener('input', () => academicScheduleDraftV276(type, form));
  form.addEventListener('change', () => academicScheduleDraftV276(type, form));
  form.onsubmit = event => saveAcademicPost(event, type);

  const input = $('#academicFiles');
  const preview = $('#academicSelectedFiles');
  input?.addEventListener('change', () => {
    const files = Array.from(input.files || []);
    preview.innerHTML = files.length
      ? `<div class="selected-files-list">${files.map(file => `<span><b>${esc(file.name)}</b><small>${Math.ceil(file.size/1024)} KB</small></span>`).join('')}</div>`
      : '';
  });

  if (candidate) {
    setTimeout(() => {
      academicSmartCandidatesV276 = [candidate];
      const previewBox = $('#academicSmartPreview');
      if (previewBox) previewBox.innerHTML = academicSmartPreviewV276([candidate], 'form');
    }, 0);
  }
};

function academicDiscardDraftV276(type) {
  academicClearDraftV276(type);
  closeModal();
  openAcademicPostForm(type);
}
function academicClearSmartMessageV276() {
  const area = $('#academicSmartText');
  if (area) area.value = '';
  const preview = $('#academicSmartPreview');
  if (preview) preview.innerHTML = '';
}
function academicAnalyzeMessageInFormV276(type) {
  const text = $('#academicSmartText')?.value || '';
  academicSmartCandidatesV276 = academicAnalyzeTextV276(text, type);
  const preview = $('#academicSmartPreview');
  if (preview) preview.innerHTML = academicSmartPreviewV276(academicSmartCandidatesV276, 'form');
  if (!academicSmartCandidatesV276.length) toast('Pegue un mensaje para analizar');
}
function academicApplySmartCandidateV276(index) {
  const candidate = academicSmartCandidatesV276[index];
  const form = $('#academicPostForm');
  if (!candidate || !form) return;
  const values = { ...candidate.fields, title:candidate.title, body:candidate.body };
  for (const [key,value] of Object.entries(values)) {
    const control = form.elements.namedItem(key);
    if (control && String(value || '').trim()) control.value = value;
  }
  form.dataset.smartMeta = JSON.stringify(candidate);
  academicScheduleDraftV276(candidate.type, form);
  const preview = $('#academicSmartPreview');
  if (preview) preview.innerHTML = `
    <div class="smart-applied">
      <b>Datos aplicados al formulario</b>
      <span>${candidate.warnings.length ? esc(candidate.warnings.join(' · ')) : 'El mensaje fue organizado correctamente. Revise antes de publicar.'}</span>
    </div>`;
  toast('Datos organizados. Revise el formulario');
}

function openAcademicSmartComposerV276(defaultType = '') {
  showModal(`
    <button class="icon-btn close" onclick="closeModal()">×</button>
    <span class="eyebrow">Creación rápida</span>
    <h2>Mensajes inteligentes</h2>
    <p>Pegue uno o varios comunicados. Para analizar varios por separado, coloque una línea con <b>---</b> entre cada mensaje.</p>
    <label class="smart-global-label">Tipo de contenido
      <select id="academicSmartForcedType">
        <option value="">Detectar automáticamente</option>
        ${Object.entries(ACADEMIC_TYPES).map(([key,item]) => `<option value="${key}" ${defaultType===key?'selected':''}>${esc(item.label)}</option>`).join('')}
      </select>
    </label>
    <textarea id="academicSmartGlobalText" class="smart-global-text" rows="10" placeholder="Ejemplo: Mañana formación general. Lugar: patio principal. Control 06:30, parte 06:45. Uniforme N.º 4…"></textarea>
    <div class="smart-actions">
      <button class="btn academic-main-btn" onclick="academicAnalyzeSmartComposerV276()">Analizar y armar tabla</button>
      <button class="btn secondary" onclick="closeModal()">Cancelar</button>
    </div>
    <div id="academicSmartGlobalPreview" class="smart-global-preview"></div>
  `);
}
function academicAnalyzeSmartComposerV276() {
  const text = $('#academicSmartGlobalText')?.value || '';
  const forced = $('#academicSmartForcedType')?.value || '';
  academicSmartCandidatesV276 = academicAnalyzeTextV276(text, forced);
  const box = $('#academicSmartGlobalPreview');
  if (box) box.innerHTML = academicSmartPreviewV276(academicSmartCandidatesV276, 'global');
  if (!academicSmartCandidatesV276.length) toast('Pegue al menos un mensaje');
}
function academicOpenCandidateFormV276(index) {
  const candidate = academicSmartCandidatesV276[index];
  if (!candidate) return;
  closeModal();
  openAcademicPostForm(candidate.type, candidate);
}

openAcademicPublishMenu = function openAcademicPublishMenuV276() {
  const allowed = academicAllowedTypesForRole();
  if (!allowed.length || academicIsTestSession()) return toast('Su rol es únicamente de lectura');
  showModal(`
    <button class="icon-btn close" onclick="closeModal()">×</button>
    <span class="eyebrow">Publicación académica</span>
    <h2>¿Qué desea publicar?</h2>
    <button class="smart-entry-button" onclick="closeModal();openAcademicSmartComposerV276()">
      <span>✨</span><b>Crear desde un mensaje</b><small>Analiza el texto y arma automáticamente la tabla de datos.</small>
    </button>
    <div class="academic-publish-grid">
      ${allowed.map(key => {
        const item = ACADEMIC_TYPES[key];
        return `<button onclick="closeModal();openAcademicPostForm('${key}')"><span>${item.icon}</span><b>${item.label}</b><small>${item.help}</small></button>`;
      }).join('')}
    </div>
  `);
};

academicModuleView = function academicModuleViewV276() {
  const info = ACADEMIC_TYPES[academicTab];
  const labels = {
    formaciones: 'Revise comunicados del curso, horas de control y hora del parte.',
    tareas: 'Cambie entre vista general y por materia para ubicar pendientes más rápido.',
    examenes: 'Consulte fechas, horarios, lugares y avisos de evaluación.',
    resumenes: 'Publique texto, varios archivos y material de apoyo académico.'
  };
  const canPublishHere = academicCanPublishType(academicTab);
  return `
    ${academicProfileHeader()}
    ${academicTextNav()}
    <div class="online-module-head refined clean-module-head premium-module-head">
      <div class="premium-module-copy">
        <span class="module-visual-icon">${info.icon}</span>
        <div><span class="eyebrow">Módulo académico</span><h3>${info.label}</h3><p>${labels[academicTab] || info.help}</p></div>
      </div>
      ${canPublishHere ? `<div class="module-create-actions"><button class="btn smart-outline-btn" onclick="openAcademicSmartComposerV276('${academicTab}')">Mensaje inteligente</button><button class="btn academic-main-btn premium-publish" onclick="openAcademicPostForm('${academicTab}')">Nueva publicación</button></div>` : `<span class="module-readonly-note">Consulta habilitada</span>`}
    </div>
    ${academicFilterBar()}
    <div id="academicPosts"><div class="card small"><p>Cargando contenido…</p></div></div>
  `;
};

saveAcademicPost = async function saveAcademicPostV276(event, type) {
  event.preventDefault();
  const form = event.currentTarget;
  if (form.dataset.submitting === '1') return;
  if (!academicCanPublishType(type)) return toast('Su rol no tiene permiso para publicar en este módulo');
  if (onlineConfigured() && !navigator.onLine) return toast('Necesita conexión para publicar');

  const submit = event.submitter || form.querySelector('button[type="submit"]');
  form.dataset.submitting = '1';
  if (submit) { submit.disabled = true; submit.dataset.originalText = submit.textContent; submit.textContent = 'Confirmando…'; }

  try {
    const formData = new FormData(form);
    const values = Object.fromEntries(formData.entries());
    let title = String(values.title || '').trim();
    const body = String(values.body || '').trim();
    delete values.title; delete values.body;

    if (type === 'formaciones') title = `${values.formation_type || 'Formación'} · ${values.date || 'sin fecha'}`;
    if (type === 'resumenes') title = `${values.subject || 'Resumen'} — ${values.topic || 'Tema'}`;

    const smartMeta = (() => { try { return JSON.parse(form.dataset.smartMeta || 'null'); } catch { return null; } })();
    if (smartMeta) {
      values.smart_analysis = {
        parser_version: smartMeta.parser_version || ACADEMIC_SMART_PARSER_VERSION_V276,
        confidence: smartMeta.confidence || 0,
        warnings: smartMeta.warnings || [],
        source_text: smartMeta.fields?.source_text || smartMeta.body || ''
      };
    }

    const files = academicValidateFiles($('#academicFiles')?.files || [], type);
    if (type === 'resumenes' && !body && !files.length) throw new Error('Agregue una descripción o al menos un archivo académico');

    let attachments = [];
    if (form.dataset.uploadedAttachments) {
      try { attachments = JSON.parse(form.dataset.uploadedAttachments); } catch {}
    }
    if (!attachments.length && files.length) {
      attachments = await uploadAcademicFiles(files, type);
      form.dataset.uploadedAttachments = JSON.stringify(attachments);
    }

    const primary = attachments[0] || null;
    if (attachments.length) values.attachments = attachments;
    const clientRequestId = form.dataset.clientRequestId || academicRequestIdV276();
    form.dataset.clientRequestId = clientRequestId;
    academicSaveDraftV276(type, form);

    let confirmedPost = null;
    if (onlineConfigured()) {
      try {
        const created = await academicRPCWithRetryV275('academic_create_post_v2', {
          p_token: academicSession.session_token,
          p_type: type,
          p_title: title,
          p_body: body,
          p_fields: values,
          p_file_url: primary?.url || null,
          p_file_name: primary?.name || null,
          p_file_mime: primary?.type || null,
          p_file_size: primary?.size || null,
          p_client_request_id: clientRequestId
        }, 2);
        confirmedPost = Array.isArray(created) ? created[0] : created;
      } catch (v2Error) {
        if (!/academic_create_post_v2|function.*not found|404/i.test(String(v2Error?.message || v2Error))) throw v2Error;
        const createdId = await academicRPCWithRetryV275('academic_create_post', {
          p_token: academicSession.session_token,
          p_type: type,
          p_title: title,
          p_body: body,
          p_fields: values,
          p_file_url: primary?.url || null,
          p_file_name: primary?.name || null,
          p_file_mime: primary?.type || null,
          p_file_size: primary?.size || null
        }, 2);
        const verified = await academicRPCWithRetryV275('academic_get_post', {
          p_token: academicSession.session_token,
          p_post_id: typeof createdId === 'string' ? createdId : createdId?.id
        }, 2);
        confirmedPost = Array.isArray(verified) ? verified[0] : verified;
      }
      if (!confirmedPost?.id) throw new Error('El servidor no confirmó la publicación');
      await academicMergeDurablePostV275(type, confirmedPost);
      academicLastSyncErrorV275 = null;
      academicLastSyncAtV275 = new Date().toISOString();
    } else {
      confirmedPost = {
        id:uid(), post_type:type, title, body, fields:values,
        file_url:primary?.url||null, file_name:primary?.name||null,
        file_mime:primary?.type||null, file_size:primary?.size||null,
        author_id:academicSession.user_id, author_name:academicSession.full_name,
        created_at:new Date().toISOString(), updated_at:new Date().toISOString(), archived:false
      };
      const posts = academicLocalPosts();
      posts.unshift(confirmedPost);
      academicSaveLocalPosts(posts);
      await academicMergeDurablePostV275(type, confirmedPost);
    }

    academicClearDraftV276(type);
    closeModal();
    await loadAcademicPosts();
    toast('Publicación confirmada y protegida');
  } catch (error) {
    console.error(error);
    academicSaveDraftV276(type, form);
    toast(academicFriendlyError(error, 'No se pudo confirmar la publicación. El borrador quedó guardado'));
  } finally {
    form.dataset.submitting = '0';
    if (submit) { submit.disabled = false; submit.textContent = submit.dataset.originalText || 'Publicar'; }
  }
};


/* =========================================================
   Agenda Policial Online v2.7.7
   Saneamiento visual, mensajes inteligentes por módulo
   y preparación multicurso independiente.
   ========================================================= */
const ACADEMIC_COURSES_CACHE_V277 = 'agenda-academic-courses-v277';
let academicCoursesV277 = (() => {
  try { return JSON.parse(localStorage.getItem(ACADEMIC_COURSES_CACHE_V277) || '[]'); }
  catch { return []; }
})();

function academicCourseLabelV277() {
  return academicSession?.course_label || academicSession?.course_name ||
    academicCoursesV277.find(item => item.code === academicSession?.course_code)?.label ||
    (academicSession?.course_code === 'capitanes-b-2026-2' ? 'Capitanes B' : 'Capitanes A');
}
function academicCourseMetaV277() {
  const course = academicCoursesV277.find(item => item.code === academicSession?.course_code);
  const shift = academicSession?.course_shift || course?.shift || '';
  const parallel = academicSession?.course_parallel || course?.parallel || '';
  return [parallel ? `Paralelo ${parallel}` : '', shift ? `Turno ${shift}` : ''].filter(Boolean).join(' · ');
}
function academicStoreCoursesV277(rows) {
  academicCoursesV277 = Array.isArray(rows) ? rows : [];
  try { localStorage.setItem(ACADEMIC_COURSES_CACHE_V277, JSON.stringify(academicCoursesV277)); } catch {}
}
async function academicLoadMyCoursesV277(force = false) {
  if (!academicSession) return [];
  if (!onlineConfigured() || !navigator.onLine) return academicCoursesV277;
  try {
    const rows = await academicRPC('academic_get_my_courses', { p_token: academicSession.session_token });
    academicStoreCoursesV277(rows || []);
    return academicCoursesV277;
  } catch (error) {
    if (!academicIsNetworkError(error)) console.warn('Cursos online:', error);
    return academicCoursesV277;
  }
}
function academicCanSwitchCourseV277() {
  return academicSession?.role === 'administrador_general' && academicCoursesV277.length > 1;
}

academicLogin = async function academicLoginV277() {
  const ci = $('#academicCi')?.value.trim();
  const phone = $('#academicPhone')?.value.trim();
  if (!ci || !phone) return toast('Ingrese usuario y contraseña');
  try {
    let user;
    if (onlineConfigured()) {
      try {
        user = await academicRPC('academic_login_v2', { p_ci:ci, p_phone:phone });
      } catch (error) {
        if (!/academic_login_v2|function.*not found|404/i.test(String(error?.message || error))) throw error;
        user = await academicRPC('academic_login', { p_ci:ci, p_phone:phone });
      }
    } else {
      user = await academicLocalLogin(ci, phone);
    }
    if (Array.isArray(user)) user = user[0];
    if (!user?.session_token) return toast('Usuario o contraseña incorrectos, o acceso inactivo');
    academicSession = { ...user, offline_cached:false, sync_error:false, last_validated_at:new Date().toISOString() };
    academicTab = 'panel';
    localStorage.setItem(ACADEMIC_SESSION_STORAGE, JSON.stringify(academicSession));
    await academicLoadMyCoursesV277(true);
    toast(`Acceso habilitado · ${academicCourseLabelV277()}`);
    render();
    setTimeout(() => loadAcademicDashboard(), 0);
  } catch (error) {
    console.error(error);
    toast(academicIsNetworkError(error) ? 'Sin conexión. Intente nuevamente cuando tenga internet' : academicFriendlyError(error, 'No fue posible validar las credenciales'));
  }
};

validateAcademicLocalSession = async function validateAcademicSessionV277() {
  if (!academicSession) return;
  if (onlineConfigured()) {
    if (!academicRemoteTokenIsValid(academicSession.session_token)) {
      academicSession = null;
      localStorage.removeItem(ACADEMIC_SESSION_STORAGE);
      return;
    }
    if (!navigator.onLine) {
      academicSession.offline_cached = true;
      localStorage.setItem(ACADEMIC_SESSION_STORAGE, JSON.stringify(academicSession));
      return;
    }
    try {
      let refreshed;
      try {
        refreshed = await academicRPC('academic_refresh_session_v2', { p_token:String(academicSession.session_token) });
      } catch (error) {
        if (!/academic_refresh_session_v2|function.*not found|404/i.test(String(error?.message || error))) throw error;
        refreshed = await academicRPC('academic_refresh_session', { p_token:String(academicSession.session_token) });
      }
      const user = Array.isArray(refreshed) ? refreshed[0] : refreshed;
      if (!user?.session_token || user.module_enabled === false) {
        academicSession = null;
        localStorage.removeItem(ACADEMIC_SESSION_STORAGE);
        return;
      }
      academicSession = { ...academicSession, ...user, offline_cached:false, sync_error:false, last_validated_at:new Date().toISOString() };
      localStorage.setItem(ACADEMIC_SESSION_STORAGE, JSON.stringify(academicSession));
      await academicLoadMyCoursesV277(true);
      return;
    } catch (error) {
      console.warn('Sesión conservada temporalmente:', error);
      academicSession.offline_cached = true;
      academicSession.sync_error = true;
      localStorage.setItem(ACADEMIC_SESSION_STORAGE, JSON.stringify(academicSession));
      return;
    }
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
};

async function academicSwitchCourseV277(courseCode) {
  if (!academicSession || !courseCode || courseCode === academicSession.course_code) return;
  if (!navigator.onLine) return toast('Necesita conexión para cambiar el curso online');
  const selector = $('#academicCourseSelector');
  if (selector) selector.disabled = true;
  try {
    let changed = await academicRPC('academic_select_course', {
      p_token: academicSession.session_token,
      p_course_code: courseCode
    });
    if (Array.isArray(changed)) changed = changed[0];
    if (!changed?.course_code) throw new Error('El servidor no confirmó el cambio de curso');
    academicSession = { ...academicSession, ...changed, offline_cached:false, sync_error:false };
    localStorage.setItem(ACADEMIC_SESSION_STORAGE, JSON.stringify(academicSession));
    academicUsersCache = [];
    academicFilter = academicDefaultFilter('formaciones');
    academicTab = 'panel';
    await academicLoadMyCoursesV277(true);
    render();
    setTimeout(() => loadAcademicDashboard(), 0);
    toast(`Curso activo: ${academicCourseLabelV277()}`);
  } catch (error) {
    console.error(error);
    toast(academicFriendlyError(error, 'No se pudo cambiar de curso'));
    if (selector) selector.value = academicSession.course_code;
  } finally {
    if (selector) selector.disabled = false;
  }
}

academicProfileHeader = function academicProfileHeaderV277() {
  const connection = academicConnectionState();
  const name = academicDisplayName();
  const options = academicCoursesV277.length
    ? academicCoursesV277.map(course => `<option value="${esc(course.code)}" ${course.code === academicSession?.course_code ? 'selected' : ''}>${esc(course.label)}</option>`).join('')
    : `<option value="${esc(academicSession?.course_code || '')}">${esc(academicCourseLabelV277())}</option>`;
  return `
    <div class="online-profile premium-profile compact-profile v277-profile">
      <div class="online-avatar premium compact-avatar">${esc(academicInitials(name))}</div>
      <div class="online-profile-copy compact-copy">
        <span class="eyebrow">Área académica online</span>
        <h2 class="profile-name-compact" title="${esc(name)}">${esc(name)}</h2>
        <div class="profile-course-line">
          ${academicCanSwitchCourseV277()
            ? `<label class="course-selector-label"><span>Curso activo</span><select id="academicCourseSelector" onchange="academicSwitchCourseV277(this.value)">${options}</select></label>`
            : `<span class="current-course-chip">${esc(academicCourseLabelV277())}${academicCourseMetaV277() ? ` · ${esc(academicCourseMetaV277())}` : ''}</span>`}
        </div>
        <div class="online-profile-meta enhanced-meta">
          <span class="role-chip">${esc(academicRoleTone(academicSession?.role))}</span>
          <span class="sync-pill ${connection.cls}">${connection.label}</span>
        </div>
      </div>
      <button class="online-logout premium-logout compact-logout" onclick="academicLogout()" aria-label="Cerrar sesión">Salir</button>
    </div>
  `;
};

academicTextNav = function academicTextNavV277() {
  const items = [
    ['panel','Panel','⌂'],
    ['formaciones','Formaciones','🛡️'],
    ['tareas','Tareas','📘'],
    ['examenes','Exámenes','📝'],
    ['resumenes','Material','📚']
  ];
  if (academicCanManageUsers()) items.push(['usuarios','Nómina','👥']);
  if (academicSession?.role === 'administrador_general') items.push(['cursos','Cursos','▦']);
  return `
    <nav class="academic-text-nav academic-text-nav-premium olive-gold-nav v277-nav" aria-label="Secciones académicas">
      ${items.map(([key,label,icon]) => `<button class="${academicTab === key ? 'active' : ''}" onclick="setAcademicTab('${key}')"><span>${icon}</span><b>${label}</b></button>`).join('')}
    </nav>
  `;
};
academicSubnav = function academicSubnavV277() { return academicTextNav(); };

academicDashboard = function academicDashboardV277() {
  return `
    ${academicProfileHeader()}
    ${academicTextNav()}
    <section class="academic-welcome compact-panel-hero v277-dashboard-hero">
      <div>
        <span class="eyebrow">${academicGreeting()} · ${esc(academicCourseLabelV277())}</span>
        <h2>Resumen académico</h2>
        <p id="academicTodayText">Revisando la actividad de hoy…</p>
      </div>
    </section>
    <div class="academic-summary-grid compact-summary-grid" id="academicSummaryGrid">
      ${['Formación','Tareas','Examen','Material'].map(label => `<div class="academic-summary-card loading"><strong>—</strong><b>${label}</b><small>Cargando…</small></div>`).join('')}
    </div>
    <section class="academic-today-card elevated-block compact-online-block">
      <div class="online-section-heading compact"><div><span class="eyebrow">Información prioritaria</span><h3>Hoy y próximos días</h3></div></div>
      <div id="academicUpcomingList" class="academic-timeline"><div class="academic-loading-line"></div></div>
    </section>
    <section class="academic-recent-card elevated-block compact-online-block">
      <div class="online-section-heading compact"><div><span class="eyebrow">Actualizaciones</span><h3>Actividad reciente</h3></div></div>
      <div id="academicRecentList"><div class="academic-loading-line"></div></div>
    </section>
  `;
};

function academicNewLabelV277(type) {
  return ({
    formaciones:'Nueva formación',
    tareas:'Nueva tarea',
    examenes:'Nuevo examen',
    resumenes:'Nuevo material'
  })[type] || 'Nueva publicación';
}
function academicSmartHelpV277(type) {
  return ({
    formaciones:'Pegue únicamente el comunicado de formación. Se buscarán fecha, lugar, control, parte y uniforme.',
    tareas:'Pegue únicamente la instrucción de la tarea. Se buscarán materia, docente, entrega, prioridad e indicaciones.',
    examenes:'Pegue únicamente el aviso del examen. Se buscarán materia, fecha, hora, lugar y temario.',
    resumenes:'Pegue únicamente el mensaje del material académico. Se buscarán materia, tema y descripción.'
  })[type] || '';
}

academicFilterBar = function academicFilterBarV277() {
  const options = academicFilterOptions(academicTab);
  const supportsSubject = ['tareas','examenes','resumenes'].includes(academicTab);
  return `
    <div class="academic-compact-controls">
      <label><span>Mostrar</span>
        <select onchange="setAcademicFilter(this.value)">
          ${options.map(([key,label]) => `<option value="${key}" ${academicFilter === key ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
      </label>
      ${supportsSubject ? `<div class="academic-view-switch compact-switch"><button class="${academicViewMode === 'general' ? 'active' : ''}" onclick="setAcademicViewMode('general')">General</button><button class="${academicViewMode === 'subject' ? 'active' : ''}" onclick="setAcademicViewMode('subject')">Por materia</button></div>` : ''}
    </div>
  `;
};

academicModuleView = function academicModuleViewV277() {
  const info = ACADEMIC_TYPES[academicTab];
  const descriptions = {
    formaciones:'Comunicados, horas de control, parte, lugar y uniforme.',
    tareas:'Trabajos, entregas y seguimiento por materia.',
    examenes:'Fechas, horarios, lugares y temarios.',
    resumenes:'Resúmenes, documentos y material de apoyo.'
  };
  const canPublishHere = academicCanPublishType(academicTab);
  return `
    ${academicProfileHeader()}
    ${academicTextNav()}
    <div class="online-module-head premium-module-head v277-module-head">
      <div class="premium-module-copy">
        <span class="module-visual-icon">${info.icon}</span>
        <div><span class="eyebrow">${esc(academicCourseLabelV277())}</span><h3>${info.label}</h3><p>${descriptions[academicTab] || info.help}</p></div>
      </div>
      ${canPublishHere ? `<button class="btn academic-main-btn premium-publish" onclick="openAcademicPostForm('${academicTab}')">${esc(academicNewLabelV277(academicTab))}</button>` : ''}
    </div>
    ${academicFilterBar()}
    <div id="academicPosts"><div class="card small"><p>Cargando contenido…</p></div></div>
  `;
};

function academicSmartInlinePanelV277(type, sourceText = '') {
  return `
    <section id="academicSmartInlinePanel" class="smart-composer v277-smart-inline" hidden>
      <div class="smart-composer-head">
        <div><span class="eyebrow">Mensaje inteligente · ${esc(ACADEMIC_TYPES[type]?.label || '')}</span><h3>Analizar y completar</h3></div>
        <span class="smart-local-chip">En el dispositivo</span>
      </div>
      <p>${esc(academicSmartHelpV277(type))}</p>
      <textarea id="academicSmartText" rows="6" placeholder="Pegue aquí el mensaje completo…">${academicValueV276(sourceText)}</textarea>
      <div class="smart-actions">
        <button type="button" class="btn smart-analyze-btn" onclick="academicAnalyzeMessageInlineV277('${type}')">Analizar texto</button>
        <button type="button" class="btn secondary" onclick="academicClearSmartMessageV276()">Limpiar</button>
      </div>
      <div id="academicSmartPreview"></div>
    </section>
  `;
}
function academicToggleEntryModeV277(mode) {
  const panel = $('#academicSmartInlinePanel');
  const manualButton = $('#academicModeManual');
  const smartButton = $('#academicModeSmart');
  const isSmart = mode === 'smart';
  if (panel) panel.hidden = !isSmart;
  manualButton?.classList.toggle('active', !isSmart);
  smartButton?.classList.toggle('active', isSmart);
  if (isSmart) setTimeout(() => $('#academicSmartText')?.focus(), 50);
}
function academicAnalyzeMessageInlineV277(type) {
  const text = $('#academicSmartText')?.value || '';
  academicSmartCandidatesV276 = academicAnalyzeTextV276(text, type);
  const preview = $('#academicSmartPreview');
  if (preview) preview.innerHTML = academicSmartPreviewV276(academicSmartCandidatesV276, 'form');
  if (!academicSmartCandidatesV276.length) toast('Pegue un mensaje para analizar');
}
academicApplySmartCandidateV276 = function academicApplySmartCandidateV277(index) {
  const candidate = academicSmartCandidatesV276[index];
  const form = $('#academicPostForm');
  if (!candidate || !form) return;
  const values = { ...candidate.fields, title:candidate.title, body:candidate.body };
  Object.entries(values).forEach(([key,value]) => {
    const control = form.elements.namedItem(key);
    if (control && String(value || '').trim()) control.value = value;
  });
  form.dataset.smartMeta = JSON.stringify(candidate);
  academicScheduleDraftV276(candidate.type, form);
  const preview = $('#academicSmartPreview');
  if (preview) preview.innerHTML = `<div class="smart-applied"><b>Formulario completado</b><span>${candidate.warnings.length ? esc(candidate.warnings.join(' · ')) : 'Datos principales detectados. Revise y publique.'}</span></div>`;
  toast('Datos organizados. Revise antes de publicar');
};

openAcademicPostForm = function openAcademicPostFormV277(type, candidate = null) {
  const labels = ACADEMIC_TYPES[type];
  if (!labels || !academicCanPublishType(type)) return toast('Su rol no tiene permiso para publicar en este módulo');
  if (onlineConfigured() && !navigator.onLine) return toast('Necesita conexión para publicar contenido online');

  const draft = !candidate ? academicReadDraftV276(type) : null;
  const prefill = candidate || (draft ? { values:draft.values, source_text:draft.source_text } : {});
  const fileLabel = type === 'resumenes' ? 'Archivos académicos' : 'Archivo opcional';
  const fileHelp = type === 'resumenes'
    ? 'Hasta 8 archivos Word, PDF o imagen.'
    : 'Word, PDF o imagen.';

  showModal(`
    <button class="icon-btn close" onclick="closeModal()">×</button>
    <div class="v277-form-heading"><span class="eyebrow">${esc(academicCourseLabelV277())}</span><h2>${esc(academicNewLabelV277(type))}</h2></div>
    ${draft && !candidate ? `<div class="draft-recovered"><b>Borrador recuperado</b><span>Se restauró la información que estaba llenando.</span><button type="button" onclick="academicDiscardDraftV276('${type}')">Descartar</button></div>` : ''}
    <form id="academicPostForm" class="form smart-academic-form v277-post-form">
      <div class="entry-mode-switch" aria-label="Forma de llenado">
        <button id="academicModeManual" type="button" class="active" onclick="academicToggleEntryModeV277('manual')">Llenado manual</button>
        <button id="academicModeSmart" type="button" onclick="academicToggleEntryModeV277('smart')">Mensaje inteligente</button>
      </div>
      ${academicSmartInlinePanelV277(type, prefill.source_text || prefill.fields?.source_text || '')}
      <div class="structured-fields-title"><span>Información de ${esc(labels.label.toLowerCase())}</span><small>Revise antes de publicar.</small></div>
      ${academicFieldsForTypeV276(type, prefill)}
      <label>${fileLabel}<input id="academicFiles" type="file" ${type === 'resumenes' ? 'multiple' : ''} accept=".doc,.docx,.pdf,image/*"></label>
      <p class="subtle compact-file-help">${fileHelp}</p>
      <div id="academicSelectedFiles" class="selected-files-note"></div>
      <div class="form-actions sticky-actions">
        <button class="btn academic-main-btn" type="submit">Publicar</button>
        <button class="btn secondary" type="button" onclick="closeModal()">Cancelar</button>
      </div>
    </form>
  `);

  const form = $('#academicPostForm');
  form.dataset.clientRequestId = draft?.client_request_id || academicRequestIdV276();
  if (draft?.smart_meta) form.dataset.smartMeta = draft.smart_meta;
  if (candidate) form.dataset.smartMeta = JSON.stringify(candidate);
  form.addEventListener('input', () => academicScheduleDraftV276(type, form));
  form.addEventListener('change', () => academicScheduleDraftV276(type, form));
  form.onsubmit = event => saveAcademicPost(event, type);

  const input = $('#academicFiles');
  const preview = $('#academicSelectedFiles');
  input?.addEventListener('change', () => {
    const files = Array.from(input.files || []);
    preview.innerHTML = files.length
      ? `<div class="selected-files-list">${files.map(file => `<span><b>${esc(file.name)}</b><small>${Math.ceil(file.size/1024)} KB</small></span>`).join('')}</div>`
      : '';
  });

  if (candidate || prefill.source_text) {
    academicToggleEntryModeV277('smart');
    setTimeout(() => {
      if (candidate) {
        academicSmartCandidatesV276 = [candidate];
        const previewBox = $('#academicSmartPreview');
        if (previewBox) previewBox.innerHTML = academicSmartPreviewV276([candidate], 'form');
      }
    }, 0);
  }
};

openAcademicPublishMenu = function openAcademicPublishMenuV277() {
  const allowed = academicAllowedTypesForRole();
  if (!allowed.length || academicIsTestSession()) return toast('Su rol es únicamente de lectura');
  showModal(`
    <button class="icon-btn close" onclick="closeModal()">×</button>
    <span class="eyebrow">${esc(academicCourseLabelV277())}</span>
    <h2>Nueva publicación</h2>
    <div class="academic-publish-grid compact-publish-grid">
      ${allowed.map(key => {
        const item = ACADEMIC_TYPES[key];
        return `<button onclick="closeModal();openAcademicPostForm('${key}')"><span>${item.icon}</span><b>${esc(academicNewLabelV277(key))}</b></button>`;
      }).join('')}
    </div>
  `);
};

academicUsersView = function academicUsersViewV277() {
  return `
    ${academicProfileHeader()}
    ${academicTextNav()}
    <div class="online-module-head premium-module-head v277-module-head">
      <div class="premium-module-copy">
        <span class="module-visual-icon">👥</span>
        <div><span class="eyebrow">${esc(academicCourseLabelV277())}</span><h3>Nómina y roles</h3><p>Integrantes y permisos exclusivos del curso activo.</p></div>
      </div>
      <button class="btn academic-main-btn" onclick="openAcademicUserForm()">Agregar integrante</button>
    </div>
    <div class="roster-actions v277-roster-actions">
      <label class="roster-search"><span>Buscar</span><input id="academicUserSearch" placeholder="Apellido o C.I." oninput="filterAcademicUsers()"></label>
      <label class="roster-filter"><span>Rol</span><select id="academicRoleFilter" onchange="filterAcademicUsers()"><option value="">Todos</option><option value="encargado_curso">Encargado</option><option value="administrador_academico">Administrador académico</option><option value="asistente_academico">Asistente</option><option value="lector">Lectores</option></select></label>
    </div>
    <details class="compact-import-panel"><summary>Importar nómina desde CSV</summary><p>Use esta opción cuando disponga de la lista oficial con nombres, C.I. y celulares.</p><button class="btn secondary" onclick="openRosterImport()">Seleccionar archivo CSV</button></details>
    <div id="academicUsersSummary" class="roster-summary"></div>
    <div id="academicUsersList"><div class="card small"><p>Cargando nómina…</p></div></div>
  `;
};

function academicCoursesViewV277() {
  return `
    ${academicProfileHeader()}
    ${academicTextNav()}
    <div class="online-module-head premium-module-head v277-module-head">
      <div class="premium-module-copy">
        <span class="module-visual-icon">▦</span>
        <div><span class="eyebrow">Administración general</span><h3>Cursos online</h3><p>Espacios independientes, nóminas y contenido separado.</p></div>
      </div>
      <button class="btn academic-main-btn" onclick="openAcademicCourseFormV277()">Nuevo curso</button>
    </div>
    <div id="academicCoursesList"><div class="card small"><p>Cargando cursos…</p></div></div>
  `;
}
async function loadAcademicCoursesViewV277() {
  const box = $('#academicCoursesList');
  if (!box || !academicSession) return;
  try {
    const rows = await academicRPC('academic_admin_courses', { p_token:academicSession.session_token });
    academicStoreCoursesV277((rows || []).map(course => ({
      ...course,
      my_role:'administrador_general',
      is_selected:course.code === academicSession.course_code
    })));
    box.innerHTML = rows?.length ? rows.map(course => {
      const expected = Number(course.expected_members || 0);
      const registered = Number(course.registered_members || 0);
      const pending = Math.max(expected - registered, 0);
      const selected = course.code === academicSession.course_code;
      return `
        <article class="course-admin-card ${selected ? 'selected' : ''}">
          <div class="course-admin-main">
            <span class="course-parallel">${esc(course.level || 'Curso')} ${course.parallel ? `· ${esc(course.parallel)}` : ''}</span>
            <h3>${esc(course.label)}</h3>
            <p>${esc(course.shift || '')}${course.period_name ? ` · ${esc(course.period_name)}` : ''}</p>
          </div>
          <div class="course-admin-stats">
            <span><b>${registered}</b><small>registrados</small></span>
            <span><b>${expected || '—'}</b><small>previstos</small></span>
            <span><b>${pending}</b><small>pendientes</small></span>
          </div>
          <div class="course-admin-footer">
            <span class="course-state ${course.module_enabled ? 'on' : 'off'}">${course.module_enabled ? 'Online habilitado' : 'Online cerrado'}</span>
            ${selected ? '<span class="selected-course-label">Curso activo</span>' : `<button class="btn secondary" onclick="academicSwitchCourseV277('${esc(course.code)}')">Abrir curso</button>`}
          </div>
        </article>`;
    }).join('') : '<div class="card small"><p>No existen cursos configurados.</p></div>';
  } catch (error) {
    console.error(error);
    box.innerHTML = '<div class="card warn-card"><p>No fue posible consultar los cursos.</p></div>';
  }
}
function academicSlugV277(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}
function openAcademicCourseFormV277() {
  const schedules = typeof scheduleCatalog === 'function' ? scheduleCatalog() : [];
  showModal(`
    <button class="icon-btn close" onclick="closeModal()">×</button>
    <span class="eyebrow">Administración general</span>
    <h2>Crear curso online</h2>
    <form id="academicCourseForm" class="form">
      <label>Nombre del curso<input name="label" required placeholder="Ej.: Capitanes C"></label>
      <div class="two-col"><label>Nivel<input name="level" required placeholder="Capitanes"></label><label>Paralelo<input name="parallel" required maxlength="8" placeholder="C"></label></div>
      <div class="two-col"><label>Turno<select name="shift"><option>Mañana</option><option>Tarde</option><option>Noche</option><option>Mixto</option></select></label><label>Integrantes previstos<input name="expected_members" type="number" min="0" value="0"></label></div>
      <label>Periodo<input name="period_name" value="Segundo semestre · Gestión 2026"></label>
      <label>Horario offline relacionado<select name="schedule_catalog_id"><option value="">Sin relacionar</option>${schedules.map(item => `<option value="${esc(item.id)}">${esc(item.etiqueta || item.id)}</option>`).join('')}</select></label>
      <div class="form-actions"><button class="btn academic-main-btn" type="submit">Crear curso</button><button class="btn secondary" type="button" onclick="closeModal()">Cancelar</button></div>
    </form>
  `);
  $('#academicCourseForm').onsubmit = saveAcademicCourseV277;
}
async function saveAcademicCourseV277(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form).entries());
  const code = `${academicSlugV277(values.label)}-2026-2`;
  const submit = event.submitter;
  if (submit) { submit.disabled = true; submit.textContent = 'Creando…'; }
  try {
    await academicRPC('academic_create_course', {
      p_token:academicSession.session_token,
      p_code:code,
      p_label:values.label,
      p_level:values.level,
      p_parallel:values.parallel,
      p_shift:values.shift,
      p_period_name:values.period_name,
      p_expected_members:Number(values.expected_members || 0),
      p_schedule_catalog_id:values.schedule_catalog_id || null
    });
    closeModal();
    await academicLoadMyCoursesV277(true);
    render();
    setTimeout(() => loadAcademicCoursesViewV277(), 0);
    toast('Curso online creado');
  } catch (error) {
    console.error(error);
    toast(academicFriendlyError(error, 'No se pudo crear el curso'));
    if (submit) { submit.disabled = false; submit.textContent = 'Crear curso'; }
  }
}

renderOnline = function renderOnlineV277() {
  if (!academicSession) return onlineLoginView();
  if (academicTab === 'panel') return `<section class="online-page">${academicDashboard()}</section>`;
  if (academicTab === 'usuarios' && academicCanManageUsers()) return `<section class="online-page">${academicUsersView()}</section>`;
  if (academicTab === 'cursos' && academicSession?.role === 'administrador_general') return `<section class="online-page">${academicCoursesViewV277()}</section>`;
  if (!ACADEMIC_TYPES[academicTab]) academicTab = 'panel';
  return `<section class="online-page">${academicModuleView()}</section>`;
};

setAcademicTab = async function setAcademicTabV277(tab) {
  academicTab = tab;
  if (ACADEMIC_TYPES[tab]) academicFilter = academicDefaultFilter(tab);
  render();
  setTimeout(() => {
    if (ACADEMIC_TYPES[tab]) loadAcademicPosts();
    if (tab === 'usuarios') loadAcademicUsers();
    if (tab === 'cursos') loadAcademicCoursesViewV277();
    if (tab === 'panel') loadAcademicDashboard();
  }, 0);
};

const _renderOnlineMulticourseV277 = render;
render = function renderWithMulticourseV277() {
  _renderOnlineMulticourseV277();
  if (state.activated && state.mode && state.view === 'online' && academicSession) {
    setTimeout(() => {
      academicLoadMyCoursesV277().then(rows => {
        if (rows.length > 1 && !$('#academicCourseSelector') && academicSession?.role === 'administrador_general') {
          _renderOnlineMulticourseV277();
        }
      });
      if (academicTab === 'cursos') loadAcademicCoursesViewV277();
    }, 0);
  }
};


/* =========================================================
   Agenda Policial Online v2.7.8 — rol oficial de exámenes
   ========================================================= */
const ACADEMIC_EXAM_ROLE_ASSET_V278 = 'assets/rol-examenes-primer-parcial-2026.jpg';

function academicExamRoleDateLabelV278(iso) {
  if (!iso) return '';
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('es-BO', { weekday:'short', day:'2-digit', month:'short' })
    .replace('.', '');
}

function academicExamRoleScheduleV278(fields) {
  const rows = Array.isArray(fields?.schedule) ? fields.schedule : [];
  if (!rows.length) return '';
  return `<div class="exam-role-schedule-v278">${rows.map(item => {
    const subjects = Array.isArray(item.subjects) ? item.subjects : [];
    return `<div class="exam-role-day-v278">
      <span>${esc(academicExamRoleDateLabelV278(item.date))}</span>
      <div>${subjects.map(subject => `<b>${esc(subject)}</b>`).join('')}</div>
    </div>`;
  }).join('')}</div>`;
}

function openAcademicExamRoleV278(asset = ACADEMIC_EXAM_ROLE_ASSET_V278) {
  const safeAsset = String(asset || ACADEMIC_EXAM_ROLE_ASSET_V278);
  showModal(`
    <button class="icon-btn close" onclick="closeModal()">×</button>
    <span class="eyebrow">Documento oficial</span>
    <h2>Rol de exámenes · 1er parcial</h2>
    <p class="subtle">La imagen se conserva como referencia oficial. Puede ampliarla directamente en el dispositivo.</p>
    <div class="exam-role-image-wrap-v278">
      <img src="${esc(safeAsset)}" alt="Rol oficial de exámenes del primer parcial" loading="eager">
    </div>
    <div class="form-actions">
      <a class="btn academic-main-btn" href="${esc(safeAsset)}" target="_blank" rel="noopener">Abrir imagen completa</a>
      <button class="btn secondary" type="button" onclick="closeModal()">Cerrar</button>
    </div>
  `);
}

const academicPostCardBeforeV278 = academicPostCard;
academicPostCard = function academicPostCardV278(post) {
  const fields = post?.fields || {};
  if (post?.post_type !== 'examenes' || !fields.role_reference) {
    return academicPostCardBeforeV278(post);
  }
  const asset = fields.reference_asset || ACADEMIC_EXAM_ROLE_ASSET_V278;
  const dateRange = [fields.date, fields.end_date].filter(Boolean).join(' al ');
  return `<article class="card academic-post exam-role-card-v278">
    <div class="row between">
      <span class="tag">Exámenes</span>
      <span class="academic-status exam">Rol oficial</span>
    </div>
    <div class="exam-role-heading-v278">
      <div class="exam-role-icon-v278">📝</div>
      <div>
        <span class="eyebrow">${esc(fields.course_label || academicCourseLabelV277())}</span>
        <h3>${esc(post.title || 'Rol oficial de exámenes')}</h3>
        <p>${dateRange ? `Vigencia: ${esc(dateRange)}` : 'Consulte las fechas oficiales.'}</p>
      </div>
    </div>
    ${academicExamRoleScheduleV278(fields)}
    <div class="exam-role-actions-v278">
      <button class="btn academic-main-btn" onclick="openAcademicExamRoleV278('${esc(asset)}')">Ver rol completo</button>
    </div>
    <p class="exam-role-source-v278">Los horarios y docentes exactos deben verificarse en la imagen oficial.</p>
  </article>`;
};


/* =========================================================
   Agenda Policial Online v2.8.1 — Banco de preguntas
   ========================================================= */
const ACADEMIC_BANK_CACHE_V279 = 'agenda-question-banks-v279';
let academicBankRowsV279 = [];
let academicBankSearchV279 = '';
let academicBankAdminQuestionsV279 = new Map();
let academicBankImportRowsV279 = [];
let academicBankActiveAttemptV279 = null;
let academicBankAttemptIndexV279 = 0;
let academicBankAttemptAnswersV279 = new Map();
let academicBankSubmittingV279 = false;

function academicCanManageBankV279(){
  return ['administrador_general','administrador_academico','encargado_curso','asistente_academico'].includes(academicSession?.role) && !academicIsTestSession();
}
function academicBankCacheKeyV279(){
  return `${ACADEMIC_BANK_CACHE_V279}:${academicSession?.course_code || 'curso'}`;
}
function academicBankStoreCacheV279(rows){
  academicBankRowsV279 = Array.isArray(rows) ? rows : [];
  try{ localStorage.setItem(academicBankCacheKeyV279(), JSON.stringify({rows:academicBankRowsV279,saved_at:new Date().toISOString()})); }catch{}
}
function academicBankReadCacheV279(){
  try{
    const parsed=JSON.parse(localStorage.getItem(academicBankCacheKeyV279())||'{}');
    return Array.isArray(parsed.rows)?parsed.rows:[];
  }catch{return []}
}
function academicBankModeLabelV279(mode){
  return ({estudio:'Estudio',evaluacion:'Evaluación',mixto:'Estudio + evaluación'})[mode] || mode || 'Banco';
}
function academicBankStatusV279(bank){
  if(!bank.published)return '<span class="bank-status-v279 draft">Borrador</span>';
  return '<span class="bank-status-v279 published">Publicado</span>';
}
function academicBankNormalizeV279(value){
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
}
function academicBankVisibleRowsV279(){
  const query=academicBankNormalizeV279(academicBankSearchV279).trim();
  if(!query)return academicBankRowsV279;
  return academicBankRowsV279.filter(bank=>academicBankNormalizeV279([bank.subject,bank.topic,bank.title].join(' ')).includes(query));
}

academicTextNav = function academicTextNavV279(){
  const items=[
    ['panel','Panel','⌂'],['formaciones','Formaciones','🛡️'],['tareas','Tareas','📘'],['examenes','Exámenes','📝'],
    ['banco','Banco','❓'],['resumenes','Material','📚']
  ];
  if(academicCanManageUsers())items.push(['usuarios','Nómina','👥']);
  if(academicSession?.role==='administrador_general')items.push(['cursos','Cursos','▦']);
  return `<nav class="academic-text-nav academic-text-nav-premium olive-gold-nav v277-nav v279-nav" aria-label="Secciones académicas">
    ${items.map(([key,label,icon])=>`<button class="${academicTab===key?'active':''}" onclick="setAcademicTab('${key}')"><span>${icon}</span><b>${label}</b></button>`).join('')}
  </nav>`;
};
academicSubnav = function academicSubnavV279(){ return academicTextNav(); };

function academicBankViewV279(){
  return `
    ${academicProfileHeader()}
    ${academicTextNav()}
    <div class="online-module-head premium-module-head v277-module-head bank-head-v279">
      <div class="premium-module-copy">
        <span class="module-visual-icon">❓</span>
        <div><span class="eyebrow">${esc(academicCourseLabelV277())}</span><h3>Banco de preguntas</h3><p>Práctica por materia y simulacros con resultado individual.</p></div>
      </div>
      ${academicCanManageBankV279()?'<button class="btn academic-main-btn" onclick="openAcademicBankFormV279()">Nuevo banco</button>':''}
    </div>
    <div class="bank-toolbar-v279">
      <label><span>Buscar</span><input id="academicBankSearch" placeholder="Materia o tema" value="${esc(academicBankSearchV279)}" oninput="academicFilterBanksV279(this.value)"></label>
      <div class="bank-toolbar-note-v279">${navigator.onLine?'Sincronizado con el curso activo':'Sin conexión · mostrando copia guardada'}</div>
    </div>
    <div id="academicBankListV279"><div class="card small"><p>Cargando bancos…</p></div></div>
  `;
}

async function loadAcademicBanksV279(){
  const box=$('#academicBankListV279');
  if(!box||!academicSession)return;
  try{
    let rows=[];
    if(onlineConfigured()&&navigator.onLine){
      rows=await academicRPCWithRetryV275('academic_bank_list',{p_token:academicSession.session_token},2);
      academicBankStoreCacheV279(rows||[]);
    }else{
      rows=academicBankReadCacheV279();
      academicBankRowsV279=rows;
    }
    academicRenderBankListV279();
  }catch(error){
    console.error(error);
    academicBankRowsV279=academicBankReadCacheV279();
    academicRenderBankListV279(true);
  }
}
function academicFilterBanksV279(value){
  academicBankSearchV279=String(value||'');
  academicRenderBankListV279();
}
function academicRenderBankListV279(syncError=false){
  const box=$('#academicBankListV279'); if(!box)return;
  const rows=academicBankVisibleRowsV279();
  const warning=syncError?'<div class="academic-sync-banner warning"><div><b>No se pudo actualizar</b><small>Se muestra la última copia disponible.</small></div><button onclick="loadAcademicBanksV279()">Reintentar</button></div>':'';
  if(!rows.length){
    box.innerHTML=warning+`<div class="bank-empty-v279"><span>❓</span><b>No hay bancos de preguntas disponibles.</b><p>${academicCanManageBankV279()?'Puede crear el primer banco por materia y cargar preguntas manualmente, desde texto o CSV.':'Cuando se publique un banco para este curso aparecerá aquí.'}</p></div>`;
    return;
  }
  box.innerHTML=warning+`<div class="bank-grid-v279">${rows.map(academicBankCardV279).join('')}</div>`;
}
function academicBankCardV279(bank){
  const attempts=Number(bank.my_attempts||0);
  const best=bank.my_best_score===null||bank.my_best_score===undefined?'—':`${Number(bank.my_best_score).toFixed(0)}%`;
  const count=Number(bank.question_count||0);
  const mode=bank.bank_mode||'mixto';
  const disabled=!navigator.onLine?'disabled':'';
  let action='';
  if(bank.published){
    if(mode==='estudio') action=`<button class="btn bank-study-btn-v279" ${disabled} onclick="startAcademicBankAttemptV279('${bank.id}','estudio')">Estudiar</button>`;
    else if(mode==='evaluacion') action=`<button class="btn academic-main-btn" ${disabled} onclick="startAcademicBankAttemptV279('${bank.id}','evaluacion')">Simulacro</button>`;
    else action=`<button class="btn bank-study-btn-v279" ${disabled} onclick="startAcademicBankAttemptV279('${bank.id}','estudio')">Estudiar</button><button class="btn academic-main-btn" ${disabled} onclick="startAcademicBankAttemptV279('${bank.id}','evaluacion')">Simulacro</button>`;
  }
  return `<article class="bank-card-v279 ${bank.published?'':'draft'}">
    <div class="bank-card-top-v279"><span class="bank-subject-v279">${esc(bank.subject)}</span>${academicBankStatusV279(bank)}</div>
    <h3>${esc(bank.title||bank.topic)}</h3><p>${esc(bank.topic)}</p>
    ${bank.description?`<small class="bank-description-v279">${esc(bank.description)}</small>`:''}
    <div class="bank-metrics-v279">
      <span><b>${count}</b><small>preguntas</small></span><span><b>${esc(academicBankModeLabelV279(mode))}</b><small>modalidad</small></span><span><b>${best}</b><small>mejor nota</small></span>
    </div>
    <div class="bank-card-actions-v279">${action}${attempts?`<button class="text-btn bank-history-btn-v279" onclick="openAcademicBankHistoryV279('${bank.id}')">Historial (${attempts})</button>`:''}${academicCanManageBankV279()?`<button class="text-btn bank-manage-btn-v279" onclick="openAcademicBankManageV279('${bank.id}')">Administrar</button>`:''}</div>
  </article>`;
}

function openAcademicBankFormV279(bankId=''){
  const bank=academicBankRowsV279.find(item=>String(item.id)===String(bankId))||{};
  const editing=Boolean(bank.id);
  showModal(`<button class="icon-btn close" onclick="closeModal()">×</button>
    <span class="eyebrow">${esc(academicCourseLabelV277())}</span><h2>${editing?'Editar banco':'Nuevo banco de preguntas'}</h2>
    <form id="academicBankFormV279" class="form bank-form-v279">
      <label>Materia<input name="subject" required value="${esc(bank.subject||'')}" placeholder="Ej.: Ciencia Política"></label>
      <label>Tema<input name="topic" required value="${esc(bank.topic||'')}" placeholder="Ej.: Crisis institucional y rol del Estado"></label>
      <label>Título<input name="title" value="${esc(bank.title||'')}" placeholder="Si queda vacío se usará el tema"></label>
      <label>Descripción<textarea name="description" rows="3" placeholder="Indicaciones opcionales">${esc(bank.description||'')}</textarea></label>
      <div class="two-col"><label>Modalidad<select name="bank_mode"><option value="mixto" ${bank.bank_mode==='mixto'||!bank.bank_mode?'selected':''}>Estudio + evaluación</option><option value="estudio" ${bank.bank_mode==='estudio'?'selected':''}>Solo estudio</option><option value="evaluacion" ${bank.bank_mode==='evaluacion'?'selected':''}>Solo evaluación</option></select></label><label>Aprobación mínima (%)<input name="passing_score" type="number" min="0" max="100" value="${Number(bank.passing_score??60)}"></label></div>
      <div class="two-col"><label>Preguntas por intento<input name="questions_per_attempt" type="number" min="0" value="${Number(bank.questions_per_attempt??0)}"><small>0 = usar todas</small></label><label class="checkline-v279"><input name="shuffle_questions" type="checkbox" ${bank.shuffle_questions!==false?'checked':''}> Mezclar preguntas</label></div>
      <div class="form-actions"><button class="btn academic-main-btn" type="submit">${editing?'Guardar cambios':'Crear banco'}</button><button class="btn secondary" type="button" onclick="closeModal()">Cancelar</button></div>
    </form>`);
  $('#academicBankFormV279').onsubmit=event=>saveAcademicBankFormV279(event,bank.id||'');
}
async function saveAcademicBankFormV279(event,bankId=''){
  event.preventDefault(); const form=event.currentTarget; const button=event.submitter;
  if(button){button.disabled=true;button.textContent='Guardando…'}
  try{
    const values=Object.fromEntries(new FormData(form).entries());
    const payload={p_token:academicSession.session_token,p_subject:values.subject,p_topic:values.topic,p_title:values.title||'',p_description:values.description||'',p_bank_mode:values.bank_mode,p_passing_score:Number(values.passing_score||60),p_questions_per_attempt:Number(values.questions_per_attempt||0),p_shuffle_questions:Boolean(form.elements.shuffle_questions.checked)};
    let id=bankId;
    if(bankId){await academicRPCWithRetryV275('academic_bank_update',{...payload,p_bank_id:bankId},2)}
    else{id=await academicRPCWithRetryV275('academic_bank_create',payload,2)}
    closeModal(); await loadAcademicBanksV279(); toast(bankId?'Banco actualizado':'Banco creado');
    if(id)setTimeout(()=>openAcademicBankManageV279(typeof id==='string'?id:id?.id||id),50);
  }catch(error){console.error(error);toast(academicFriendlyError(error,'No se pudo guardar el banco'));if(button){button.disabled=false;button.textContent=bankId?'Guardar cambios':'Crear banco'}}
}

async function openAcademicBankManageV279(bankId){
  if(!academicCanManageBankV279())return toast('No tiene permiso para administrar bancos');
  const bank=academicBankRowsV279.find(item=>String(item.id)===String(bankId)); if(!bank)return toast('Banco no encontrado');
  try{
    const rows=await academicRPCWithRetryV275('academic_bank_admin_questions',{p_token:academicSession.session_token,p_bank_id:bankId},2);
    academicBankAdminQuestionsV279.set(String(bankId),rows||[]);
    renderAcademicBankManageV279(bank);
  }catch(error){console.error(error);toast(academicFriendlyError(error,'No se pudieron cargar las preguntas'))}
}
function renderAcademicBankManageV279(bank){
  const questions=academicBankAdminQuestionsV279.get(String(bank.id))||[];
  showModal(`<button class="icon-btn close" onclick="closeModal()">×</button>
    <div class="bank-manage-head-v279"><div><span class="eyebrow">${esc(bank.subject)}</span><h2>${esc(bank.title||bank.topic)}</h2><p>${esc(bank.topic)} · ${questions.length} preguntas</p></div>${academicBankStatusV279(bank)}</div>
    <div class="bank-manage-actions-v279"><button class="btn academic-main-btn" onclick="openAcademicBankQuestionFormV279('${bank.id}')">Agregar pregunta</button><button class="btn secondary" onclick="openAcademicBankImportV279('${bank.id}')">Importar preguntas</button><button class="text-btn" onclick="closeModal();openAcademicBankFormV279('${bank.id}')">Editar datos</button></div>
    <div class="bank-publish-strip-v279"><span>${bank.published?'Visible para el curso':'Todavía no visible para estudiantes'}</span><button class="btn ${bank.published?'secondary':'academic-main-btn'}" onclick="toggleAcademicBankPublishV279('${bank.id}',${bank.published?'false':'true'})">${bank.published?'Ocultar banco':'Publicar banco'}</button></div>
    <div class="bank-question-admin-list-v279">${questions.length?questions.map(q=>`<article><div><span>Pregunta ${q.question_order}</span><b>${esc(q.question_text)}</b><small>Correcta: ${esc(q.correct_option)}${q.explanation?' · Con explicación':''}</small></div><div><button class="icon-btn" title="Editar" onclick="openAcademicBankQuestionFormV279('${bank.id}','${q.id}')">✎</button><button class="icon-btn danger" title="Eliminar" onclick="deleteAcademicBankQuestionV279('${bank.id}','${q.id}')">×</button></div></article>`).join(''):'<div class="bank-empty-questions-v279">Todavía no hay preguntas. Puede agregarlas manualmente o importar varias de una vez.</div>'}</div>`);
}
async function toggleAcademicBankPublishV279(bankId,published){
  try{await academicRPCWithRetryV275('academic_bank_publish',{p_token:academicSession.session_token,p_bank_id:bankId,p_published:Boolean(published)},2);closeModal();await loadAcademicBanksV279();toast(published?'Banco publicado':'Banco ocultado');setTimeout(()=>openAcademicBankManageV279(bankId),50)}catch(error){console.error(error);toast(academicFriendlyError(error,'No se pudo cambiar la publicación'))}
}

function openAcademicBankQuestionFormV279(bankId,questionId=''){
  const list=academicBankAdminQuestionsV279.get(String(bankId))||[];
  const q=list.find(item=>String(item.id)===String(questionId))||{};
  showModal(`<button class="icon-btn close" onclick="closeModal()">×</button><span class="eyebrow">Banco de preguntas</span><h2>${q.id?'Editar pregunta':'Agregar pregunta'}</h2>
    <form id="academicBankQuestionFormV279" class="form bank-question-form-v279">
      <label>Pregunta<textarea name="question" rows="4" required>${esc(q.question_text||'')}</textarea></label>
      <label>Opción A<input name="A" required value="${esc(q.option_a||'')}"></label><label>Opción B<input name="B" required value="${esc(q.option_b||'')}"></label><label>Opción C<input name="C" required value="${esc(q.option_c||'')}"></label><label>Opción D<input name="D" required value="${esc(q.option_d||'')}"></label>
      <div class="two-col"><label>Respuesta correcta<select name="correct"><option value="A" ${q.correct_option==='A'?'selected':''}>A</option><option value="B" ${q.correct_option==='B'?'selected':''}>B</option><option value="C" ${q.correct_option==='C'?'selected':''}>C</option><option value="D" ${q.correct_option==='D'?'selected':''}>D</option></select></label><label>Explicación opcional<textarea name="explanation" rows="2">${esc(q.explanation||'')}</textarea></label></div>
      <div class="form-actions"><button class="btn academic-main-btn" type="submit">Guardar pregunta</button><button class="btn secondary" type="button" onclick="closeModal();openAcademicBankManageV279('${bankId}')">Cancelar</button></div>
    </form>`);
  $('#academicBankQuestionFormV279').onsubmit=event=>saveAcademicBankQuestionV279(event,bankId,q.id||'');
}
async function saveAcademicBankQuestionV279(event,bankId,questionId=''){
  event.preventDefault(); const button=event.submitter; if(button){button.disabled=true;button.textContent='Guardando…'}
  try{
    const values=Object.fromEntries(new FormData(event.currentTarget).entries());
    await academicRPCWithRetryV275('academic_bank_save_question',{p_token:academicSession.session_token,p_bank_id:bankId,p_question_id:questionId||null,p_question_text:values.question,p_option_a:values.A,p_option_b:values.B,p_option_c:values.C,p_option_d:values.D,p_correct_option:values.correct,p_explanation:values.explanation||''},2);
    closeModal();await loadAcademicBanksV279();toast('Pregunta guardada');setTimeout(()=>openAcademicBankManageV279(bankId),50);
  }catch(error){console.error(error);toast(academicFriendlyError(error,'No se pudo guardar la pregunta'));if(button){button.disabled=false;button.textContent='Guardar pregunta'}}
}
async function deleteAcademicBankQuestionV279(bankId,questionId){
  if(!confirm('¿Eliminar esta pregunta del banco?'))return;
  try{await academicRPCWithRetryV275('academic_bank_delete_question',{p_token:academicSession.session_token,p_bank_id:bankId,p_question_id:questionId},2);closeModal();await loadAcademicBanksV279();toast('Pregunta eliminada');setTimeout(()=>openAcademicBankManageV279(bankId),50)}catch(error){console.error(error);toast(academicFriendlyError(error,'No se pudo eliminar la pregunta'))}
}

function academicBankParseTextV279(text){
  const lines=String(text||'').replace(/\r/g,'').split('\n').map(line=>line.trim()).filter(Boolean);
  const rows=[]; let current=null; let lastField='';
  const push=()=>{if(current&&current.question&&current.A&&current.B&&current.C&&current.D&&current.correct)rows.push(current);current=null;lastField=''};
  for(const line of lines){
    let m=line.match(/^\s*(\d{1,4})[\.)-]\s+(.+)/);
    if(m){push();current={question:m[2].trim(),A:'',B:'',C:'',D:'',correct:'',explanation:''};lastField='question';continue}
    m=line.match(/^\s*([ABCD])[\).:\-]\s*(.+)/i);
    if(m){if(!current)current={question:'',A:'',B:'',C:'',D:'',correct:'',explanation:''};current[m[1].toUpperCase()]=m[2].trim();lastField=m[1].toUpperCase();continue}
    m=line.match(/^\s*(?:correcta?|respuesta(?:\s+correcta)?|correcto)\s*[:\-]\s*([ABCD])\b/i);
    if(m){if(!current)continue;current.correct=m[1].toUpperCase();lastField='correct';continue}
    m=line.match(/^\s*explicaci[oó]n\s*[:\-]\s*(.+)/i);
    if(m){if(!current)continue;current.explanation=m[1].trim();lastField='explanation';continue}
    if(!current)current={question:line,A:'',B:'',C:'',D:'',correct:'',explanation:''};
    else if(!current.A){current.question=`${current.question} ${line}`.trim();lastField='question'}
    else if(lastField==='explanation'||current.correct){current.explanation=`${current.explanation} ${line}`.trim();lastField='explanation'}
  }
  push(); return rows;
}
function academicCsvLineV279(line,delimiter){
  const cells=[];let cell='';let quoted=false;
  for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(quoted&&line[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(ch===delimiter&&!quoted){cells.push(cell);cell=''}else cell+=ch}cells.push(cell);return cells.map(v=>v.trim());
}
function academicBankParseCsvV279(text){
  const lines=String(text||'').replace(/\r/g,'').split('\n').filter(line=>line.trim());if(lines.length<2)return[];
  const delimiter=(lines[0].match(/;/g)||[]).length>(lines[0].match(/,/g)||[]).length?';':',';
  const headers=academicCsvLineV279(lines[0],delimiter).map(h=>academicBankNormalizeV279(h));
  const idx=names=>headers.findIndex(h=>names.includes(h));
  const map={question:idx(['pregunta','question']),A:idx(['a','opcion a','opcion_a']),B:idx(['b','opcion b','opcion_b']),C:idx(['c','opcion c','opcion_c']),D:idx(['d','opcion d','opcion_d']),correct:idx(['correcta','correct','respuesta','respuesta correcta']),explanation:idx(['explicacion','explanation'])};
  return lines.slice(1).map(line=>{const c=academicCsvLineV279(line,delimiter);return{question:c[map.question]||'',A:c[map.A]||'',B:c[map.B]||'',C:c[map.C]||'',D:c[map.D]||'',correct:String(c[map.correct]||'').toUpperCase().trim(),explanation:map.explanation>=0?(c[map.explanation]||''):''}}).filter(r=>r.question&&r.A&&r.B&&r.C&&r.D&&['A','B','C','D'].includes(r.correct));
}
function openAcademicBankImportV279(bankId){
  academicBankImportRowsV279=[];
  showModal(`<button class="icon-btn close" onclick="closeModal()">×</button><span class="eyebrow">Carga rápida</span><h2>Importar preguntas</h2>
    <p class="subtle">Puede pegar un banco con opciones A, B, C, D y “Correcta: B”, o cargar un archivo CSV/TXT.</p>
    <textarea id="academicBankImportTextV279" class="bank-import-text-v279" rows="11" placeholder="1. Pregunta…\nA) Opción…\nB) Opción…\nC) Opción…\nD) Opción…\nCorrecta: B\nExplicación: opcional"></textarea>
    <div class="bank-import-controls-v279"><label class="file-chip-v279">Archivo CSV/TXT<input id="academicBankImportFileV279" type="file" accept=".csv,.txt,text/csv,text/plain" onchange="academicBankReadImportFileV279(this,'${bankId}')"></label><button class="text-btn" onclick="downloadAcademicBankTemplateV279()">Plantilla CSV</button></div>
    <div class="form-actions"><button class="btn academic-main-btn" onclick="academicBankAnalyzeImportV279('${bankId}')">Analizar preguntas</button><button class="btn secondary" onclick="closeModal();openAcademicBankManageV279('${bankId}')">Cancelar</button></div>
    <div id="academicBankImportPreviewV279"></div>`);
}
async function academicBankReadImportFileV279(input,bankId){
  const file=input?.files?.[0];if(!file)return;
  try{
    const text=await file.text();
    const area=$('#academicBankImportTextV279');if(area)area.value=text;
    academicBankImportRowsV279=file.name.toLowerCase().endsWith('.csv')?academicBankParseCsvV279(text):academicBankParseTextV279(text);
    academicRenderBankImportPreviewV279(bankId);
  }catch(error){toast('No se pudo leer el archivo')}
}
function academicBankAnalyzeImportV279(bankId){
  const text=$('#academicBankImportTextV279')?.value||'';
  academicBankImportRowsV279=/^\s*(pregunta|question)\s*[,;]/i.test(text)?academicBankParseCsvV279(text):academicBankParseTextV279(text);
  academicRenderBankImportPreviewV279(bankId);
}
function academicRenderBankImportPreviewV279(bankId){
  const box=$('#academicBankImportPreviewV279');if(!box)return;
  const rows=academicBankImportRowsV279;
  if(!rows.length){box.innerHTML='<div class="bank-import-empty-v279">No se detectaron preguntas completas. Verifique que cada una tenga A, B, C, D y respuesta correcta.</div>';return}
  box.innerHTML=`<div class="bank-import-summary-v279"><b>${rows.length} preguntas listas</b><small>Revise antes de guardar.</small></div><div class="bank-import-preview-v279">${rows.slice(0,12).map((r,i)=>`<div><span>${i+1}</span><b>${esc(r.question)}</b><small>Correcta: ${esc(r.correct)}</small></div>`).join('')}${rows.length>12?`<p>+ ${rows.length-12} preguntas adicionales</p>`:''}</div><button class="btn academic-main-btn bank-import-save-v279" onclick="commitAcademicBankImportV279('${bankId}')">Importar ${rows.length} preguntas</button>`;
}
async function commitAcademicBankImportV279(bankId){
  if(!academicBankImportRowsV279.length)return toast('No hay preguntas listas para importar');
  if(academicBankImportRowsV279.length>500&&!confirm(`Se detectaron ${academicBankImportRowsV279.length} preguntas. Por seguridad se importarán las primeras 500. ¿Continuar?`))return;
  const rows=academicBankImportRowsV279.slice(0,500);
  try{const count=await academicRPCWithRetryV275('academic_bank_import_questions',{p_token:academicSession.session_token,p_bank_id:bankId,p_rows:rows},2);closeModal();await loadAcademicBanksV279();toast(`${Number(count||0)} preguntas importadas`);setTimeout(()=>openAcademicBankManageV279(bankId),50)}catch(error){console.error(error);toast(academicFriendlyError(error,'No se pudieron importar las preguntas'))}
}
function downloadAcademicBankTemplateV279(){
  const csv='pregunta;A;B;C;D;correcta;explicacion\n"Escriba la pregunta";"Opción A";"Opción B";"Opción C";"Opción D";B;"Explicación opcional"\n';
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='plantilla-banco-preguntas.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

async function startAcademicBankAttemptV279(bankId,mode){
  if(!navigator.onLine)return toast('Necesita conexión para iniciar el cuestionario');
  if(academicBankSubmittingV279)return;
  academicBankSubmittingV279=true;
  try{
    let data=await academicRPCWithRetryV275('academic_bank_start_attempt',{p_token:academicSession.session_token,p_bank_id:bankId,p_mode:mode},2);data=Array.isArray(data)?data[0]:data;
    if(!data?.attempt_id||!Array.isArray(data.questions)||!data.questions.length)throw new Error('El servidor no entregó las preguntas');
    academicBankActiveAttemptV279=data;academicBankAttemptIndexV279=0;academicBankAttemptAnswersV279=new Map();renderAcademicBankAttemptV279();
  }catch(error){console.error(error);toast(academicFriendlyError(error,'No se pudo iniciar el cuestionario'))}finally{academicBankSubmittingV279=false}
}
function renderAcademicBankAttemptV279(){
  const attempt=academicBankActiveAttemptV279;if(!attempt)return;
  const questions=attempt.questions||[];const q=questions[academicBankAttemptIndexV279];if(!q)return;
  const answered=academicBankAttemptAnswersV279.get(String(q.id));
  const progress=Math.round(((academicBankAttemptIndexV279+1)/questions.length)*100);
  const optionHtml=(q.options||[]).map(opt=>{
    let cls='';if(answered){if(opt.key===answered.selected)cls+=' selected';if(attempt.attempt_mode==='estudio'&&answered.correct_option){if(opt.key===answered.correct_option)cls+=' correct';else if(opt.key===answered.selected&&!answered.is_correct)cls+=' wrong'}}
    return `<button class="bank-option-v279${cls}" ${answered?'disabled':''} onclick="submitAcademicBankAnswerV279('${q.id}','${opt.key}')"><span>${esc(opt.key)}</span><b>${esc(opt.text)}</b></button>`;
  }).join('');
  const feedback=answered&&attempt.attempt_mode==='estudio'?`<div class="bank-feedback-v279 ${answered.is_correct?'ok':'bad'}"><b>${answered.is_correct?'✓ Correcto':'✕ Incorrecto'}</b>${!answered.is_correct&&answered.correct_option?`<span>Respuesta correcta: ${esc(answered.correct_option)}</span>`:''}${answered.explanation?`<p>${esc(answered.explanation)}</p>`:''}</div>`:'';
  showModal(`<button class="icon-btn close" onclick="closeModal()">×</button>
    <div class="bank-attempt-head-v279"><div><span class="eyebrow">${esc(attempt.subject)} · ${attempt.attempt_mode==='estudio'?'Modo estudio':'Simulacro'}</span><h2>${esc(attempt.title)}</h2></div><span>${academicBankAttemptIndexV279+1}/${questions.length}</span></div>
    <div class="bank-progress-v279"><i style="width:${progress}%"></i></div>
    <section class="bank-question-v279"><span>Pregunta ${academicBankAttemptIndexV279+1}</span><h3>${esc(q.question)}</h3><div class="bank-options-v279">${optionHtml}</div>${feedback}</section>
    <div class="bank-attempt-actions-v279">${answered?`<button class="btn academic-main-btn" onclick="academicBankNextV279()">${academicBankAttemptIndexV279===questions.length-1?'Finalizar':'Siguiente'}</button>`:'<small>Seleccione una respuesta para continuar.</small>'}</div>`);
}
async function submitAcademicBankAnswerV279(questionId,selected){
  if(academicBankSubmittingV279||!academicBankActiveAttemptV279)return;
  academicBankSubmittingV279=true;
  try{
    let result=await academicRPCWithRetryV275('academic_bank_submit_answer',{p_token:academicSession.session_token,p_attempt_id:academicBankActiveAttemptV279.attempt_id,p_question_id:questionId,p_selected:selected},2);result=Array.isArray(result)?result[0]:result||{};
    academicBankAttemptAnswersV279.set(String(questionId),{selected,is_correct:result.is_correct,correct_option:result.correct_option,explanation:result.explanation||''});renderAcademicBankAttemptV279();
  }catch(error){console.error(error);toast(academicFriendlyError(error,'No se pudo guardar la respuesta'))}finally{academicBankSubmittingV279=false}
}
function academicBankNextV279(){
  const questions=academicBankActiveAttemptV279?.questions||[];
  if(academicBankAttemptIndexV279<questions.length-1){academicBankAttemptIndexV279+=1;renderAcademicBankAttemptV279();return}
  finishAcademicBankAttemptV279();
}
async function finishAcademicBankAttemptV279(){
  if(!academicBankActiveAttemptV279||academicBankSubmittingV279)return;academicBankSubmittingV279=true;
  try{
    let result=await academicRPCWithRetryV275('academic_bank_finish_attempt',{p_token:academicSession.session_token,p_attempt_id:academicBankActiveAttemptV279.attempt_id},2);result=Array.isArray(result)?result[0]:result;
    const passed=Boolean(result?.passed);const score=Number(result?.score||0);const bankId=academicBankActiveAttemptV279.bank_id;
    showModal(`<button class="icon-btn close" onclick="closeModal();loadAcademicBanksV279()">×</button><div class="bank-result-v279 ${passed?'passed':'failed'}"><span>${passed?'✓':'!'}</span><h2>${passed?'APROBADO':'NO APROBADO'}</h2><strong>${score.toFixed(0)}%</strong><p>${Number(result?.correct_count||0)} correctas de ${Number(result?.total_questions||0)} preguntas.</p><small>Nota mínima: ${Number(academicBankActiveAttemptV279.passing_score||0)}%</small></div><div class="form-actions"><button class="btn academic-main-btn" onclick="closeModal();loadAcademicBanksV279()">Volver al banco</button><button class="btn secondary" onclick="closeModal();openAcademicBankHistoryV279('${bankId}')">Ver historial</button></div>`);
    academicBankActiveAttemptV279=null;academicBankAttemptAnswersV279=new Map();await loadAcademicBanksV279();
  }catch(error){console.error(error);toast(academicFriendlyError(error,'No se pudo cerrar el intento'))}finally{academicBankSubmittingV279=false}
}
async function openAcademicBankHistoryV279(bankId){
  try{
    const rows=await academicRPCWithRetryV275('academic_bank_attempt_history',{p_token:academicSession.session_token,p_bank_id:bankId},2);
    showModal(`<button class="icon-btn close" onclick="closeModal()">×</button><span class="eyebrow">Resultados personales</span><h2>Historial de intentos</h2><div class="bank-history-list-v279">${rows?.length?rows.map((row,i)=>`<article><span>${i+1}</span><div><b>${row.attempt_mode==='estudio'?'Estudio':'Evaluación'} · ${Number(row.score||0).toFixed(0)}%</b><small>${Number(row.correct_count||0)}/${Number(row.total_questions||0)} correctas · ${row.passed?'Aprobado':'No aprobado'}</small></div><time>${row.completed_at?new Date(row.completed_at).toLocaleDateString('es-BO'):''}</time></article>`).join(''):'<div class="bank-empty-questions-v279">Todavía no existen intentos finalizados.</div>'}</div>`);
  }catch(error){console.error(error);toast(academicFriendlyError(error,'No se pudo cargar el historial'))}
}

renderOnline = function renderOnlineV279(){
  if(!academicSession)return onlineLoginView();
  if(academicTab==='panel')return `<section class="online-page">${academicDashboard()}</section>`;
  if(academicTab==='banco')return `<section class="online-page">${academicBankViewV279()}</section>`;
  if(academicTab==='usuarios'&&academicCanManageUsers())return `<section class="online-page">${academicUsersView()}</section>`;
  if(academicTab==='cursos'&&academicSession?.role==='administrador_general')return `<section class="online-page">${academicCoursesViewV277()}</section>`;
  if(!ACADEMIC_TYPES[academicTab])academicTab='panel';
  return `<section class="online-page">${academicModuleView()}</section>`;
};
setAcademicTab = async function setAcademicTabV279(tab){
  academicTab=tab;if(ACADEMIC_TYPES[tab])academicFilter=academicDefaultFilter(tab);render();
  setTimeout(()=>{if(ACADEMIC_TYPES[tab])loadAcademicPosts();if(tab==='banco')loadAcademicBanksV279();if(tab==='usuarios')loadAcademicUsers();if(tab==='cursos')loadAcademicCoursesViewV277();if(tab==='panel')loadAcademicDashboard()},0);
};

/* =========================================================
   Agenda Policial Online v2.9.0 — Lector académico DOCX/PDF
   ========================================================= */
const ACADEMIC_READER_MAMMOTH_V290='https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js';
const ACADEMIC_READER_PDFJS_V290='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const ACADEMIC_READER_PDFWORKER_V290='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const academicReaderRegistryV290=new Map();
let academicReaderRegistrySeqV290=0;
let academicReaderStateV290={session:0,file:null,type:null,blocks:[],speechChunks:[],speechIndex:0,rate:1,pdfDoc:null,pdfPage:1,pdfPages:0,loading:false,paused:false,stopped:true};

function academicReaderFileTypeV290(file){
  const name=String(file?.name||'').toLowerCase();
  const mime=String(file?.type||'').toLowerCase();
  if(name.endsWith('.pdf')||mime==='application/pdf')return 'pdf';
  if(name.endsWith('.docx')||mime.includes('wordprocessingml.document'))return 'docx';
  return null;
}
function academicReaderRegisterV290(file){
  if(academicReaderRegistryV290.size>350)academicReaderRegistryV290.clear();
  const key=`r290_${++academicReaderRegistrySeqV290}`;
  academicReaderRegistryV290.set(key,{...file});
  return key;
}
function academicReaderIconV290(type){return type==='pdf'?'📕':type==='docx'?'📘':'📎'}
function academicReaderTypeLabelV290(type){return type==='pdf'?'PDF':type==='docx'?'Word DOCX':'Archivo'}
function academicReaderSizeLabelV290(bytes){
  const size=Number(bytes||0); if(!size)return '';
  if(size<1024)return `${size} B`;
  if(size<1024*1024)return `${(size/1024).toFixed(0)} KB`;
  return `${(size/(1024*1024)).toFixed(1)} MB`;
}

academicAttachmentLinks=function academicAttachmentLinksV290(post){
  const attachments=academicPostAttachments(post);
  if(!attachments.length)return '';
  return `<div class="academic-attachments academic-attachments-v290">${attachments.map((file,index)=>{
    const type=academicReaderFileTypeV290(file);
    const key=academicReaderRegisterV290(file);
    const size=academicReaderSizeLabelV290(file.size);
    return `<div class="academic-file-card-v290">
      <div class="academic-file-main-v290">
        <span class="academic-file-icon-v290">${academicReaderIconV290(type)}</span>
        <span class="file-copy"><b>${esc(file.name||`Archivo ${index+1}`)}</b><small>${esc(academicReaderTypeLabelV290(type))}${size?` · ${esc(size)}`:''}</small></span>
      </div>
      <div class="academic-file-actions-v290">
        ${type?`<button class="academic-reader-btn-v290" type="button" onclick="openAcademicReaderV290('${key}')">📖 Leer aquí</button>`:''}
        <a class="academic-original-btn-v290" href="${esc(file.url)}" target="_blank" rel="noopener">Abrir original ↗</a>
      </div>
    </div>`;
  }).join('')}</div>`;
};

function academicLoadScriptV290(src,globalName){
  if(globalName&&window[globalName])return Promise.resolve(window[globalName]);
  return new Promise((resolve,reject)=>{
    const existing=[...document.scripts].find(s=>s.src===src);
    if(existing){
      if(existing.dataset.loaded==='true')return resolve(globalName?window[globalName]:true);
      existing.addEventListener('load',()=>resolve(globalName?window[globalName]:true),{once:true});
      existing.addEventListener('error',()=>reject(new Error('No se pudo cargar el componente del lector')), {once:true});
      return;
    }
    const script=document.createElement('script');
    script.src=src; script.async=true; script.crossOrigin='anonymous';
    script.onload=()=>{script.dataset.loaded='true';resolve(globalName?window[globalName]:true)};
    script.onerror=()=>reject(new Error('No se pudo cargar el componente del lector'));
    document.head.appendChild(script);
  });
}
async function academicReaderDepsV290(type){
  if(type==='docx'){
    await academicLoadScriptV290(ACADEMIC_READER_MAMMOTH_V290,'mammoth');
    if(!window.mammoth)throw new Error('El lector DOCX no está disponible');
  }
  if(type==='pdf'){
    await academicLoadScriptV290(ACADEMIC_READER_PDFJS_V290,'pdfjsLib');
    if(!window.pdfjsLib)throw new Error('El lector PDF no está disponible');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc=ACADEMIC_READER_PDFWORKER_V290;
  }
}
function academicReaderFetchMessageV290(){
  return navigator.onLine?'Preparando el documento…':'Buscando una copia disponible del documento…';
}
function academicReaderOpenShellV290(file,type){
  showModal(`<div class="academic-reader-shell-v290">
    <div class="academic-reader-top-v290">
      <button class="icon-btn close academic-reader-close-v290" type="button" onclick="closeAcademicReaderV290()">×</button>
      <div class="academic-reader-title-v290"><span>${academicReaderIconV290(type)}</span><div><small>Lector académico · ${academicReaderTypeLabelV290(type)}</small><h2>${esc(file.name||'Documento académico')}</h2></div></div>
    </div>
    <div id="academicReaderBodyV290" class="academic-reader-body-v290">
      <div class="academic-reader-loading-v290"><span class="academic-reader-spinner-v290"></span><b>${academicReaderFetchMessageV290()}</b><small>El archivo original no será modificado.</small></div>
    </div>
  </div>`);
  requestAnimationFrame(()=>{
    document.querySelector('#modalRoot .modal-bg')?.classList.add('academic-reader-bg-v290');
    document.querySelector('#modalRoot .modal')?.classList.add('academic-reader-modal-v290');
  });
}
async function academicReaderFetchV290(file){
  if(!file?.url)throw new Error('El archivo no tiene una dirección válida');
  const response=await fetch(file.url,{cache:'default',credentials:'omit'});
  if(!response.ok)throw new Error(`No se pudo obtener el archivo (${response.status})`);
  return await response.arrayBuffer();
}
function academicReaderNormalizeBlocksV290(text,page=null){
  const clean=String(text||'').replace(/\r/g,'').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
  if(!clean)return [];
  const raw=clean.split(/\n\s*\n|\n(?=[A-ZÁÉÍÓÚÑ0-9•\-])/).map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean);
  const blocks=[];
  for(const part of raw){
    if(part.length<=1300){blocks.push({text:part,page});continue}
    const sentences=part.match(/[^.!?;:]+[.!?;:]?|.+$/g)||[part];
    let chunk='';
    for(const sentence of sentences){
      const candidate=(chunk+' '+sentence).trim();
      if(candidate.length>900&&chunk){blocks.push({text:chunk,page});chunk=sentence.trim()}else chunk=candidate;
    }
    if(chunk)blocks.push({text:chunk,page});
  }
  return blocks;
}
function academicReaderSpeechChunksV290(blocks){
  const chunks=[];
  blocks.forEach((block,blockIndex)=>{
    const text=String(block.text||'').trim(); if(!text)return;
    const pieces=text.match(/[^.!?;:]+[.!?;:]?|.+$/g)||[text];
    let buf='';
    const flush=()=>{if(buf.trim()){chunks.push({text:buf.trim(),blockIndex});buf=''}};
    for(const piece of pieces){
      const candidate=(buf+' '+piece).trim();
      if(candidate.length>650&&buf){flush();buf=piece.trim()}else buf=candidate;
      if(buf.length>850)flush();
    }
    flush();
  });
  return chunks;
}
function academicReaderHasSpeechV290(){return 'speechSynthesis' in window&&'SpeechSynthesisUtterance' in window}
function academicReaderControlsV290({speech=true,scan=false}={}){
  const rate=Number(academicReaderStateV290.rate||1);
  return `<div class="academic-reader-controls-v290">
    <div class="academic-reader-primary-v290">
      <button id="academicReaderPlayV290" class="btn academic-reader-play-v290" type="button" onclick="academicReaderToggleSpeechV290()" ${speech?'':'disabled'}>🔊 Escuchar</button>
      <button class="btn secondary" type="button" onclick="academicReaderPreviousV290()" ${speech?'':'disabled'}>◀ Anterior</button>
      <button class="btn secondary" type="button" onclick="academicReaderNextV290()" ${speech?'':'disabled'}>Siguiente ▶</button>
      <button class="btn ghost" type="button" onclick="academicReaderStopV290()" ${speech?'':'disabled'}>■ Detener</button>
    </div>
    <div class="academic-reader-secondary-v290">
      <label>Velocidad<select onchange="academicReaderSetRateV290(this.value)" ${speech?'':'disabled'}>${[.8,1,1.2,1.4,1.6].map(v=>`<option value="${v}" ${Math.abs(rate-v)<.01?'selected':''}>${v}×</option>`).join('')}</select></label>
      <label>Tamaño<select onchange="academicReaderSetFontV290(this.value)"><option value=".95">Pequeño</option><option value="1.05" selected>Normal</option><option value="1.18">Grande</option><option value="1.32">Muy grande</option></select></label>
      <span id="academicReaderProgressV290" class="academic-reader-progress-text-v290">Listo para leer</span>
    </div>
    ${scan?'<div class="academic-reader-scan-note-v290">⚠️ Este PDF parece ser escaneado. Puede verlo dentro de la aplicación, pero no contiene suficiente texto seleccionable para la lectura en voz alta.</div>':''}
  </div>`;
}
function academicReaderTextHtmlV290(blocks){
  if(!blocks.length)return '<div class="academic-reader-empty-v290"><b>No se encontró texto legible.</b><p>Puede consultar la vista del documento o abrir el archivo original.</p></div>';
  return `<div id="academicReaderTextV290" class="academic-reader-text-v290">${blocks.map((block,index)=>`<p id="readerBlockV290_${index}" data-reader-block="${index}" onclick="academicReaderStartAtBlockV290(${index})">${esc(block.text)}</p>`).join('')}</div>`;
}
function academicReaderFooterV290(file){return `<div class="academic-reader-footer-v290"><a class="btn secondary" href="${esc(file.url)}" target="_blank" rel="noopener">📄 Abrir archivo original</a><small>Agenda Policial muestra una copia de lectura. El documento original permanece sin cambios.</small></div>`}

async function openAcademicReaderV290(key){
  const file=academicReaderRegistryV290.get(key);
  const type=academicReaderFileTypeV290(file);
  if(!file||!type)return toast('Este archivo no es compatible con el lector interno');
  academicReaderStopV290(true);
  const session=Date.now()+Math.random();
  academicReaderStateV290={session,file,type,blocks:[],speechChunks:[],speechIndex:0,rate:1,pdfDoc:null,pdfPage:1,pdfPages:0,loading:true,paused:false,stopped:true};
  academicReaderOpenShellV290(file,type);
  try{
    await academicReaderDepsV290(type);
    const buffer=await academicReaderFetchV290(file);
    if(academicReaderStateV290.session!==session)return;
    if(type==='docx')await academicReaderLoadDocxV290(buffer,session);
    else await academicReaderLoadPdfV290(buffer,session);
  }catch(error){
    console.error(error);
    if(academicReaderStateV290.session!==session)return;
    const body=document.getElementById('academicReaderBodyV290');
    if(body&&type==='pdf'){
      body.innerHTML=`<div class="academic-reader-native-v290"><div><b>Vista PDF de respaldo</b><small>El componente de lectura no pudo iniciarse, pero puede intentar ver el PDF dentro de Agenda Policial.</small></div><iframe src="${esc(file.url)}" title="${esc(file.name||'Documento PDF')}"></iframe>${academicReaderFooterV290(file)}</div>`;
    }else if(body){
      body.innerHTML=`<div class="academic-reader-error-v290"><span>⚠️</span><h3>No se pudo abrir este archivo dentro de la aplicación</h3><p>${esc(academicFriendlyError(error,'Compruebe su conexión e intente nuevamente.'))}</p><a class="btn academic-main-btn" href="${esc(file.url)}" target="_blank" rel="noopener">Abrir archivo original</a></div>`;
    }
  }finally{if(academicReaderStateV290.session===session)academicReaderStateV290.loading=false}
}

async function academicReaderLoadDocxV290(buffer,session){
  const result=await window.mammoth.extractRawText({arrayBuffer:buffer});
  if(academicReaderStateV290.session!==session)return;
  const blocks=academicReaderNormalizeBlocksV290(result?.value||'');
  academicReaderStateV290.blocks=blocks;
  academicReaderStateV290.speechChunks=academicReaderSpeechChunksV290(blocks);
  const canSpeak=academicReaderHasSpeechV290()&&academicReaderStateV290.speechChunks.length>0;
  const body=document.getElementById('academicReaderBodyV290');
  if(!body)return;
  body.innerHTML=`${academicReaderControlsV290({speech:canSpeak})}<div class="academic-reader-doc-head-v290"><span>📘</span><div><b>Vista de lectura</b><small>${blocks.length} bloque${blocks.length===1?'':'s'} de texto recuperado${blocks.length===1?'':'s'} del Word.</small></div></div>${academicReaderTextHtmlV290(blocks)}${academicReaderFooterV290(academicReaderStateV290.file)}`;
}

function academicPdfItemsTextV290(items){
  let out='';
  for(const item of items||[]){
    const value=String(item?.str||'').trim();
    if(value)out+=(out&&!out.endsWith('\n')?' ':'')+value;
    if(item?.hasEOL)out+='\n';
  }
  return out.replace(/\n[ \t]+/g,'\n').trim();
}
async function academicReaderLoadPdfV290(buffer,session){
  const task=window.pdfjsLib.getDocument({data:new Uint8Array(buffer)});
  const pdf=await task.promise;
  if(academicReaderStateV290.session!==session){try{pdf.destroy()}catch{};return}
  academicReaderStateV290.pdfDoc=pdf;
  academicReaderStateV290.pdfPages=pdf.numPages;
  academicReaderStateV290.pdfPage=1;
  const blocks=[];
  let chars=0;
  for(let pageNum=1;pageNum<=pdf.numPages;pageNum++){
    if(academicReaderStateV290.session!==session)return;
    const loading=document.querySelector('.academic-reader-loading-v290 b');
    if(loading)loading.textContent=`Preparando PDF · página ${pageNum} de ${pdf.numPages}`;
    const page=await pdf.getPage(pageNum);
    const content=await page.getTextContent();
    const text=academicPdfItemsTextV290(content.items);
    chars+=text.replace(/\s/g,'').length;
    blocks.push(...academicReaderNormalizeBlocksV290(text,pageNum));
    if(pageNum%4===0)await new Promise(resolve=>setTimeout(resolve,0));
  }
  academicReaderStateV290.blocks=blocks;
  academicReaderStateV290.speechChunks=academicReaderSpeechChunksV290(blocks);
  const scanLike=chars<Math.max(50,pdf.numPages*18);
  const canSpeak=!scanLike&&academicReaderHasSpeechV290()&&academicReaderStateV290.speechChunks.length>0;
  const body=document.getElementById('academicReaderBodyV290');
  if(!body)return;
  body.innerHTML=`${academicReaderControlsV290({speech:canSpeak,scan:scanLike})}
    <div class="academic-reader-pdf-v290">
      <div class="academic-reader-pdf-toolbar-v290"><button type="button" onclick="academicReaderPdfPageV290(-1)">‹</button><b id="academicReaderPdfLabelV290">Página 1 de ${pdf.numPages}</b><button type="button" onclick="academicReaderPdfPageV290(1)">›</button></div>
      <div id="academicReaderPdfCanvasWrapV290" class="academic-reader-pdf-canvas-wrap-v290"><canvas id="academicReaderPdfCanvasV290"></canvas></div>
    </div>
    <div class="academic-reader-text-heading-v290"><b>Texto para lectura</b><small>${scanLike?'No se detectó texto suficiente para voz.':'Toque un párrafo para comenzar la lectura desde ese punto.'}</small></div>
    ${academicReaderTextHtmlV290(blocks)}${academicReaderFooterV290(academicReaderStateV290.file)}`;
  await academicReaderRenderPdfPageV290(1);
}
async function academicReaderRenderPdfPageV290(pageNum){
  const pdf=academicReaderStateV290.pdfDoc;
  if(!pdf)return;
  const target=Math.max(1,Math.min(pdf.numPages,Number(pageNum)||1));
  academicReaderStateV290.pdfPage=target;
  const label=document.getElementById('academicReaderPdfLabelV290');
  if(label)label.textContent=`Página ${target} de ${pdf.numPages}`;
  const canvas=document.getElementById('academicReaderPdfCanvasV290');
  const wrap=document.getElementById('academicReaderPdfCanvasWrapV290');
  if(!canvas||!wrap)return;
  const page=await pdf.getPage(target);
  const base=page.getViewport({scale:1});
  const cssWidth=Math.max(260,Math.min(wrap.clientWidth-12,760));
  const dpr=Math.min(window.devicePixelRatio||1,2);
  const scale=(cssWidth/base.width)*dpr;
  const viewport=page.getViewport({scale});
  canvas.width=Math.floor(viewport.width);canvas.height=Math.floor(viewport.height);
  canvas.style.width=`${Math.floor(viewport.width/dpr)}px`;canvas.style.height=`${Math.floor(viewport.height/dpr)}px`;
  const context=canvas.getContext('2d',{alpha:false});
  context.save();context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.restore();
  await page.render({canvasContext:context,viewport}).promise;
}
function academicReaderPdfPageV290(delta){academicReaderRenderPdfPageV290((academicReaderStateV290.pdfPage||1)+Number(delta||0)).catch(console.error)}

function academicReaderPreferredVoiceV290(){
  const voices=window.speechSynthesis?.getVoices?.()||[];
  return voices.find(v=>/^es[-_]BO$/i.test(v.lang))||voices.find(v=>/^es[-_](419|MX|AR|ES)/i.test(v.lang))||voices.find(v=>/^es/i.test(v.lang))||null;
}
function academicReaderHighlightV290(blockIndex){
  document.querySelectorAll('#academicReaderTextV290 [data-reader-block]').forEach(el=>el.classList.toggle('speaking',Number(el.dataset.readerBlock)===Number(blockIndex)));
  const el=document.getElementById(`readerBlockV290_${blockIndex}`);
  if(el)el.scrollIntoView({behavior:'smooth',block:'center'});
}
function academicReaderUpdateSpeechUiV290(){
  const state=academicReaderStateV290;
  const btn=document.getElementById('academicReaderPlayV290');
  if(btn)btn.textContent=state.stopped?'🔊 Escuchar':state.paused?'▶ Continuar':'⏸ Pausar';
  const progress=document.getElementById('academicReaderProgressV290');
  if(progress){
    if(state.stopped)progress.textContent='Listo para leer';
    else if(state.paused)progress.textContent='Lectura pausada';
    else progress.textContent=`Leyendo ${Math.min(state.speechIndex+1,state.speechChunks.length)} de ${state.speechChunks.length}`;
  }
}
function academicReaderSpeakCurrentV290(){
  const state=academicReaderStateV290;
  if(state.stopped||state.paused)return;
  if(!academicReaderHasSpeechV290()||!state.speechChunks.length){academicReaderStopV290();return}
  if(state.speechIndex>=state.speechChunks.length){academicReaderStopV290();toast('Lectura finalizada');return}
  const chunk=state.speechChunks[state.speechIndex];
  academicReaderHighlightV290(chunk.blockIndex);
  const utterance=new SpeechSynthesisUtterance(chunk.text);
  utterance.lang='es-BO';utterance.rate=Number(state.rate||1);
  const voice=academicReaderPreferredVoiceV290();if(voice)utterance.voice=voice;
  utterance.onend=()=>{if(state.stopped||state.paused)return;state.speechIndex+=1;academicReaderUpdateSpeechUiV290();academicReaderSpeakCurrentV290()};
  utterance.onerror=e=>{if(['canceled','interrupted'].includes(e.error))return;console.warn('TTS',e.error);academicReaderStopV290();toast('El dispositivo interrumpió la lectura en voz alta')};
  window.speechSynthesis.cancel();
  setTimeout(()=>{if(!state.stopped&&!state.paused)window.speechSynthesis.speak(utterance)},40);
  academicReaderUpdateSpeechUiV290();
}
function academicReaderToggleSpeechV290(){
  const state=academicReaderStateV290;
  if(!academicReaderHasSpeechV290()||!state.speechChunks.length)return toast('La lectura en voz alta no está disponible para este archivo');
  if(state.stopped){state.stopped=false;state.paused=false;state.speechIndex=Math.max(0,Math.min(state.speechIndex,state.speechChunks.length-1));academicReaderSpeakCurrentV290();return}
  if(state.paused){state.paused=false;academicReaderSpeakCurrentV290();return}
  state.paused=true;window.speechSynthesis.cancel();academicReaderUpdateSpeechUiV290();
}
function academicReaderStopV290(silent=false){
  try{window.speechSynthesis?.cancel?.()}catch{}
  const state=academicReaderStateV290;
  state.stopped=true;state.paused=false;state.speechIndex=0;
  document.querySelectorAll('#academicReaderTextV290 [data-reader-block]').forEach(el=>el.classList.remove('speaking'));
  academicReaderUpdateSpeechUiV290();
  if(!silent){};
}
function academicReaderStartAtBlockV290(blockIndex){
  const state=academicReaderStateV290;
  const index=state.speechChunks.findIndex(item=>item.blockIndex===Number(blockIndex));
  if(index<0)return;
  try{window.speechSynthesis?.cancel?.()}catch{}
  state.speechIndex=index;state.stopped=false;state.paused=false;academicReaderSpeakCurrentV290();
}
function academicReaderPreviousV290(){
  const state=academicReaderStateV290;if(!state.speechChunks.length)return;
  try{window.speechSynthesis?.cancel?.()}catch{}
  state.speechIndex=Math.max(0,state.speechIndex-1);state.stopped=false;state.paused=false;academicReaderSpeakCurrentV290();
}
function academicReaderNextV290(){
  const state=academicReaderStateV290;if(!state.speechChunks.length)return;
  try{window.speechSynthesis?.cancel?.()}catch{}
  state.speechIndex=Math.min(state.speechChunks.length-1,state.speechIndex+1);state.stopped=false;state.paused=false;academicReaderSpeakCurrentV290();
}
function academicReaderSetRateV290(value){
  const state=academicReaderStateV290;state.rate=Math.max(.6,Math.min(2,Number(value)||1));
  if(!state.stopped&&!state.paused){try{window.speechSynthesis?.cancel?.()}catch{};academicReaderSpeakCurrentV290()}
}
function academicReaderSetFontV290(value){
  const el=document.getElementById('academicReaderTextV290');if(el)el.style.setProperty('--reader-scale',String(Math.max(.8,Math.min(1.6,Number(value)||1.05))));
}
function closeAcademicReaderV290(){
  academicReaderStopV290(true);
  try{academicReaderStateV290.pdfDoc?.destroy?.()}catch{}
  academicReaderStateV290.session=0;academicReaderStateV290.pdfDoc=null;
  closeModal();
}
const closeModalBeforeV290=closeModal;
closeModal=function closeModalV290(){
  if(academicReaderStateV290?.session){
    academicReaderStopV290(true);
    try{academicReaderStateV290.pdfDoc?.destroy?.()}catch{}
    academicReaderStateV290.session=0;academicReaderStateV290.pdfDoc=null;
  }
  closeModalBeforeV290();
};

/* =========================================================
   AGENDA POLICIAL v2.10.0 — BANCO DE PREGUNTAS MIXTO
   Tipos: selección múltiple, verdadero/falso, relacionar,
   completar concepto. Mantiene compatibilidad con v2.9.
   ========================================================= */
function academicBankTypeLabelV210(type){
  return ({multiple_choice:'Selección múltiple',true_false:'Verdadero / Falso',matching:'Relacionar conceptos',fill_blank:'Completar concepto'})[type]||'Selección múltiple';
}
function academicBankTypeIconV210(type){
  return ({multiple_choice:'🔘',true_false:'✓',matching:'🔗',fill_blank:'✏️'})[type]||'🔘';
}
function academicBankTypeClassV210(type){return `bank-type-${String(type||'multiple_choice').replace(/_/g,'-')}-v210`}
function academicBankQuestionTypeV210(q){return q?.question_type||q?.type||'multiple_choice'}
function academicBankAnswerDataV210(q){
  const raw=q?.answer_data;
  if(raw&&typeof raw==='object')return raw;
  if(typeof raw==='string'){try{return JSON.parse(raw)}catch{}}
  return {};
}
function academicBankQuestionSummaryV210(q){
  const type=academicBankQuestionTypeV210(q),data=academicBankAnswerDataV210(q);
  if(type==='true_false')return `Correcta: ${data.correct===true?'Verdadero':'Falso'}`;
  if(type==='fill_blank')return `${Array.isArray(data.answers)?data.answers.length:0} respuesta${Array.isArray(data.answers)&&data.answers.length===1?'':'s'} aceptada${Array.isArray(data.answers)&&data.answers.length===1?'':'s'}`;
  if(type==='matching')return `${Array.isArray(data.pairs)?data.pairs.length:0} pares para relacionar`;
  return `Correcta: ${q.correct_option||'—'}`;
}
function academicBankTypeBadgeV210(type){return `<span class="bank-type-badge-v210 ${academicBankTypeClassV210(type)}">${academicBankTypeIconV210(type)} ${esc(academicBankTypeLabelV210(type))}</span>`}

async function openAcademicBankManageV210(bankId){
  if(!academicCanManageBankV279())return toast('No tiene permiso para administrar bancos');
  const bank=academicBankRowsV279.find(item=>String(item.id)===String(bankId));if(!bank)return toast('Banco no encontrado');
  try{
    const rows=await academicRPCWithRetryV275('academic_bank_admin_questions_v210',{p_token:academicSession.session_token,p_bank_id:bankId},2);
    academicBankAdminQuestionsV279.set(String(bankId),rows||[]);
    renderAcademicBankManageV210(bank);
  }catch(error){console.error(error);toast(academicFriendlyError(error,'No se pudieron cargar las preguntas'))}
}
function renderAcademicBankManageV210(bank){
  const questions=academicBankAdminQuestionsV279.get(String(bank.id))||[];
  const counts={multiple_choice:0,true_false:0,matching:0,fill_blank:0};
  questions.forEach(q=>{const t=academicBankQuestionTypeV210(q);counts[t]=(counts[t]||0)+1});
  const typeChips=Object.entries(counts).filter(([,count])=>count>0).map(([type,count])=>`<span class="bank-type-count-v210 ${academicBankTypeClassV210(type)}"><b>${count}</b>${esc(academicBankTypeLabelV210(type))}</span>`).join('');
  showModal(`<button class="icon-btn close" onclick="closeModal()">×</button>
    <div class="bank-manage-head-v279"><div><span class="eyebrow">${esc(bank.subject)}</span><h2>${esc(bank.title||bank.topic)}</h2><p>${esc(bank.topic)} · ${questions.length} preguntas</p></div>${academicBankStatusV279(bank)}</div>
    ${questions.length?`<div class="bank-type-counts-v210">${typeChips}</div>`:''}
    <div class="bank-manage-actions-v279"><button class="btn academic-main-btn" onclick="openAcademicBankQuestionFormV279('${bank.id}')">Agregar pregunta</button><button class="btn secondary" onclick="openAcademicBankImportV279('${bank.id}')">Importar preguntas</button><button class="text-btn" onclick="closeModal();openAcademicBankFormV279('${bank.id}')">Editar datos</button></div>
    <div class="bank-publish-strip-v279"><span>${bank.published?'Visible para el curso':'Todavía no visible para estudiantes'}</span><button class="btn ${bank.published?'secondary':'academic-main-btn'}" onclick="toggleAcademicBankPublishV279('${bank.id}',${bank.published?'false':'true'})">${bank.published?'Ocultar banco':'Publicar banco'}</button></div>
    <div class="bank-question-admin-list-v279 bank-question-admin-list-v210">${questions.length?questions.map(q=>`<article><div><div class="bank-question-meta-v210"><span>Pregunta ${q.question_order}</span>${academicBankTypeBadgeV210(academicBankQuestionTypeV210(q))}</div><b>${esc(q.question_text)}</b><small>${esc(academicBankQuestionSummaryV210(q))}${q.explanation?' · Con explicación':''}</small></div><div><button class="icon-btn" title="Editar" onclick="openAcademicBankQuestionFormV279('${bank.id}','${q.id}')">✎</button><button class="icon-btn danger" title="Eliminar" onclick="deleteAcademicBankQuestionV279('${bank.id}','${q.id}')">×</button></div></article>`).join(''):'<div class="bank-empty-questions-v279">Todavía no hay preguntas. Puede mezclar selección múltiple, Verdadero/Falso, relacionar conceptos y completar.</div>'}</div>`);
}

function academicBankQuestionTypeHelpV210(type){
  return ({
    multiple_choice:'Una respuesta correcta entre cuatro opciones A, B, C y D.',
    true_false:'Una afirmación que el estudiante debe identificar como Verdadera o Falsa.',
    matching:'El estudiante relaciona cada concepto con su definición o correspondencia.',
    fill_blank:'El estudiante escribe la palabra o concepto faltante. Se pueden registrar varias formas válidas.'
  })[type]||'';
}
function academicBankQuestionTypeChangeV210(type){
  document.querySelectorAll('[data-bank-type-panel-v210]').forEach(el=>el.hidden=el.dataset.bankTypePanelV210!==type);
  const help=document.getElementById('bankQuestionTypeHelpV210');if(help)help.textContent=academicBankQuestionTypeHelpV210(type);
}
function openAcademicBankQuestionFormV210(bankId,questionId=''){
  const list=academicBankAdminQuestionsV279.get(String(bankId))||[];
  const q=list.find(item=>String(item.id)===String(questionId))||{};
  const type=academicBankQuestionTypeV210(q),data=academicBankAnswerDataV210(q);
  const pairs=Array.isArray(data.pairs)?data.pairs:[];
  const answers=Array.isArray(data.answers)?data.answers:[];
  const pairRows=Array.from({length:8},(_,i)=>`<div class="bank-pair-row-v210"><span>${i+1}</span><input name="pair_left_${i}" placeholder="Concepto" value="${esc(pairs[i]?.left||'')}"><span class="bank-pair-arrow-v210">↔</span><input name="pair_right_${i}" placeholder="Definición / correspondencia" value="${esc(pairs[i]?.right||'')}"></div>`).join('');
  showModal(`<button class="icon-btn close" onclick="closeModal()">×</button><span class="eyebrow">Banco de preguntas mixto</span><h2>${q.id?'Editar pregunta':'Agregar pregunta'}</h2>
    <form id="academicBankQuestionFormV210" class="form bank-question-form-v279 bank-question-form-v210">
      <label>Tipo de pregunta<select name="question_type" onchange="academicBankQuestionTypeChangeV210(this.value)">
        <option value="multiple_choice" ${type==='multiple_choice'?'selected':''}>🔘 Selección múltiple</option>
        <option value="true_false" ${type==='true_false'?'selected':''}>✓ Verdadero / Falso</option>
        <option value="matching" ${type==='matching'?'selected':''}>🔗 Relacionar conceptos</option>
        <option value="fill_blank" ${type==='fill_blank'?'selected':''}>✏️ Completar concepto</option>
      </select><small id="bankQuestionTypeHelpV210">${esc(academicBankQuestionTypeHelpV210(type))}</small></label>
      <label>Pregunta o consigna<textarea name="question" rows="4" required placeholder="Escriba la pregunta o instrucción…">${esc(q.question_text||'')}</textarea></label>

      <div data-bank-type-panel-v210="multiple_choice" ${type==='multiple_choice'?'':'hidden'} class="bank-type-panel-v210">
        <label>Opción A<input name="A" value="${esc(type==='multiple_choice'?(q.option_a||''):'')}"></label><label>Opción B<input name="B" value="${esc(type==='multiple_choice'?(q.option_b||''):'')}"></label><label>Opción C<input name="C" value="${esc(type==='multiple_choice'?(q.option_c||''):'')}"></label><label>Opción D<input name="D" value="${esc(type==='multiple_choice'?(q.option_d||''):'')}"></label>
        <label>Respuesta correcta<select name="correct"><option value="A" ${q.correct_option==='A'?'selected':''}>A</option><option value="B" ${q.correct_option==='B'?'selected':''}>B</option><option value="C" ${q.correct_option==='C'?'selected':''}>C</option><option value="D" ${q.correct_option==='D'?'selected':''}>D</option></select></label>
      </div>

      <div data-bank-type-panel-v210="true_false" ${type==='true_false'?'':'hidden'} class="bank-type-panel-v210 bank-tf-editor-v210">
        <div class="bank-type-editor-note-v210">La afirmación anterior será mostrada con dos botones: <b>Verdadero</b> y <b>Falso</b>.</div>
        <label>Respuesta correcta<select name="tf_correct"><option value="true" ${data.correct===true?'selected':''}>Verdadero</option><option value="false" ${data.correct===false?'selected':''}>Falso</option></select></label>
      </div>

      <div data-bank-type-panel-v210="matching" ${type==='matching'?'':'hidden'} class="bank-type-panel-v210">
        <div class="bank-type-editor-note-v210">Complete al menos 2 pares. En el examen las definiciones aparecerán mezcladas.</div>
        <div class="bank-pairs-editor-v210">${pairRows}</div>
      </div>

      <div data-bank-type-panel-v210="fill_blank" ${type==='fill_blank'?'':'hidden'} class="bank-type-panel-v210">
        <label>Respuestas aceptadas<textarea name="fill_answers" rows="4" placeholder="Una respuesta por línea\nEj.: auditoría\nauditoria">${esc(answers.join('\n'))}</textarea><small>Mayúsculas, minúsculas y tildes no afectan la corrección. Puede registrar varias formas válidas.</small></label>
      </div>

      <label>Explicación opcional<textarea name="explanation" rows="3" placeholder="Se mostrará después de responder en Modo Estudio.">${esc(q.explanation||'')}</textarea></label>
      <div class="form-actions"><button class="btn academic-main-btn" type="submit">Guardar pregunta</button><button class="btn secondary" type="button" onclick="closeModal();openAcademicBankManageV279('${bankId}')">Cancelar</button></div>
    </form>`);
  document.getElementById('academicBankQuestionFormV210').onsubmit=event=>saveAcademicBankQuestionV210(event,bankId,q.id||'');
}
async function saveAcademicBankQuestionV210(event,bankId,questionId=''){
  event.preventDefault();const form=event.currentTarget,button=event.submitter;if(button){button.disabled=true;button.textContent='Guardando…'}
  try{
    const values=Object.fromEntries(new FormData(form).entries());
    const type=values.question_type||'multiple_choice';let data={};
    if(type==='true_false')data={correct:values.tf_correct==='true'};
    else if(type==='fill_blank'){
      const answers=String(values.fill_answers||'').split(/\n|\|/).map(v=>v.trim()).filter(Boolean);data={answers};
    }else if(type==='matching'){
      const pairs=[];for(let i=0;i<8;i++){const left=String(values[`pair_left_${i}`]||'').trim(),right=String(values[`pair_right_${i}`]||'').trim();if(left||right)pairs.push({left,right})}data={pairs};
    }
    await academicRPCWithRetryV275('academic_bank_save_question_v210',{
      p_token:academicSession.session_token,p_bank_id:bankId,p_question_id:questionId||null,p_question_text:values.question,
      p_question_type:type,p_option_a:values.A||'',p_option_b:values.B||'',p_option_c:values.C||'',p_option_d:values.D||'',
      p_correct_option:values.correct||'',p_answer_data:data,p_explanation:values.explanation||''
    },2);
    closeModal();await loadAcademicBanksV279();toast('Pregunta guardada');setTimeout(()=>openAcademicBankManageV279(bankId),50);
  }catch(error){console.error(error);toast(academicFriendlyError(error,'No se pudo guardar la pregunta'));if(button){button.disabled=false;button.textContent='Guardar pregunta'}}
}

function academicBankNormalizeTypeV210(value){
  const t=academicBankNormalizeV279(value||'').replace(/[\s-]+/g,'_');
  if(['verdadero_falso','verdaderofalso','vf','true_false','truefalse'].includes(t))return'true_false';
  if(['relacionar','relacion','relacionar_conceptos','matching','emparejar'].includes(t))return'matching';
  if(['completar','completar_concepto','fill_blank','fillblank','texto'].includes(t))return'fill_blank';
  return'multiple_choice';
}
function academicBankParsePairsV210(value){
  return String(value||'').split(/\|\|/).map(piece=>{const parts=piece.split(/=>|→/);return{left:String(parts.shift()||'').trim(),right:parts.join('=>').trim()}}).filter(p=>p.left&&p.right);
}
function academicBankParseCsvV210(text){
  const lines=String(text||'').replace(/\r/g,'').split('\n').filter(line=>line.trim());if(lines.length<2)return[];
  const delimiter=(lines[0].match(/;/g)||[]).length>(lines[0].match(/,/g)||[]).length?';':',';
  const headers=academicCsvLineV279(lines[0],delimiter).map(h=>academicBankNormalizeV279(h));
  const idx=names=>headers.findIndex(h=>names.includes(h));
  const map={type:idx(['tipo','type','modalidad pregunta']),question:idx(['pregunta','question']),A:idx(['a','opcion a','opcion_a']),B:idx(['b','opcion b','opcion_b']),C:idx(['c','opcion c','opcion_c']),D:idx(['d','opcion d','opcion_d']),correct:idx(['correcta','correct','respuesta','respuesta correcta']),explanation:idx(['explicacion','explanation']),content:idx(['contenido','datos','content','respuestas aceptadas','pares'])};
  return lines.slice(1).map(line=>{
    const c=academicCsvLineV279(line,delimiter),type=map.type>=0?academicBankNormalizeTypeV210(c[map.type]):'multiple_choice';
    const row={type,question:c[map.question]||'',A:map.A>=0?(c[map.A]||''):'',B:map.B>=0?(c[map.B]||''):'',C:map.C>=0?(c[map.C]||''):'',D:map.D>=0?(c[map.D]||''):'',correct:map.correct>=0?String(c[map.correct]||'').trim():'',explanation:map.explanation>=0?(c[map.explanation]||''):'',answer_data:{}};
    const content=map.content>=0?(c[map.content]||''):'';
    if(type==='true_false'){const v=academicBankNormalizeV279(row.correct);if(['verdadero','v','true','1'].includes(v))row.answer_data={correct:true};else if(['falso','f','false','0'].includes(v))row.answer_data={correct:false};else row.invalid=true}
    else if(type==='fill_blank'){const answers=String(content||row.correct||'').split('|').map(v=>v.trim()).filter(Boolean);row.answer_data={answers};if(!answers.length)row.invalid=true}
    else if(type==='matching'){const pairs=academicBankParsePairsV210(content);row.answer_data={pairs};if(pairs.length<2)row.invalid=true}
    else{row.correct=row.correct.toUpperCase();if(!(row.question&&row.A&&row.B&&row.C&&row.D&&['A','B','C','D'].includes(row.correct)))row.invalid=true}
    if(!row.question)row.invalid=true;return row;
  }).filter(r=>!r.invalid);
}
function academicBankParseTextV210(text){return academicBankParseTextV279(text).map(r=>({...r,type:'multiple_choice',answer_data:{}}))}
function openAcademicBankImportV210(bankId){
  academicBankImportRowsV279=[];
  showModal(`<button class="icon-btn close" onclick="closeModal()">×</button><span class="eyebrow">Carga rápida · Banco mixto</span><h2>Importar preguntas</h2>
    <p class="subtle">Los CSV antiguos A-B-C-D siguen funcionando. La nueva plantilla permite mezclar los cuatro tipos de preguntas.</p>
    <div class="bank-import-format-note-v210"><b>CSV mixto recomendado</b><span>Selección múltiple · Verdadero/Falso · Relacionar · Completar</span></div>
    <textarea id="academicBankImportTextV279" class="bank-import-text-v279" rows="10" placeholder="También puede pegar preguntas A-B-C-D en el formato tradicional…"></textarea>
    <div class="bank-import-controls-v279"><label class="file-chip-v279">Archivo CSV/TXT<input id="academicBankImportFileV279" type="file" accept=".csv,.txt,text/csv,text/plain" onchange="academicBankReadImportFileV210(this,'${bankId}')"></label><button class="text-btn" onclick="downloadAcademicBankTemplateV210()">Plantilla CSV mixta</button></div>
    <div class="form-actions"><button class="btn academic-main-btn" onclick="academicBankAnalyzeImportV210('${bankId}')">Analizar preguntas</button><button class="btn secondary" onclick="closeModal();openAcademicBankManageV279('${bankId}')">Cancelar</button></div>
    <div id="academicBankImportPreviewV279"></div>`);
}
async function academicBankReadImportFileV210(input,bankId){
  const file=input?.files?.[0];if(!file)return;
  try{const text=await file.text();const area=document.getElementById('academicBankImportTextV279');if(area)area.value=text;academicBankImportRowsV279=file.name.toLowerCase().endsWith('.csv')?academicBankParseCsvV210(text):academicBankParseTextV210(text);academicRenderBankImportPreviewV210(bankId)}catch(error){toast('No se pudo leer el archivo')}
}
function academicBankAnalyzeImportV210(bankId){
  const text=document.getElementById('academicBankImportTextV279')?.value||'';
  const firstLine=String(text).replace(/^\uFEFF/,'').split(/\r?\n/)[0]||'';
  const looksCsv=/[;,]/.test(firstLine)&&/(pregunta|question)/i.test(firstLine);
  academicBankImportRowsV279=looksCsv?academicBankParseCsvV210(text):academicBankParseTextV210(text);academicRenderBankImportPreviewV210(bankId);
}
function academicRenderBankImportPreviewV210(bankId){
  const box=document.getElementById('academicBankImportPreviewV279');if(!box)return;const rows=academicBankImportRowsV279;
  if(!rows.length){box.innerHTML='<div class="bank-import-empty-v279">No se detectaron preguntas válidas. Si usa modalidades mixtas, descargue la plantilla CSV nueva.</div>';return}
  const counts={};rows.forEach(r=>counts[r.type]=(counts[r.type]||0)+1);
  const chips=Object.entries(counts).map(([type,count])=>`<span class="bank-import-type-chip-v210 ${academicBankTypeClassV210(type)}"><b>${count}</b> ${esc(academicBankTypeLabelV210(type))}</span>`).join('');
  box.innerHTML=`<div class="bank-import-summary-v279"><b>${rows.length} preguntas listas</b><small>Revise antes de guardar. Máximo 500 por importación.</small><div class="bank-import-types-v210">${chips}</div></div><div class="bank-import-preview-v279">${rows.slice(0,12).map((r,i)=>`<div><span>${i+1}</span><b>${esc(r.question)}</b><small>${esc(academicBankTypeLabelV210(r.type))}</small></div>`).join('')}${rows.length>12?`<p>+ ${rows.length-12} preguntas adicionales</p>`:''}</div><button class="btn academic-main-btn bank-import-save-v279" onclick="commitAcademicBankImportV210('${bankId}')">Importar ${Math.min(rows.length,500)} preguntas</button>`;
}
async function commitAcademicBankImportV210(bankId){
  if(!academicBankImportRowsV279.length)return toast('No hay preguntas listas para importar');
  if(academicBankImportRowsV279.length>500&&!confirm(`Se detectaron ${academicBankImportRowsV279.length} preguntas. Se importarán las primeras 500. ¿Continuar?`))return;
  const rows=academicBankImportRowsV279.slice(0,500);
  try{
    const count=Number(await academicRPCWithRetryV275('academic_bank_import_questions_v210',{p_token:academicSession.session_token,p_bank_id:bankId,p_rows:rows},2)||0);
    const rejected=Math.max(0,rows.length-count);await loadAcademicBanksV279();
    showModal(`<button class="icon-btn close" onclick="closeModal();openAcademicBankManageV279('${bankId}')">×</button><div class="bank-import-result-v210 ${rejected?'warning':''}"><span>${rejected?'⚠️':'✅'}</span><h2>${rejected?'Importación completada con observaciones':'Importación completada'}</h2><div><b>${rows.length}</b><small>detectadas</small></div><div><b>${count}</b><small>cargadas</small></div><div><b>${rejected}</b><small>rechazadas</small></div><p>${rejected?'Revise las filas rechazadas y vuelva a importarlas. Las preguntas correctas ya quedaron guardadas.':'Todas las preguntas fueron guardadas correctamente.'}</p><button class="btn academic-main-btn" onclick="closeModal();openAcademicBankManageV279('${bankId}')">Volver al banco</button></div>`);
  }catch(error){console.error(error);toast(academicFriendlyError(error,'No se pudieron importar las preguntas'))}
}
function downloadAcademicBankTemplateV210(){
  const csv='tipo;pregunta;A;B;C;D;correcta;explicacion;contenido\n'+
  'seleccion;"¿Cuál es la opción correcta?";"Opción A";"Opción B";"Opción C";"Opción D";B;"Explicación opcional";\n'+
  'verdadero_falso;"La auditoría es un examen sistemático.";;;;;VERDADERO;"Explicación opcional";\n'+
  'completar;"La ________ permite verificar el uso de recursos públicos.";;;;;;"Explicación opcional";"auditoría|auditoria"\n'+
  'relacionar;"Relacione cada concepto con su definición.";;;;;;"Explicación opcional";"Eficacia=>Logro de objetivos||Eficiencia=>Uso adecuado de recursos"\n';
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='plantilla-banco-preguntas-mixto-v210.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function academicBankAttemptTypeHeaderV210(q){return `<span class="bank-attempt-type-v210 ${academicBankTypeClassV210(q.type||'multiple_choice')}">${academicBankTypeIconV210(q.type)} ${esc(academicBankTypeLabelV210(q.type))}</span>`}
function academicBankFeedbackV210(q,answered,attempt){
  if(!answered||attempt.attempt_mode!=='estudio')return'';
  const ca=answered.correct_answer||{};let answer='';
  if(q.type==='multiple_choice'&&ca.option)answer=`Respuesta correcta: ${esc(ca.option)}`;
  else if(q.type==='true_false'&&typeof ca.value==='boolean')answer=`Respuesta correcta: ${ca.value?'Verdadero':'Falso'}`;
  else if(q.type==='fill_blank'&&Array.isArray(ca.answers))answer=`Respuesta aceptada: ${esc(ca.answers.join(' / '))}`;
  else if(q.type==='matching'&&Array.isArray(ca.pairs))answer=`<div class="bank-match-solution-v210">${ca.pairs.map(p=>`<span><b>${esc(p.left)}</b> → ${esc(p.right)}</span>`).join('')}</div>`;
  return `<div class="bank-feedback-v279 ${answered.is_correct?'ok':'bad'}"><b>${answered.is_correct?'✓ Correcto':'✕ Incorrecto'}</b>${answer?`<span>${answer}</span>`:''}${answered.explanation?`<p>${esc(answered.explanation)}</p>`:''}</div>`;
}
function academicBankQuestionBodyV210(q,answered){
  const type=q.type||'multiple_choice';
  if(type==='multiple_choice'){
    return `<div class="bank-options-v279">${(q.options||[]).map(opt=>{let cls='';if(answered){if(opt.key===answered.selected?.option)cls+=' selected';if(academicBankActiveAttemptV279.attempt_mode==='estudio'&&answered.correct_answer?.option){if(opt.key===answered.correct_answer.option)cls+=' correct';else if(opt.key===answered.selected?.option&&!answered.is_correct)cls+=' wrong'}}return `<button class="bank-option-v279${cls}" ${answered?'disabled':''} onclick="submitAcademicBankAnswerV210('${q.id}',{option:'${opt.key}'})"><span>${esc(opt.key)}</span><b>${esc(opt.text)}</b></button>`}).join('')}</div>`;
  }
  if(type==='true_false'){
    return `<div class="bank-tf-options-v210">${(q.options||[]).map(opt=>{const value=opt.key==='true',selected=answered&&answered.selected?.value===value;let cls=selected?' selected':'';if(answered&&academicBankActiveAttemptV279.attempt_mode==='estudio'&&typeof answered.correct_answer?.value==='boolean'){if(answered.correct_answer.value===value)cls+=' correct';else if(selected&&!answered.is_correct)cls+=' wrong'}return `<button class="bank-tf-option-v210${cls}" ${answered?'disabled':''} onclick="submitAcademicBankAnswerV210('${q.id}',{value:${value}})"><span>${value?'V':'F'}</span><b>${esc(opt.text)}</b></button>`}).join('')}</div>`;
  }
  if(type==='fill_blank'){
    const value=answered?.selected?.text||'';
    return `<div class="bank-fill-answer-v210"><label>Escriba la palabra o concepto<input id="bankFillAnswerV210_${q.id}" value="${esc(value)}" ${answered?'disabled':''} autocomplete="off" autocapitalize="sentences" placeholder="Escriba su respuesta…"></label>${answered?'':`<button class="btn academic-main-btn" onclick="submitAcademicBankFillV210('${q.id}')">Responder</button>`}</div>`;
  }
  const left=Array.isArray(q.data?.left)?q.data.left:[],right=Array.isArray(q.data?.right)?q.data.right:[];
  const selected=answered?.selected?.matches||{};
  return `<div class="bank-matching-v210"><div class="bank-matching-note-v210">Seleccione para cada concepto la correspondencia correcta. Cada opción se utiliza una sola vez.</div>${left.map((item,i)=>`<label class="bank-match-row-v210"><span><b>${i+1}</b>${esc(item.text)}</span><select data-match-left-v210="${esc(item.id)}" ${answered?'disabled':''}><option value="">Elegir correspondencia…</option>${right.map(r=>`<option value="${esc(r.id)}" ${selected[item.id]===r.id?'selected':''}>${esc(r.text)}</option>`).join('')}</select></label>`).join('')}${answered?'':`<button class="btn academic-main-btn" onclick="submitAcademicBankMatchingV210('${q.id}')">Comprobar relaciones</button>`}</div>`;
}
function renderAcademicBankAttemptV210(){
  const attempt=academicBankActiveAttemptV279;if(!attempt)return;const questions=attempt.questions||[],q=questions[academicBankAttemptIndexV279];if(!q)return;
  q.type=q.type||'multiple_choice';const answered=academicBankAttemptAnswersV279.get(String(q.id));const progress=Math.round(((academicBankAttemptIndexV279+1)/questions.length)*100);
  const body=academicBankQuestionBodyV210(q,answered),feedback=academicBankFeedbackV210(q,answered,attempt);
  showModal(`<button class="icon-btn close" onclick="closeModal()">×</button>
    <div class="bank-attempt-head-v279"><div><span class="eyebrow">${esc(attempt.subject)} · ${attempt.attempt_mode==='estudio'?'Modo estudio':'Simulacro mixto'}</span><h2>${esc(attempt.title)}</h2></div><span>${academicBankAttemptIndexV279+1}/${questions.length}</span></div>
    <div class="bank-progress-v279"><i style="width:${progress}%"></i></div>
    <section class="bank-question-v279 bank-question-v210"><div class="bank-question-kicker-v210"><span>Pregunta ${academicBankAttemptIndexV279+1}</span>${academicBankAttemptTypeHeaderV210(q)}</div><h3>${esc(q.question)}</h3>${body}${feedback}</section>
    <div class="bank-attempt-actions-v279">${answered?`<button class="btn academic-main-btn" onclick="academicBankNextV279()">${academicBankAttemptIndexV279===questions.length-1?'Finalizar':'Siguiente'}</button>`:`<small>${q.type==='matching'?'Complete todas las relaciones para continuar.':q.type==='fill_blank'?'Escriba su respuesta para continuar.':'Seleccione una respuesta para continuar.'}</small>`}</div>`);
}
async function startAcademicBankAttemptV210(bankId,mode){
  if(!navigator.onLine)return toast('Necesita conexión para iniciar el cuestionario');if(academicBankSubmittingV279)return;academicBankSubmittingV279=true;
  try{let data=await academicRPCWithRetryV275('academic_bank_start_attempt_v210',{p_token:academicSession.session_token,p_bank_id:bankId,p_mode:mode},2);data=Array.isArray(data)?data[0]:data;if(!data?.attempt_id||!Array.isArray(data.questions)||!data.questions.length)throw new Error('El servidor no entregó las preguntas');academicBankActiveAttemptV279=data;academicBankAttemptIndexV279=0;academicBankAttemptAnswersV279=new Map();renderAcademicBankAttemptV210()}catch(error){console.error(error);toast(academicFriendlyError(error,'No se pudo iniciar el cuestionario'))}finally{academicBankSubmittingV279=false}
}
async function submitAcademicBankAnswerV210(questionId,selected){
  if(academicBankSubmittingV279||!academicBankActiveAttemptV279)return;academicBankSubmittingV279=true;
  try{let result=await academicRPCWithRetryV275('academic_bank_submit_answer_v210',{p_token:academicSession.session_token,p_attempt_id:academicBankActiveAttemptV279.attempt_id,p_question_id:questionId,p_selected:selected},2);result=Array.isArray(result)?result[0]:result||{};academicBankAttemptAnswersV279.set(String(questionId),{selected,is_correct:result.is_correct,correct_answer:result.correct_answer||null,explanation:result.explanation||''});renderAcademicBankAttemptV210()}catch(error){console.error(error);toast(academicFriendlyError(error,'No se pudo guardar la respuesta'))}finally{academicBankSubmittingV279=false}
}
function submitAcademicBankFillV210(questionId){const input=document.getElementById(`bankFillAnswerV210_${questionId}`),text=String(input?.value||'').trim();if(!text)return toast('Escriba una respuesta');submitAcademicBankAnswerV210(questionId,{text})}
function submitAcademicBankMatchingV210(questionId){
  const rows=[...document.querySelectorAll('[data-match-left-v210]')],matches={},used=new Set();
  for(const row of rows){const value=row.value;if(!value)return toast('Complete todas las relaciones');if(used.has(value))return toast('Cada correspondencia debe utilizarse una sola vez');used.add(value);matches[row.dataset.matchLeftV210]=value}
  submitAcademicBankAnswerV210(questionId,{matches});
}

// Sobrescribe solamente la capa del Banco; el resto del modo online permanece intacto.
openAcademicBankManageV279=openAcademicBankManageV210;
renderAcademicBankManageV279=renderAcademicBankManageV210;
openAcademicBankQuestionFormV279=openAcademicBankQuestionFormV210;
saveAcademicBankQuestionV279=saveAcademicBankQuestionV210;
openAcademicBankImportV279=openAcademicBankImportV210;
academicBankReadImportFileV279=academicBankReadImportFileV210;
academicBankAnalyzeImportV279=academicBankAnalyzeImportV210;
academicRenderBankImportPreviewV279=academicRenderBankImportPreviewV210;
commitAcademicBankImportV279=commitAcademicBankImportV210;
downloadAcademicBankTemplateV279=downloadAcademicBankTemplateV210;
startAcademicBankAttemptV279=startAcademicBankAttemptV210;
renderAcademicBankAttemptV279=renderAcademicBankAttemptV210;
submitAcademicBankAnswerV279=(questionId,selected)=>submitAcademicBankAnswerV210(questionId,{option:selected});

/* =========================================================
   AGENDA POLICIAL v2.11.1 — MEZCLA AUTOMÁTICA
   Convierte temporalmente bancos A/B/C/D a modalidades mixtas.
   No duplica ni modifica las preguntas almacenadas.
   ========================================================= */
function renderAcademicBankManageV211(bank){
  const questions=academicBankAdminQuestionsV279.get(String(bank.id))||[];
  const counts={multiple_choice:0,true_false:0,matching:0,fill_blank:0};
  questions.forEach(q=>{const t=academicBankQuestionTypeV210(q);counts[t]=(counts[t]||0)+1});
  const typeChips=Object.entries(counts).filter(([,count])=>count>0).map(([type,count])=>`<span class="bank-type-count-v210 ${academicBankTypeClassV210(type)}"><b>${count}</b>${esc(academicBankTypeLabelV210(type))}</span>`).join('');
  const onlyMultiple=questions.length>=2&&counts.multiple_choice===questions.length;
  const autoNote=onlyMultiple?`<div class="bank-auto-mix-note-v211"><span>⚡</span><div><b>Mezcla automática activa</b><p>No necesita convertir estas ${questions.length} preguntas manualmente. Al iniciar Estudio o Simulacro, Agenda Policial generará temporalmente Selección múltiple, Verdadero/Falso, Completar y Relacionar usando este mismo banco.</p></div></div>`:'';
  showModal(`<button class="icon-btn close" onclick="closeModal()">×</button>
    <div class="bank-manage-head-v279"><div><span class="eyebrow">${esc(bank.subject)}</span><h2>${esc(bank.title||bank.topic)}</h2><p>${esc(bank.topic)} · ${questions.length} preguntas</p></div>${academicBankStatusV279(bank)}</div>
    ${questions.length?`<div class="bank-type-counts-v210">${typeChips}</div>`:''}${autoNote}
    <div class="bank-manage-actions-v279"><button class="btn academic-main-btn" onclick="openAcademicBankQuestionFormV279('${bank.id}')">Agregar pregunta</button><button class="btn secondary" onclick="openAcademicBankImportV279('${bank.id}')">Importar preguntas</button><button class="text-btn" onclick="closeModal();openAcademicBankFormV279('${bank.id}')">Editar datos</button></div>
    <div class="bank-publish-strip-v279"><span>${bank.published?'Visible para el curso':'Todavía no visible para estudiantes'}</span><button class="btn ${bank.published?'secondary':'academic-main-btn'}" onclick="toggleAcademicBankPublishV279('${bank.id}',${bank.published?'false':'true'})">${bank.published?'Ocultar banco':'Publicar banco'}</button></div>
    <div class="bank-question-admin-list-v279 bank-question-admin-list-v210">${questions.length?questions.map(q=>`<article><div><div class="bank-question-meta-v210"><span>Pregunta ${q.question_order}</span>${academicBankTypeBadgeV210(academicBankQuestionTypeV210(q))}</div><b>${esc(q.question_text)}</b><small>${esc(academicBankQuestionSummaryV210(q))}${q.explanation?' · Con explicación':''}</small></div><div><button class="icon-btn" title="Editar" onclick="openAcademicBankQuestionFormV279('${bank.id}','${q.id}')">✎</button><button class="icon-btn danger" title="Eliminar" onclick="deleteAcademicBankQuestionV279('${bank.id}','${q.id}')">×</button></div></article>`).join(''):'<div class="bank-empty-questions-v279">Todavía no hay preguntas.</div>'}</div>`);
}

function renderAcademicBankAttemptV211(){
  const attempt=academicBankActiveAttemptV279;if(!attempt)return;const questions=attempt.questions||[],q=questions[academicBankAttemptIndexV279];if(!q)return;
  q.type=q.type||'multiple_choice';const answered=academicBankAttemptAnswersV279.get(String(q.id));const progress=Math.round(((academicBankAttemptIndexV279+1)/questions.length)*100);
  const body=academicBankQuestionBodyV210(q,answered),feedback=academicBankFeedbackV210(q,answered,attempt);
  const autoBadge=attempt.auto_generated?`<span class="bank-auto-badge-v211">⚡ Mixto automático</span>`:'';
  showModal(`<button class="icon-btn close" onclick="closeModal()">×</button>
    <div class="bank-attempt-head-v279"><div><span class="eyebrow">${esc(attempt.subject)} · ${attempt.attempt_mode==='estudio'?'Modo estudio':'Simulacro mixto'}</span><h2>${esc(attempt.title)}</h2>${autoBadge}</div><span>${academicBankAttemptIndexV279+1}/${questions.length}</span></div>
    <div class="bank-progress-v279"><i style="width:${progress}%"></i></div>
    <section class="bank-question-v279 bank-question-v210"><div class="bank-question-kicker-v210"><span>Pregunta ${academicBankAttemptIndexV279+1}</span>${academicBankAttemptTypeHeaderV210(q)}</div><h3>${esc(q.question)}</h3>${body}${feedback}</section>
    <div class="bank-attempt-actions-v279">${answered?`<button class="btn academic-main-btn" onclick="academicBankNextV279()">${academicBankAttemptIndexV279===questions.length-1?'Finalizar':'Siguiente'}</button>`:`<small>${q.type==='matching'?'Complete todas las relaciones para continuar.':q.type==='fill_blank'?'Escriba su respuesta para continuar.':'Seleccione una respuesta para continuar.'}</small>`}</div>`);
}

async function startAcademicBankAttemptV211(bankId,mode){
  if(!navigator.onLine)return toast('Necesita conexión para iniciar el cuestionario');if(academicBankSubmittingV279)return;academicBankSubmittingV279=true;
  try{
    let data=await academicRPCWithRetryV275('academic_bank_start_attempt_v211',{p_token:academicSession.session_token,p_bank_id:bankId,p_mode:mode},2);
    data=Array.isArray(data)?data[0]:data;
    if(!data?.attempt_id||!Array.isArray(data.questions)||!data.questions.length)throw new Error('El servidor no entregó las preguntas');
    academicBankActiveAttemptV279=data;academicBankAttemptIndexV279=0;academicBankAttemptAnswersV279=new Map();renderAcademicBankAttemptV211();
  }catch(error){console.error(error);toast(academicFriendlyError(error,'No se pudo iniciar el cuestionario'))}finally{academicBankSubmittingV279=false}
}

renderAcademicBankManageV210=renderAcademicBankManageV211;
renderAcademicBankManageV279=renderAcademicBankManageV211;
renderAcademicBankAttemptV210=renderAcademicBankAttemptV211;
renderAcademicBankAttemptV279=renderAcademicBankAttemptV211;
startAcademicBankAttemptV210=startAcademicBankAttemptV211;
startAcademicBankAttemptV279=startAcademicBankAttemptV211;


/* =========================================================
   AGENDA POLICIAL v2.11.1 — SINCRONIZACIÓN Y PUBLICACIÓN SEGURA
   - Refresco visible del Banco para lectores y administradores.
   - Confirmación antes de ocultar un banco publicado.
   - Refresco al volver a la app si el Banco está abierto.
   ========================================================= */
let academicBankRefreshingV2111=false;
let academicBankLastSyncV2111=null;
let academicBankVisibilityTimerV2111=0;

function academicBankSyncLabelV2111(){
  if(!navigator.onLine)return 'Sin conexión · mostrando copia guardada';
  if(!academicBankLastSyncV2111)return 'Sincronizado con el curso activo';
  try{return `Actualizado ${new Date(academicBankLastSyncV2111).toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'})}`}
  catch{return 'Sincronizado con el curso activo'}
}

academicBankViewV279=function academicBankViewV2111(){
  return `
    ${academicProfileHeader()}
    ${academicTextNav()}
    <div class="online-module-head premium-module-head v277-module-head bank-head-v279">
      <div class="premium-module-copy">
        <span class="module-visual-icon">❓</span>
        <div><span class="eyebrow">${esc(academicCourseLabelV277())}</span><h3>Banco de preguntas</h3><p>Práctica por materia y simulacros con resultado individual.</p></div>
      </div>
      ${academicCanManageBankV279()?'<button class="btn academic-main-btn" onclick="openAcademicBankFormV279()">Nuevo banco</button>':''}
    </div>
    <div class="bank-toolbar-v279 bank-toolbar-v2111">
      <label><span>Buscar</span><input id="academicBankSearch" placeholder="Materia o tema" value="${esc(academicBankSearchV279)}" oninput="academicFilterBanksV279(this.value)"></label>
      <div class="bank-sync-row-v2111"><div class="bank-toolbar-note-v279" id="academicBankSyncTextV2111">${esc(academicBankSyncLabelV2111())}</div><button class="bank-refresh-btn-v2111" id="academicBankRefreshBtnV2111" onclick="refreshAcademicBanksV2111()">↻ Actualizar</button></div>
    </div>
    <div id="academicBankListV279"><div class="card small"><p>Cargando bancos…</p></div></div>
  `;
};

async function refreshAcademicBanksV2111(showToast=true){
  if(academicBankRefreshingV2111)return;
  if(!academicSession)return;
  academicBankRefreshingV2111=true;
  const btn=document.getElementById('academicBankRefreshBtnV2111');
  const txt=document.getElementById('academicBankSyncTextV2111');
  if(btn){btn.disabled=true;btn.textContent='↻ Actualizando…'}
  if(txt)txt.textContent=navigator.onLine?'Consultando el curso…':'Sin conexión · mostrando copia guardada';
  try{
    await loadAcademicBanksV279();
    academicBankLastSyncV2111=new Date().toISOString();
    if(txt)txt.textContent=academicBankSyncLabelV2111();
    if(showToast&&navigator.onLine)toast('Banco de preguntas actualizado');
  }finally{
    academicBankRefreshingV2111=false;
    if(btn){btn.disabled=false;btn.textContent='↻ Actualizar'}
  }
}

academicRenderBankListV279=function academicRenderBankListV2111(syncError=false){
  const box=$('#academicBankListV279'); if(!box)return;
  const rows=academicBankVisibleRowsV279();
  const warning=syncError?'<div class="academic-sync-banner warning"><div><b>No se pudo actualizar</b><small>Se muestra la última copia disponible.</small></div><button onclick="refreshAcademicBanksV2111()">Reintentar</button></div>':'';
  if(!rows.length){
    box.innerHTML=warning+`<div class="bank-empty-v279"><span>❓</span><b>No hay bancos de preguntas disponibles.</b><p>${academicCanManageBankV279()?'Puede crear o publicar un banco para este curso.':'Si acaba de publicarse un banco, pulse Actualizar para sincronizarlo.'}</p><button class="btn secondary bank-empty-refresh-v2111" onclick="refreshAcademicBanksV2111()">↻ Actualizar bancos</button></div>`;
    return;
  }
  box.innerHTML=warning+`<div class="bank-grid-v279">${rows.map(academicBankCardV279).join('')}</div>`;
};

const _loadAcademicBanksV2111=loadAcademicBanksV279;
loadAcademicBanksV279=async function loadAcademicBanksV2111(){
  await _loadAcademicBanksV2111();
  if(navigator.onLine)academicBankLastSyncV2111=new Date().toISOString();
  const txt=document.getElementById('academicBankSyncTextV2111');
  if(txt)txt.textContent=academicBankSyncLabelV2111();
};

const _toggleAcademicBankPublishV2111=toggleAcademicBankPublishV279;
toggleAcademicBankPublishV279=async function toggleAcademicBankPublishV2111(bankId,published){
  if(!published){
    const bank=academicBankRowsV279.find(item=>String(item.id)===String(bankId));
    const label=bank?.title||bank?.topic||'este banco';
    if(!confirm(`¿Ocultar “${label}”?\n\nDejará de aparecer inmediatamente para los usuarios lectores del curso.`))return;
  }
  return _toggleAcademicBankPublishV2111(bankId,published);
};

if(!window.__agendaBankVisibilityV2111){
  window.__agendaBankVisibilityV2111=true;
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState!=='visible'||academicTab!=='banco'||!academicSession||!navigator.onLine)return;
    clearTimeout(academicBankVisibilityTimerV2111);
    academicBankVisibilityTimerV2111=setTimeout(()=>refreshAcademicBanksV2111(false),350);
  });
  window.addEventListener('online',()=>{
    if(academicTab==='banco'&&academicSession)setTimeout(()=>refreshAcademicBanksV2111(false),350);
  });
}
