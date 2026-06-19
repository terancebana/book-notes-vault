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
  renderAbout,
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
  wireForm();
  wireRecords();
  wireSettings();
  wireAbout();
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
    case 'about':
      renderAbout();
      wireAbout();
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
  // Search
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      setSearch(e.target.value, getState().ui.searchFlags);
    });
  }

  // Case toggle
  const caseBtn = document.getElementById('search-case-btn');
  if (caseBtn) {
    caseBtn.addEventListener('click', () => {
      const current = getState().ui.searchFlags;
      const next = current === 'i' ? '' : 'i';
      setSearch(getState().ui.searchQuery, next);
    });
  }

  // Sort
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      setSort(e.target.value, getState().ui.sortDir);
    });
  }

  const sortDirBtn = document.getElementById('sort-dir-btn');
  if (sortDirBtn) {
    sortDirBtn.addEventListener('click', () => {
      const next = getState().ui.sortDir === 'asc' ? 'desc' : 'asc';
      setSort(getState().ui.sortBy, next);
    });
  }

  // Edit buttons
  document.querySelectorAll('.edit-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      setEditingId(btn.dataset.id);
      setActiveSection('form');
    });
  });

  // Delete buttons
  document.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const rec = getState().records.find((r) => r.id === id);
      const title = rec ? rec.title : 'this book';
      const confirmed = await showConfirm(`Delete "${title}"? This cannot be undone.`);
      if (confirmed) {
        deleteRecord(id);
        showToast('Book deleted.', 'info');
      }
    });
  });
}

// ─── Settings ───────────────────────────────────────────────

function wireSettings() {
  // Tags — add
  const addTagBtn = document.getElementById('add-tag-btn');
  const newTagInput = document.getElementById('new-tag-input');
  const errNewTag = document.getElementById('err-new-tag');

  if (addTagBtn && newTagInput) {
    addTagBtn.addEventListener('click', () => {
      const value = newTagInput.value.trim();
      if (errNewTag) errNewTag.textContent = '';

      const tagCheck = validators.tag(value);
      if (!tagCheck.valid) {
        if (errNewTag) errNewTag.textContent = tagCheck.message;
        return;
      }

      const current = getState().settings.tags;
      if (current.includes(value)) {
        if (errNewTag) errNewTag.textContent = 'Tag already exists.';
        return;
      }

      updateSettings({ tags: [...current, value] });
      newTagInput.value = '';
    });
  }

  // Tags — remove
  document.querySelectorAll('.tag-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.tag;
      const current = getState().settings.tags;
      updateSettings({ tags: current.filter((t) => t !== tag) });
    });
  });

  // Reading speed
  const speedInput = document.getElementById('reading-speed');
  if (speedInput) {
    speedInput.addEventListener('change', () => {
      const val = parseFloat(speedInput.value);
      if (val > 0) updateSettings({ readingSpeed: val });
    });
  }

  // Pages cap
  const capInput = document.getElementById('pages-cap');
  if (capInput) {
    capInput.addEventListener('change', () => {
      const val = parseInt(capInput.value, 10);
      if (val > 0) updateSettings({ pagesCap: val });
    });
  }

  // Export
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportJSON(getState().records);
      showToast('Exported!', 'success');
    });
  }

  // Import
  const importBtn = document.getElementById('import-btn');
  if (importBtn) {
    importBtn.addEventListener('click', async () => {
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
  }

  // Reset
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      const confirmed = await showConfirm('Reset ALL data? This cannot be undone.');
      if (confirmed) {
        resetStorage();
        resetAll();
        showToast('All data reset.', 'info');
      }
    });
  }
}

// ─── About ──────────────────────────────────────────────────

function wireAbout() {
  // About is static, but we wire it on first render
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
