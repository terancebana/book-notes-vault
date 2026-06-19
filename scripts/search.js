// search.js — Safe regex compiler, highlight matches, filter records

// Compile a regex safely — never crash on bad user input
export function compileRegex(input, flags = 'i') {
  if (!input || !input.trim()) return null;
  try {
    return new RegExp(input, flags);
  } catch (e) {
    return null;
  }
}

// Highlight matches with <mark> — safe, escapes HTML to prevent XSS
export function highlightMatches(text, regex) {
  if (!regex) return escapeHTML(text);
  const escaped = escapeHTML(text);
  return escaped.replace(regex, (match) => `<mark>${match}</mark>`);
}

// Escape HTML special characters
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Search records: match against title, author, tag, and description
export function searchRecords(records, query, flags = 'i') {
  if (!query || !query.trim()) return records;

  const regex = compileRegex(query, flags);
  if (!regex) return []; // Invalid regex = no results (safe fail)

  return records.filter((rec) => {
    return (
      regex.test(rec.title) ||
      regex.test(rec.author) ||
      regex.test(rec.tag)
    );
  });
}

// Sort records by a given field
export function sortRecords(records, sortBy, sortDir) {
  return [...records].sort((a, b) => {
    let valA, valB;

    switch (sortBy) {
      case 'title':
        valA = a.title.toLowerCase();
        valB = b.title.toLowerCase();
        break;
      case 'author':
        valA = a.author.toLowerCase();
        valB = b.author.toLowerCase();
        break;
      case 'pages':
        valA = a.pages;
        valB = b.pages;
        break;
      case 'dateAdded':
      default:
        valA = a.dateAdded;
        valB = b.dateAdded;
        break;
    }

    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });
}
