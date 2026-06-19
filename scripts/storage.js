const STORAGE_KEY = 'bookvault:records';
const SETTINGS_KEY = 'bookvault:settings';
const DEFAULTS_KEY = 'bookvault:seeded';

export function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(validateRecord);
  } catch (e) {
    console.warn('Failed to load records, resetting.', e);
    return [];
  }
}

export function saveRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch (e) {
    console.error('Failed to save records:', e);
    return false;
  }
}

export function loadSettings() {
  const defaults = {
    tags: ['Fiction', 'Non-Fiction', 'Reference', 'Notes', 'Research', 'Other'],
    readingSpeed: 1,
    pagesCap: 1000,
  };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw);
    return { ...defaults, ...parsed };
  } catch (e) {
    return { ...defaults };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (e) {
    console.error('Failed to save settings:', e);
    return false;
  }
}

// Seed from seed.json on first load, rebasing dates to the last 7 days so the
// dashboard chart/cap are never empty when the app is opened months later.
export async function seedIfEmpty() {
  if (localStorage.getItem(DEFAULTS_KEY)) return;
  try {
    const resp = await fetch('seed.json');
    const data = await resp.json();
    if (Array.isArray(data) && data.length > 0) {
      const seeded = rebaseSeedDates(data.filter(validateRecord));
      saveRecords(seeded);
      localStorage.setItem(DEFAULTS_KEY, 'true');
      return seeded;
    }
  } catch (e) {
    console.warn('Could not load seed data:', e);
  }
  return null;
}

function rebaseSeedDates(records) {
  const n = records.length;
  if (n === 0) return records;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return records.map((rec, i) => {
    const daysAgo = n === 1 ? 0 : Math.round((i / (n - 1)) * 6);
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    const dateStr = d.toISOString().split('T')[0];
    return {
      ...rec,
      dateAdded: dateStr,
      createdAt: `${dateStr}T00:00:00Z`,
      updatedAt: `${dateStr}T00:00:00Z`,
    };
  });
}

export function exportJSON(records) {
  const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `book-vault-export-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) {
          return reject(new Error('File must contain an array of records.'));
        }
        const valid = data.filter(validateRecord);
        if (valid.length === 0) {
          return reject(new Error('No valid records found in the file.'));
        }
        if (valid.length < data.length) {
          console.warn(`${data.length - valid.length} records were skipped due to validation errors.`);
        }
        resolve(valid);
      } catch (err) {
        reject(new Error('File is not valid JSON.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}

function validateRecord(obj) {
  if (!obj || typeof obj !== 'object') return false;
  const required = ['id', 'title', 'author', 'pages', 'tag', 'dateAdded'];
  for (const key of required) {
    if (!(key in obj)) return false;
  }
  if (typeof obj.id !== 'string' || !obj.id) return false;
  if (typeof obj.title !== 'string' || !obj.title.trim()) return false;
  if (typeof obj.author !== 'string' || !obj.author.trim()) return false;
  if (typeof obj.pages !== 'number' || obj.pages < 0) return false;
  if (typeof obj.tag !== 'string' || !obj.tag.trim()) return false;
  if (typeof obj.dateAdded !== 'string' || !obj.dateAdded) return false;
  return true;
}

export function resetAll() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SETTINGS_KEY);
  localStorage.removeItem(DEFAULTS_KEY);
}
