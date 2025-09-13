
const els = {
  form: document.getElementById('task-form'),
  input: document.getElementById('task-input'),
  date: document.getElementById('task-date'),
  list: document.getElementById('task-list'),
  filter: document.getElementById('filter'),
  search: document.getElementById('search'),
  clearDone: document.getElementById('clear-done'),
};

const STORAGE_KEY = 'tm_tasks_v2';


function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []; }
  catch { return []; }
}
function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let tasks = load();


function addTask(title, due) {
  tasks.push({
    id: crypto.randomUUID(),
    title,
    done: false,
    createdAt: Date.now(),
    due: due || null, 
  });
  save(tasks);
  render();
}

function toggleTask(id) {
  tasks = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
  save(tasks);
  render();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  save(tasks);
  render();
}

function clearDone() {
  tasks = tasks.filter(t => !t.done);
  save(tasks);
  render();
}


function render() {
  const q = els.search.value.trim().toLowerCase();
  const f = els.filter.value;

  const filtered = tasks.filter(t => {
    const matchesText = t.title.toLowerCase().includes(q);
    const matchesFilter = f === 'all' || (f === 'open' && !t.done) || (f === 'done' && t.done);
    return matchesText && matchesFilter;
  });

  els.list.innerHTML = '';

  if (filtered.length === 0) {
    const li = document.createElement('li');
    li.style.opacity = .7;
    li.textContent = 'Keine Aufgaben gefunden.';
    els.list.appendChild(li);
    calendarUpdate?.();
    return;
  }

  const todayIso = isoToday();

  for (const t of filtered.sort(sortByDueThenCreated)) {
    const li = document.createElement('li');
    const isOverdue = t.due && t.due < todayIso && !t.done;
    li.className = 'task' + (t.done ? ' done' : '') + (isOverdue ? ' overdue' : '');
    const dueLabel = t.due ? `<span class="due">⏰ ${fmtDate(t.due)}</span>` : '';
    li.innerHTML = `
      <input type="checkbox" ${t.done ? 'checked' : ''} aria-label="erledigt"/>
      <span class="title">${escapeHtml(t.title)}</span>
      <span class="spacer"></span>
      ${dueLabel}
      <button class="delete" aria-label="löschen">Löschen</button>
    `;
    const [checkbox] = li.getElementsByTagName('input');
    const [delBtn] = li.getElementsByClassName('delete');
    checkbox.addEventListener('change', () => toggleTask(t.id));
    delBtn.addEventListener('click', () => deleteTask(t.id));
    els.list.appendChild(li);
  }

  
  calendarUpdate?.();
}


function sortByDueThenCreated(a, b) {
  if (a.due && b.due) return a.due.localeCompare(b.due) || (a.createdAt - b.createdAt);
  if (a.due && !b.due) return -1;
  if (!a.due && b.due) return 1;
  return a.createdAt - b.createdAt;
}

function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2,'0')}.${String(m).padStart(2,'0')}.${y}`;
}

function isoToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}


els.form.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = els.input.value.trim();
  const due = els.date.value || null;
  if (!title) return;
  addTask(title, due);
  els.input.value = '';
  els.date.value = '';
  els.input.focus();
});
els.filter.addEventListener('change', render);
els.search.addEventListener('input', render);
els.clearDone.addEventListener('click', clearDone);


let calendar;       
let calendarUpdate; 

document.addEventListener('DOMContentLoaded', () => {
  const calEl = document.getElementById('calendar');

  
  if (!calEl || !window.FullCalendar) {
    render();
    return;
  }

  calendar = new FullCalendar.Calendar(calEl, {
    initialView: 'dayGridMonth',
    height: 'auto',
    firstDay: 1,                 
    locale: 'de',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,listWeek'
    },
    events: () => tasks
      .filter(t => !!t.due)
      .map(t => ({
        id: t.id,
        title: (t.done ? '✅ ' : '') + t.title,
        start: t.due,
        allDay: true
      })),
    dateClick: (info) => {
      
      if (els.date) els.date.value = info.dateStr;
      els.input?.focus();
    },
    eventClick: (info) => {
     
      document.querySelector(`#${els.list.id}`)?.scrollIntoView({ behavior: 'smooth' });
      els.filter.value = 'all';
      els.search.value = '';
      render();
    }
  });

  calendar.render();

 
  calendarUpdate = () => {
    if (!calendar) return;
    calendar.removeAllEvents();
    const evs = tasks.filter(t => t.due).map(t => ({
      id: t.id,
      title: (t.done ? '✅ ' : '') + t.title,
      start: t.due,
      allDay: true
    }));
    calendar.addEventSource(evs);
  };

  
  render();
});
