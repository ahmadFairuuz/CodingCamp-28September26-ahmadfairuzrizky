/* ==========================================================================
   Expense & Budget Visualizer — Application Script
   ========================================================================== */

// === Constants ===

const STORAGE_KEY = "expense_budget_visualizer_v1";
const CUSTOM_CATEGORIES_KEY = "expense_budget_visualizer_categories_v1"; // Challenge 1
const LIMIT_KEY = "expense_budget_visualizer_limit_v1";                   // Challenge 4
const THEME_KEY = "expense_budget_visualizer_theme";                       // Challenge 5

const MAX_AMOUNT = 999_999_999.99;
const MIN_AMOUNT = 0.01;
const MAX_NAME_LENGTH = 100;
const TRUNCATE_LENGTH = 50;

// Challenge 1: let instead of const so it can be extended with custom categories
let CATEGORIES = ["Food", "Transport", "Fun"];

// Challenge 3: current sort mode
let currentSort = "date-desc";

// Challenge 4: spending limit (0 = no limit)
let spendingLimit = 0;

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
    throw err;
  }
}

// === Challenge 1: Custom Category Storage ===

/**
 * Loads custom categories from localStorage and merges with defaults.
 * Returns the merged array of category strings.
 *
 * @returns {string[]}
 */
function loadCustomCategories() {
  const raw = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
  if (raw == null) return ["Food", "Transport", "Fun"];

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return ["Food", "Transport", "Fun"];
  }

  if (!Array.isArray(parsed)) return ["Food", "Transport", "Fun"];

  // Merge defaults with any extras found in storage, preserving order
  const defaults = ["Food", "Transport", "Fun"];
  const extras = parsed.filter(
    (cat) => typeof cat === "string" && !defaults.includes(cat),
  );
  return [...defaults, ...extras];
}

/**
 * Persists the current CATEGORIES array to localStorage.
 *
 * @returns {void}
 */
function saveCustomCategories() {
  localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(CATEGORIES));
}

/**
 * Adds a new custom category after validation, persists it, and rebuilds the select.
 *
 * @param {string} name - The raw category name from the input
 * @returns {boolean} true on success, false on validation failure
 */
function addCustomCategory(name) {
  const trimmed = typeof name === "string" ? name.trim() : "";

  if (trimmed.length === 0) {
    alert("Category name cannot be empty.");
    return false;
  }
  if (trimmed.length > 30) {
    alert("Category name must be 30 characters or fewer.");
    return false;
  }
  if (CATEGORIES.map((c) => c.toLowerCase()).includes(trimmed.toLowerCase())) {
    alert(`"${trimmed}" already exists as a category.`);
    return false;
  }

  CATEGORIES.push(trimmed);
  saveCustomCategories();
  rebuildCategorySelect();
  return true;
}

/**
 * Clears and repopulates the #item-category select with the current CATEGORIES array.
 *
 * @returns {void}
 */
function rebuildCategorySelect() {
  const select = document.getElementById("item-category");
  if (!select) return;

  // Remember the currently selected value so we can restore it
  const currentValue = select.value;

  select.innerHTML = '<option value="">Select category</option>';
  for (const cat of CATEGORIES) {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  }

  // Restore previously selected value if it still exists
  if (currentValue && CATEGORIES.includes(currentValue)) {
    select.value = currentValue;
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

// === Event Handlers ===

/**
 * Handles the form submit event.
 * Validates input fields, displays inline errors on failure, or adds the
 * transaction and resets the form on success.
 *
 * @param {Event} event - The form submit event
 */
function handleFormSubmit(event) {
  event.preventDefault();

  const nameEl     = document.getElementById("item-name");
  const amountEl   = document.getElementById("item-amount");
  const categoryEl = document.getElementById("item-category");

  const name     = nameEl?.value ?? "";
  const amount   = amountEl?.value ?? "";
  const category = categoryEl?.value ?? "";

  // Clear previous errors
  clearFieldError("item-name",     "error-name");
  clearFieldError("item-amount",   "error-amount");
  clearFieldError("item-category", "error-category");

  const { valid, errors } = validateForm(name, amount, category);

  if (!valid) {
    if (errors.name)     showFieldError("item-name",     "error-name",     errors.name);
    if (errors.amount)   showFieldError("item-amount",   "error-amount",   errors.amount);
    if (errors.category) showFieldError("item-category", "error-category", errors.category);
    return;
  }

  // Add the transaction (mutations + renderAll called inside addTransaction)
  try {
    addTransaction(name.trim(), parseFloat(amount), category);
  } catch (err) {
    showStorageError();
    return;
  }

  // Reset form on success
  if (nameEl)     nameEl.value = "";
  if (amountEl)   amountEl.value = "";
  if (categoryEl) categoryEl.selectedIndex = 0;
}

// === Transaction Mutations ===

/**
 * Adds a new transaction to the in-memory array, persists it, and re-renders the UI.
 *
 * @param {string} name     - Validated item name (trimmed)
 * @param {number} amount   - Validated positive number
 * @param {string} category - Validated category string
 * @returns {void}
 *
 * Validates: Requirements 1.6, 5.1
 */
function addTransaction(name, amount, category) {
  const snapshot = transactions.slice();

  const newTransaction = {
    id: (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : generateUUID(),
    name: name.trim(),
    amount: parseFloat(amount),
    category,
    createdAt: new Date().toISOString(),
  };

  transactions.push(newTransaction);

  try {
    saveTransactions(transactions);
  } catch (err) {
    transactions = snapshot;
    throw err;
  }

  renderAll();
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
  const snapshot = transactions.slice();

  transactions = transactions.filter((t) => t.id !== id);

  try {
    saveTransactions(transactions);
  } catch (err) {
    transactions = snapshot;
    throw err;
  }

  renderAll();
}

// === Formatting Utilities ===

/**
 * Formats a number as a currency string with exactly 2 decimal places
 * and a thousands separator comma for values >= 1000.
 *
 * @param {number} amount - Non-negative number to format
 * @returns {string} e.g. "1,234.56", "0.00", "999,999,999.99"
 *
 * Validates: Requirements 3.4
 */
function formatCurrency(amount) {
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
 * Validates: Requirements 4.1, 4.6
 */
function computeChartData(transactions) {
  if (transactions.length === 0) {
    return {
      labels: [],
      data: [],
      percentages: [],
      displayPercentages: [],
      isEmpty: true,
    };
  }

  const totals = {};
  for (const t of transactions) {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  }

  const labels = Object.keys(totals);
  const data = labels.map((label) => totals[label]);

  const grandTotal = data.reduce((sum, val) => sum + val, 0);

  const percentages = [];
  const displayPercentages = [];

  for (const categoryTotal of data) {
    const rawPct = (categoryTotal / grandTotal) * 100;
    const percentage = Math.round(rawPct * 100) / 100;
    percentages.push(percentage);

    let displayPercentage;
    if (rawPct < 0.05) {
      displayPercentage = rawPct.toFixed(4) + "%";
    } else {
      displayPercentage = rawPct.toFixed(1) + "%";
    }
    displayPercentages.push(displayPercentage);
  }

  return { labels, data, percentages, displayPercentages, isEmpty: false };
}

// === Challenge 3: Sort Transactions ===

/**
 * Returns a sorted copy of the transactions array based on the sort key.
 *
 * @param {Transaction[]} txns - Array to sort
 * @param {string} sort - One of: date-desc, date-asc, amount-desc, amount-asc, category
 * @returns {Transaction[]} Sorted copy (original is unchanged)
 */
function sortTransactions(txns, sort) {
  const copy = [...txns];

  switch (sort) {
    case "date-desc":
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    case "date-asc":
      return copy.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    case "amount-desc":
      return copy.sort((a, b) => b.amount - a.amount);

    case "amount-asc":
      return copy.sort((a, b) => a.amount - b.amount);

    case "category":
      return copy.sort((a, b) => {
        const catCmp = a.category.localeCompare(b.category);
        if (catCmp !== 0) return catCmp;
        return a.name.localeCompare(b.name);
      });

    default:
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

// === Challenge 2: Monthly Summary ===

/**
 * Groups transactions by YYYY-MM, sorts newest month first, and renders
 * each month as a card with total amount and per-category breakdown.
 *
 * @param {Transaction[]} txns - The current in-memory transaction array
 * @returns {void}
 */
function renderMonthlySummary(txns) {
  const listEl  = document.getElementById("monthly-summary-list");
  const emptyEl = document.getElementById("summary-empty");

  if (!listEl) return;

  if (txns.length === 0) {
    listEl.innerHTML = "";
    if (emptyEl) emptyEl.removeAttribute("hidden");
    return;
  }

  if (emptyEl) emptyEl.setAttribute("hidden", "");

  // Group by YYYY-MM
  const byMonth = {};
  for (const t of txns) {
    const key = t.createdAt.slice(0, 7); // "YYYY-MM"
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(t);
  }

  // Sort months newest-first
  const months = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));

  listEl.innerHTML = months
    .map((monthKey) => {
      const entries = byMonth[monthKey];
      const total   = entries.reduce((sum, t) => sum + t.amount, 0);

      // e.g. "January 2025"
      const [year, month] = monthKey.split("-");
      const monthName = new Date(
        parseInt(year, 10),
        parseInt(month, 10) - 1,
        1,
      ).toLocaleString("en-US", { month: "long", year: "numeric" });

      // Per-category totals within this month
      const catTotals = {};
      for (const t of entries) {
        catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
      }

      const breakdownRows = Object.entries(catTotals)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(
          ([cat, amt]) =>
            `<li class="month-breakdown-row">
              <span class="month-breakdown-cat">${cat}</span>
              <span class="month-breakdown-amt">$${formatCurrency(amt)}</span>
            </li>`,
        )
        .join("");

      return `<div class="month-card">
  <div class="month-header">
    <span class="month-name">${monthName}</span>
    <span class="month-total">$${formatCurrency(total)}</span>
  </div>
  <ul class="month-breakdown">${breakdownRows}</ul>
</div>`;
    })
    .join("\n");
}

// === Render Functions ===

// Tracks the active Chart.js pie-chart instance so we can destroy and
// recreate it whenever the data changes (avoids duplicate-canvas errors).
let chartInstance = null;

/**
 * Renders the sorted transaction list into the DOM.
 * Shows an empty-state message when there are no transactions.
 * Challenge 3: uses sortTransactions() with currentSort.
 *
 * @param {Transaction[]} txns - The current in-memory transaction array
 * @returns {void}
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.6, 2.7
 */
function renderTransactionList(txns) {
  const ul = document.getElementById("transaction-list");
  const emptyMsg = document.getElementById("transaction-empty");

  // Challenge 3: use sortTransactions with currentSort
  const sorted = sortTransactions(txns, currentSort);

  if (sorted.length === 0) {
    ul.innerHTML = "";
    if (emptyMsg) emptyMsg.removeAttribute("hidden");
    return;
  }

  if (emptyMsg) emptyMsg.setAttribute("hidden", "");

  ul.innerHTML = sorted
    .map((t) => {
      const safeTitle = t.name.replace(/"/g, "&quot;");
      return `<li class="transaction-item">
  <span class="transaction-name" title="${safeTitle}">${truncateName(t.name)}</span>
  <span class="transaction-amount">${formatCurrency(t.amount)}</span>
  <span class="transaction-category" data-category="${t.category}">${t.category}</span>
  <button class="btn-delete" data-id="${t.id}" aria-label="Delete ${truncateName(t.name)}">&#x2715;</button>
</li>`;
    })
    .join("\n");
}

/**
 * Renders the running total balance into the DOM.
 * Challenge 4: also checks spending limit and shows warning.
 *
 * @param {Transaction[]} txns - The current in-memory transaction array
 * @returns {void}
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.5, 3.6
 */
function renderBalance(txns) {
  const balanceAmountEl = document.getElementById("balance-amount");
  const overflowEl      = document.getElementById("balance-overflow");

  const sum = txns.reduce((acc, t) => acc + t.amount, 0);

  if (sum > MAX_AMOUNT) {
    if (balanceAmountEl) balanceAmountEl.textContent = formatCurrency(MAX_AMOUNT);
    if (overflowEl) overflowEl.removeAttribute("hidden");
  } else {
    if (balanceAmountEl) balanceAmountEl.textContent = formatCurrency(sum);
    if (overflowEl) overflowEl.setAttribute("hidden", "");
  }

  // Challenge 4: Spending limit check
  const limitWarning  = document.getElementById("limit-warning");
  const balanceSection = document.getElementById("balance-section");

  if (spendingLimit > 0 && sum >= spendingLimit) {
    if (limitWarning)   limitWarning.removeAttribute("hidden");
    if (balanceSection) balanceSection.classList.add("balance-over-limit");
  } else {
    if (limitWarning)   limitWarning.setAttribute("hidden", "");
    if (balanceSection) balanceSection.classList.remove("balance-over-limit");
  }
}

/**
 * Renders (or re-renders) the spending pie-chart via Chart.js.
 *
 * @param {Transaction[]} txns - The current in-memory transaction array
 * @returns {void}
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */
function renderChart(txns) {
  const canvas    = document.getElementById("spending-chart");
  const chartEmpty = document.getElementById("chart-empty");
  const chartError = document.getElementById("chart-error");

  if (typeof Chart === "undefined") {
    if (canvas) canvas.hidden = true;
    if (chartEmpty) chartEmpty.setAttribute("hidden", "");
    if (chartError) chartError.removeAttribute("hidden");
    return;
  }

  const chartData = computeChartData(txns);

  if (chartData.isEmpty) {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    if (canvas) canvas.hidden = true;
    if (chartEmpty) chartEmpty.removeAttribute("hidden");
    if (chartError) chartError.setAttribute("hidden", "");
    return;
  }

  if (canvas) canvas.hidden = false;
  if (chartEmpty) chartEmpty.setAttribute("hidden", "");
  if (chartError) chartError.setAttribute("hidden", "");

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const CATEGORY_COLORS = {
    Food:      "#16a34a",
    Transport: "#2563eb",
    Fun:       "#d97706",
  };

  // Generate distinct colours for custom categories using a simple string hash
  function getCategoryColor(label) {
    if (CATEGORY_COLORS[label]) return CATEGORY_COLORS[label];
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
      hash = label.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  }

  const backgroundColors = chartData.labels.map(getCategoryColor);

  chartInstance = new Chart(canvas, {
    type: "pie",
    data: {
      labels: chartData.labels,
      datasets: [
        {
          data: chartData.data,
          backgroundColor: backgroundColors,
          borderWidth: 2,
          borderColor: "#ffffff",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const idx = ctx.dataIndex;
              return ` ${ctx.label}: ${chartData.displayPercentages[idx]}`;
            },
          },
        },
      },
    },
  });
}

/**
 * Orchestrates a full UI refresh by delegating to each specialised render
 * function in turn.
 *
 * @returns {void}
 *
 * Validates: Requirements 1.6, 2.4, 3.2, 3.3, 4.3
 */
function renderAll() {
  renderTransactionList(transactions);
  renderBalance(transactions);
  renderChart(transactions);
  renderMonthlySummary(transactions); // Challenge 2
}

/**
 * Delegated click handler for delete buttons in the transaction list.
 *
 * @param {MouseEvent} event
 */
function handleDeleteClick(event) {
  const btn = event.target.closest("[data-id]");
  if (!btn) return;
  const id = btn.dataset.id;
  if (id) deleteTransaction(id);
}

// === Initialization ===

/**
 * Fallback UUID generator for browsers that do not support crypto.randomUUID().
 *
 * @returns {string} A UUID v4-like string
 */
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Shows the storage error banner (if it exists in the DOM).
 */
function showStorageError() {
  const banner = document.getElementById("storage-error");
  if (banner) banner.removeAttribute("hidden");
}

/**
 * Application entry point.
 * Loads persisted transactions, renders the initial UI, and attaches all event listeners.
 *
 * @returns {void}
 */
function init() {
  // 1. Load transactions from localStorage into the in-memory array
  transactions = loadTransactions();

  // === Challenge 1: Load custom categories and rebuild select ===
  CATEGORIES = loadCustomCategories();
  rebuildCategorySelect();

  const customRow    = document.getElementById("custom-category-row");
  const customInput  = document.getElementById("custom-category-input");
  const btnToggle    = document.getElementById("btn-toggle-custom-category");
  const btnAdd       = document.getElementById("btn-add-category");

  if (btnToggle) {
    btnToggle.addEventListener("click", () => {
      if (customRow) {
        const isHidden = customRow.hasAttribute("hidden");
        if (isHidden) {
          customRow.removeAttribute("hidden");
          if (customInput) customInput.focus();
        } else {
          customRow.setAttribute("hidden", "");
        }
      }
    });
  }

  if (btnAdd) {
    btnAdd.addEventListener("click", () => {
      const name = customInput ? customInput.value : "";
      const success = addCustomCategory(name);
      if (success) {
        if (customInput) customInput.value = "";
        if (customRow)   customRow.setAttribute("hidden", "");
      }
    });
  }

  // Also allow pressing Enter in the custom input field
  if (customInput) {
    customInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const success = addCustomCategory(customInput.value);
        if (success) {
          customInput.value = "";
          if (customRow) customRow.setAttribute("hidden", "");
        }
      }
    });
  }

  // === Challenge 3: Sort controls ===
  const sortControls = document.getElementById("sort-controls");
  if (sortControls) {
    sortControls.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-sort");
      if (!btn) return;

      const sort = btn.dataset.sort;
      if (!sort) return;

      currentSort = sort;

      // Update active class
      sortControls.querySelectorAll(".btn-sort").forEach((b) => {
        b.classList.toggle("active", b === btn);
      });

      renderTransactionList(transactions);
    });
  }

  // === Challenge 4: Spending limit ===
  spendingLimit = parseFloat(localStorage.getItem(LIMIT_KEY)) || 0;

  const limitInput = document.getElementById("spending-limit");
  if (limitInput) {
    if (spendingLimit > 0) limitInput.value = spendingLimit;

    limitInput.addEventListener("input", () => {
      const val = parseFloat(limitInput.value);
      spendingLimit = isNaN(val) || val < 0 ? 0 : val;
      if (spendingLimit > 0) {
        localStorage.setItem(LIMIT_KEY, spendingLimit);
      } else {
        localStorage.removeItem(LIMIT_KEY);
      }
      renderBalance(transactions);
    });
  }

  // === Challenge 5: Theme toggle ===
  const btnTheme = document.getElementById("btn-theme-toggle");
  if (btnTheme) {
    // Set correct initial label
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    btnTheme.textContent = isDark ? "☀ Light Mode" : "🌙 Dark Mode";

    btnTheme.addEventListener("click", () => {
      const currentlyDark =
        document.documentElement.getAttribute("data-theme") === "dark";

      if (currentlyDark) {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem(THEME_KEY, "light");
        btnTheme.textContent = "🌙 Dark Mode";
        btnTheme.setAttribute("aria-label", "Switch to dark mode");
      } else {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem(THEME_KEY, "dark");
        btnTheme.textContent = "☀ Light Mode";
        btnTheme.setAttribute("aria-label", "Switch to light mode");
      }
    });
  }

  // 2. Render the initial UI state
  renderAll();

  // 3. Attach form submit handler
  const form = document.getElementById("expense-form");
  if (form) form.addEventListener("submit", handleFormSubmit);

  // 4. Attach delegated delete handler on the list container
  const list = document.getElementById("transaction-list");
  if (list) list.addEventListener("click", handleDeleteClick);
}

// Bootstrap: run init once the DOM is fully parsed
document.addEventListener("DOMContentLoaded", init);
