// PATTERNS is the single source of truth; tests.html imports it to avoid drift.

export const PATTERNS = {
  author: /^[A-Za-z]+(?:[ .\-]+[A-Za-z]+)*$/,
  pages: /^(0|[1-9]\d*)$/,
  date: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  tag: /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/,
  titleDoubleSpace: /\s{2,}/,
  duplicateWords: /\b(\w+)\s+\1\b/i,
};

const validators = {};

// Rule 1: Title — required, 2–150 chars, trimmed, no double spaces
validators.title = (value) => {
  if (!value || !value.trim()) return { valid: false, message: 'Title is required.' };
  if (value.length < 2) return { valid: false, message: 'Title must be at least 2 characters.' };
  if (value !== value.trim()) return { valid: false, message: 'Title must not have leading or trailing spaces.' };
  if (PATTERNS.titleDoubleSpace.test(value)) return { valid: false, message: 'Title must not contain double spaces.' };
  if (value.length > 150) return { valid: false, message: 'Title must be under 150 characters.' };
  return { valid: true, message: '' };
};

// Advanced: back-reference — reject duplicate consecutive words (e.g. "The The Book")
validators.titleNoDuplicates = (value) =>
  PATTERNS.duplicateWords.test(value)
    ? { valid: false, message: 'Title contains duplicate consecutive words.' }
    : { valid: true, message: '' };

// Rule 2: Author — letters, spaces, hyphens, periods (supports initials)
validators.author = (value) => {
  if (!value || !value.trim()) return { valid: false, message: 'Author is required.' };
  if (!PATTERNS.author.test(value)) return { valid: false, message: 'Author must contain only letters, spaces, hyphens, and periods.' };
  if (value.length > 100) return { valid: false, message: 'Author name must be under 100 characters.' };
  return { valid: true, message: '' };
};

// Rule 3: Pages — positive integer
validators.pages = (value) => {
  if (value === '' || value === null || value === undefined) return { valid: false, message: 'Pages is required.' };
  const str = String(value).trim();
  if (!PATTERNS.pages.test(str)) return { valid: false, message: 'Pages must be a positive whole number.' };
  if (parseInt(str, 10) > 10000) return { valid: false, message: 'Pages cannot exceed 10,000.' };
  return { valid: true, message: '' };
};

// Rule 4: Date — YYYY-MM-DD (real calendar date)
validators.date = (value) => {
  if (!value) return { valid: false, message: 'Date is required.' };
  if (!PATTERNS.date.test(value)) return { valid: false, message: 'Date must be in YYYY-MM-DD format.' };
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return { valid: false, message: 'Date is invalid (e.g., Feb 30 does not exist).' };
  }
  return { valid: true, message: '' };
};

// Rule 5: Tag — letters, spaces, hyphens
validators.tag = (value) => {
  if (!value || !value.trim()) return { valid: false, message: 'Tag is required.' };
  if (!PATTERNS.tag.test(value)) return { valid: false, message: 'Tag must contain only letters, spaces, and hyphens.' };
  return { valid: true, message: '' };
};

validators.validateAll = (fields) => {
  const errors = [];

  const titleCheck = validators.title(fields.title);
  if (!titleCheck.valid) errors.push({ field: 'title', message: titleCheck.message });
  else {
    const dupCheck = validators.titleNoDuplicates(fields.title);
    if (!dupCheck.valid) errors.push({ field: 'title', message: dupCheck.message });
  }

  const authorCheck = validators.author(fields.author);
  if (!authorCheck.valid) errors.push({ field: 'author', message: authorCheck.message });

  const pagesCheck = validators.pages(fields.pages);
  if (!pagesCheck.valid) errors.push({ field: 'pages', message: pagesCheck.message });

  const dateCheck = validators.date(fields.date);
  if (!dateCheck.valid) errors.push({ field: 'date', message: dateCheck.message });

  const tagCheck = validators.tag(fields.tag);
  if (!tagCheck.valid) errors.push({ field: 'tag', message: tagCheck.message });

  return errors;
};

export default validators;
