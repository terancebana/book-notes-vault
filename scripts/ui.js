import { compileRegex, highlightMatches } from './search.js';
import { exportJSON } from './storage.js';

const NAV_ICONS = {
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
  records: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>`,
  form: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
  about: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><line x1="12" y1="16" x2="12" y2="12"/><circle cx="12" cy="8" r="0.5" fill="currentColor" stroke="none"/></svg>`,
};

export function renderNav(state) {
  const nav = document.querySelector('.bottom-nav');
  if (!nav) return;
  const items = [
    { id: 'dashboard', label: 'Home' },
    { id: 'records', label: 'Library' },
    { id: 'form', label: 'Add' },
    { id: 'settings', label: 'Settings' },
    { id: 'about', label: 'About' },
  ];
  nav.innerHTML = items
    .map(
      (item) => `
    <button class="nav-btn${state.ui.activeSection === item.id ? ' active' : ''}"
            data-section="${item.id}"
            aria-current="${state.ui.activeSection === item.id ? 'page' : 'false'}"
            aria-label="${item.label}">
      <span class="nav-icon">${NAV_ICONS[item.id]}</span>
      <span class="nav-label">${item.label}</span>
    </button>`
    )
    .join('');
}

export function showSection(sectionId) {
  document.querySelectorAll('main > section').forEach((s) => {
    s.hidden = s.id !== sectionId;
  });
  const labels = {
    dashboard: 'Dashboard',
    records: 'Records',
    form: 'Add Book',
    settings: 'Settings',
    about: 'About',
  };
  document.title = `${labels[sectionId] || sectionId} — Book & Notes Vault`;
}

export function renderDashboard(state, stats) {
  const el = document.getElementById('dashboard');
  if (!el || el.hidden) return;

  const { totalRecords, totalPages, topTag, days, pagesThisMonth, cap, remaining, readingTime } = stats;

  const capStatus = remaining >= 0 ? 'under' : 'over';
  const capAria = remaining >= 0 ? 'polite' : 'assertive';
  const readingTimeStr = readingTime.hours > 0
    ? `${readingTime.hours}h ${readingTime.minutes}m`
    : `${readingTime.minutes}m`;

  el.innerHTML = `
    <h2>Dashboard</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-value">${totalRecords}</span>
        <span class="stat-label">Total Books</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${totalPages.toLocaleString()}</span>
        <span class="stat-label">Total Pages</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${topTag}</span>
        <span class="stat-label">Top Tag</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${readingTimeStr}</span>
        <span class="stat-label">Est. Reading Time</span>
      </div>
    </div>

    <div class="cap-section">
      <h3>Monthly Cap</h3>
      <div class="cap-bar">
        <div class="cap-fill ${capStatus}" style="width:${Math.min(100, (pagesThisMonth / cap) * 100)}%"></div>
      </div>
      <p class="cap-text" aria-live="${capAria}" role="status">
        ${pagesThisMonth} / ${cap} pages this month —
        ${remaining >= 0 ? `${remaining} remaining` : `${Math.abs(remaining)} over cap`}
      </p>
    </div>

    <div class="chart-section">
      <h3>Last 7 Days</h3>
      <div class="chart-bars" role="img" aria-label="Bar chart of pages added over last 7 days">
        ${days.map((d) =>
          `<div class="chart-bar-wrap" title="${d.date}: ${d.pages} pages">
            <div class="chart-bar" style="height:${d.pages ? Math.max(8, Math.min(120, d.pages / 5)) : 4}px"></div>
            <span class="chart-label">${d.label}</span>
            <span class="chart-val">${d.pages}</span>
          </div>`
        ).join('')}
      </div>
    </div>
  `;
}

export function renderRecords(state, records) {
  const el = document.getElementById('records');
  if (!el || el.hidden) return;

  const regex = compileRegex(state.ui.searchQuery, state.ui.searchFlags);
  const isMobile = window.innerWidth < 768;

  el.innerHTML = `
    <h2>Records</h2>
    <div class="records-toolbar">
      <div class="search-wrap">
        <label for="search-input" class="sr-only">Search records</label>
        <input type="text" id="search-input" placeholder="Search with regex…" value="${escapeAttr(state.ui.searchQuery)}" aria-label="Search records with regex">
        <button id="search-case-btn" class="btn btn-sm" title="Toggle case sensitivity" aria-pressed="${state.ui.searchFlags === '' ? 'true' : 'false'}">
          ${state.ui.searchFlags === '' ? 'Aa' : 'Aa*'}
        </button>
      </div>
      <div class="sort-controls">
        <label for="sort-select" class="sr-only">Sort by</label>
        <select id="sort-select" aria-label="Sort records by">
          <option value="dateAdded" ${state.ui.sortBy === 'dateAdded' ? 'selected' : ''}>Date</option>
          <option value="title" ${state.ui.sortBy === 'title' ? 'selected' : ''}>Title</option>
          <option value="author" ${state.ui.sortBy === 'author' ? 'selected' : ''}>Author</option>
          <option value="pages" ${state.ui.sortBy === 'pages' ? 'selected' : ''}>Pages</option>
        </select>
        <button id="sort-dir-btn" class="btn btn-sm" title="Toggle sort direction" aria-label="Sort ${state.ui.sortDir === 'asc' ? 'ascending' : 'descending'}">
          ${state.ui.sortDir === 'asc' ? '↑' : '↓'}
        </button>
      </div>
    </div>
    ${renderRecordsList(records, regex, isMobile, state)}
  `;
}

function renderRecordsList(records, regex, isMobile, state) {
  if (records.length === 0) {
    const msg = state.ui.searchQuery
      ? 'No records match your search.'
      : 'No records yet — add your first book!';
    return `<div class="empty-state" role="status">${msg}</div>`;
  }

  if (isMobile) {
    return `<div class="cards-grid" role="list">${records.map((r) => renderCard(r, regex)).join('')}</div>`;
  }

  return `
    <div class="table-wrap" role="table" aria-label="Book records">
      <div class="table-header" role="row">
        <span role="columnheader">Title</span>
        <span role="columnheader">Author</span>
        <span role="columnheader">Pages</span>
        <span role="columnheader">Tag</span>
        <span role="columnheader">Date</span>
        <span role="columnheader">Actions</span>
      </div>
      ${records.map((r) => renderRow(r, regex)).join('')}
    </div>`;
}

function renderCard(rec, regex) {
  return `
    <div class="record-card" role="listitem" data-id="${rec.id}">
      <div class="card-body">
        <h3 class="card-title">${highlight(rec.title, regex)}</h3>
        <p class="card-author">by ${highlight(rec.author, regex)}</p>
        <div class="card-meta">
          <span class="badge">${highlight(rec.tag, regex)}</span>
          <span>${rec.pages} pages</span>
          <span>${rec.dateAdded}</span>
        </div>
      </div>
      <div class="card-actions">
        <button class="btn btn-sm edit-btn" data-id="${rec.id}" aria-label="Edit ${escapeAttr(rec.title)}">Edit</button>
        <button class="btn btn-sm btn-danger delete-btn" data-id="${rec.id}" aria-label="Delete ${escapeAttr(rec.title)}">Del</button>
      </div>
    </div>`;
}

function renderRow(rec, regex) {
  return `
    <div class="table-row" role="row" data-id="${rec.id}">
      <span role="cell" class="cell-title">${highlight(rec.title, regex)}</span>
      <span role="cell">${highlight(rec.author, regex)}</span>
      <span role="cell">${rec.pages}</span>
      <span role="cell"><span class="badge">${highlight(rec.tag, regex)}</span></span>
      <span role="cell">${rec.dateAdded}</span>
      <span role="cell" class="cell-actions">
        <button class="btn btn-sm edit-btn" data-id="${rec.id}" aria-label="Edit ${escapeAttr(rec.title)}">Edit</button>
        <button class="btn btn-sm btn-danger delete-btn" data-id="${rec.id}" aria-label="Delete ${escapeAttr(rec.title)}">Del</button>
      </span>
    </div>`;
}

export function renderForm(state) {
  const el = document.getElementById('form');
  if (!el || el.hidden) return;

  const editingId = state.ui.editingId;
  const record = editingId ? state.records.find((r) => r.id === editingId) : null;
  const isEdit = !!record;

  el.innerHTML = `
    <h2>${isEdit ? 'Edit Book' : 'Add Book'}</h2>
    <form id="book-form" novalidate>
      ${isEdit ? `<input type="hidden" id="edit-id" value="${record.id}">` : ''}

      <div class="form-group">
        <label for="field-title">Title *</label>
        <input type="text" id="field-title" value="${isEdit ? escapeAttr(record.title) : ''}" required
          aria-describedby="err-title">
        <span class="error-msg" id="err-title" role="status"></span>
      </div>

      <div class="form-group">
        <label for="field-author">Author *</label>
        <input type="text" id="field-author" value="${isEdit ? escapeAttr(record.author) : ''}" required
          aria-describedby="err-author">
        <span class="error-msg" id="err-author" role="status"></span>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="field-pages">Pages *</label>
          <input type="number" id="field-pages" value="${isEdit ? record.pages : ''}" min="1" required
            aria-describedby="err-pages">
          <span class="error-msg" id="err-pages" role="status"></span>
        </div>
        <div class="form-group">
          <label for="field-date">Date Added *</label>
          <input type="date" id="field-date" value="${isEdit ? record.dateAdded : new Date().toISOString().split('T')[0]}" required
            aria-describedby="err-date">
          <span class="error-msg" id="err-date" role="status"></span>
        </div>
      </div>

      <div class="form-group">
        <label for="field-tag">Tag *</label>
        <select id="field-tag" required aria-describedby="err-tag">
          <option value="">— Select —</option>
          ${state.settings.tags.map((t) => `<option value="${t}" ${isEdit && record.tag === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
        <span class="error-msg" id="err-tag" role="status"></span>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Add Book'}</button>
        ${isEdit ? '<button type="button" id="cancel-edit" class="btn">Cancel</button>' : ''}
      </div>
      <div id="form-feedback" role="status" aria-live="assertive"></div>
    </form>
  `;
}

export function renderSettings(state) {
  const el = document.getElementById('settings');
  if (!el || el.hidden) return;

  el.innerHTML = `
    <h2>Settings</h2>

    <section class="settings-block">
      <h3>Tags</h3>
      <p class="help-text">Manage the list of tags available when adding books.</p>
      <div class="tags-list" id="tags-list">
        ${state.settings.tags
          .map((t) => `<span class="tag-chip">${escapeHTML(t)} <button class="tag-remove" data-tag="${escapeAttr(t)}" aria-label="Remove tag ${escapeAttr(t)}">×</button></span>`)
          .join('')}
      </div>
      <div class="add-tag-row">
        <label for="new-tag-input" class="sr-only">New tag name</label>
        <input type="text" id="new-tag-input" placeholder="New tag name">
        <button id="add-tag-btn" class="btn btn-sm">Add Tag</button>
        <span class="error-msg" id="err-new-tag" role="status"></span>
      </div>
    </section>

    <section class="settings-block">
      <h3>Reading Speed</h3>
      <p class="help-text">Pages per minute — used to estimate total reading time.</p>
      <label for="reading-speed" class="sr-only">Reading speed</label>
      <input type="number" id="reading-speed" value="${state.settings.readingSpeed}" min="0.1" step="0.1" class="input-narrow">
      <span>pages / minute</span>
    </section>

    <section class="settings-block">
      <h3>Monthly Pages Cap</h3>
      <p class="help-text">Set a target for pages to read each month.</p>
      <label for="pages-cap" class="sr-only">Monthly pages cap</label>
      <input type="number" id="pages-cap" value="${state.settings.pagesCap}" min="1" class="input-narrow">
      <span>pages</span>
    </section>

    <section class="settings-block">
      <h3>Data Management</h3>
      <div class="btn-row">
        <button id="export-btn" class="btn">Export JSON</button>
        <button id="import-btn" class="btn">Import JSON</button>
        <input type="file" id="import-file" accept=".json" hidden>
        <button id="reset-btn" class="btn btn-danger">Reset All Data</button>
      </div>
      <div id="settings-feedback" role="status" aria-live="polite"></div>
    </section>
  `;
}

export function showConfirm(message) {
  return new Promise((resolve) => {
    const old = document.getElementById('confirm-modal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'confirm-modal';
    modal.className = 'modal-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Confirm action');
    modal.innerHTML = `
      <div class="modal-box">
        <p>${message}</p>
        <div class="modal-actions">
          <button id="confirm-yes" class="btn btn-danger">Yes</button>
          <button id="confirm-no" class="btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const onKey = (e) => {
      if (e.key === 'Escape') { cleanup(); resolve(false); }
    };
    const cleanup = () => {
      modal.remove();
      document.removeEventListener('keydown', onKey);
    };

    modal.querySelector('#confirm-yes').addEventListener('click', () => { cleanup(); resolve(true); });
    modal.querySelector('#confirm-no').addEventListener('click', () => { cleanup(); resolve(false); });
    modal.addEventListener('click', (e) => { if (e.target === modal) { cleanup(); resolve(false); } });
    document.addEventListener('keydown', onKey);
    modal.querySelector('#confirm-yes').focus();
  });
}

export function showImportPrompt() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', () => resolve(input.files[0] || null));
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

export function showToast(message, type = 'info') {
  const old = document.querySelector('.toast');
  if (old) old.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

function highlight(val, regex) {
  return regex ? highlightMatches(val, regex) : escapeHTML(val);
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
