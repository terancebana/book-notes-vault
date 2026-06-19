// validators.js — Regex validation rules for Book & Notes Vault
// 5 basic rules + 1 advanced (duplicate word back-reference)

const validators = {};

// Rule 1: Title — no leading/trailing spaces, no double spaces
validators.title = (value) => {
  if (!value || !value.trim()) {
    return { valid: false, message: 'Title is required.' };
  }
  if (value.length < 2) {
    return { valid: false, message: 'Title must be at least 2 characters.' };
  }
  if (value !== value.trim()) {
    return { valid: false, message: 'Title must not have leading or trailing spaces.' };
  }
  if (/\s{2,}/.test(value)) {
    return { valid: false, message: 'Title must not contain double spaces.' };
  }
  if (value.length > 150) {
    return { valid: false, message: 'Title must be under 150 characters.' };
  }
  return { valid: true, message: '' };
};

// Advanced Regex: Back-reference — reject duplicate consecutive words (e.g. "The The Book")
validators.titleNoDuplicates = (value) => {
  if (/\b(\w+)\s+\1\b/i.test(value)) {
    return { valid: false, message: 'Title contains duplicate consecutive words.' };
  }
  return { valid: true, message: '' };
};

// Rule 2: Author — letters, spaces, hyphens, periods (supports initials like J.R.R. Tolkien)
validators.author = (value) => {
  if (!value || !value.trim()) {
    return { valid: false, message: 'Author is required.' };
  }
  if (!/^[A-Za-z]+(?:[ .\-]+[A-Za-z]+)*$/.test(value)) {
    return { valid: false, message: 'Author must contain only letters, spaces, hyphens, and periods.' };
  }
  if (value.length > 100) {
    return { valid: false, message: 'Author name must be under 100 characters.' };
  }
  return { valid: true, message: '' };
};

// Rule 3: Pages — positive integer
validators.pages = (value) => {
  if (value === '' || value === null || value === undefined) {
    return { valid: false, message: 'Pages is required.' };
  }
  const str = String(value).trim();
  if (!/^(0|[1-9]\d*)$/.test(str)) {
    return { valid: false, message: 'Pages must be a positive whole number.' };
  }
  const num = parseInt(str, 10);
  if (num > 10000) {
    return { valid: false, message: 'Pages cannot exceed 10,000.' };
  }
  return { valid: true, message: '' };
};

// Rule 4: Date — YYYY-MM-DD format
validators.date = (value) => {
  if (!value) {
    return { valid: false, message: 'Date is required.' };
  }
  if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value)) {
    return { valid: false, message: 'Date must be in YYYY-MM-DD format.' };
  }
  // Validate actual calendar date (catches Feb 30, etc.)
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return { valid: false, message: 'Date is invalid (e.g., Feb 30 does not exist).' };
  }
  return { valid: true, message: '' };
};

// Rule 5: Tag — letters, spaces, hyphens
validators.tag = (value) => {
  if (!value || !value.trim()) {
    return { valid: false, message: 'Tag is required.' };
  }
  if (!/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/.test(value)) {
    return { valid: false, message: 'Tag must contain only letters, spaces, and hyphens.' };
  }
  return { valid: true, message: '' };
};

// Run all validators, return array of errors
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
