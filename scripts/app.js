// app.js — Main entry: initializes app, wires events, orchestrates modules

import { seedIfEmpty, exportJSON, importJSON, resetAll as resetStorage } from './storage.js';
import {
  initState,
  seedRecords,
  onStateChange,
  getState,
  getVisibleRecords,
  getStats,
  addRecord,
  updateRecord,
  deleteRecord,
  updateSettings,
  setActiveSection,
  setEditingId,
  setSort,
  setSearch,
  resetAll,
  importRecords,
} from './state.js';
import validators from './validators.js';
import {
  renderNav,
  showSection,
  renderDashboard,
  renderRecords,
  renderForm,
  renderSettings,
  showConfirm,
  showImportPrompt,
  showToast,
} from './ui.js';

// ─── Bootstrap ──────────────────────────────────────────────

async function bootstrap() {
  initState();
  const state = getState();

  // Seed from seed.json if first run
  const seeded = await seedIfEmpty();
  if (seeded) {
    seedRecords(seeded);
  }

  // Initial render
  refreshUI(state);

  // Wire global events
  wireNav();
  wireKeyboard();

  // Re-render on any state change
  onStateChange(refreshUI);
}

// ─── Refresh UI ─────────────────────────────────────────────

function refreshUI(state) {
  renderNav(state);
  showSection(state.ui.activeSection);

  const stats = getStats();

  switch (state.ui.activeSection) {
    case 'dashboard':
      renderDashboard(state, stats);
      break;
    case 'records':
      renderRecords(state, getVisibleRecords());
      wireRecords(); // re-wire after render
      break;
    case 'form':
      renderForm(state);
      wireForm(); // re-wire after render
      break;
    case 'settings':
      renderSettings(state);
      wireSettings(); // re-wire after render
      break;
  }
}

// ─── Navigation ─────────────────────────────────────────────
// Uses event delegation on bottom-nav so listeners survive re-renders

function wireNav() {
  const nav = document.querySelector('.bottom-nav');
  if (!nav || nav.dataset.wired === 'true') return;
  nav.dataset.wired = 'true';
  nav.addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-btn');
    if (!btn) return;
    setActiveSection(btn.dataset.section);
  });
}

// ─── Form ───────────────────────────────────────────────────

function wireForm() {
  const form = document.getElementById('book-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleFormSubmit();
  });

  const cancelBtn = document.getElementById('cancel-edit');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      setEditingId(null);
      setActiveSection('records');
    });
  }
}

function handleFormSubmit() {
  const editId = document.getElementById('edit-id');
  const isEdit = !!editId;

  const fields = {
    title: document.getElementById('field-title').value,
    author: document.getElementById('field-author').value,
    pages: document.getElementById('field-pages').value,
    date: document.getElementById('field-date').value,
    tag: document.getElementById('field-tag').value,
  };

  // Clear previous errors
  document.querySelectorAll('.error-msg').forEach((el) => (el.textContent = ''));
  document.querySelectorAll('.form-group input.error, .form-group select.error').forEach((el) => el.classList.remove('error'));

  // Validate
  const errors = validators.validateAll(fields);
  if (errors.length > 0) {
    errors.forEach((err) => {
      const msgEl = document.getElementById(`err-${err.field}`);
      const inputEl = document.getElementById(`field-${err.field}`);
      if (msgEl) msgEl.textContent = err.message;
      if (inputEl) inputEl.classList.add('error');
    });
    // Focus first error
    const firstErrInput = document.getElementById(`field-${errors[0].field}`);
    if (firstErrInput) firstErrInput.focus();
    return;
  }

  const now = new Date().toISOString();

  if (isEdit) {
    updateRecord(editId.value, {
      title: fields.title.trim(),
      author: fields.author.trim(),
      pages: parseInt(fields.pages, 10),
      dateAdded: fields.date,
      tag: fields.tag,
    });
    showToast('Book updated!', 'success');
  } else {
    const newId = 'rec_' + Date.now().toString(36);
    addRecord({
      id: newId,
      title: fields.title.trim(),
      author: fields.author.trim(),
      pages: parseInt(fields.pages, 10),
      tag: fields.tag,
      dateAdded: fields.date,
      createdAt: now,
      updatedAt: now,
    });
    showToast('Book added!', 'success');
  }

  setEditingId(null);
  setActiveSection('records');
}

// ─── Records ────────────────────────────────────────────────

function wireRecords() {
  document.getElementById('search-input').addEventListener('input', (e) => {
    setSearch(e.target.value, getState().ui.searchFlags);
  });

  document.getElementById('search-case-btn').addEventListener('click', () => {
    const current = getState().ui.searchFlags;
    setSearch(getState().ui.searchQuery, current === 'i' ? '' : 'i');
  });

  document.getElementById('sort-select').addEventListener('change', (e) => {
    setSort(e.target.value, getState().ui.sortDir);
  });

  document.getElementById('sort-dir-btn').addEventListener('click', () => {
    setSort(getState().ui.sortBy, getState().ui.sortDir === 'asc' ? 'desc' : 'asc');
  });

  document.querySelectorAll('.edit-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      setEditingId(btn.dataset.id);
      setActiveSection('form');
    });
  });

  document.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const rec = getState().records.find((r) => r.id === btn.dataset.id);
      const confirmed = await showConfirm(`Delete "${rec ? rec.title : 'this book'}"? This cannot be undone.`);
      if (confirmed) {
        deleteRecord(btn.dataset.id);
        showToast('Book deleted.', 'info');
      }
    });
  });
}

// ─── Settings ───────────────────────────────────────────────

function wireSettings() {
  const newTagInput = document.getElementById('new-tag-input');
  const errNewTag = document.getElementById('err-new-tag');

  document.getElementById('add-tag-btn').addEventListener('click', () => {
    const value = newTagInput.value.trim();
    errNewTag.textContent = '';

    const tagCheck = validators.tag(value);
    if (!tagCheck.valid) {
      errNewTag.textContent = tagCheck.message;
      return;
    }

    const current = getState().settings.tags;
    if (current.includes(value)) {
      errNewTag.textContent = 'Tag already exists.';
      return;
    }

    updateSettings({ tags: [...current, value] });
    newTagInput.value = '';
  });

  document.querySelectorAll('.tag-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      updateSettings({ tags: getState().settings.tags.filter((t) => t !== btn.dataset.tag) });
    });
  });

  document.getElementById('reading-speed').addEventListener('change', (e) => {
    const val = parseFloat(e.target.value);
    if (val > 0) updateSettings({ readingSpeed: val });
  });

  document.getElementById('pages-cap').addEventListener('change', (e) => {
    const val = parseInt(e.target.value, 10);
    if (val > 0) updateSettings({ pagesCap: val });
  });

  document.getElementById('export-btn').addEventListener('click', () => {
    exportJSON(getState().records);
    showToast('Exported!', 'success');
  });

  document.getElementById('import-btn').addEventListener('click', async () => {
    const file = await showImportPrompt();
    if (!file) return;
    try {
      const records = await importJSON(file);
      importRecords(records);
      showToast(`Imported ${records.length} records.`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  document.getElementById('reset-btn').addEventListener('click', async () => {
    const confirmed = await showConfirm('Reset ALL data? This cannot be undone.');
    if (confirmed) {
      resetStorage();
      resetAll();
      showToast('All data reset.', 'info');
    }
  });
}

// ─── Keyboard ───────────────────────────────────────────────

function wireKeyboard() {
  document.addEventListener('keydown', (e) => {
    // Escape to go to dashboard
    if (e.key === 'Escape' && !document.querySelector('.modal-overlay')) {
      setEditingId(null);
      setActiveSection('dashboard');
      document.querySelector('main')?.focus();
    }
  });
}

// ─── Start ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', bootstrap);
