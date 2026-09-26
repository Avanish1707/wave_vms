const $ = (selector) => document.querySelector(selector);
const state = { host: '', employees: [], detections: [], cameras: [] };
const api = (path, query = {}) => {
  const url = new URL(`${state.host}${path}`);
  Object.entries(query).forEach(([key, value]) => value !== undefined && value !== '' && url.searchParams.set(key, value));
  return url;
};
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&':'&','<':'<','>':'>',"'":'&#39;','"':'&quot;' })[char]);
const formatDate = (value) => { if (!value) return '—'; const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value); return Number.isNaN(date) ? String(value) : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); };
const titleForType = (type) => ({ vehicle:'Vehicle detected', known_person:'Known person detected', unknown_person:'Unknown person detected', fall_detected:'Fall detected', smoke_detected:'Smoke detected', fire_detected:'Fire detected' }[type] || String(type || 'Detection').replaceAll('_', ' '));

async function request(path, options) {
  const response = await fetch(api(path), options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) throw new Error(payload.message || `Request failed (${response.status})`);
  return payload;
}
async function login(event) {
  event.preventDefault();
  const error = $('#loginError'); error.textContent = '';
  state.host = $('#apiHost').value.trim().replace(/\/$/, '');
  try {
    const result = await request('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: $('#username').value.trim(), password: $('#password').value, fcm_token: '' }) });
    $('#adminName').textContent = result.username || 'Admin'; $('#avatar').textContent = (result.username || 'A')[0].toUpperCase(); $('#hostLabel').textContent = state.host.replace(/^https?:\/\//, '');
    $('#loginView').classList.add('hidden'); $('#portalView').classList.remove('hidden');
    await loadAll();
  } catch (err) { error.textContent = err.message.includes('Failed to fetch') ? 'Could not reach the API host. Check the server address or CORS settings.' : err.message; }
}
async function loadAll() { await Promise.all([loadEmployees(), loadDetections(), loadCameras()]); $('#updatedAt').textContent = `UPDATED ${new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}`; }
async function loadEmployees() {
  $('#registrationState').classList.remove('hidden'); $('#registrationState').textContent = 'Loading registered people…';
  try { state.employees = (await request('/api/registered-employees')).employees || []; renderEmployees(); } catch (err) { $('#registrationState').textContent = `Could not load registrations: ${err.message}`; }
}
function renderEmployees() {
  const term = $('#employeeSearch').value.toLowerCase(); const rows = state.employees.filter(p => [p.employee_name,p.employee_id,p.designation,p.gate_no].some(x => String(x || '').toLowerCase().includes(term)));
  $('#employeeCount').textContent = `${rows.length} ${rows.length === 1 ? 'person' : 'people'}`; const grid = $('#registrationGrid'); grid.innerHTML = '';
  $('#registrationState').classList.toggle('hidden', rows.length > 0); if (!rows.length) { $('#registrationState').textContent = term ? 'No registered people match your search.' : 'No registered people found.'; return; }
  const template = $('#personTemplate'); rows.forEach(person => { const card = template.content.cloneNode(true); const image = card.querySelector('img'); const noPhoto = card.querySelector('.no-photo'); if (person.image_urls?.[0]) { image.src = person.image_urls[0]; image.onerror = () => { image.style.display = 'none'; noPhoto.classList.remove('hidden'); }; } else { image.classList.add('hidden'); noPhoto.classList.remove('hidden'); } card.querySelector('.gate-tag').textContent = person.gate_no || 'NO GATE'; card.querySelector('h3').textContent = person.employee_name || 'Unnamed person'; card.querySelector('.designation').textContent = person.designation || 'No designation'; card.querySelector('.employee-id').textContent = person.employee_id || '—'; card.querySelector('.registered-date').textContent = formatDate(person.created_at); grid.append(card); });
}
async function loadDetections() {
  $('#alertState').classList.remove('hidden'); $('#alertState').textContent = 'Loading detection alerts…';
  try { state.detections = (await request('/api/detections', { method:'GET' })).detections || []; renderAlerts(); } catch (err) { $('#alertState').textContent = `Could not load alerts: ${err.message}`; }
}
async function loadCameras() { try { state.cameras = (await request('/api/cameras')).cameras || []; const select = $('#cameraFilter'); const current = select.value; select.innerHTML = '<option value="all">All cameras</option>' + state.cameras.map(c => `<option value="${escapeHtml(c.camera_id)}">${escapeHtml(c.name || c.camera_id)}</option>`).join(''); select.value = current; } catch (_) { /* Detection records remain filterable without camera metadata. */ } }
function renderAlerts() {
  const kind = $('#typeFilter').value, camera = $('#cameraFilter').value; const rows = state.detections.filter(item => (kind === 'all' || item.type === kind) && (camera === 'all' || item.camera_id === camera)); const list = $('#alertsList'); list.innerHTML = ''; $('#alertState').classList.toggle('hidden', rows.length > 0); $('#alertBadge').textContent = state.detections.length; $('#alertBadge').classList.toggle('hidden', !state.detections.length); if (!rows.length) { $('#alertState').textContent = 'No alerts match the selected filters.'; return; } rows.forEach(item => { const card = document.createElement('article'); card.className = `alert-card ${escapeHtml(item.type)}`; const image = item.image_url ? `<img class="alert-image" src="${escapeHtml(item.image_url)}" alt="Detection evidence" onerror="this.remove()">` : ''; card.innerHTML = `${image}<div class="alert-info"><h3>${escapeHtml(item.title || titleForType(item.type))}</h3><p>${escapeHtml(item.message || item.person_name || item.vehicle_type || 'Detection recorded')}</p><div class="alert-meta"><span>${escapeHtml(item.camera_name || item.gate || item.camera_id || 'Unknown camera')}</span>${item.confidence ? `<span>${Math.round(item.confidence * 100)}% confidence</span>` : ''}</div></div><time class="alert-time">${escapeHtml(formatDate(item.time))}</time>`; list.append(card); });
}
function showPage(page) { document.querySelectorAll('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.page === page)); $('#registrationsPage').classList.toggle('hidden', page !== 'registrations'); $('#alertsPage').classList.toggle('hidden', page !== 'alerts'); $('#pageTitle').textContent = page === 'alerts' ? 'Detection alerts' : 'Registered people'; $('#sectionKicker').textContent = page === 'alerts' ? 'SECURITY EVENTS' : 'EMPLOYEE DIRECTORY'; }
$('#loginForm').addEventListener('submit', login); $('#employeeSearch').addEventListener('input', renderEmployees); document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => showPage(button.dataset.page))); $('#typeFilter').addEventListener('change', renderAlerts); $('#cameraFilter').addEventListener('change', renderAlerts); $('#clearFilters').addEventListener('click', () => { $('#typeFilter').value = 'all'; $('#cameraFilter').value = 'all'; renderAlerts(); }); $('#refreshButton').addEventListener('click', loadAll); $('#logoutButton').addEventListener('click', () => { $('#portalView').classList.add('hidden'); $('#loginView').classList.remove('hidden'); });
