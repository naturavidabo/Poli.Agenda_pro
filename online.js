/* Agenda Policial Online v2.6.4 — módulo académico opcional y nómina preinstalada */
const ONLINE_CFG = {
  url: '',
  anonKey: '',
  bucket: 'academic-files'
};

const ACADEMIC_ROSTER_URL = './data/academic-users.json';
const ACADEMIC_USERS_STORAGE = 'agenda-academic-users-v263';
const ACADEMIC_POSTS_STORAGE = 'agenda-academic-posts-v263';
const ACADEMIC_SESSION_STORAGE = 'agenda-academic-session';

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
  const users = await academicLocalUsers();
  const ciKey = academicCredential(ci);
  const phoneKey = academicCredential(phone);
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
  if (!ci || !phone) return toast('Ingrese carnet y número celular');

  try {
    let user;
    if (onlineConfigured()) {
      user = await academicRPC('academic_login', { p_ci: ci, p_phone: phone });
      if (Array.isArray(user)) user = user[0];
    } else {
      user = await academicLocalLogin(ci, phone);
    }

    if (!user?.session_token) return toast('Datos no registrados o acceso inactivo');
    academicSession = user;
    academicTab = 'panel';
    localStorage.setItem(ACADEMIC_SESSION_STORAGE, JSON.stringify(user));
    render();
    toast('Acceso académico habilitado');
  } catch (error) {
    console.error(error);
    toast('No se pudo conectar al área académica');
  }
}

function academicLogout(silent = false) {
  academicSession = null;
  academicTab = 'panel';
  localStorage.removeItem(ACADEMIC_SESSION_STORAGE);
  render();
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
        p_file_url: fileUrl
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
  if (onlineConfigured() && academicSession.storage_mode === 'local_roster') {
    academicSession = null;
    localStorage.removeItem(ACADEMIC_SESSION_STORAGE);
    return;
  }
  if (onlineConfigured()) return;
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
  validateAcademicLocalSession().then(() => {
    if (state.activated && state.mode) render();
  });
});

/* =========================================================
   Agenda Policial Online v2.6.4 — panel académico pulido
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
