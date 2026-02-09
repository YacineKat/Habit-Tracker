/* ========================================
   🎯 Habit Tracker — Application Logic (EN / LTR)
   ======================================== */

// ──────────────────────────────────────────
// 🗃 STATE & CONSTANTS
// ──────────────────────────────────────────

const STORAGE_KEY = 'habit-tracker-data';

const MOTIVATIONAL_MESSAGES = [
  'Amazing! You completed every habit today 🌟',
  'Perfect day! Keep this momentum going 💪',
  'Incredible work! One day closer to your goals 🎯',
  'Outstanding! You\'re building a better you ✨',
  'All done! Consistency is the key to greatness 🚀',
  'Unstoppable! Your streak is on fire 🔥',
  'Champion! Every habit checked off 🏆',
  'Brilliant! Each step forward counts 👏',
];

let state = { habits: [] };
let calendarDate = new Date();

// Chart instances
let lineChartInstance = null;
let barChartInstance = null;
let ringChartInstance = null;

// Modal state
let editingHabitId = null;
let deletingHabitId = null;

// PWA Install
let deferredPrompt;

// ──────────────────────────────────────────
// 💾 STORAGE
// ──────────────────────────────────────────

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      state = JSON.parse(raw);
      if (!Array.isArray(state.habits)) state.habits = [];
    }
  } catch (e) {
    console.warn('Failed to load state:', e);
    state = { habits: [] };
  }
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { console.warn('Failed to save state:', e); }
}

// ──────────────────────────────────────────
// 🛠 UTILITIES
// ──────────────────────────────────────────

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}

function formatMonth(date) {
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long' }).format(date);
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function calculateStreak(habit) {
  let streak = 0;
  const d = new Date();
  const todayKey = getTodayKey();
  if (!habit.history[todayKey]) d.setDate(d.getDate() - 1);

  while (true) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (habit.history[key]) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}

function getCompletedDays(habit) {
  return Object.values(habit.history).filter(Boolean).length;
}

function getCommitmentPercent(habit) {
  const created = new Date(habit.createdAt);
  const diffTime = new Date().getTime() - created.getTime();
  const totalDays = Math.max(1, Math.floor(diffTime / 86400000) + 1);
  return Math.round((getCompletedDays(habit) / totalDays) * 100);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ──────────────────────────────────────────
// 🖥 RENDER — HEADER DATE
// ──────────────────────────────────────────

function renderTodayDate() {
  document.getElementById('today-date').textContent = formatDate(new Date());
}

// ──────────────────────────────────────────
// 🖥 RENDER — STATS
// ──────────────────────────────────────────

function renderStats() {
  const todayKey = getTodayKey();
  const total = state.habits.length;
  const doneToday = state.habits.filter(h => h.history[todayKey]).length;
  const pct = total === 0 ? 0 : Math.round((doneToday / total) * 100);
  const bestStreak = state.habits.reduce((mx, h) => Math.max(mx, calculateStreak(h)), 0);

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-done-today').textContent = doneToday;
  document.getElementById('stat-percentage').textContent = pct + '%';
  document.getElementById('stat-best-streak').textContent = bestStreak;
}

// ──────────────────────────────────────────
// 🖥 RENDER — HABITS LIST
// ──────────────────────────────────────────

function renderHabits() {
  const list = document.getElementById('habits-list');
  const emptyState = document.getElementById('empty-state');
  const todayKey = getTodayKey();

  if (state.habits.length === 0) {
    list.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  list.innerHTML = state.habits.map(habit => {
    const isDone = !!habit.history[todayKey];
    const streak = calculateStreak(habit);
    const completed = getCompletedDays(habit);
    const commitment = getCommitmentPercent(habit);

    return `
      <div class="habit-item ${isDone ? 'done' : ''}" data-id="${habit.id}">
        <label class="habit-check">
          <input type="checkbox" ${isDone ? 'checked' : ''} data-habit-id="${habit.id}">
          <span class="checkmark">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          </span>
        </label>
        <div class="habit-info">
          <div class="habit-name">${escapeHtml(habit.name)}</div>
          <div class="habit-meta">
            <span>${completed} day${completed !== 1 ? 's' : ''} completed</span>
            <span>${commitment}% commitment</span>
            ${streak > 0 ? `<span class="habit-streak">🔥 ${streak} day streak</span>` : ''}
          </div>
        </div>
        <div class="habit-actions">
          <button class="btn-edit" data-habit-id="${habit.id}" title="Edit">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn-delete" data-habit-id="${habit.id}" title="Delete">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        </div>
      </div>`;
  }).join('');
}

// ──────────────────────────────────────────
// 🖥 RENDER ALL
// ──────────────────────────────────────────

function renderAll() {
  renderStats();
  renderHabits();
  if (document.getElementById('tab-dashboard').classList.contains('active')) renderCharts();
  if (document.getElementById('tab-calendar').classList.contains('active')) renderCalendar();
}

// ──────────────────────────────────────────
// 📊 CHARTS
// ──────────────────────────────────────────

function renderCharts() {
  renderDashSummary();
  renderRingChart();
  renderLineChart();
  renderBarChart();
}

/** Dashboard summary cards */
function renderDashSummary() {
  const total = state.habits.length;
  const todayKey = getTodayKey();

  // Avg completion last 14 days
  let sumPct = 0;
  let perfectDays = 0;
  let totalChecks = 0;

  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const done = state.habits.filter(h => h.history[key]).length;
    totalChecks += done;
    if (total > 0) {
      const dayPct = (done / total) * 100;
      sumPct += dayPct;
      if (done === total) perfectDays++;
    }
  }

  const avgRate = total === 0 ? 0 : Math.round(sumPct / 14);

  document.getElementById('dash-avg-rate').textContent = avgRate + '%';
  document.getElementById('dash-perfect-days').textContent = perfectDays;
  document.getElementById('dash-total-checks').textContent = totalChecks;
}

/** Percentage Ring */
function renderRingChart() {
  const canvas = document.getElementById('ring-chart');
  const ctx = canvas.getContext('2d');
  const todayKey = getTodayKey();
  const total = state.habits.length;
  const done = state.habits.filter(h => h.history[todayKey]).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  document.getElementById('ring-value').textContent = pct + '%';
  document.getElementById('ring-detail').textContent = `${done} / ${total} habits`;

  if (ringChartInstance) ringChartInstance.destroy();

  ringChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [pct, 100 - pct],
        backgroundColor: [
          pct === 100 ? '#34d399' : '#6c63ff',
          'rgba(108, 99, 255, 0.08)'
        ],
        borderWidth: 0,
        borderRadius: pct > 0 && pct < 100 ? 8 : 0,
      }]
    },
    options: {
      cutout: '80%',
      responsive: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      animation: { animateRotate: true, duration: 700 },
    }
  });
}

/** Line Chart — last 14 days */
function renderLineChart() {
  const canvas = document.getElementById('line-chart');
  const ctx = canvas.getContext('2d');
  const total = state.habits.length;

  const labels = [];
  const data = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    labels.push(`${monthNames[d.getMonth()]} ${d.getDate()}`);
    if (total === 0) data.push(0);
    else data.push(Math.round((state.habits.filter(h => h.history[key]).length / total) * 100));
  }

  if (lineChartInstance) lineChartInstance.destroy();

  const gradient = ctx.createLinearGradient(0, 0, 0, 220);
  gradient.addColorStop(0, 'rgba(108, 99, 255, 0.25)');
  gradient.addColorStop(1, 'rgba(108, 99, 255, 0.0)');

  lineChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Completion %',
        data,
        borderColor: '#6c63ff',
        backgroundColor: gradient,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#6c63ff',
        pointBorderColor: '#181b25',
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6,
        borderWidth: 2.5,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      scales: {
        y: {
          min: 0, max: 100,
          ticks: { color: '#5c6078', callback: v => v + '%', font: { size: 11 } },
          grid: { color: 'rgba(38,41,56,0.6)', drawBorder: false },
          border: { display: false },
        },
        x: {
          ticks: { color: '#5c6078', maxRotation: 45, font: { size: 10 } },
          grid: { display: false },
          border: { display: false },
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f2231',
          titleColor: '#eaeaf0',
          bodyColor: '#8b8fa4',
          borderColor: '#262938',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          displayColors: false,
          callbacks: { label: (c) => `Completion: ${c.raw}%` }
        }
      },
      animation: { duration: 700 },
    }
  });
}

/** Bar Chart — commitment ranking */
function renderBarChart() {
  const canvas = document.getElementById('bar-chart');
  const ctx = canvas.getContext('2d');

  const sorted = [...state.habits]
    .map(h => ({ name: h.name, pct: getCommitmentPercent(h) }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 10);

  if (barChartInstance) barChartInstance.destroy();

  const colors = sorted.map(h => {
    if (h.pct >= 80) return '#34d399';
    if (h.pct >= 50) return '#6c63ff';
    if (h.pct >= 25) return '#fbbf24';
    return '#f87171';
  });

  barChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(h => h.name.length > 20 ? h.name.substring(0, 20) + '…' : h.name),
      datasets: [{
        label: 'Commitment %',
        data: sorted.map(h => h.pct),
        backgroundColor: colors.map(c => c + '33'),
        borderColor: colors,
        borderWidth: 1.5,
        borderRadius: 6,
        maxBarThickness: 32,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          min: 0, max: 100,
          ticks: { color: '#5c6078', callback: v => v + '%', font: { size: 11 } },
          grid: { color: 'rgba(38,41,56,0.6)', drawBorder: false },
          border: { display: false },
        },
        y: {
          ticks: { color: '#8b8fa4', font: { size: 12 } },
          grid: { display: false },
          border: { display: false },
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f2231',
          titleColor: '#eaeaf0',
          bodyColor: '#8b8fa4',
          borderColor: '#262938',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          displayColors: false,
          callbacks: { label: (c) => `Commitment: ${c.raw}%` }
        }
      },
      animation: { duration: 700 },
    }
  });

  // Dynamic height based on number of habits
  const wrapperEl = canvas.closest('.bar-wrapper');
  if (wrapperEl) {
    wrapperEl.style.height = Math.max(160, sorted.length * 38 + 50) + 'px';
  }
}

// ──────────────────────────────────────────
// 📅 CALENDAR
// ──────────────────────────────────────────

function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  const label = document.getElementById('cal-month-label');
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  label.textContent = formatMonth(calendarDate);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month); // 0=Sun
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  let html = dayNames.map(d => `<div class="day-header">${d}</div>`).join('');

  for (let i = 0; i < firstDay; i++) html += `<div class="day-cell empty"></div>`;

  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const total = state.habits.length;
    const done = state.habits.filter(h => h.history[key]).length;
    const isToday = isCurrentMonth && day === today.getDate();

    let cls = '';
    if (total > 0 && done > 0) {
      cls = done === total ? 'full' : 'partial';
    } else if (total > 0 && isDayPast(year, month, day)) {
      cls = 'none';
    }

    html += `<div class="day-cell ${cls} ${isToday ? 'today' : ''}" title="${done}/${total}">${day}</div>`;
  }

  grid.innerHTML = html;
}

function isDayPast(year, month, day) {
  const d = new Date(year, month, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

// ──────────────────────────────────────────
// 📤 EXPORT
// ──────────────────────────────────────────

function exportJSON() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `habit-tracker-${getTodayKey()}.json`);
}

function exportCSV() {
  const allDates = new Set();
  state.habits.forEach(h => Object.keys(h.history).forEach(k => allDates.add(k)));
  const dates = [...allDates].sort();

  let csv = 'Habit,' + dates.join(',') + ',Days Completed,Commitment %,Streak\n';

  state.habits.forEach(h => {
    const cells = dates.map(d => h.history[d] ? '1' : '0');
    csv += `"${h.name}",${cells.join(',')},${getCompletedDays(h)},${getCommitmentPercent(h)}%,${calculateStreak(h)}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `habit-tracker-${getTodayKey()}.csv`);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ──────────────────────────────────────────
// 🍞 TOAST
// ──────────────────────────────────────────

function showToast(message) {
  const toast = document.getElementById('motivation-toast');
  toast.querySelector('.toast-text').textContent = message;
  toast.classList.remove('hidden');
  void toast.offsetWidth;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 400);
  }, 3500);
}

function checkAllCompleted() {
  const todayKey = getTodayKey();
  const total = state.habits.length;
  if (total === 0) return;
  if (state.habits.filter(h => h.history[todayKey]).length === total) {
    showToast(MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)]);
  }
}

// ──────────────────────────────────────────
// ⚡ EVENT HANDLERS
// ──────────────────────────────────────────

function initEvents() {
  const input = document.getElementById('habit-input');
  const btnAdd = document.getElementById('btn-add-habit');

  function addHabit() {
    const name = input.value.trim();
    if (!name) return;
    state.habits.push({
      id: generateId(), name,
      createdAt: new Date().toISOString(),
      history: {}, streak: 0,
    });
    input.value = '';
    saveState();
    renderAll();
  }

  btnAdd.addEventListener('click', addHabit);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') addHabit(); });

  // Checkbox toggle
  document.getElementById('habits-list').addEventListener('change', e => {
    if (e.target.type !== 'checkbox') return;
    const habit = state.habits.find(h => h.id === e.target.dataset.habitId);
    if (!habit) return;

    habit.history[getTodayKey()] = e.target.checked;
    habit.streak = calculateStreak(habit);

    if (e.target.checked) {
      const item = e.target.closest('.habit-item');
      item.classList.add('celebrate');
      setTimeout(() => item.classList.remove('celebrate'), 500);
    }

    saveState();
    renderAll();
    if (e.target.checked) checkAllCompleted();
  });

  // Edit / Delete buttons
  document.getElementById('habits-list').addEventListener('click', e => {
    const editBtn = e.target.closest('.btn-edit');
    const deleteBtn = e.target.closest('.btn-delete');

    if (editBtn) {
      const habit = state.habits.find(h => h.id === editBtn.dataset.habitId);
      if (!habit) return;
      editingHabitId = habit.id;
      document.getElementById('edit-input').value = habit.name;
      document.getElementById('edit-modal').classList.remove('hidden');
      document.getElementById('edit-input').focus();
    }

    if (deleteBtn) {
      const habit = state.habits.find(h => h.id === deleteBtn.dataset.habitId);
      if (!habit) return;
      deletingHabitId = habit.id;
      document.getElementById('delete-msg').textContent = `Are you sure you want to delete "${habit.name}"?`;
      document.getElementById('delete-modal').classList.remove('hidden');
    }
  });

  // Edit Modal
  document.getElementById('edit-save').addEventListener('click', () => {
    const name = document.getElementById('edit-input').value.trim();
    if (!name || !editingHabitId) return;
    const habit = state.habits.find(h => h.id === editingHabitId);
    if (habit) habit.name = name;
    editingHabitId = null;
    document.getElementById('edit-modal').classList.add('hidden');
    saveState();
    renderAll();
  });

  document.getElementById('edit-cancel').addEventListener('click', () => {
    editingHabitId = null;
    document.getElementById('edit-modal').classList.add('hidden');
  });

  document.getElementById('edit-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('edit-save').click();
    if (e.key === 'Escape') document.getElementById('edit-cancel').click();
  });

  // Delete Modal
  document.getElementById('delete-confirm').addEventListener('click', () => {
    if (!deletingHabitId) return;
    state.habits = state.habits.filter(h => h.id !== deletingHabitId);
    deletingHabitId = null;
    document.getElementById('delete-modal').classList.add('hidden');
    saveState();
    renderAll();
  });

  document.getElementById('delete-cancel').addEventListener('click', () => {
    deletingHabitId = null;
    document.getElementById('delete-modal').classList.add('hidden');
  });

  // Close modals
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) { overlay.classList.add('hidden'); editingHabitId = null; deletingHabitId = null; }
    });
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
      editingHabitId = null;
      deletingHabitId = null;
    }
  });

  // Tabs
  const tabs = ['habits', 'dashboard', 'calendar'];
  const tabsViewport = document.getElementById('tabs-viewport');
  const tabsTrack = document.getElementById('tabs-track');

  function getCurrentTab() {
    const activeBtn = document.querySelector('.tab-btn.active');
    return activeBtn ? activeBtn.dataset.tab : 'habits';
  }

  function getCurrentTabIndex() {
    const idx = tabs.indexOf(getCurrentTab());
    return idx >= 0 ? idx : 0;
  }

  function isSwipeLayoutEnabled() {
    if (!tabsViewport || !tabsTrack) return false;
    if (!window.matchMedia) return false;
    return window.matchMedia('(pointer: coarse)').matches && window.matchMedia('(max-width: 900px)').matches;
  }

  function setTrackX(x, { animate } = { animate: true }) {
    if (!tabsTrack) return;
    if (animate) tabsTrack.classList.remove('dragging');
    else tabsTrack.classList.add('dragging');
    tabsTrack.style.transform = `translateX(${x}px)`;
  }

  function snapTrackToActive({ animate } = { animate: true }) {
    if (!isSwipeLayoutEnabled()) return;
    const viewportWidth = tabsViewport.clientWidth || 0;
    if (!viewportWidth) return;
    const x = -getCurrentTabIndex() * viewportWidth;
    setTrackX(x, { animate });
  }

  function switchToTab(tabName, { animate } = { animate: true }) {
    if (!tabs.includes(tabName)) return;

    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    const content = document.getElementById('tab-' + tabName);
    if (!btn || !content) return;

    btn.classList.add('active');
    content.classList.add('active');

    if (tabName === 'dashboard') renderCharts();
    if (tabName === 'calendar') renderCalendar();

    snapTrackToActive({ animate });
  }

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchToTab(btn.dataset.tab, { animate: true }));
  });

  // Swipe Navigation for Mobile
  function switchToTabIndex(index, { animate } = { animate: true }) {
    const clamped = Math.max(0, Math.min(tabs.length - 1, index));
    switchToTab(tabs[clamped], { animate });
  }
  function switchToNextTab() {
    switchToTabIndex(getCurrentTabIndex() + 1, { animate: true });
  }
  function switchToPrevTab() {
    switchToTabIndex(getCurrentTabIndex() - 1, { animate: true });
  }

  // Swipe detection
  const isCoarsePointer = () => window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const isSmallScreen = () => window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
  const isModalOpen = () => !!document.querySelector('.modal-overlay:not(.hidden)');
  const isInteractiveTarget = (el) => {
    if (!el) return false;
    return !!el.closest('input, textarea, select, button, a, label, .modal, .tab-nav');
  };

  let startX = null;
  let startY = null;
  let trackingSwipe = false;
  let dragging = false;
  let baseX = 0;
  let startIndex = 0;

  // Keep track aligned on load & resize
  snapTrackToActive({ animate: false });
  window.addEventListener('resize', () => snapTrackToActive({ animate: false }));

  document.addEventListener('touchstart', (e) => {
    if (!isCoarsePointer() || !isSmallScreen()) return;
    if (!isSwipeLayoutEnabled()) return;
    if (isModalOpen()) return;
    if (isInteractiveTarget(e.target)) return;

    const viewportWidth = tabsViewport.clientWidth || 0;
    if (!viewportWidth) return;

    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    trackingSwipe = true;
    dragging = false;

    startIndex = getCurrentTabIndex();
    baseX = -startIndex * viewportWidth;
    setTrackX(baseX, { animate: false });
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!trackingSwipe || startX === null || startY === null) return;
    if (!isSwipeLayoutEnabled()) return;

    const curX = e.touches[0].clientX;
    const curY = e.touches[0].clientY;
    const deltaX = curX - startX;
    const deltaY = curY - startY;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // If user is clearly scrolling vertically, cancel swipe tracking.
    if (absY > absX && absY > 12) {
      trackingSwipe = false;
      startX = null;
      startY = null;
      dragging = false;
      snapTrackToActive({ animate: true });
      return;
    }

    // Drag only if swipe is clearly horizontal.
    if (absX > 6 && absX > absY) {
      dragging = true;

      const viewportWidth = tabsViewport.clientWidth || 0;
      const minX = -(tabs.length - 1) * viewportWidth;
      const maxX = 0;

      let nextX = baseX + deltaX;

      // Resist at bounds.
      if (nextX > maxX) nextX = maxX + (nextX - maxX) * 0.25;
      if (nextX < minX) nextX = minX + (nextX - minX) * 0.25;

      setTrackX(nextX, { animate: false });
    }
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (!trackingSwipe || startX === null || startY === null) return;
    if (!isSwipeLayoutEnabled()) return;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - startX;
    const deltaY = endY - startY;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    const viewportWidth = tabsViewport.clientWidth || 0;
    const threshold = Math.min(140, Math.max(70, Math.round(viewportWidth * 0.22)));

    // Horizontal swipe only; snap to next/prev if moved enough.
    if (dragging && absX > absY * 1.2) {
      if (deltaX <= -threshold) switchToTabIndex(startIndex + 1, { animate: true });
      else if (deltaX >= threshold) switchToTabIndex(startIndex - 1, { animate: true });
      else snapTrackToActive({ animate: true });
    } else {
      snapTrackToActive({ animate: true });
    }

    trackingSwipe = false;
    startX = null;
    startY = null;
    dragging = false;
  }, { passive: true });

  // Calendar Nav
  document.getElementById('cal-prev').addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar();
  });

  // Export
  document.getElementById('btn-export').addEventListener('click', () => {
    document.getElementById('export-modal').classList.remove('hidden');
  });
  document.getElementById('export-json').addEventListener('click', () => {
    exportJSON();
    document.getElementById('export-modal').classList.add('hidden');
  });
  document.getElementById('export-csv').addEventListener('click', () => {
    exportCSV();
    document.getElementById('export-modal').classList.add('hidden');
  });
  document.getElementById('export-cancel').addEventListener('click', () => {
    document.getElementById('export-modal').classList.add('hidden');
  });

  // PWA Install Modal
  document.getElementById('install-btn').addEventListener('click', () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(choiceResult => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        deferredPrompt = null;
      });
    }
    hideInstallModal();
  });

  document.getElementById('install-cancel').addEventListener('click', () => {
    hideInstallModal();
  });
}

// ──────────────────────────────────────────
// 🚀 INIT
// ──────────────────────────────────────────

function init() {
  loadState();
  state.habits.forEach(h => { h.streak = calculateStreak(h); });
  saveState();
  renderTodayDate();
  renderAll();
  initEvents();
  initPWA();
}

function initPWA() {
  // Listen for beforeinstallprompt
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    // Show install modal if on mobile and not already installed
    if (isMobile() && !isInstalled()) {
      setTimeout(() => showInstallModal(), 2000); // Delay 2 seconds
    }
  });

  // Listen for app installed
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    hideInstallModal();
  });
}

function isMobile() {
  return window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function showInstallModal() {
  document.getElementById('install-modal').classList.remove('hidden');
}

function hideInstallModal() {
  document.getElementById('install-modal').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', init);