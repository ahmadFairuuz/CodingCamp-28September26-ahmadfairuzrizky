# Requirements Document

## Introduction

The Expense & Budget Visualizer is a mobile-friendly web application that helps users track their daily spending. The app allows users to input expense transactions, view a scrollable history of all recorded transactions, monitor their total balance, and explore spending distribution via an interactive pie chart. All data is stored client-side using the browser's Local Storage API. The application is built with plain HTML, CSS, and Vanilla JavaScript — no frameworks or build tools required.

---

## Glossary

- **App**: The Expense & Budget Visualizer web application.
- **Transaction**: A single expense entry consisting of an item name, an amount, and a category.
- **Input_Form**: The UI form component that collects transaction data from the user.
- **Transaction_List**: The scrollable UI component that displays all saved transactions.
- **Balance_Display**: The UI component at the top of the App that shows the total amount spent.
- **Pie_Chart**: The visual chart component that displays spending distribution by category.
- **Storage**: The browser's Local Storage API used to persist transaction data client-side.
- **Category**: A classification label for a transaction. Default values are: Food, Transport, Fun.
- **Validator**: The logic component responsible for checking that all required form fields are filled before submission.

---

## Requirements

### Requirement 1: Transaction Input Form

**User Story:** As a user, I want to fill in a form with an item name, amount, and category, so that I can record a new expense transaction.

#### Acceptance Criteria

1. THE Input_Form SHALL provide a text field for the item name accepting up to 100 characters, a numeric field for the amount accepting values between 0.01 and 999,999,999.99, and a dropdown selector for the category.
2. THE Input_Form SHALL offer Food, Transport, and Fun as the default selectable category options.
3. WHEN the user submits the Input_Form, THE Validator SHALL check that the item name field, the amount field, and the category field are all non-empty.
4. IF the Validator detects any empty required field, THEN THE Input_Form SHALL display an inline error message adjacent to each empty field identifying which field is missing and SHALL NOT add a transaction.
5. IF the amount field contains a value that is not a number between 0.01 and 999,999,999.99, THEN THE Input_Form SHALL display an inline error message adjacent to the amount field and SHALL NOT add a transaction.
6. WHEN the Validator confirms all fields are valid, THE App SHALL add the transaction to the Transaction_List and persist it to Storage within 2 seconds.
7. WHEN a transaction is successfully added, THE Input_Form SHALL reset the item name field to empty, the amount field to empty, and the category dropdown to its first default option.

---

### Requirement 2: Transaction List

**User Story:** As a user, I want to see a scrollable list of all my recorded transactions, so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display every stored transaction, showing the item name, the amount, and the category for each entry.
2. WHILE the number of transactions exceeds the visible area, THE Transaction_List SHALL remain scrollable to allow access to all entries.
3. THE Transaction_List SHALL present transactions in reverse-chronological order, with the most recently added transaction appearing first.
4. WHEN the user selects the delete control for a transaction, THE App SHALL remove that transaction from the Transaction_List and from Storage.
5. IF the delete operation fails, THEN THE App SHALL display an error message indicating the transaction could not be deleted and leave the transaction unchanged in the Transaction_List and in Storage.
6. WHEN Storage contains no transactions, THE Transaction_List SHALL display a placeholder message indicating that no transactions have been recorded.
7. THE Transaction_List SHALL display each transaction's item name truncated to a maximum of 50 characters if the item name exceeds that length.

---

### Requirement 3: Total Balance Display

**User Story:** As a user, I want to see my total amount spent displayed prominently, so that I always know how much I have spent overall.

#### Acceptance Criteria

1. THE Balance_Display SHALL show the sum of the amounts of all transactions currently stored in Storage.
2. WHEN a new transaction is added, THE Balance_Display SHALL update to reflect the new total within the same render cycle.
3. WHEN a transaction is deleted, THE Balance_Display SHALL update to reflect the reduced total within the same render cycle.
4. THE Balance_Display SHALL format the total amount as a currency value with exactly two decimal places and a thousands separator for values of 1,000.00 or greater.
5. WHEN Storage contains no transactions, THE Balance_Display SHALL show a total of 0.00.
6. IF the sum of transaction amounts exceeds 999,999,999.99, THEN THE Balance_Display SHALL show the maximum displayable value of 999,999,999.99 and indicate that the display limit has been reached.

---

### Requirement 4: Spending Distribution Pie Chart

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Pie_Chart SHALL display one segment per category that has at least one recorded transaction, sized proportionally to that category's share of total spending, where each segment's percentage is calculated as (category total / grand total * 100) rounded to two decimal places.
2. THE Pie_Chart SHALL label each segment with the category name and the corresponding percentage of total spending rounded to one decimal place, and no label SHALL overlap an adjacent label.
3. WHEN a transaction is added or deleted, THE Pie_Chart SHALL update to reflect the new spending distribution within 500 milliseconds and without requiring a page reload.
4. WHEN Storage contains transactions in only one category, THE Pie_Chart SHALL render a single full-circle segment for that category labeled with the category name and 100%.
5. WHEN Storage contains no transactions, THE Pie_Chart SHALL replace the chart canvas with a placeholder message indicating no data is available.
6. IF a category's share of total spending rounds to 0.0% when rounded to one decimal place, THEN THE Pie_Chart SHALL still render a minimum visible segment for that category using 1% of the chart area and SHALL display the actual percentage in the label formatted to four decimal places (e.g., '0.0042%').
7. THE Pie_Chart SHALL render using Chart.js or an equivalent client-side charting library loaded without a build step.

---

### Requirement 5: Client-Side Data Persistence

**User Story:** As a user, I want my transactions to be saved between sessions, so that I do not lose my spending history when I close or refresh the browser.

#### Acceptance Criteria

1. WHEN a transaction is added, THE Storage SHALL persist the complete transaction data — item name of at most 100 characters, amount as a positive number up to 999,999,999.99, category, and a unique transaction identifier — to the browser's Local Storage under a fixed, application-specific key.
2. WHEN a transaction is deleted, THE Storage SHALL remove the corresponding entry from the browser's Local Storage and write the updated transaction list back under the same application-specific key.
3. WHEN the App initialises, THE App SHALL read all transactions from Storage and render the Transaction_List, Balance_Display, and Pie_Chart to reflect the persisted data within 500 milliseconds of page load.
4. THE Storage SHALL serialise all transaction data as JSON before writing to Local Storage and deserialise it when reading.
5. IF the data read from Local Storage is not valid JSON, THEN THE App SHALL initialise with an empty transaction list and SHALL log a descriptive error message to the browser console.
6. IF the data read from Local Storage is valid JSON but one or more transaction entries are missing required fields — item name, amount, category, or unique identifier — THEN THE App SHALL discard only the malformed entries, initialise with the remaining valid transactions, and SHALL log a descriptive error message to the browser console for each discarded entry.

---

### Requirement 6: Mobile-Friendly Responsive Layout

**User Story:** As a user accessing the app on a mobile device, I want the interface to be readable and usable on a small screen, so that I can track expenses on the go.

#### Acceptance Criteria

1. THE App SHALL use a single CSS file located at `css/style.css` and a single JavaScript file located at `js/app.js`.
2. THE App SHALL apply a responsive layout so that all primary UI components — Input_Form, Balance_Display, Transaction_List, and Pie_Chart — are fully visible and functional on viewport widths from 320px to 1440px.
3. THE App SHALL render without horizontal scrolling on viewport widths of 320px or greater.
4. THE App SHALL use legible font sizes of at least 14px for body text on all supported viewport widths.
5. WHEN a viewport width is less than 768px, THE App SHALL stack all primary UI components — Input_Form, Balance_Display, Transaction_List, and Pie_Chart — vertically in a single column with no component exceeding the viewport width.
6. WHEN a viewport width is 768px or greater, THE App SHALL arrange primary UI components in a multi-column layout such that no component requires horizontal scrolling to view its full content.
7. IF a touch event is the primary input method, THEN THE App SHALL render all interactive controls — including buttons and form inputs — with a minimum touch target size of 44px by 44px.

---

### Requirement 7: Performance and Browser Compatibility

**User Story:** As a user, I want the app to load quickly and respond without noticeable delay, so that I can record expenses without friction.

#### Acceptance Criteria

1. THE App SHALL load and become interactive in a modern browser without requiring any build tool, server, or installation step — opening `index.html` directly in a browser SHALL be sufficient.
2. WHEN a transaction add or delete operation is initiated on a list of up to 500 entries, THE App SHALL complete the Storage write and UI re-render within 100 milliseconds.
3. THE App SHALL function correctly in the current stable releases of Chrome, Firefox, Edge, and Safari, where "correctly" means all acceptance criteria defined in Requirements 1–6 pass without error or visual defect in each browser.
4. THE App SHALL NOT depend on any server-side runtime, backend API, or external data source.
5. WHEN the App is opened by loading `index.html` directly in a browser, THE App SHALL reach an interactive state — defined as all UI controls being visible and responsive to user input — within 3 seconds on a machine with a standard consumer-grade processor and no network dependency.

