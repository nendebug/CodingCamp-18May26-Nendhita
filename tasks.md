# Implementation Plan: Todo-Life Dashboard

## Overview

Implement a single-page client-side productivity dashboard using plain HTML, CSS, and Vanilla JavaScript. The application consists of four independent widgets (Greeting, Focus Timer, To-Do List, Quick Links) wired together in `app.js` with a `StorageService` for localStorage persistence. No build tools or external dependencies are used.

## Tasks

- [x] 1. Set up project file structure and HTML skeleton
  - Create `index.html` with the full page skeleton: `<head>` with charset, viewport, title, and `<link>` to `css/style.css`; `<body>` with a `<main class="dashboard-grid">` containing four `<section>` widgets (`#greeting`, `#timer`, `#todo`, `#links`); `<script src="js/app.js">` at the bottom of `<body>`
  - Populate each section with the exact DOM contract elements specified in the design (all IDs, `data-action`/`data-id` attributes, `hidden` attributes, `aria-label` attributes, `maxlength`, `placeholder` values)
  - Create `css/style.css` as an empty file with the section comment scaffold (`:root`, `body`, `.dashboard-grid`, `.widget`, per-widget blocks, utilities, responsive breakpoint)
  - Create `js/app.js` as an empty file with the section comment scaffold matching the design's `js/app.js` structure
  - _Requirements: 6.1, 6.2_

- [ ] 2. Implement `StorageService` and data persistence layer
  - [x] 2.1 Implement `StorageService` object in `js/app.js`
    - Define `TASKS_KEY = 'dashboard_tasks'` and `LINKS_KEY = 'dashboard_links'`
    - Implement `read(key, defaultValue)`: wraps `localStorage.getItem` + `JSON.parse` in `try/catch`; returns `defaultValue` when key is absent or JSON is malformed
    - Implement `write(key, value)`: wraps `localStorage.setItem(key, JSON.stringify(value))` in `try/catch`; calls `onWriteError(key, error)` and returns `false` on failure; returns `true` on success
    - Implement `onWriteError(key, error)`: inserts a temporary `<p class="storage-error">` inline error message near the affected widget
    - _Requirements: 5.1, 5.2, 5.4, 5.6_

  - [ ] 2.2 Write property test for `StorageService.read` — malformed JSON and absent key
    - **Property 25: Storage read handles absent keys and malformed JSON gracefully**
    - **Validates: Requirements 5.4**

  - [ ] 2.3 Write property test for `StorageService` write failure preserving in-memory state
    - **Property 26: Storage write failure preserves in-memory state**
    - **Validates: Requirements 5.6**

- [ ] 3. Implement Greeting Widget
  - [ ] 3.1 Implement greeting helper functions in `js/app.js`
    - Implement `getGreeting(hour)`: returns `"Good Morning"` for hour ∈ [5, 11], `"Good Afternoon"` for hour ∈ [12, 17], `"Good Evening"` for hour ∈ [0, 4] ∪ [18, 23]
    - Implement `formatTime(date)`: returns `"HH:MM"` string with zero-padded hours and minutes from `date.getHours()` / `date.getMinutes()`
    - Implement `formatDate(date)`: returns `"Weekday, DD Month YYYY"` using English weekday/month names, zero-padded day, four-digit year
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 3.2 Write property test for `getGreeting` — all hours 0–23
    - **Property 1: Greeting correctness for all hours**
    - **Validates: Requirements 1.3, 1.4, 1.5**

  - [ ] 3.3 Write property test for `formatTime` — any `Date` object
    - **Property 2: Time formatting produces valid HH:MM strings**
    - **Validates: Requirements 1.1**

  - [ ] 3.4 Write property test for `formatDate` — any `Date` object
    - **Property 3: Date formatting produces correctly structured strings**
    - **Validates: Requirements 1.2**

  - [ ] 3.5 Implement `updateGreeting` and `initGreeting` in `js/app.js`
    - Implement `updateGreeting()`: reads `new Date()`, calls `getGreeting`, `formatTime`, `formatDate`, and writes results to `#greeting-text`, `#greeting-time`, `#greeting-date`
    - Implement `initGreeting()`: calls `updateGreeting()` once synchronously, then starts `setInterval(updateGreeting, 60_000)`
    - _Requirements: 1.1, 1.2, 1.6_

- [ ] 4. Implement Focus Timer
  - [ ] 4.1 Implement timer state variables and helper functions in `js/app.js`
    - Declare module-scoped `let remainingSeconds = 1500`, `let intervalId = null`, `let isRunning = false`
    - Implement `formatTimerDisplay(totalSeconds)`: returns `"MM:SS"` with zero-padded minutes (`Math.floor(s/60)`) and seconds (`s % 60`)
    - Implement `renderTimer()`: writes `formatTimerDisplay(remainingSeconds)` to `#timer-display`
    - _Requirements: 2.1, 2.3, 2.8_

  - [ ] 4.2 Write property test for `formatTimerDisplay` — integers 0–1500
    - **Property 4: Timer display formatting produces valid MM:SS strings**
    - **Validates: Requirements 2.3, 2.8**

  - [ ] 4.3 Implement `tick`, `startTimer`, `stopTimer`, `resetTimer`, and `initTimer` in `js/app.js`
    - Implement `tick()`: decrements `remainingSeconds` by 1, calls `renderTimer()`; when `remainingSeconds` reaches 0, calls `clearInterval(intervalId)`, sets `isRunning = false`, and removes `hidden` from `#timer-complete`
    - Implement `startTimer()`: no-op if `isRunning === true` or `remainingSeconds === 0`; otherwise sets `isRunning = true` and starts `setInterval(tick, 1000)` storing result in `intervalId`
    - Implement `stopTimer()`: no-op if `isRunning === false`; otherwise calls `clearInterval(intervalId)`, sets `isRunning = false`
    - Implement `resetTimer()`: calls `clearInterval(intervalId)`, sets `remainingSeconds = 1500`, `isRunning = false`, `intervalId = null`, calls `renderTimer()`, sets `document.getElementById('timer-complete').hidden = true`
    - Implement `initTimer()`: calls `renderTimer()`, attaches click listeners on `#timer-start` → `startTimer`, `#timer-stop` → `stopTimer`, `#timer-reset` → `resetTimer`
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.9_

  - [ ] 4.4 Write property test for `tick` — decrement by exactly one second
    - **Property 5: Each tick decrements remaining time by exactly one second**
    - **Validates: Requirements 2.2, 2.3**

  - [ ] 4.5 Write property test for `stopTimer` — preserves remaining time
    - **Property 6: Timer stop preserves remaining time**
    - **Validates: Requirements 2.4**

  - [ ] 4.6 Write property test for `resetTimer` — always restores to 25:00 and hides completion indicator
    - **Property 7: Timer reset always restores to 25:00 and hides completion indicator**
    - **Validates: Requirements 2.5, 2.9**

  - [ ] 4.7 Write property test for `startTimer` — no-op when already running or at zero
    - **Property 8: Timer start is a no-op when already running or at zero**
    - **Validates: Requirements 2.7**

  - [ ] 4.8 Write property test for `stopTimer` — no-op when not running
    - **Property 9: Timer stop is a no-op when not running**
    - **Validates: Requirements 2.9**

- [ ] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement To-Do List
  - [ ] 6.1 Implement To-Do data functions in `js/app.js`
    - Declare module-scoped `let tasks = []`
    - Implement `generateId()`: uses `crypto.randomUUID()` with fallback to `Date.now() + '-' + Math.random().toString(36).slice(2)`
    - Implement `loadTasks()`: calls `StorageService.read(StorageService.TASKS_KEY, [])` and assigns result to `tasks`
    - Implement `saveTasks()`: calls `StorageService.write(StorageService.TASKS_KEY, tasks)`
    - _Requirements: 3.4, 3.6, 3.14, 5.1, 5.3, 5.5_

  - [ ] 6.2 Write property test for `addTask` — valid description grows list, clears input, persists
    - **Property 10: Adding a valid task grows the list, clears the input, and persists**
    - **Validates: Requirements 3.2, 3.4**

  - [ ] 6.3 Write property test for `addTask` — whitespace-only descriptions are rejected
    - **Property 11: Whitespace-only descriptions are rejected**
    - **Validates: Requirements 3.3**

  - [ ] 6.4 Implement `renderTaskItem` and `renderTasks` in `js/app.js`
    - Implement `renderTaskItem(task)`: creates an `<li data-id>` with class `todo-item` (plus `completed` if `task.completed`); in normal mode renders toggle/edit/delete buttons with `data-action` and `data-id`; in edit mode renders an `<input class="todo-edit-input">` pre-filled with `task.description` plus Save/Cancel buttons; attaches `keydown` listener on edit input for `Enter` → `confirmEdit` and `Escape` → `cancelEdit`
    - Implement `renderTasks()`: clears `#todo-list` innerHTML, iterates `tasks` array calling `renderTaskItem` for each, appends to `#todo-list`
    - _Requirements: 3.7, 3.9, 3.15_

  - [ ] 6.5 Write property test for `toggleTask` — self-inverse operation
    - **Property 12: Task completion toggle is a self-inverse operation**
    - **Validates: Requirements 3.6**

  - [ ] 6.6 Write property test for `renderTaskItem` — completed class applied correctly
    - **Property 13: Completed tasks are rendered with the completed CSS class**
    - **Validates: Requirements 3.7**

  - [ ] 6.7 Write property test for `editTask` — pre-fills input with current description
    - **Property 14: Edit mode pre-fills the input with the current description**
    - **Validates: Requirements 3.9**

  - [ ] 6.8 Implement `addTask`, `toggleTask`, `editTask`, `confirmEdit`, `cancelEdit`, `deleteTask`, and `initTodo` in `js/app.js`
    - Implement `addTask(description)`: trims input; if empty retains focus on `#todo-input` and returns; otherwise creates a `Task` object with `generateId()`, `completed: false`, `createdAt: Date.now()`, pushes to `tasks`, calls `saveTasks()`, `renderTasks()`, clears `#todo-input.value`, and focuses `#todo-input`
    - Implement `toggleTask(id)`: finds task by id, flips `completed`, calls `saveTasks()`, `renderTasks()`
    - Implement `editTask(id)`: sets a module-scoped `editingId` variable, calls `renderTasks()` (which renders that item in edit mode)
    - Implement `confirmEdit(id, newDescription)`: trims `newDescription`; if empty retains focus on edit input; otherwise updates task description, clears `editingId`, calls `saveTasks()`, `renderTasks()`
    - Implement `cancelEdit(id)`: clears `editingId`, calls `renderTasks()`
    - Implement `deleteTask(id)`: filters `tasks` array, calls `saveTasks()`, `renderTasks()`
    - Implement `initTodo()`: calls `loadTasks()`, `renderTasks()`, attaches `submit` listener on `#todo-form` (calls `addTask`), attaches delegated `click` listener on `#todo-list` dispatching by `data-action`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 3.14, 3.15_

  - [ ] 6.9 Write property test for `confirmEdit` — valid description updates task
    - **Property 15: Confirming an edit with a valid description updates the task**
    - **Validates: Requirements 3.10**

  - [ ] 6.10 Write property test for `confirmEdit` — whitespace description is rejected
    - **Property 16: Confirming an edit with a whitespace description is rejected**
    - **Validates: Requirements 3.11**

  - [ ] 6.11 Write property test for `cancelEdit` — leaves task unchanged
    - **Property 17: Cancelling an edit leaves the task unchanged**
    - **Validates: Requirements 3.12**

  - [ ] 6.12 Write property test for `deleteTask` — removes task from list and storage
    - **Property 18: Deleting a task removes it from the list and storage**
    - **Validates: Requirements 3.14**

  - [ ] 6.13 Write property test for task persistence round-trip
    - **Property 19: Task persistence round-trip preserves content and order**
    - **Validates: Requirements 3.15, 5.1, 5.3, 5.5**

- [ ] 7. Implement Quick Links
  - [ ] 7.1 Implement Quick Links data functions in `js/app.js`
    - Declare module-scoped `let links = []`
    - Implement `loadLinks()`: calls `StorageService.read(StorageService.LINKS_KEY, [])` and assigns result to `links`
    - Implement `saveLinks()`: calls `StorageService.write(StorageService.LINKS_KEY, links)`
    - Implement `normalizeUrl(url)`: if `url` does not start with `"http://"` or `"https://"`, prepends `"https://"`; otherwise returns unchanged
    - _Requirements: 4.5, 4.9, 5.2, 5.3, 5.5_

  - [ ] 7.2 Write property test for `normalizeUrl` — always produces protocol-prefixed URL
    - **Property 20: URL normalization always produces a protocol-prefixed URL**
    - **Validates: Requirements 4.5**

  - [ ] 7.3 Implement `renderLinks`, `addLink`, `deleteLink`, and `initLinks` in `js/app.js`
    - Implement `renderLinks()`: clears `#links-list` innerHTML, iterates `links` array, creates a `<div class="link-item">` per link with a `.link-open` button (`data-url`, text = `link.name`) and a `.link-delete` button (`data-id`, `aria-label="Delete link"`)
    - Implement `addLink(name, url)`: trims both inputs; shows `#link-name-error` if name is empty; shows `#link-url-error` if URL is empty; returns false if either is empty; otherwise calls `normalizeUrl(url)`, creates a `Link` object with `generateId()`, pushes to `links`, calls `saveLinks()`, `renderLinks()`, clears both inputs, hides both error spans, returns true
    - Implement `deleteLink(id)`: filters `links` array, calls `saveLinks()`, `renderLinks()`
    - Implement `initLinks()`: calls `loadLinks()`, `renderLinks()`, attaches `submit` listener on `#links-form` (calls `addLink`), attaches delegated `click` listener on `#links-list` — `.link-open` calls `window.open(url, '_blank', 'noopener,noreferrer')`; `.link-delete` calls `deleteLink(id)`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 4.7, 4.8, 4.9_

  - [ ] 7.4 Write property test for `addLink` — valid link grows list and persists
    - **Property 22: Adding a valid link grows the list and persists it**
    - **Validates: Requirements 4.2, 5.2**

  - [ ] 7.5 Write property test for `addLink` — rejects empty name or URL
    - **Property 21: Link validation rejects empty name or URL**
    - **Validates: Requirements 4.3, 4.4**

  - [ ] 7.6 Write property test for `deleteLink` — removes link from list and storage
    - **Property 23: Deleting a link removes it from the list and storage**
    - **Validates: Requirements 4.8**

  - [ ] 7.7 Write property test for link persistence round-trip
    - **Property 24: Link persistence round-trip preserves content and order**
    - **Validates: Requirements 4.9, 5.2, 5.3, 5.5**

- [ ] 8. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement CSS styles
  - [ ] 9.1 Implement base styles and CSS custom properties in `css/style.css`
    - Define `:root` with CSS custom properties for colors (background, surface, text, accent, error), spacing scale, and font sizes
    - Add `*, *::before, *::after { box-sizing: border-box; }` reset
    - Style `body` (font family, background color, margin 0)
    - Style `.dashboard-grid` with `display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; padding: 1.5rem; max-width: 1200px; margin: 0 auto;`
    - Style `.widget` with `min-width: 0; overflow-wrap: break-word;` and card-like appearance (background, border-radius, padding, box-shadow)
    - _Requirements: 6.1, 6.4_

  - [ ] 9.2 Implement per-widget and utility styles in `css/style.css`
    - Style `#greeting` elements: `#greeting-text` (greeting message), `#greeting-time` (large clock display), `#greeting-date` (date line)
    - Style `#timer` elements: `#timer-display` (large monospace countdown), `#timer-complete` (completion indicator), timer buttons
    - Style `#todo` elements: `#todo-form` (input + button row), `.todo-item` (flex row with controls), `.todo-item.completed .todo-text` (`text-decoration: line-through; opacity: 0.5;`), `.todo-edit-input`
    - Style `#links` elements: `#links-form` (two-input + button layout), `.link-item` (flex row), `.link-open` (bookmark button), `.link-delete`
    - Add utility rules: `.error { color: var(--color-error); }` and `[hidden] { display: none !important; }`
    - Add responsive breakpoint: `@media (max-width: 600px) { .dashboard-grid { grid-template-columns: 1fr; } }`
    - _Requirements: 3.7, 6.4_

- [ ] 10. Wire bootstrap and final integration in `js/app.js`
  - Add the `DOMContentLoaded` bootstrap block at the bottom of `js/app.js`:
    ```js
    document.addEventListener('DOMContentLoaded', () => {
      initGreeting();
      initTimer();
      initTodo();
      initLinks();
    });
    ```
  - Verify `initTodo()` and `initLinks()` call their respective `load*()` functions before `render*()` so storage is read before any list content is rendered
  - Open `index.html` as a `file://` URL and confirm all four widgets render, no console errors appear, and localStorage keys are written on first interaction
  - _Requirements: 5.3, 6.2, 6.3_

- [ ] 11. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property-based tests use [fast-check](https://github.com/dubzzz/fast-check) with a minimum of 100 iterations per property; tag each test with `// Feature: todo-life-dashboard, Property N: <property text>`
- The Focus Timer state is intentionally not persisted to localStorage — it resets on page reload by design
- `generateId()` is shared between the To-Do and Quick Links modules; define it once before both widget sections
- All widget `init*()` functions must be called inside `DOMContentLoaded` to guarantee the DOM is ready
- Each task references specific requirements for traceability

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "3.1", "4.1"] },
    { "id": 2, "tasks": ["3.2", "3.3", "3.4", "3.5", "4.2", "4.3", "6.1"] },
    { "id": 3, "tasks": ["4.4", "4.5", "4.6", "4.7", "4.8", "6.2", "6.3", "6.4", "7.1"] },
    { "id": 4, "tasks": ["6.5", "6.6", "6.7", "6.8", "7.2", "7.3"] },
    { "id": 5, "tasks": ["6.9", "6.10", "6.11", "6.12", "6.13", "7.4", "7.5", "7.6", "7.7"] },
    { "id": 6, "tasks": ["9.1"] },
    { "id": 7, "tasks": ["9.2"] }
  ]
}
```
