// state.js — App state management, stats computation, record CRUD

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

// Listeners for state changes (re-render triggers)
let listeners = [];

export function onStateChange(fn) {
  listeners.push(fn);
}

function notify() {
  listeners.forEach((fn) => fn(state));
}

// Initialize state from storage
export function initState() {
  state.records = loadRecords();
  state.settings = loadSettings();
}

// Re-seed with provided records
export function seedRecords(records) {
  state.records = records;
  saveRecords(state.records);
  notify();
}

// CRUD
export function addRecord(record) {
  state.records.push(record);
  saveRecords(state.records);
  notify();
}

export function updateRecord(id, updates) {
  const idx = state.records.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  state.records[idx] = {
    ...state.records[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
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

// Settings
export function updateSettings(updates) {
  state.settings = { ...state.settings, ...updates };
  saveSettings(state.settings);
  notify();
}

// UI state
export function setActiveSection(section) {
  state.ui.activeSection = section;
  notify();
}

export function setEditingId(id) {
  state.ui.editingId = id;
  notify();
}

export function setSort(sortBy, sortDir) {
  state.ui.sortBy = sortBy;
  state.ui.sortDir = sortDir;
  notify();
}

export function setSearch(query, flags) {
  state.ui.searchQuery = query;
  state.ui.searchFlags = flags || 'i';
  notify();
}

// Get filtered + sorted records
export function getVisibleRecords() {
  const filtered = searchRecords(state.records, state.ui.searchQuery, state.ui.searchFlags);
  return sortRecords(filtered, state.ui.sortBy, state.ui.sortDir);
}

// Compute dashboard stats
export function getStats() {
  const records = state.records;
  const totalRecords = records.length;
  const totalPages = records.reduce((sum, r) => sum + r.pages, 0);

  // Top tag
  const tagCounts = {};
  records.forEach((r) => {
    tagCounts[r.tag] = (tagCounts[r.tag] || 0) + 1;
  });
  let topTag = '—';
  let topCount = 0;
  for (const [tag, count] of Object.entries(tagCounts)) {
    if (count > topCount) {
      topTag = tag;
      topCount = count;
    }
  }

  // Last 7 days trend
  const today = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const pagesOnDay = records
      .filter((r) => r.dateAdded === dateStr)
      .reduce((sum, r) => sum + r.pages, 0);
    days.push({
      date: dateStr,
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      pages: pagesOnDay,
    });
  }

  // Pages this month (for cap)
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const pagesThisMonth = records
    .filter((r) => r.dateAdded.startsWith(monthStart))
    .reduce((sum, r) => sum + r.pages, 0);

  const cap = state.settings.pagesCap;
  const remaining = cap - pagesThisMonth;

  // Estimated reading time
  const speed = state.settings.readingSpeed || 1;
  const totalMinutes = totalPages / speed;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);

  return {
    totalRecords,
    totalPages,
    topTag,
    days,
    pagesThisMonth,
    cap,
    remaining,
    readingTime: { hours, minutes },
  };
}

// Get the raw state
export function getState() {
  return state;
}

// Load records from import
export function importRecords(records) {
  // Merge: replace existing with imported ones (user choice)
  state.records = records;
  saveRecords(state.records);
  notify();
}

// Reset everything
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
