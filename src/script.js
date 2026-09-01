// To-Do List app.
// State model: tasks is an array of plain objects
//   { id, title, description, priority, completed }
// The whole array is (de)serialized to localStorage as one JSON blob on every
// change — simplest possible persistence strategy, and fine at this scale
// (no need for per-task storage keys or a real backend).

const STORAGE_KEY = 'todoTasks';

// Cache all DOM references once at the top rather than re-querying on every
// render — cheap, and keeps the render/handler functions below easy to read.
const form = document.getElementById('taskForm');
const titleInput = document.getElementById('title');
const descInput = document.getElementById('description');
const priorityInput = document.getElementById('priority');
const editingIdInput = document.getElementById('editingId');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const taskListEl = document.getElementById('taskList');
const filterBtns = document.querySelectorAll('.filterBtn');

// tasks is the single source of truth in memory; localStorage just mirrors it.
// currentFilter is UI-only state (not persisted) — a refresh always resets to "All".
let tasks = loadTasks();
let currentFilter = 'all';

function loadTasks() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : []; // no saved data yet (first visit) → start empty
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// Re-renders the entire task list from scratch on every change.
// Simpler and less error-prone than trying to patch individual DOM nodes —
// the list is small enough that a full re-render has no noticeable cost.
function render() {
  taskListEl.innerHTML = '';

  const visibleTasks = tasks.filter(task => {
    if (currentFilter === 'pending') return !task.completed;
    if (currentFilter === 'complete') return task.completed;
    return true; // 'all' — no filtering
  });

  visibleTasks.forEach(task => {
    const li = document.createElement('li');
    // priority-${task.priority} drives the border colour (see style.css);
    // 'completed' conditionally added drives the strikethrough/dim styling
    li.className = `task priority-${task.priority}${task.completed ? ' completed' : ''}`;

    // data-action + data-id on each button let the single delegated click
    // listener below (on taskListEl) figure out what was clicked and on
    // which task, without attaching a separate listener per button per task
    li.innerHTML = `
      <div class="task-main">
        <p class="task-title">${escapeHtml(task.title)}</p>
        ${task.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : ''}
        <p class="task-meta">${task.priority} priority &middot; ${task.completed ? 'Complete' : 'Pending'}</p>
      </div>
      <div class="task-actions">
        <button data-action="toggle" data-id="${task.id}">${task.completed ? 'Undo' : 'Done'}</button>
        <button data-action="edit" data-id="${task.id}">Edit</button>
        <button data-action="delete" data-id="${task.id}">Delete</button>
      </div>
    `;
    taskListEl.appendChild(li);
  });
}

// Prevents stored HTML/script in a task's title or description from being
// interpreted as markup when rendered — e.g. a task titled "<script>..."
// gets displayed as literal text instead of executing. Using the browser's
// own textContent→innerHTML round-trip avoids writing a custom escaping regex.
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

form.addEventListener('submit', (e) => {
  e.preventDefault(); // stop the browser's default full-page-reload form submission
  const editingId = editingIdInput.value;

  if (editingId) {
    // Edit mode: mutate the existing task object in place rather than
    // replacing it, so array order (and thus on-screen position) is preserved.
    // completed status is deliberately left untouched — editing a task's
    // details shouldn't silently change whether it's marked done.
    const task = tasks.find(t => t.id === editingId);
    task.title = titleInput.value;
    task.description = descInput.value;
    task.priority = priorityInput.value;
  } else {
    // Add mode: crypto.randomUUID() gives a collision-safe id without
    // needing a counter or any server round-trip.
    tasks.push({
      id: crypto.randomUUID(),
      title: titleInput.value,
      description: descInput.value,
      priority: priorityInput.value,
      completed: false
    });
  }

  saveTasks();
  render();
  resetForm(); // always return to "add mode" after a successful submit
});

// One listener on the list container, rather than one per button, using
// event delegation — this also means newly rendered buttons automatically
// work without re-attaching listeners after every render() call.
taskListEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button'); // handles clicks landing on inner text nodes too
  if (!btn) return; // click was on the row but not a button — ignore

  const { action, id } = btn.dataset;
  const task = tasks.find(t => t.id === id);
  if (!task) return; // defensive: task may have just been deleted by a rapid double-click

  if (action === 'toggle') {
    task.completed = !task.completed;
    saveTasks();
    render();
  } else if (action === 'delete') {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    render();
  } else if (action === 'edit') {
    // Populate the shared form with this task's current values and flip it
    // into edit mode — see the #editingId comment in index.html for how
    // the submit handler above uses this.
    editingIdInput.value = task.id;
    titleInput.value = task.title;
    descInput.value = task.description;
    priorityInput.value = task.priority;
    submitBtn.textContent = 'Save Changes';
    cancelBtn.classList.remove('hidden');
    titleInput.focus(); // moves focus straight to the field the user most likely wants to change
  }
});

cancelBtn.addEventListener('click', resetForm);

function resetForm() {
  form.reset(); // clears all input values back to their HTML defaults
  editingIdInput.value = ''; // explicitly clear — form.reset() alone doesn't guarantee this for a hidden field in every browser
  submitBtn.textContent = 'Add Task';
  cancelBtn.classList.add('hidden');
}

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // Only one filter can be active at a time — clear all, then mark the clicked one
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});

// Initial render on page load, using whatever was restored from localStorage
render();
