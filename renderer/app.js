const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const COLORS = ['#e94560', '#9b59b6', '#3498db', '#e67e22', '#1abc9c', '#e91e63', '#00bcd4'];

let state = { kids: [], weekStart: null };
let currentKidId = null;
let currentManageKidId = null;

function getCurrentWeekStart() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

function getTodayIndex() {
  return new Date().getDay();
}

async function init() {
  state = await window.api.loadData();
  const currentWeek = getCurrentWeekStart();
  if (state.weekStart !== currentWeek) {
    // Auto-reset if new week
    if (state.weekStart && new Date(state.weekStart) < new Date(currentWeek)) {
      resetWeekData();
    }
    state.weekStart = currentWeek;
    await save();
  }
  showView('home');
  renderHome();
}

async function save() {
  await window.api.saveData(state);
}

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
}

function getKid(id) {
  return state.kids.find(k => k.id === id);
}

function kidHasStarToday(kid) {
  const today = getTodayIndex();
  return kid.chores.length > 0 && kid.chores.every(c => c.days && c.days[today] === 'done');
}

function kidHasStarOnDay(kid, dayIdx) {
  return kid.chores.length > 0 && kid.chores.every(c => c.days && c.days[dayIdx] === 'done');
}

// HOME VIEW
function renderHome() {
  const list = document.getElementById('kids-list');
  const empty = document.getElementById('empty-home');
  list.innerHTML = '';

  if (state.kids.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  state.kids.forEach((kid, idx) => {
    const color = COLORS[idx % COLORS.length];
    const letter = kid.name.charAt(0).toUpperCase();

    const card = document.createElement('div');
    card.className = 'kid-card';
    card.innerHTML = `
      <div class="kid-avatar" style="background: linear-gradient(135deg, ${color}, ${shiftColor(color)})">${letter}</div>
      <div class="kid-card-name">${escHtml(kid.name)}</div>
      <div class="kid-week-stars">${DAYS.map((d, i) => `<span class="week-star ${kidHasStarOnDay(kid, i) ? 'earned' : ''}" title="${d}">⭐</span>`).join('')}</div>
    `;
    card.addEventListener('click', () => openKid(kid.id));
    list.appendChild(card);
  });
}

function shiftColor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 0xff) + 60);
  const g = Math.min(255, ((n >> 8) & 0xff) + 30);
  const b = Math.min(255, (n & 0xff) + 80);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

// KID VIEW
function openKid(kidId) {
  currentKidId = kidId;
  const kid = getKid(kidId);
  document.getElementById('kid-name-title').textContent = kid.name + "'s Chores";
  renderWeekStars(kid);
  renderChores(kid);
  showView('kid');
}

function renderWeekStars(kid) {
  const container = document.getElementById('week-stars');
  container.innerHTML = DAYS.map((d, i) => `
    <div class="day-badge ${kidHasStarOnDay(kid, i) ? 'earned' : ''}">
      <span class="day-star">⭐</span>
      <span>${d}</span>
    </div>
  `).join('');
}

function renderChores(kid) {
  const list = document.getElementById('chores-list');
  const empty = document.getElementById('empty-chores');
  list.innerHTML = '';
  const today = getTodayIndex();

  if (kid.chores.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  kid.chores.forEach(chore => {
    const status = (chore.days && chore.days[today]) || 'pending';
    const item = document.createElement('div');
    item.className = `chore-item ${status === 'done' ? 'done' : status === 'failed' ? 'failed' : ''}`;
    item.innerHTML = `
      <div class="chore-status-icon">${status === 'done' ? '✅' : status === 'failed' ? '❌' : '⬜'}</div>
      <div class="chore-name">${escHtml(chore.name)}</div>
      <div class="chore-buttons">
        <button class="btn-check" data-id="${chore.id}" title="Done">✓</button>
        <button class="btn-cross" data-id="${chore.id}" title="Not done">✗</button>
      </div>
    `;
    item.querySelector('.btn-check').addEventListener('click', () => markChore(kid.id, chore.id, 'done'));
    item.querySelector('.btn-cross').addEventListener('click', () => markChore(kid.id, chore.id, 'failed'));
    list.appendChild(item);
  });
}

async function markChore(kidId, choreId, status) {
  const kid = getKid(kidId);
  const chore = kid.chores.find(c => c.id === choreId);
  const today = getTodayIndex();
  if (!chore.days) chore.days = {};
  chore.days[today] = status;
  await save();
  renderChores(kid);
  renderWeekStars(kid);

  if (status === 'done' && kidHasStarToday(kid)) {
    showStarCelebration(kid.name);
  }
}

// STAR CELEBRATION
function showStarCelebration(kidName) {
  document.getElementById('star-kid-name').textContent = kidName + ' did it! 🌟';
  document.getElementById('star-overlay').classList.remove('hidden');
  spawnConfetti();
}

function spawnConfetti() {
  const container = document.getElementById('confetti-container');
  container.innerHTML = '';
  const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6ab04c', '#e84393'];
  for (let i = 0; i < 80; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = (1.5 + Math.random() * 2) + 's';
    piece.style.animationDelay = (Math.random() * 1.5) + 's';
    piece.style.width = piece.style.height = (8 + Math.random() * 10) + 'px';
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    container.appendChild(piece);
  }
}

// MANAGE VIEW
function openManage() {
  renderManageKids();
  showView('manage');
}

function renderManageKids() {
  const list = document.getElementById('manage-kids-list');
  list.innerHTML = '';
  state.kids.forEach(kid => {
    const item = document.createElement('div');
    item.className = 'manage-kid-item';
    item.innerHTML = `
      <div class="manage-kid-name">${escHtml(kid.name)}</div>
      <div class="manage-kid-actions">
        <button class="btn btn-edit-chores" data-id="${kid.id}">Edit Chores</button>
        <button class="btn btn-delete" data-id="${kid.id}">Delete</button>
      </div>
    `;
    item.querySelector('.btn-edit-chores').addEventListener('click', () => openManageKidChores(kid.id));
    item.querySelector('.btn-delete').addEventListener('click', () => deleteKid(kid.id));
    list.appendChild(item);
  });
}

async function addKid() {
  const input = document.getElementById('new-kid-name');
  const name = input.value.trim();
  if (!name) return;
  state.kids.push({ id: uid(), name, chores: [] });
  input.value = '';
  await save();
  renderManageKids();
}

async function deleteKid(id) {
  state.kids = state.kids.filter(k => k.id !== id);
  await save();
  renderManageKids();
}

// MANAGE KID CHORES VIEW
function openManageKidChores(kidId) {
  currentManageKidId = kidId;
  const kid = getKid(kidId);
  document.getElementById('manage-kid-title').textContent = kid.name + "'s Chores";
  renderManageChores(kid);
  showView('manage-kid');
}

function renderManageChores(kid) {
  const list = document.getElementById('manage-chores-list');
  list.innerHTML = '';
  kid.chores.forEach(chore => {
    const item = document.createElement('div');
    item.className = 'manage-chore-item';
    item.innerHTML = `
      <div class="manage-chore-name">${escHtml(chore.name)}</div>
      <div class="manage-chore-actions">
        <button class="btn btn-delete" data-id="${chore.id}">Delete</button>
      </div>
    `;
    item.querySelector('.btn-delete').addEventListener('click', () => deleteChore(kid.id, chore.id));
    list.appendChild(item);
  });
}

async function addChore() {
  const input = document.getElementById('new-chore-name');
  const name = input.value.trim();
  if (!name || !currentManageKidId) return;
  const kid = getKid(currentManageKidId);
  kid.chores.push({ id: uid(), name, days: {} });
  input.value = '';
  await save();
  renderManageChores(kid);
}

async function deleteChore(kidId, choreId) {
  const kid = getKid(kidId);
  kid.chores = kid.chores.filter(c => c.id !== choreId);
  await save();
  renderManageChores(kid);
}

// RESET WEEK
function resetWeekData() {
  state.kids.forEach(kid => {
    kid.chores.forEach(chore => { chore.days = {}; });
  });
}

async function resetWeek() {
  if (!confirm('Reset the whole week for all kids?')) return;
  resetWeekData();
  state.weekStart = getCurrentWeekStart();
  await save();
  renderHome();
}

// UTILS
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// EVENT LISTENERS
document.getElementById('btn-manage').addEventListener('click', openManage);
document.getElementById('btn-reset').addEventListener('click', resetWeek);
document.getElementById('btn-back').addEventListener('click', () => { showView('home'); renderHome(); });
document.getElementById('btn-back-manage').addEventListener('click', () => { showView('home'); renderHome(); });
document.getElementById('btn-back-manage-kid').addEventListener('click', () => { openManage(); });
document.getElementById('btn-add-kid').addEventListener('click', addKid);
document.getElementById('btn-add-chore').addEventListener('click', addChore);
document.getElementById('btn-close-star').addEventListener('click', () => {
  document.getElementById('star-overlay').classList.add('hidden');
});

document.getElementById('new-kid-name').addEventListener('keydown', e => { if (e.key === 'Enter') addKid(); });
document.getElementById('new-chore-name').addEventListener('keydown', e => { if (e.key === 'Enter') addChore(); });

init();
