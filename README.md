# Book & Notes Vault

A personal library tracker built with vanilla HTML, CSS, and JavaScript — no frameworks.

**Live Demo:** https://terancebana.github.io/book-notes-vault

---

## Theme

**Book & Notes Vault** — catalog your books, tag them by category, track pages read, and monitor your reading progress over time.

---

## Features

- Add, edit, and delete book records (title, author, pages, tag, date)
- Dashboard with total books, total pages, top tag, estimated reading time, and a 7-day bar chart
- Monthly pages cap with live progress bar and ARIA live region feedback
- Regex-powered live search with match highlighting using `<mark>`
- Case-sensitive / case-insensitive search toggle
- Sort records by date, title, author, or pages (ascending / descending)
- Responsive layout: card grid on mobile, data table on tablet/desktop
- JSON import and export with structure validation
- localStorage persistence — data survives page reloads
- Settings: manage tags, reading speed (pages/min), and monthly cap
- Reading time estimator (pages ÷ reading speed → hours & minutes)
- Confirmation modal for destructive actions (delete, reset)
- Toast notifications for all user actions
- Full keyboard accessibility and screen-reader support
- Regex validation test suite at `tests.html`

---

## Regex Catalog

| # | Field | Pattern | Purpose | Valid Example | Invalid Example |
|---|-------|---------|---------|---------------|-----------------|
| 1 | Title | `\s{2,}` | Reject double spaces | `The Hobbit` | `The  Hobbit` |
| 1 | Title | leading/trailing check | Reject spaces at edges | `Dune` | ` Dune ` |
| 2 | Author | `/^[A-Za-z]+(?:[ .\-]+[A-Za-z]+)*$/` | Letters, spaces, hyphens, periods | `J.R.R. Tolkien` | `Author123` |
| 3 | Pages | `/^(0|[1-9]\d*)$/` | Positive integer, no leading zeros | `352` | `03`, `-5`, `3.5` |
| 4 | Date | `/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/` | YYYY-MM-DD with calendar check | `2025-06-15` | `2025-13-01`, `2025-02-30` |
| 5 | Tag | `/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/` | Letters, spaces, hyphens only | `Non-Fiction` | `Tag123` |
| 6 ⭐ | Title (advanced) | `/\b(\w+)\s+\1\b/i` | Back-reference: reject duplicate consecutive words | `The Book` | `The The Book` |

**Search patterns users can try:**
- `^The` — titles starting with "The"
- `\d{3,}` — books with 3+ digit page mentions in title
- `[A-Z][a-z]+$` — authors whose last name ends with a capital-then-lowercase sequence
- `\b(\w+)\s+\1\b` — duplicate words anywhere (uses back-reference)

---

## Keyboard Map

| Key | Action |
|-----|--------|
| `Tab` | Move focus forward through interactive elements |
| `Shift + Tab` | Move focus backward |
| `Enter` / `Space` | Activate focused button or nav item |
| `Escape` | Close modal / return to Dashboard |
| `Tab` to Skip Link → `Enter` | Jump directly to main content |

**Keyboard flow:**
1. On page load, focus lands on the skip-to-content link
2. Tab through the bottom navigation to switch sections
3. In the Records section, Tab reaches the search box, case toggle, sort controls, and each Edit/Delete button
4. In the Add/Edit form, Tab moves through all fields; Enter submits
5. In any confirmation modal, focus is trapped to Yes/Cancel; Escape cancels

---

## Accessibility Notes

- **Landmarks:** `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>` used throughout
- **Headings:** Single `<h1>` in the header; `<h2>` per section; `<h3>` for subsections
- **Labels:** Every input and select has an associated `<label>` (visible or `.sr-only`)
- **Focus:** Custom `:focus-visible` outlines on all interactive elements; nav active state is visually distinct
- **Skip link:** Fixed skip-to-content link becomes visible on focus (top of page)
- **Live regions:**
  - Monthly cap status uses `aria-live="polite"` when under cap, `aria-live="assertive"` when exceeded
  - Form error messages use `role="status"` on each field's error span
  - Toast notifications use `role="status"` and `aria-live="polite"`
- **Search highlights:** `<mark>` elements are used for match highlighting; screen readers announce marked text naturally
- **Modal:** Confirmation dialog uses `role="dialog"`, `aria-modal="true"`, and traps focus; Escape closes it
- **Color contrast:** All text meets WCAG AA contrast ratios (verified against design tokens in `styles/main.css`)
- **Animations:** `pageIn` and `cardIn` animations use `transform` and `opacity` only — respects reduced-motion if added

---

## How to Run Tests

1. Open the project in a browser (local file or via the live GitHub Pages URL)
2. Navigate to `tests.html` directly:
   - **Local:** open `tests.html` in the same folder as `index.html`
   - **Live:** https://terancebana.github.io/book-notes-vault/tests.html
3. The page auto-runs all assertions on load and displays pass/fail results
4. Check the browser console for a summary line: `Validation tests: X/Y passed`

**What is tested:**
- Rule 1: Title — required, min 2 chars, no leading/trailing spaces, no double spaces
- Rule 2: Author — letters, spaces, hyphens, periods
- Rule 3: Pages — positive integer, no leading zeros, no decimals
- Rule 4: Date — YYYY-MM-DD format + real calendar check (Feb 30 fails)
- Rule 5: Tag — letters, spaces, hyphens
- Advanced: Back-reference duplicate word detection (`The The Book` rejected)

---

## File Structure

```
book-notes-vault/
├── index.html          # App shell with all section placeholders
├── tests.html          # Regex validation test suite
├── seed.json           # 12 sample records for first-run seeding
├── styles/
│   └── main.css        # Mobile-first CSS, design tokens, animations
└── scripts/
    ├── app.js          # Bootstrap, event wiring, section routing
    ├── state.js        # Singleton state, CRUD, stats computation
    ├── ui.js           # All DOM rendering functions
    ├── storage.js      # localStorage, JSON import/export, seed loader
    ├── validators.js   # Regex rules and validateAll
    └── search.js       # Safe regex compiler, highlight, sort, filter
```

---

## Demo Video

<!-- Add your unlisted YouTube/Drive link here -->
**Video:** _coming soon_

---

## Author

**Bana Terance CYUZUZO** — [@terancebana](https://github.com/terancebana)
