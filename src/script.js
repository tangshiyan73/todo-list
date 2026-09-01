// To-Do List app: tasks are stored as an array of
// { id, title, description, priority, completed } objects,
// persisted to localStorage so they survive a page refresh.

const STORAGE_KEY = 'todoTasks';

const form = document.getElementById('taskForm');
const titleInput = document.getElementById('title');
const descInput = document.getElementById('description');
const priorityInput = document.getElementById('priority');
const editingIdInput = document.getElementById('editingId');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const taskListEl = document.getElementById('taskList');
const filterBtns = document.querySelectorAll('.filterBtn');

let tasks = loadTasks();
let currentFilter = 'all';

function loadTasks() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function render() {
  taskListEl.innerHTML = '';

  const visibleTasks = tasks.filter(task => {
    if (currentFilter === 'pending') return !task.completed;
    if (currentFilter === 'complete') return task.completed;
    return true; // 'all'
  });

  visibleTasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `task priority-${task.priority}${task.completed ? ' completed' : ''}`;

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

// Basic HTML-escaping so task titles/descriptions can't break the markup
// or inject scripts if a user types HTML into the form.
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const editingId = editingIdInput.value;

  if (editingId) {
    // update existing task, keep its completed status untouched
    const task = tasks.find(t => t.id === editingId);
    task.title = titleInput.value;
    task.description = descInput.value;
    task.priority = priorityInput.value;
  } else {
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
  resetForm();
});

taskListEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;

  const { action, id } = btn.dataset;
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  if (action === 'toggle') {
    task.completed = !task.completed;
    saveTasks();
    render();
  } else if (action === 'delete') {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    render();
  } else if (action === 'edit') {
    // populate the form with the task's current values and switch to edit mode
    editingIdInput.value = task.id;
    titleInput.value = task.title;
    descInput.value = task.description;
    priorityInput.value = task.priority;
    submitBtn.textContent = 'Save Changes';
    cancelBtn.classList.remove('hidden');
    titleInput.focus();
  }
});

cancelBtn.addEventListener('click', resetForm);

function resetForm() {
  form.reset();
  editingIdInput.value = '';
  submitBtn.textContent = 'Add Task';
  cancelBtn.classList.add('hidden');
}

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});

render();
