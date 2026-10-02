# Implementation Plan: Expense & Budget Visualizer

## Overview

Build a standalone, client-side web application using plain HTML, CSS, and Vanilla JavaScript. No build step required — the user opens `index.html` directly in a browser. The implementation follows the module structure defined in `design.md`: a single `js/app.js` partitioned into logical sections, with `localStorage` as the persistence layer and Chart.js (CDN) for the pie chart.

Tasks are ordered to build incrementally: scaffolding → HTML structure → CSS → JS sections (bottom-up: Storage → Validator → Mutations → Utilities → Render → Events → Init) → error handling → tests.

---

## Tasks

- [x] 1. Project scaffolding
  - [x] 1.1 Create the directory structure and empty source files
    - Create `index.html` at the workspace root
    - Create `css/style.css`
    - Create `js/app.js`
    - Verify the three files can be opened in a browser without errors
    - _Requirements: 6.1, 7.1_

- [x] 2. HTML structure
  - [x] 2.1 Build the full document skeleton in `index.html`
    - Add `<meta charset>`, `<meta name="viewport" content="width=device-width, initial-scale=1">`, and `<title>`
    - Link `css/style.css` and `js/app.js` (defer)
    - Add Chart.js CDN `<script>` tag before `js/app.js`
    - _Requirements: 6.1, 7.1_

  - [x] 2.2 Add all UI section elements
    - `Balance_Display` section: heading + total amount element
    - `Input_Form`: text input (name, maxlength=100), number input (amount, min/max), category `<select>` with Food / Transport / Fun options, submit button; add inline error `<span>` elements adjacent to each field
    - `Transaction_List` container: scrollable `<ul>` or `<ol>` with a placeholder `<p>` for empty state
    - `Pie_Chart` section: `<canvas>` element and a placeholder `<p>` for empty state
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.6, 3.1, 4.5_

- [x] 3. CSS — responsive layout and styling
  - [x] 3.1 Implement mobile-first base styles
    - Single-column stacked layout for all primary components (< 768 px)
    - Minimum font size 14 px for body text
    - No horizontal scroll at 320 px viewport width
    - Minimum touch-target size 44 × 44 px for all interactive controls
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.7_

  - [x] 3.2 Add multi-column responsive breakpoint (≥ 768 px)
    - Arrange components in a two-column (or grid) layout at 768 px and wider
    - Verify no component requires horizontal scrolling up to 1440 px
    - Style the transaction list to be scrollable within a fixed height
    - Style form inline error messages (visible, distinct color)
    - Style the delete button per transaction row
    - _Requirements: 6.2, 6.3, 6.6_

- [x] 4. JS — Constants and Storage Layer
  - [x] 4.1 Implement the Constants section in `js/app.js`
    - Define `STORAGE_KEY = "expense_budget_visualizer_v1"`
    - Define `MAX_AMOUNT = 999_999_999.99`, `MIN_AMOUNT = 0.01`, `MAX_NAME_LENGTH = 100`, `TRUNCATE_LENGTH = 50`
    - Define `CATEGORIES = ['Food', 'Transport', 'Fun']`
    - Initialise the in-memory `transactions` array
    - _Requirements: 1.1, 1.2, 5.1_

  - [x] 4.2 Implement `loadTransactions` and `saveTransactions`
    - `loadTransactions`: reads `STORAGE_KEY`, parses JSON, discards entries missing any required field (`id`, `name`, `amount`, `category`, `createdAt`), logs a `console.error` per discarded entry, handles non-JSON gracefully (returns `[]` + `console.error`)
    - `saveTransactions(transactions)`: serialises to JSON and writes under `STORAGE_KEY`; wraps write in `try/catch` (quota handling covered in Task 10)
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 5.6_

  - [ ]\* 4.3 Write property test for JSON serialisation round-trip (Property 11)
    - **Property 11: JSON serialization round-trip preserves all transaction fields**
    - **Validates: Requirements 5.1, 5.3, 5.4**
    - Use fast-check to generate arbitrary valid `Transaction` arrays; assert `loadTransactions(saveTransactions(txs))` deep-equals input

  - [ ]\* 4.4 Write property test for partial-invalid load filter (Property 12)
    - **Property 12: Partial-invalid load discards only malformed entries**
    - **Validates: Requirements 5.6**
    - Use fast-check to generate a mixed array of valid and malformed objects; assert result contains exactly the valid subset

- [x] 5. JS — Validator
  - [x] 5.1 Implement `validateForm(name, amount, category)`
    - Returns `{ valid: boolean, errors: { name?, amount?, category? } }`
    - `name`: non-empty, length ≤ 100
    - `amount`: parseable as finite float in `[0.01, 999_999_999.99]`
    - `category`: non-empty, one of `CATEGORIES`
    - Pure function — no DOM access, no side effects
    - _Requirements: 1.3, 1.4, 1.5_

  - [x] 5.2 Wire inline error display into the form submit handler (stub)
    - Create a stub `handleFormSubmit` that calls `validateForm` and toggles the inline error `<span>` elements per field
    - Full wiring to mutations happens in Task 9
    - _Requirements: 1.3, 1.4, 1.5_

  - [ ]\* 5.3 Write property test — Validator rejects invalid inputs (Property 1)
    - **Property 1: Validator rejects invalid inputs**
    - **Validates: Requirements 1.1, 1.3, 1.4, 1.5**
    - Use fast-check to generate form tuples with at least one invalid field; assert `result.valid === false` and error key present

  - [ ]\* 5.4 Write property test — Validator accepts all valid inputs (Property 2)
    - **Property 2: Validator accepts all fully valid inputs**
    - **Validates: Requirements 1.1, 1.3**
    - Use fast-check to generate fully valid tuples; assert `result.valid === true` and `errors` object is empty

- [x] 6. JS — Transaction Mutations
  - [x] 6.1 Implement `addTransaction(name, amount, category)`
    - Generate UUID via `crypto.randomUUID()` (with `Math.random` fallback — see Task 10)
    - Capture `new Date().toISOString()` as `createdAt`
    - Push new transaction object onto in-memory `transactions` array
    - Call `saveTransactions()` then `renderAll()`
    - _Requirements: 1.6, 5.1_

  - [x] 6.2 Implement `deleteTransaction(id)`
    - Filter in-memory `transactions` array to remove the entry with matching `id`
    - Call `saveTransactions()` then `renderAll()`
    - _Requirements: 2.4, 5.2_

  - [ ]\* 6.3 Write property test — adding a transaction grows list by one (Property 3)
    - **Property 3: Adding a transaction grows the list by exactly one**
    - **Validates: Requirements 1.6, 2.1**
    - Use fast-check to generate a valid transaction tuple + arbitrary starting list; assert `list.length === n + 1` and new item found

  - [ ]\* 6.4 Write property test — deleting a transaction removes exactly that item (Property 4)
    - **Property 4: Deleting a transaction removes exactly that item**
    - **Validates: Requirements 2.4, 5.2**
    - Use fast-check to generate a non-empty list and pick a random existing `id`; assert `list.length === n - 1` and deleted `id` absent

- [x] 7. JS — Formatting Utilities
  - [x] 7.1 Implement `formatCurrency(amount)`
    - Returns a string with exactly two decimal places and a thousands-separator comma for values ≥ 1 000
    - Caps display at `999,999,999.99` (overflow handled in `renderBalance` — Task 8)
    - _Requirements: 3.4_

  - [x] 7.2 Implement `truncateName(name)`
    - Returns `name` unchanged if `name.length ≤ 50`; otherwise returns `name.slice(0, 50)`
    - _Requirements: 2.7_

  - [x] 7.3 Implement `computeChartData(transactions)`
    - Aggregate amounts per category
    - Compute `percentages` as `(categoryTotal / grandTotal * 100)` rounded to two decimal places
    - Build `displayPercentages` strings; handle near-zero shares (< 0.05% displayed to four decimal places at 1 % minimum segment — see design)
    - Return `{ labels, data, percentages, displayPercentages, isEmpty }`
    - _Requirements: 4.1, 4.6_

  - [ ]\* 7.4 Write property test — truncation invariant (Property 6)
    - **Property 6: Item name truncation invariant**
    - **Validates: Requirements 2.7**
    - Use fast-check to generate arbitrary strings; assert `truncateName(s).length === Math.min(s.length, 50)`

  - [ ]\* 7.5 Write property test — currency formatting two decimal places (Property 8)
    - **Property 8: Currency formatting always produces two decimal places**
    - **Validates: Requirements 3.4**
    - Use fast-check to generate non-negative floats in range; assert output matches `/\.\d{2}$/`; assert comma present for values ≥ 1 000

  - [ ]\* 7.6 Write property test — pie chart percentages sum to 100 (Property 10)
    - **Property 10: Pie chart percentages are non-negative and sum to 100**
    - **Validates: Requirements 4.1**
    - Use fast-check to generate non-empty transaction arrays; assert all percentages ≥ 0 and sum within 0.1 of 100

- [ ] 8. JS — Render Functions
  - [ ] 8.1 Implement `renderTransactionList(transactions)`
    - Sort a copy of the array in reverse-chronological order (`createdAt` descending)
    - Clear and repopulate the `<ul>` with one `<li>` per transaction showing name (truncated), amount (formatted), category, and a delete `<button data-id="...">`
    - Show the empty-state placeholder when the array is empty
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 2.7_

  - [ ]\* 8.2 Write property test — reverse-chronological order (Property 5)
    - **Property 5: Transaction list order is reverse-chronological**
    - **Validates: Requirements 2.3**
    - Use fast-check to generate arrays with shuffled `createdAt` timestamps; assert adjacent pairs satisfy `list[i].createdAt >= list[i+1].createdAt`

  - [ ] 8.3 Implement `renderBalance(transactions)`
    - Sum all transaction amounts
    - If sum > `MAX_AMOUNT`, display `"999,999,999.99"` with an overflow indicator element; otherwise display `formatCurrency(sum)`
    - Show `"0.00"` when array is empty
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6_

  - [ ]\* 8.4 Write property test — balance sum correctness (Property 7)
    - **Property 7: Balance sum correctness**
    - **Validates: Requirements 3.1, 3.5**
    - Use fast-check to generate arbitrary amount arrays; assert computed sum equals `reduce(+, 0)` within tolerance 0.001

  - [ ]\* 8.5 Write property test — balance display overflow cap (Property 9)
    - **Property 9: Balance display overflow cap**
    - **Validates: Requirements 3.6**
    - Use fast-check to generate transaction arrays whose sum exceeds 999,999,999.99; assert display shows capped value and overflow indicator

  - [ ] 8.6 Implement `renderChart(transactions)`
    - Call `computeChartData(transactions)`
    - If `isEmpty`, hide canvas and show pie-chart placeholder message
    - Otherwise show canvas, call `chartInstance.destroy()` if an instance exists, then create new `Chart` instance with doughnut/pie type, labels, data, and percentage display in tooltips/labels
    - Guard against `Chart` being undefined (CDN failure — see Task 10)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ] 8.7 Implement `renderAll()`
    - Calls `renderTransactionList(transactions)`, `renderBalance(transactions)`, `renderChart(transactions)` in sequence
    - _Requirements: 1.6, 2.4, 3.2, 3.3, 4.3_

- [ ] 9. Checkpoint — core rendering complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. JS — Event Handlers and Initialization
  - [ ] 10.1 Implement `handleDeleteClick(event)` with event delegation
    - Attach a single `click` listener on the `Transaction_List` container
    - Read `data-id` from `event.target.closest('[data-id]')`; call `deleteTransaction(id)` if found
    - _Requirements: 2.4_

  - [ ] 10.2 Complete `handleFormSubmit(event)` wiring
    - Prevent default, collect field values, call `validateForm`
    - On invalid: display inline errors per field, do not add transaction
    - On valid: clear inline errors, call `addTransaction`, reset form fields and reset category to first option
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ] 10.3 Implement `init()` and `DOMContentLoaded` bootstrap
    - `crypto.randomUUID` feature-detect; define `generateUUID` fallback using `Math.random` hex strings if unavailable
    - Call `loadTransactions()`, assign result to in-memory `transactions`
    - Call `renderAll()`
    - Attach `handleFormSubmit` to the form's `submit` event
    - Attach `handleDeleteClick` to the transaction list container's `click` event
    - Register `document.addEventListener('DOMContentLoaded', init)`
    - _Requirements: 5.3, 7.1, 7.5_

- [ ] 11. Error handling edge cases
  - [ ] 11.1 Handle `localStorage` write failure (quota exceeded)
    - In `saveTransactions`, catch errors from `localStorage.setItem`
    - Revert in-memory `transactions` to the pre-mutation snapshot
    - Display a user-visible error message in the UI
    - _Requirements: (design error-handling table)_

  - [ ] 11.2 Handle Chart.js CDN load failure
    - In `renderChart`, check `typeof Chart === 'undefined'`
    - If true, hide canvas and show a user-visible error message in the pie-chart section
    - Ensure the rest of the UI (form, list, balance) remains fully functional
    - _Requirements: 4.7_

- [ ] 12. Testing setup and unit tests
  - [ ] 12.1 Set up Vitest (or Jest) as a dev-only test runner
    - Install Vitest and fast-check as `devDependencies` (or reference via CDN-equivalent for Node test environment)
    - Create `tests/` directory with a `vitest.config.js` (or `jest.config.js`)
    - Ensure `npm test` (or `npx vitest --run`) executes all test files
    - _Requirements: (design testing strategy)_

  - [ ]\* 12.2 Write unit tests for `validateForm`
    - Empty name, empty amount, empty category → each produces the corresponding error key
    - Name exactly 100 chars → valid
    - Amount exactly 0.01 and 999,999,999.99 → valid
    - Amount 0 and negative → invalid
    - All fields valid → `{ valid: true, errors: {} }`
    - _Requirements: 1.1, 1.3, 1.4, 1.5_

  - [ ]\* 12.3 Write unit tests for `formatCurrency`
    - `0` → `"0.00"`, `1000` → `"1,000.00"`, `999999999.99` → `"999,999,999.99"`, `1234567.89` → `"1,234,567.89"`
    - _Requirements: 3.4_

  - [ ]\* 12.4 Write unit tests for `truncateName`
    - 50-character string → unchanged
    - 51-character string → truncated to 50
    - Empty string → `""`
    - _Requirements: 2.7_

  - [ ]\* 12.5 Write unit tests for `computeChartData`
    - Empty array → `isEmpty: true`
    - Single category → 100% for that category
    - Three categories → percentages sum to 100, near-zero share uses minimum-segment logic
    - _Requirements: 4.1, 4.6_

  - [ ]\* 12.6 Write unit tests for `loadTransactions`
    - Valid JSON array → returns all entries
    - Invalid JSON → returns `[]` and logs error
    - Mixed valid + malformed → returns only valid entries, logs per discarded
    - Empty array JSON → returns `[]`
    - _Requirements: 5.5, 5.6_

- [ ] 13. Final checkpoint — all tests and smoke checks
  - Ensure all unit and property tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP build
- Each task references specific requirements for traceability; all 7 requirements are covered
- The app itself requires no build step — tests are a dev-only concern using Vitest/Jest
- Property tests use fast-check and each run a minimum of 100 iterations as specified in the design
- Checkpoints (Tasks 9 and 13) are gates to confirm correctness before moving forward
- The `js/app.js` sections must be implemented in the order: Constants → Storage → Validator → Mutations → Utilities → Render → Events → Init to avoid forward-reference issues in a non-module script

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["3.2", "4.1"] },
    { "id": 4, "tasks": ["4.2", "12.1"] },
    { "id": 5, "tasks": ["4.3", "4.4", "5.1"] },
    { "id": 6, "tasks": ["5.2", "5.3", "5.4"] },
    { "id": 7, "tasks": ["6.1", "6.2"] },
    { "id": 8, "tasks": ["6.3", "6.4", "7.1", "7.2", "7.3"] },
    { "id": 9, "tasks": ["7.4", "7.5", "7.6", "8.1"] },
    { "id": 10, "tasks": ["8.2", "8.3"] },
    { "id": 11, "tasks": ["8.4", "8.5", "8.6"] },
    { "id": 12, "tasks": ["8.7"] },
    { "id": 13, "tasks": ["10.1", "10.2"] },
    { "id": 14, "tasks": ["10.3"] },
    { "id": 15, "tasks": ["11.1", "11.2"] },
    { "id": 16, "tasks": ["12.2", "12.3", "12.4", "12.5", "12.6"] }
  ]
}
```
