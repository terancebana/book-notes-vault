import { saveRecords, saveSettings, loadRecords, loadSettings } from './storage.js';
import { searchRecords, sortRecords } from './search.js';

// Singleton state
const state = {
  records: [],
  settings: {
    tags: ['Fiction', 'Non-Fiction', 'Reference', 'Notes', 'Research', 'Other'],
    readingSpeed: 1,
    pagesCap: 1000,
  },
  ui: {
    activeSection: 'dashboard',
    editingId: null,
    sortBy: 'dateAdded',
    sortDir: 'desc',
    searchQuery: '',
    searchFlags: 'i',
  },
};

let listeners = [];

export function onStateChange(fn) { listeners.push(fn); }

function notify() { listeners.forEach((fn) => fn(state)); }

export function initState() {
  state.records = loadRecords();
  state.settings = loadSettings();
}

export function seedRecords(records) {
  state.records = records;
  saveRecords(state.records);
  notify();
}

export function addRecord(record) {
  state.records.push(record);
  saveRecords(state.records);
  notify();
}

export function updateRecord(id, updates) {
  const idx = state.records.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  state.records[idx] = { ...state.records[idx], ...updates, updatedAt: new Date().toISOString() };
  saveRecords(state.records);
  notify();
  return true;
}

export function deleteRecord(id) {
  const idx = state.records.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  state.records.splice(idx, 1);
  saveRecords(state.records);
  notify();
  return true;
}

export function updateSettings(updates) {
  state.settings = { ...state.settings, ...updates };
  saveSettings(state.settings);
  notify();
}

export function setActiveSection(section) { state.ui.activeSection = section; notify(); }
export function setEditingId(id) { state.ui.editingId = id; notify(); }
export function setSort(sortBy, sortDir) { state.ui.sortBy = sortBy; state.ui.sortDir = sortDir; notify(); }
export function setSearch(query, flags) { state.ui.searchQuery = query; state.ui.searchFlags = flags || 'i'; notify(); }
export function getState() { return state; }

export function getVisibleRecords() {
  return sortRecords(
    searchRecords(state.records, state.ui.searchQuery, state.ui.searchFlags),
    state.ui.sortBy,
    state.ui.sortDir
  );
}

export function getStats() {
  const records = state.records;
  const totalRecords = records.length;
  const totalPages = records.reduce((sum, r) => sum + r.pages, 0);

  const tagCounts = {};
  records.forEach((r) => { tagCounts[r.tag] = (tagCounts[r.tag] || 0) + 1; });
  let topTag = '—', topCount = 0;
  for (const [tag, count] of Object.entries(tagCounts)) {
    if (count > topCount) { topTag = tag; topCount = count; }
  }

  const today = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    days.push({
      date: dateStr,
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      pages: records.filter((r) => r.dateAdded === dateStr).reduce((sum, r) => sum + r.pages, 0),
    });
  }

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const pagesThisMonth = records
    .filter((r) => r.dateAdded.startsWith(monthStart))
    .reduce((sum, r) => sum + r.pages, 0);

  const cap = state.settings.pagesCap;
  const speed = state.settings.readingSpeed || 1;
  const totalMinutes = totalPages / speed;

  return {
    totalRecords,
    totalPages,
    topTag,
    days,
    pagesThisMonth,
    cap,
    remaining: cap - pagesThisMonth,
    readingTime: { hours: Math.floor(totalMinutes / 60), minutes: Math.round(totalMinutes % 60) },
  };
}

export function importRecords(records) {
  state.records = records;
  saveRecords(state.records);
  notify();
}

export function resetAll() {
  state.records = [];
  state.settings = {
    tags: ['Fiction', 'Non-Fiction', 'Reference', 'Notes', 'Research', 'Other'],
    readingSpeed: 1,
    pagesCap: 1000,
  };
  state.ui.activeSection = 'dashboard';
  state.ui.editingId = null;
  state.ui.sortBy = 'dateAdded';
  state.ui.sortDir = 'desc';
  state.ui.searchQuery = '';
  state.ui.searchFlags = 'i';
  notify();
}
