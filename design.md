# Design Document: Todo-Life Dashboard

## Overview

The Todo-Life Dashboard is a single-page, client-side productivity application delivered as a static set of three files: `index.html`, `css/style.css`, and `js/app.js`. It requires no server, no build step, and no external dependencies — it opens directly from the filesystem via a `file://` URL.

The application is composed of four independent widgets rendered in a responsive grid layout:

| Widget | Responsibility |
|---|---|
| Greeting Widget | Displays live time, date, and a contextual greeting |
| Focus Timer | 25-minute Pomodoro countdown with start/stop/reset |
| To-Do List | CRUD task management with localStorage persistence |
| Quick Links | Named URL bookmarks with localStorage persistence |

All persistent state lives in `localStorage` under two keys: `dashboard_tasks` and `dashboard_links`. There is no shared mutable state between widgets beyond the storage layer — each widget owns its own in-memory array and writes to storage on every mutation.

---

## Architecture

The application follows a **module-per-widget** pattern inside a single JavaScript file. Each widget is an explicitly-initialized module that:

1. Reads its initial state from `localStorage` on page load.
2. Renders its UI into a pre-existing DOM container.
3. Attaches event listeners to its own DOM subtree.
4. Writes back to `localStorage` on every state mutation.

There is no global event bus or shared state object. Widgets communicate only through the DOM (e.g., focus management) and through `localStorage` (persistence).

```
┌─────────────────────────────────────────────────────────┐
│                        index.html                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  #greeting   │  │  #timer      │  │  #todo       │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐                                        │
│  │  #links      │                                        │
│  └──────────────┘                                        │
└─────────────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
   js/app.js            localStorage
   ┌──────────────────────────────────┐
   │  initGreeting()                  │
   │  initTimer()                     │
   │  initTodo()                      │
   │  initLinks()                     │
   │  StorageService                  │
   └──────────────────────────────────┘
```

### Initialization Sequence

```
DOMContentLoaded
  └─► initGreeting()   — starts setInterval for clock
  └─► initTimer()      — sets up timer state and button listeners
  └─► initTodo()       — loads tasks from storage, renders list
  └─► initLinks()      — loads links from storage, renders panel
```

Storage is read inside `initTodo()` and `initLinks()` before any list content is rendered, satisfying Requirement 5.3.

---

## Components and Interfaces

### 1. Greeting Widget (`initGreeting`)

**Responsibility:** Display live time, date, and time-of-day greeting. Update every minute.

**DOM contract:**
```html
<section id="greeting">
  <p id="greeting-text">Good Morning</p>
  <p id="greeting-time">08:30</p>
  <p id="greeting-date">Monday, 26 May 2025</p>
</section>
```

**Functions:**

```js
/**
 * Returns the greeting string for a given hour (0–23).
 * @param {number} hour
 * @returns {"Good Morning" | "Good Afternoon" | "Good Evening"}
 */
function getGreeting(hour) { ... }

/**
 * Formats a Date object as "HH:MM".
 * @param {Date} date
 * @returns {string}
 */
function formatTime(date) { ... }

/**
 * Formats a Date object as "Weekday, DD Month YYYY".
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) { ... }

/**
 * Reads the current time, updates all three greeting DOM nodes.
 * Re-evaluates getGreeting on every call so boundary crossings
 * (e.g., 11:59 → 12:00) are reflected automatically (Requirement 1.6).
 */
function updateGreeting() { ... }

/**
 * Initializes the greeting widget and starts a 60-second interval.
 */
function initGreeting() { ... }
```

**Greeting logic:**

| Hour range | Greeting |
|---|---|
| 05:00 – 11:59 | "Good Morning" |
| 12:00 – 17:59 | "Good Afternoon" |
| 18:00 – 23:59 and 00:00 – 04:59 | "Good Evening" |

**Interval strategy:** `setInterval(updateGreeting, 60_000)` started after the first synchronous call to `updateGreeting()`. The interval fires every 60 seconds; because the display only shows HH:MM, sub-minute drift is imperceptible. On each tick, `updateGreeting()` calls `getGreeting(new Date().getHours())` so boundary crossings are reflected automatically, satisfying Requirement 1.6.

---

### 2. Focus Timer (`initTimer`)

**Responsibility:** 25-minute countdown with start, stop, and reset controls.

**DOM contract:**
```html
<section id="timer">
  <p id="timer-display">25:00</p>
  <p id="timer-complete" hidden>Session complete!</p>
  <button id="timer-start">Start</button>
  <button id="timer-stop">Stop</button>
  <button id="timer-reset">Reset</button>
</section>
```

**Internal state (module-scoped variables):**

| Variable | Type | Description |
|---|---|---|
| `remainingSeconds` | `number` | Seconds left; initialized to `1500` (25 × 60) |
| `intervalId` | `number \| null` | Return value of `setInterval`; `null` when stopped |
| `isRunning` | `boolean` | Whether the countdown is active |

**Functions:**

```js
/** Formats total seconds as "MM:SS". */
function formatTimerDisplay(totalSeconds) { ... }

/** Renders remainingSeconds into #timer-display. */
function renderTimer() { ... }

/** Tick handler: decrements remainingSeconds, calls renderTimer, handles completion. */
function tick() { ... }

/** Starts the countdown if not already running and time > 0. */
function startTimer() { ... }

/** Pauses the countdown if running. */
function stopTimer() { ... }

/**
 * Stops and resets remainingSeconds to 1500.
 * Also re-hides #timer-complete if it was shown (Requirement 2.5).
 */
function resetTimer() { ... }

/** Wires up button listeners and renders initial state. */
function initTimer() { ... }
```

**Guard conditions:**
- `startTimer`: no-op if `isRunning === true` or `remainingSeconds === 0` (Requirement 2.7).
- `stopTimer`: no-op if `isRunning === false` (Requirement 2.9).
- `resetTimer`: clears interval, resets to 1500, sets `isRunning = false`, and re-hides `#timer-complete` regardless of current state (Requirements 2.5, 2.9).

**Completion behavior:** When `tick()` decrements `remainingSeconds` to `0`, it calls `clearInterval(intervalId)`, sets `isRunning = false`, renders `"00:00"`, and removes the `hidden` attribute from `#timer-complete` (Requirement 2.6).

**Reset and completion indicator:** `resetTimer()` must set `document.getElementById('timer-complete').hidden = true` in addition to restoring `remainingSeconds` to `1500`. This ensures the completion message is cleared when the user resets after a completed session.

**Design decision:** Timer state is intentionally **not persisted** to `localStorage`. The timer resets on page reload by design — this keeps the implementation simple and avoids stale timer state from previous sessions.

---

### 3. To-Do List (`initTodo`)

**Responsibility:** CRUD task management with localStorage persistence.

**DOM contract:**
```html
<section id="todo">
  <form id="todo-form">
    <input id="todo-input" type="text" maxlength="500" placeholder="Add a task…" />
    <button type="submit">Add</button>
  </form>
  <ul id="todo-list"></ul>
</section>
```

Each rendered task item (normal mode):
```html
<li data-id="<uuid>" class="todo-item [completed]">
  <button data-action="toggle" data-id="<uuid>" aria-label="Toggle complete">✓</button>
  <span class="todo-text">Task description</span>
  <button data-action="edit"   data-id="<uuid>" aria-label="Edit task">✎</button>
  <button data-action="delete" data-id="<uuid>" aria-label="Delete task">✕</button>
</li>
```

Each rendered task item (edit mode):
```html
<li data-id="<uuid>" class="todo-item editing">
  <input class="todo-edit-input" value="Task description" />
  <button data-action="confirm" data-id="<uuid>">Save</button>
  <button data-action="cancel"  data-id="<uuid>">Cancel</button>
</li>
```

**Functions:**

```js
/** Generates a unique ID (crypto.randomUUID or timestamp-based fallback). */
function generateId() { ... }

/** Loads tasks array from StorageService. */
function loadTasks() { ... }

/** Persists the current tasks array via StorageService. */
function saveTasks() { ... }

/** Renders the full task list into #todo-list. */
function renderTasks() { ... }

/** Renders a single <li> element for a task. */
function renderTaskItem(task) { ... }

/**
 * Validates and adds a new task from the given description string.
 * On success: appends task, saves, re-renders, and clears #todo-input (Requirement 3.2).
 * On failure (empty/whitespace): retains focus on #todo-input (Requirement 3.3).
 */
function addTask(description) { ... }

/** Toggles the completed state of a task by id. */
function toggleTask(id) { ... }

/** Enters edit mode for a task by id. */
function editTask(id) { ... }

/** Confirms an edit with a new description. */
function confirmEdit(id, newDescription) { ... }

/** Cancels edit mode without saving. */
function cancelEdit(id) { ... }

/** Deletes a task by id. */
function deleteTask(id) { ... }

/** Wires up form submit and delegated list click/keydown listeners. */
function initTodo() { ... }
```

**Input clearing:** After a successful `addTask`, the function must set `document.getElementById('todo-input').value = ''` and call `.focus()` on it, satisfying Requirement 3.2.

**Event delegation:** A single `click` listener on `#todo-list` inspects `event.target.closest('[data-action]')` to dispatch to the correct handler. This avoids attaching per-item listeners on every render.

**Keyboard shortcuts in edit mode:** The inline `<input>` listens for `Enter` → `confirmEdit` and `Escape` → `cancelEdit`. These are attached directly to the edit input element during `renderTaskItem`.

---

### 4. Quick Links (`initLinks`)

**Responsibility:** Named URL bookmarks with add, open, and delete.

**DOM contract:**
```html
<section id="links">
  <form id="links-form">
    <input id="link-name-input" type="text" placeholder="Name" />
    <span id="link-name-error" class="error" hidden></span>
    <input id="link-url-input" type="text" placeholder="https://…" />
    <span id="link-url-error" class="error" hidden></span>
    <button type="submit">Add Link</button>
  </form>
  <div id="links-list"></div>
</section>
```

Each rendered link:
```html
<div class="link-item">
  <button class="link-open" data-url="https://example.com">Example</button>
  <button class="link-delete" data-id="<uuid>" aria-label="Delete link">✕</button>
</div>
```

**Functions:**

```js
/** Loads links array from StorageService. */
function loadLinks() { ... }

/** Persists the current links array via StorageService. */
function saveLinks() { ... }

/** Renders all links into #links-list. */
function renderLinks() { ... }

/** Validates and adds a new link. Returns true on success. */
function addLink(name, url) { ... }

/** Normalizes a URL by prepending "https://" if no protocol present. */
function normalizeUrl(url) { ... }

/** Deletes a link by id. */
function deleteLink(id) { ... }

/** Wires up form submit and delegated list click listeners. */
function initLinks() { ... }
```

**Validation rules:**
- Empty name → show `#link-name-error` with text "Name is required", do not add (Requirement 4.3).
- Empty URL → show `#link-url-error` with text "URL is required", do not add (Requirement 4.4).
- URL without `http://` or `https://` prefix → `normalizeUrl` prepends `"https://"` before saving (Requirement 4.5).
- Both errors can be shown simultaneously if both fields are empty.
- On successful add, both error spans are hidden and both inputs are cleared.

**Link opening:** The `.link-open` button calls `window.open(url, '_blank', 'noopener,noreferrer')` to open the URL in a new tab with security best practices (Requirement 4.6).

---

### 5. Storage Service (`StorageService`)

**Responsibility:** Centralize all `localStorage` reads and writes with error handling.

```js
const StorageService = {
  TASKS_KEY: 'dashboard_tasks',
  LINKS_KEY: 'dashboard_links',

  /**
   * Reads and JSON-parses a value from localStorage.
   * Returns defaultValue if the key is absent or JSON is malformed.
   * @param {string} key
   * @param {*} defaultValue
   * @returns {*}
   */
  read(key, defaultValue) { ... },

  /**
   * JSON-serializes value and writes it to localStorage.
   * Returns true on success, false on failure (quota exceeded, etc.).
   * On failure, calls StorageService.onWriteError(key, error).
   * @param {string} key
   * @param {*} value
   * @returns {boolean}
   */
  write(key, value) { ... },

  /**
   * Called when a write fails. Displays an inline error message near the widget.
   * @param {string} key
   * @param {Error} error
   */
  onWriteError(key, error) { ... },
};
```

---

## Data Models

### Task

Stored as an element of the JSON array at `localStorage["dashboard_tasks"]`.

```js
/**
 * @typedef {Object} Task
 * @property {string}  id          - Unique identifier (UUID or timestamp-based)
 * @property {string}  description - Task text, 1–500 characters, trimmed
 * @property {boolean} completed   - Whether the task is marked done
 * @property {number}  createdAt   - Unix timestamp (ms) of creation
 */
```

**Example:**
```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "description": "Write the design document",
    "completed": false,
    "createdAt": 1716700800000
  }
]
```

### Link

Stored as an element of the JSON array at `localStorage["dashboard_links"]`.

```js
/**
 * @typedef {Object} Link
 * @property {string} id   - Unique identifier
 * @property {string} name - Display label, non-empty, trimmed
 * @property {string} url  - Fully-qualified URL (always has http:// or https:// prefix)
 */
```

**Example:**
```json
[
  {
    "id": "f0e1d2c3-b4a5-6789-0123-456789abcdef",
    "name": "GitHub",
    "url": "https://github.com"
  }
]
```

### Storage Layout

| Key | Type | Description |
|---|---|---|
| `dashboard_tasks` | `Task[]` (JSON) | All to-do tasks in insertion order |
| `dashboard_links` | `Link[]` (JSON) | All quick links in insertion order |

---

## State Management Approach

Each widget owns a **module-scoped array** (`tasks: Task[]`, `links: Link[]`) that is the single source of truth for that widget's data. The pattern for every mutation is:

```
1. Validate input
2. Mutate the in-memory array
3. Call saveTasks() / saveLinks()  →  StorageService.write(...)
4. Call renderTasks() / renderLinks()  →  full re-render of the list
```

Full re-renders are acceptable because the lists are small (bounded by practical localStorage limits) and the DOM operations are synchronous and fast. There is no virtual DOM or diffing.

The Focus Timer uses three module-scoped primitives (`remainingSeconds`, `intervalId`, `isRunning`) rather than an array; its state is intentionally **not persisted** — the timer resets on page reload by design.

---

## Event Handling Patterns

### Form Submission

Both the To-Do form and the Quick Links form use `submit` event listeners on the `<form>` element with `event.preventDefault()`. This captures both button clicks and Enter-key presses in text inputs.

### Event Delegation

The To-Do list and Quick Links panel use a single delegated `click` listener on the container element. Each interactive element carries a `data-action` attribute and a `data-id` attribute:

```html
<button data-action="toggle" data-id="abc123">✓</button>
<button data-action="edit"   data-id="abc123">✎</button>
<button data-action="delete" data-id="abc123">✕</button>
```

The handler pattern:
```js
container.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;
  switch (action) {
    case 'toggle':  toggleTask(id);  break;
    case 'edit':    editTask(id);    break;
    case 'confirm': confirmEdit(id, /* input value */); break;
    case 'cancel':  cancelEdit(id);  break;
    case 'delete':  deleteTask(id);  break;
  }
});
```

### Keyboard Shortcuts in Edit Mode

When a task is in edit mode, the inline `<input>` listens for:
- `Enter` → `confirmEdit(id, input.value)`
- `Escape` → `cancelEdit(id)`

This is attached directly to the edit input element during `renderTaskItem`.

### Timer Interval

`setInterval(tick, 1000)` is used for the countdown. The interval ID is stored in `intervalId` so it can be cleared by `stopTimer()` and `resetTimer()`.

---

## File Structure

```
index.html          ← Single HTML file; all widget markup, links to CSS/JS
css/
  style.css         ← All styles; CSS custom properties for theming
js/
  app.js            ← All JavaScript; module-per-widget pattern
```

This structure satisfies Requirement 6.2: exactly one HTML file, one CSS file in `css/`, and one JavaScript file in `js/`.

### `index.html` Skeleton

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Todo-Life Dashboard</title>
  <link rel="stylesheet" href="css/style.css" />
</head>
<body>
  <main class="dashboard-grid">
    <section id="greeting" class="widget">…</section>
    <section id="timer"    class="widget">…</section>
    <section id="todo"     class="widget">…</section>
    <section id="links"    class="widget">…</section>
  </main>
  <script src="js/app.js"></script>
</body>
</html>
```

### `css/style.css` Structure

```
:root { /* CSS custom properties: colors, spacing, font sizes */ }
*, *::before, *::after { box-sizing: border-box; }
body { … }
.dashboard-grid { display: grid; … }
.widget { … }

/* Greeting */
#greeting { … }

/* Timer */
#timer { … }
#timer-display { … }

/* Todo */
#todo { … }
.todo-item { … }
.todo-item.completed .todo-text { text-decoration: line-through; opacity: 0.5; }

/* Links */
#links { … }
.link-item { … }

/* Utilities */
.error { color: var(--color-error); }
[hidden] { display: none !important; }

/* Responsive */
@media (max-width: 600px) { .dashboard-grid { grid-template-columns: 1fr; } }
```

### `js/app.js` Structure

```
// ── StorageService ──────────────────────────────────────
const StorageService = { … };

// ── Greeting Widget ─────────────────────────────────────
function getGreeting(hour) { … }
function formatTime(date) { … }
function formatDate(date) { … }
function updateGreeting() { … }
function initGreeting() { … }

// ── Focus Timer ─────────────────────────────────────────
let remainingSeconds = 1500;
let intervalId = null;
let isRunning = false;
function formatTimerDisplay(s) { … }
function renderTimer() { … }
function tick() { … }
function startTimer() { … }
function stopTimer() { … }
function resetTimer() { … }
function initTimer() { … }

// ── To-Do List ──────────────────────────────────────────
let tasks = [];
function generateId() { … }
function loadTasks() { … }
function saveTasks() { … }
function renderTasks() { … }
function renderTaskItem(task) { … }
function addTask(description) { … }
function toggleTask(id) { … }
function editTask(id) { … }
function confirmEdit(id, newDescription) { … }
function cancelEdit(id) { … }
function deleteTask(id) { … }
function initTodo() { … }

// ── Quick Links ─────────────────────────────────────────
let links = [];
function loadLinks() { … }
function saveLinks() { … }
function renderLinks() { … }
function normalizeUrl(url) { … }
function addLink(name, url) { … }
function deleteLink(id) { … }
function initLinks() { … }

// ── Bootstrap ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initGreeting();
  initTimer();
  initTodo();
  initLinks();
});
```

---

## Responsive Layout Approach

The dashboard uses **CSS Grid** with a two-column layout on wide viewports and a single-column stack on narrow viewports.

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

@media (max-width: 600px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
```

Each `.widget` uses `min-width: 0` to prevent grid blowout and `overflow-wrap: break-word` to handle long task descriptions. No fixed pixel widths are used on widget content; all sizing is relative (`rem`, `%`, `fr`). This ensures no horizontal scrollbar appears between 320 px and 1920 px, satisfying Requirement 6.4.

---

## Performance Considerations

The application is designed to meet the performance requirements in Requirement 6.5 (all widgets visible within 1 second; interactions respond within 200 ms) through the following design choices:

- **No external dependencies**: No network requests for scripts or stylesheets. All assets are local files loaded synchronously.
- **Synchronous initialization**: All four `init*()` functions run synchronously on `DOMContentLoaded`. `localStorage` reads are synchronous and fast for small payloads.
- **Full re-renders are cheap**: Task and link lists are bounded by practical `localStorage` limits (~5 MB). Re-rendering a list of hundreds of items takes well under 10 ms.
- **No layout thrashing**: Each widget reads and writes the DOM in a single pass (read state → build HTML string or DOM nodes → insert once).
- **60-second greeting interval**: The greeting widget uses a 60-second interval rather than a 1-second interval, minimizing timer overhead.
- **1-second timer interval**: The focus timer uses a 1-second interval only while running, and clears it when stopped or reset.

---

## Error Handling

| Scenario | Handling |
|---|---|
| `localStorage` read returns `null` | `StorageService.read` returns the provided `defaultValue` (empty array `[]`) |
| `localStorage` read returns malformed JSON | `JSON.parse` is wrapped in `try/catch`; returns `defaultValue` on error |
| `localStorage.setItem` throws (quota exceeded, private browsing) | `StorageService.write` catches the error, calls `onWriteError`, returns `false`; in-memory state is preserved |
| `onWriteError` | Displays a temporary inline `<p class="storage-error">` message near the affected widget |
| Empty task submission | `description.trim() === ''` check before `addTask`; focus is retained on the input |
| Whitespace-only task submission | Treated identically to empty — rejected before any mutation |
| Empty link name or URL | Inline `<span class="error">` elements shown; form not submitted |
| URL without protocol | `normalizeUrl` prepends `"https://"` before saving |
| Timer start when already running or at 00:00 | Guard condition in `startTimer`; silently ignored (Requirement 2.7) |
| Stop when timer not running | Guard condition in `stopTimer`; silently ignored (Requirement 2.9) |
| Reset when timer not running | `resetTimer` always restores to 1500, clears any interval, and re-hides `#timer-complete`; safe to call in any state (Requirement 2.9) |
| Reset after completion indicator shown | `resetTimer` sets `#timer-complete.hidden = true`, clearing the completion message |
| Edit confirmed with whitespace-only description | Rejected; original description retained; focus kept on edit input |
| Edit cancelled via cancel button or Escape key | `cancelEdit` exits edit mode without mutating state |
| `crypto.randomUUID` unavailable | `generateId` falls back to `Date.now() + Math.random()` string |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

---

### Property 1: Greeting correctness for all hours

*For any* integer hour in [0, 23], `getGreeting(hour)` SHALL return `"Good Morning"` when hour ∈ [5, 11], `"Good Afternoon"` when hour ∈ [12, 17], and `"Good Evening"` when hour ∈ [0, 4] ∪ [18, 23]. No hour value in [0, 23] shall produce an unexpected or undefined result.

**Validates: Requirements 1.3, 1.4, 1.5**

---

### Property 2: Time formatting produces valid HH:MM strings

*For any* `Date` object, `formatTime(date)` SHALL return a string that matches the pattern `^\d{2}:\d{2}$`, where the hours component equals `date.getHours()` zero-padded to two digits and the minutes component equals `date.getMinutes()` zero-padded to two digits.

**Validates: Requirements 1.1**

---

### Property 3: Date formatting produces correctly structured strings

*For any* `Date` object, `formatDate(date)` SHALL return a string of the form `"<Weekday>, <DD> <Month> <YYYY>"` where `<Weekday>` is the correct English weekday name, `<DD>` is the zero-padded day of the month, `<Month>` is the correct English month name, and `<YYYY>` is the four-digit year.

**Validates: Requirements 1.2**

---

### Property 4: Timer display formatting produces valid MM:SS strings

*For any* integer `s` in [0, 1500], `formatTimerDisplay(s)` SHALL return a string matching `^\d{2}:\d{2}$` where the minutes component equals `Math.floor(s / 60)` zero-padded to two digits and the seconds component equals `s % 60` zero-padded to two digits.

**Validates: Requirements 2.3, 2.8**

---

### Property 5: Each tick decrements remaining time by exactly one second

*For any* timer state where `remainingSeconds` is in [1, 1500] and `isRunning === true`, one call to `tick()` SHALL decrement `remainingSeconds` by exactly 1 and update the display to reflect the new value.

**Validates: Requirements 2.2, 2.3**

---

### Property 6: Timer stop preserves remaining time

*For any* running timer state (any value of `remainingSeconds` in [1, 1500] with `isRunning === true`), calling `stopTimer()` SHALL set `isRunning` to `false`, clear the active interval, and leave `remainingSeconds` unchanged.

**Validates: Requirements 2.4**

---

### Property 7: Timer reset always restores to 25:00 and hides completion indicator

*For any* timer state (any value of `remainingSeconds` in [0, 1500] and any value of `isRunning`), calling `resetTimer()` SHALL set `remainingSeconds` to `1500`, set `isRunning` to `false`, clear any active interval, and set `#timer-complete.hidden = true` — without throwing an error.

**Validates: Requirements 2.5, 2.9**

---

### Property 8: Timer start is a no-op when already running or at zero

*For any* timer state where `isRunning === true` or `remainingSeconds === 0`, calling `startTimer()` SHALL leave `remainingSeconds`, `isRunning`, and `intervalId` unchanged.

**Validates: Requirements 2.7**

---

### Property 9: Timer stop is a no-op when not running

*For any* timer state where `isRunning === false`, calling `stopTimer()` SHALL leave `remainingSeconds`, `isRunning`, and `intervalId` unchanged and SHALL NOT throw an error.

**Validates: Requirements 2.9**

---

### Property 10: Adding a valid task grows the list, clears the input, and persists

*For any* non-empty, non-whitespace-only string `description` of length ≤ 500 characters, calling `addTask(description)` SHALL increase `tasks.length` by exactly 1, the new task SHALL have `completed === false` and `description` equal to the trimmed input, `StorageService.read(TASKS_KEY, [])` SHALL return an array containing the new task, and `#todo-input.value` SHALL be `''` after the call.

**Validates: Requirements 3.2, 3.4**

---

### Property 11: Whitespace-only descriptions are rejected

*For any* string composed entirely of whitespace characters (including the empty string), calling `addTask(s)` SHALL leave `tasks.length` unchanged and SHALL NOT write a new task to storage.

**Validates: Requirements 3.3**

---

### Property 12: Task completion toggle is a self-inverse operation

*For any* task in the list, calling `toggleTask(id)` twice in succession SHALL return the task's `completed` field to its original value. Additionally, calling `toggleTask(id)` once SHALL flip `completed` from `false` to `true` or from `true` to `false`.

**Validates: Requirements 3.6**

---

### Property 13: Completed tasks are rendered with the completed CSS class

*For any* `Task` object where `completed === true`, `renderTaskItem(task)` SHALL produce a DOM element that has the CSS class `"completed"` applied to the list item. *For any* `Task` where `completed === false`, the element SHALL NOT have the `"completed"` class.

**Validates: Requirements 3.7**

---

### Property 14: Edit mode pre-fills the input with the current description

*For any* task in the list, calling `editTask(id)` SHALL render an edit input whose `value` equals the task's current `description`.

**Validates: Requirements 3.9**

---

### Property 15: Confirming an edit with a valid description updates the task

*For any* task in the list and any non-empty, non-whitespace-only string `newDescription`, calling `confirmEdit(id, newDescription)` SHALL update the task's `description` to `newDescription.trim()` and persist the updated list to storage.

**Validates: Requirements 3.10**

---

### Property 16: Confirming an edit with a whitespace description is rejected

*For any* task in the list and any whitespace-only string `s`, calling `confirmEdit(id, s)` SHALL leave the task's `description` unchanged and SHALL NOT persist any change to storage.

**Validates: Requirements 3.11**

---

### Property 17: Cancelling an edit leaves the task unchanged

*For any* task in the list, entering edit mode and then calling `cancelEdit(id)` SHALL leave the task's `description` unchanged, exit edit mode, and NOT persist any change to storage.

**Validates: Requirements 3.12**

---

### Property 18: Deleting a task removes it from the list and storage

*For any* non-empty task list and any task `t` in that list, calling `deleteTask(t.id)` SHALL result in a `tasks` array that does not contain any element with `id === t.id`, and the updated array SHALL be persisted to storage.

**Validates: Requirements 3.14**

---

### Property 19: Task persistence round-trip preserves content and order

*For any* array of `Task` objects, writing them to storage via `saveTasks()` and then reading them back via `loadTasks()` SHALL produce an array that is deeply equal to the original array — same ids, descriptions, completed states, and insertion order.

**Validates: Requirements 3.15, 5.1, 5.3, 5.5**

---

### Property 20: URL normalization always produces a protocol-prefixed URL

*For any* string `url` that does not begin with `"http://"` or `"https://"`, `normalizeUrl(url)` SHALL return a string that begins with `"https://"` followed by the original `url`. For any string that already begins with `"http://"` or `"https://"`, `normalizeUrl(url)` SHALL return the string unchanged.

**Validates: Requirements 4.5**

---

### Property 21: Link validation rejects empty name or URL

*For any* call to `addLink` where `name.trim() === ''` or `url.trim() === ''`, the function SHALL leave `links.length` unchanged and SHALL NOT persist any change to storage.

**Validates: Requirements 4.3, 4.4**

---

### Property 22: Adding a valid link grows the list and persists it

*For any* non-empty `name` string and non-empty `url` string, calling `addLink(name, url)` SHALL increase `links.length` by exactly 1, the stored URL SHALL have a valid protocol prefix (ensured by `normalizeUrl`), and `StorageService.read(LINKS_KEY, [])` SHALL return an array containing the new link.

**Validates: Requirements 4.2, 5.2**

---

### Property 23: Deleting a link removes it from the list and storage

*For any* non-empty links list and any link `l` in that list, calling `deleteLink(l.id)` SHALL result in a `links` array that does not contain any element with `id === l.id`, and the updated array SHALL be persisted to storage.

**Validates: Requirements 4.8**

---

### Property 24: Link persistence round-trip preserves content and order

*For any* array of `Link` objects, writing them to storage via `saveLinks()` and then reading them back via `loadLinks()` SHALL produce an array that is deeply equal to the original array — same ids, names, urls, and insertion order.

**Validates: Requirements 4.9, 5.2, 5.3, 5.5**

---

### Property 25: Storage read handles absent keys and malformed JSON gracefully

*For any* string that is not valid JSON (including the empty string, arbitrary text, and truncated JSON), `StorageService.read(key, defaultValue)` SHALL return `defaultValue` without throwing an exception. When the key is absent from `localStorage`, it SHALL also return `defaultValue`.

**Validates: Requirements 5.4**

---

### Property 26: Storage write failure preserves in-memory state

*For any* in-memory `tasks` array, if `localStorage.setItem` is made to throw (simulating quota exceeded or unavailable storage), calling `saveTasks()` SHALL leave the `tasks` array in memory unchanged and SHALL display an error message to the user.

**Validates: Requirements 5.6**

---

## Testing Strategy

### Unit Tests

Unit tests cover pure functions with deterministic outputs and specific behavioral scenarios:

- `getGreeting(hour)` — all boundary hours (0, 4, 5, 11, 12, 17, 18, 23)
- `formatTime(date)` — midnight, noon, single-digit hours/minutes
- `formatDate(date)` — weekday names, month names, zero-padded days
- `formatTimerDisplay(seconds)` — 0, 1, 59, 60, 1499, 1500
- `normalizeUrl(url)` — already-prefixed URLs, bare domains, empty string
- `StorageService.read` — absent key, valid JSON, malformed JSON
- `addTask` / `toggleTask` / `deleteTask` — state transitions
- `addLink` / `deleteLink` — state transitions and URL normalization
- `confirmEdit` — valid and whitespace-only descriptions
- `cancelEdit` — verifies no state change
- `startTimer` — guard when already running; guard when at 00:00 (Requirement 2.7)
- `stopTimer` — guard when not running (Requirement 2.9); preserves `remainingSeconds` when paused
- `resetTimer` — restores to 1500 from any state, including when not running; hides `#timer-complete` (Requirements 2.5, 2.9)
- `tick()` — decrements `remainingSeconds` by 1 per call
- Timer completion — `tick()` when `remainingSeconds === 1` reaches 00:00 and shows `#timer-complete` (Requirement 2.6)
- Greeting boundary crossing — `updateGreeting()` at hour 11 shows "Good Morning"; at hour 12 shows "Good Afternoon" (Requirement 1.6)
- Input cleared after task add — `#todo-input.value === ''` after successful `addTask` (Requirement 3.2)
- Link opening — `window.open` called with correct URL, `'_blank'`, and `'noopener,noreferrer'` (Requirement 4.6)

### Property-Based Tests

The dashboard's pure functions are well-suited to property-based testing. Use [fast-check](https://github.com/dubzzz/fast-check) with a minimum of 100 iterations per property. Tag each test with a comment referencing the design property:

**Tag format:** `// Feature: todo-life-dashboard, Property N: <property text>`

Each of the 26 Correctness Properties above maps to one property-based test. Key generators:

| Property | Generator |
|---|---|
| 1 | `fc.integer({ min: 0, max: 23 })` |
| 2, 3 | `fc.date()` |
| 4 | `fc.integer({ min: 0, max: 1500 })` |
| 5 | States where `isRunning === true` and `remainingSeconds` in [1, 1500] |
| 6 | States where `isRunning === true` and `remainingSeconds` in [1, 1500] |
| 7 | `fc.record({ remainingSeconds: fc.integer({min:0,max:1500}), isRunning: fc.boolean() })` |
| 8 | States where `isRunning === true` or `remainingSeconds === 0` |
| 9 | States where `isRunning === false` |
| 10, 11 | `fc.string()` filtered by valid/invalid (non-empty vs whitespace-only) |
| 12, 13, 14, 15, 16, 17, 18 | `fc.array(fc.record({ id, description, completed, createdAt }))` |
| 19, 24 | Arrays of Task / Link objects |
| 20 | `fc.string()` with/without protocol prefix |
| 21 | `fc.record({ name: fc.string(), url: fc.string() })` filtered for empty name or URL |
| 22 | Non-empty name and URL strings |
| 23 | Non-empty links array + link id |
| 25 | `fc.string()` (arbitrary non-JSON) |
| 26 | Any task array + mocked `localStorage.setItem` that throws |

### Integration / Smoke Tests

These tests verify infrastructure wiring, browser compatibility, and performance — not suitable for property-based testing:

- Open `index.html` as a `file://` URL in Chrome, Firefox, Edge, and Safari — verify all widgets render and no console errors appear (Requirement 6.3).
- Verify `localStorage` keys `dashboard_tasks` and `dashboard_links` are written on first interaction (Requirements 5.1, 5.2).
- Verify data survives a page reload (Requirement 5.3).
- Verify layout at 320 px, 768 px, 1280 px, and 1920 px viewport widths — no horizontal scrollbar, no overlapping elements (Requirement 6.4).
- Verify link buttons open URLs in a new tab with `noopener,noreferrer` (Requirement 4.6).
- Verify timer completion indicator (`#timer-complete`) appears when countdown reaches 00:00 (Requirement 2.6).
- Verify timer completion indicator is hidden after `resetTimer()` is called (Requirement 2.5).
- Verify all widgets are visible within 1 second of page load and interactions respond within 200 ms (Requirement 6.5).
- Verify no external scripts, stylesheets, or frameworks are loaded (Requirement 6.1).
- Verify `initTodo()` and `initLinks()` read from storage before rendering any list content (Requirement 5.3).
