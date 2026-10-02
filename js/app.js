/* ==========================================================================
   Expense & Budget Visualizer — Application Script
   ========================================================================== */

// === Constants ===

const STORAGE_KEY = "expense_budget_visualizer_v1";
const MAX_AMOUNT = 999_999_999.99;
const MIN_AMOUNT = 0.01;
const MAX_NAME_LENGTH = 100;
const TRUNCATE_LENGTH = 50;
const CATEGORIES = ["Food", "Transport", "Fun"];

// In-memory source of truth — kept in sync with localStorage
let transactions = [];

// === Storage Layer ===

/**
 * Reads and deserialises the transaction list from localStorage.
 * Malformed entries are discarded with a console.error rather than
 * crashing the whole load.
 *
 * @returns {Transaction[]} Array of valid transaction objects (may be empty).
 */
function loadTransactions() {
  const raw = localStorage.getItem(STORAGE_KEY);

  // Nothing stored yet — start fresh
  if (raw == null) return [];

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error(
      "[ExpenseApp] localStorage data is not valid JSON. Initialising with empty list.",
    );
    return [];
  }

  // Guard against non-array values (e.g. a stale plain object)
  if (!Array.isArray(parsed)) return [];

  // Filter out any entry that is missing a required field or has the wrong type
  return parsed.filter((entry) => {
    const isValid =
      typeof entry.id === "string" &&
      typeof entry.name === "string" &&
      typeof entry.amount === "number" &&
      typeof entry.category === "string" &&
      typeof entry.createdAt === "string";

    if (!isValid) {
      console.error(
        "[ExpenseApp] Discarding malformed transaction entry:",
        entry,
      );
    }

    return isValid;
  });
}

/**
 * Serialises the transaction list to JSON and writes it to localStorage.
 * Re-throws any write error (e.g. QuotaExceededError) so callers can
 * handle it and revert in-memory state if needed.
 *
 * @param {Transaction[]} txns - The current transaction array to persist.
 * @returns {void}
 */
function saveTransactions(txns) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(txns));
  } catch (err) {
    // Re-throw so the calling mutation (Task 11) can display an error and
    // revert the in-memory array to its pre-mutation snapshot.
    throw err;
  }
}

// === Validator ===

/**
 * Validates raw form field values before a transaction is added.
 * Pure function — no DOM access, no side effects.
 *
 * @param {string} name     - Raw value from the item name field
 * @param {string} amount   - Raw value from the amount field (string from input)
 * @param {string} category - Raw value from the category select
 * @returns {{ valid: boolean, errors: { name?: string, amount?: string, category?: string } }}
 */
function validateForm(name, amount, category) {
  const errors = {};

  // --- Validate name ---
  const trimmedName = typeof name === "string" ? name.trim() : "";
  if (trimmedName.length === 0) {
    errors.name = "Item name is required.";
  } else if (trimmedName.length > MAX_NAME_LENGTH) {
    errors.name = `Item name must be ${MAX_NAME_LENGTH} characters or fewer.`;
  }

  // --- Validate amount ---
  const parsed = parseFloat(amount);
  if (amount === "" || amount == null || isNaN(parsed)) {
    errors.amount = "Amount is required.";
  } else if (!isFinite(parsed) || parsed < MIN_AMOUNT || parsed > MAX_AMOUNT) {
    errors.amount = `Amount must be between ${MIN_AMOUNT} and ${MAX_AMOUNT.toLocaleString()}.`;
  }

  // --- Validate category ---
  const trimmedCategory = typeof category === "string" ? category.trim() : "";
  if (trimmedCategory.length === 0) {
    errors.category = "Please select a category.";
  } else if (!CATEGORIES.includes(trimmedCategory)) {
    errors.category = "Please select a valid category.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// === DOM Helpers ===

/**
 * Marks a form field as invalid and displays an error message.
 *
 * @param {string} fieldId - The `id` of the input or select element
 * @param {string} errorId - The `id` of the associated error <span>
 * @param {string} message - The error message to display
 */
function showFieldError(fieldId, errorId, message) {
  const field = document.getElementById(fieldId);
  const errorSpan = document.getElementById(errorId);

  if (errorSpan) errorSpan.textContent = message;
  if (field) field.classList.add("is-invalid");
}

/**
 * Clears any validation error state from a form field.
 *
 * @param {string} fieldId - The `id` of the input or select element
 * @param {string} errorId - The `id` of the associated error <span>
 */
function clearFieldError(fieldId, errorId) {
  const field = document.getElementById(fieldId);
  const errorSpan = document.getElementById(errorId);

  if (errorSpan) errorSpan.textContent = "";
  if (field) field.classList.remove("is-invalid");
}

// === Event Handlers (stub — completed in Task 10) ===

/**
 * Handles the form submit event.
 * Validates input fields and displays inline errors, or logs a success
 * message until full wiring is completed in Task 10.
 *
 * @param {Event} event - The form submit event
 */
function handleFormSubmit(event) {
  event.preventDefault();

  // 1. Read raw field values
  const name = document.getElementById("item-name")?.value ?? "";
  const amount = document.getElementById("item-amount")?.value ?? "";
  const category = document.getElementById("item-category")?.value ?? "";

  // 2. Clear previous validation errors
  clearFieldError("item-name", "error-name");
  clearFieldError("item-amount", "error-amount");
  clearFieldError("item-category", "error-category");

  // 3. Validate
  const { valid, errors } = validateForm(name, amount, category);

  // 4. Show errors if invalid
  if (!valid) {
    if (errors.name) showFieldError("item-name", "error-name", errors.name);
    if (errors.amount) showFieldError("item-amount", "error-amount", errors.amount);
    if (errors.category) showFieldError("item-category", "error-category", errors.category);
    return;
  }

  // 5. Valid — full wiring deferred to Task 10
  console.log("[ExpenseApp] Form valid — addTransaction to be wired in Task 10");
}

// === Transaction Mutations ===

/**
 * Adds a new transaction to the in-memory array, persists it, and re-renders the UI.
 * Uses crypto.randomUUID() for the ID (with Math.random fallback set up in Task 10).
 *
 * @param {string} name     - Validated item name (trimmed)
 * @param {number} amount   - Validated positive number
 * @param {string} category - Validated category string
 * @returns {void}
 *
 * Validates: Requirements 1.6, 5.1
 */
function addTransaction(name, amount, category) {
  // Snapshot current state so we can roll back if the save fails (Task 11)
  const snapshot = transactions.slice();

  // Build the new transaction object
  const newTransaction = {
    // Use the native Web Crypto API; generateUUID() fallback is wired in Task 10
    id: (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : generateUUID(), // eslint-disable-line no-undef — defined in Task 10
    name: name.trim(),
    amount: parseFloat(amount), // amount may arrive as a string from the form
    category,
    createdAt: new Date().toISOString(),
  };

  // Mutate the in-memory array
  transactions.push(newTransaction);

  try {
    // Persist to localStorage
    saveTransactions(transactions);
  } catch (err) {
    // Revert in-memory state so it stays in sync with what's actually stored
    transactions = snapshot;
    // Re-throw so the error UI layer (Task 11) can surface it to the user
    throw err;
  }

  // Re-render all UI panels (renderAll defined in Task 8)
  renderAll(); // eslint-disable-line no-undef — defined in Task 8
}

/**
 * Removes the transaction with the given id from the in-memory array,
 * persists the change, and re-renders the UI.
 *
 * @param {string} id - The UUID of the transaction to remove
 * @returns {void}
 *
 * Validates: Requirements 2.4, 5.2
 */
function deleteTransaction(id) {
  // Snapshot current state so we can roll back if the save fails (Task 11)
  const snapshot = transactions.slice();

  // Remove the matching entry (filter returns a new array, keeping immutability intent)
  transactions = transactions.filter((t) => t.id !== id);

  try {
    // Persist the updated list to localStorage
    saveTransactions(transactions);
  } catch (err) {
    // Revert in-memory state to keep it consistent with storage
    transactions = snapshot;
    // Re-throw so the error UI layer (Task 11) can surface it to the user
    throw err;
  }

  // Re-render all UI panels (renderAll defined in Task 8)
  renderAll(); // eslint-disable-line no-undef — defined in Task 8
}

// === Formatting Utilities ===

/**
 * Formats a number as a currency string with exactly 2 decimal places
 * and a thousands separator comma for values >= 1000.
 * Does not cap the value — overflow capping is handled by renderBalance().
 *
 * @param {number} amount - Non-negative number to format
 * @returns {string} e.g. "1,234.56", "0.00", "999,999,999.99"
 *
 * Validates: Requirements 3.4
 */
function formatCurrency(amount) {
  // Guard: treat any non-finite value (NaN, Infinity, undefined, etc.) as 0
  if (typeof amount !== "number" || !isFinite(amount)) {
    amount = 0;
  }

  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Truncates a string to at most TRUNCATE_LENGTH (50) characters.
 * Returns the string unchanged if it is already within the limit.
 *
 * @param {string} name - The item name to potentially truncate
 * @returns {string}
 *
 * Validates: Requirements 2.7
 */
function truncateName(name) {
  if (name.length <= TRUNCATE_LENGTH) return name;
  return name.slice(0, TRUNCATE_LENGTH);
}

/**
 * Aggregates transaction amounts by category and computes percentage shares.
 *
 * @param {Transaction[]} transactions
 * @returns {ChartData}
 *
 * @typedef {Object} ChartData
 * @property {string[]}  labels             - Category names with at least one transaction
 * @property {number[]}  data               - Raw total amount per category
 * @property {number[]}  percentages        - Share rounded to 2 decimal places
 * @property {string[]}  displayPercentages - Formatted label strings for chart tooltips
 * @property {boolean}   isEmpty            - True when transactions array is empty
 *
 * Validates: Requirements 4.1, 4.6
 */
function computeChartData(transactions) {
  // Early-exit: return a clearly empty structure when there's nothing to chart
  if (transactions.length === 0) {
    return {
      labels: [],
      data: [],
      percentages: [],
      displayPercentages: [],
      isEmpty: true,
    };
  }

  // Step 1: Aggregate totals per category
  const totals = {};
  for (const t of transactions) {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  }

  // Step 2: Build parallel labels and data arrays from the totals object
  const labels = Object.keys(totals);
  const data = labels.map((label) => totals[label]);

  // Step 3: Compute grand total
  const grandTotal = data.reduce((sum, val) => sum + val, 0);

  // Step 4: Compute per-category percentages and display strings
  const percentages = [];
  const displayPercentages = [];

  for (const categoryTotal of data) {
    const rawPct = (categoryTotal / grandTotal) * 100;

    // Round to 2 decimal places for the numeric percentages array
    const percentage = Math.round(rawPct * 100) / 100;
    percentages.push(percentage);

    // For very small slices that would display as "0.0%", show more precision
    let displayPercentage;
    if (rawPct < 0.05) {
      // Format to 4 decimal places to avoid misleading "0.0%" label
      displayPercentage = rawPct.toFixed(4) + "%";
    } else {
      // Standard 1 decimal place, e.g. "23.5%"
      displayPercentage = rawPct.toFixed(1) + "%";
    }
    displayPercentages.push(displayPercentage);
  }

  return { labels, data, percentages, displayPercentages, isEmpty: false };
}
