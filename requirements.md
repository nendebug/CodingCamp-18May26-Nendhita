# Requirements Document

## Introduction

The Todo-Life Dashboard is a client-side web application that serves as a personal productivity hub. It combines a live greeting with the current time and date, a Pomodoro-style focus timer, a persistent to-do list, and a quick-links panel — all in a single, minimal HTML/CSS/Vanilla JS page. All data is stored in the browser's Local Storage; no backend or build tooling is required.

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **Greeting_Widget**: The UI section that displays the current time, date, and a time-of-day greeting.
- **Focus_Timer**: The UI section that implements a 25-minute countdown timer with start, stop, and reset controls.
- **Todo_List**: The UI section that manages a collection of Task items.
- **Task**: A single to-do item with a text description and a completion state.
- **Quick_Links**: The UI section that displays and manages a collection of Link items.
- **Link**: A named URL entry that opens in a new browser tab.
- **Storage**: The browser's `localStorage` API used for all client-side persistence.
- **User**: The person interacting with the Dashboard in a modern browser.

---

## Requirements

### Requirement 1: Live Greeting

**User Story:** As a User, I want to see the current time, date, and a contextual greeting, so that I have an at-a-glance sense of the moment when I open the Dashboard.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display the current time in HH:MM format, updated every minute.
2. THE Greeting_Widget SHALL display the current date in the format "Weekday, DD Month YYYY" (e.g., "Monday, 26 May 2025").
3. WHEN the local hour is between 05:00 and 11:59, THE Greeting_Widget SHALL display the greeting "Good Morning".
4. WHEN the local hour is between 12:00 and 17:59, THE Greeting_Widget SHALL display the greeting "Good Afternoon".
5. WHEN the local hour is between 18:00 and 23:59, or between 00:00 and 04:59 (inclusive of midnight), THE Greeting_Widget SHALL display the greeting "Good Evening".
6. WHEN the displayed time updates, THE Greeting_Widget SHALL re-evaluate the current hour and update the greeting text if the time-of-day boundary has been crossed.

---

### Requirement 2: Focus Timer

**User Story:** As a User, I want a 25-minute countdown timer with start, stop, and reset controls, so that I can manage focused work sessions without leaving the Dashboard.

#### Acceptance Criteria

1. THE Focus_Timer SHALL initialise with a countdown value of 25 minutes and 00 seconds (25:00).
2. WHEN the User activates the start control, THE Focus_Timer SHALL begin counting down one second per real-world second from the current displayed remaining time.
3. WHILE the Focus_Timer is counting down, THE Focus_Timer SHALL update the displayed time every second.
4. WHEN the User activates the stop control, THE Focus_Timer SHALL pause the countdown and retain the current remaining time.
5. WHEN the User activates the reset control, THE Focus_Timer SHALL stop any active countdown and restore the display to 25:00.
6. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL stop automatically, display 00:00, and show a visible completion indicator (e.g., a notification message or visual cue).
7. IF the User activates the start control while the countdown is already running, or when the display shows 00:00, THEN THE Focus_Timer SHALL ignore the action.
8. THE Focus_Timer SHALL display the remaining time in MM:SS format at all times.
9. IF the User activates the stop or reset control while the timer is not running, THEN THE Focus_Timer SHALL ignore the action without producing an error.

---

### Requirement 3: To-Do List

**User Story:** As a User, I want to add, edit, complete, and delete tasks that persist across browser sessions, so that I can track my daily responsibilities without losing data on page reload.

#### Acceptance Criteria

1. THE Todo_List SHALL provide an input field and a submit control for adding a new Task.
2. WHEN the User submits a non-empty task description of up to 500 characters, THE Todo_List SHALL add the Task to the list and clear the input field.
3. IF the User submits an empty or whitespace-only task description, THEN THE Todo_List SHALL not add a Task and SHALL retain focus on the input field.
4. WHEN a Task is added, THE Todo_List SHALL persist all current Tasks to Storage immediately.
5. THE Todo_List SHALL provide a completion toggle control for each Task.
6. WHEN the User activates the completion toggle for a Task, THE Todo_List SHALL update the Task's completion state and persist the updated list to Storage.
7. WHEN a Task is marked as complete, THE Todo_List SHALL apply strikethrough text and reduced opacity to visually differentiate it from incomplete Tasks.
8. THE Todo_List SHALL provide an edit control for each Task.
9. WHEN the User activates the edit control for a Task, THE Todo_List SHALL replace the Task's display text with an editable input field pre-filled with the current description, and SHALL expose both a confirm control and a cancel control.
10. WHEN the User confirms an edit (via the confirm control or pressing Enter) with a non-empty description, THE Todo_List SHALL update the Task text, exit edit mode, and persist the updated list to Storage.
11. IF the User confirms an edit with an empty or whitespace-only description, THEN THE Todo_List SHALL not save the change, SHALL retain the original Task text, and SHALL retain focus on the editable input field.
12. WHEN the User cancels an edit (via the cancel control or pressing Escape), THE Todo_List SHALL exit edit mode without saving any changes and SHALL restore the original Task text.
13. THE Todo_List SHALL provide a delete control for each Task.
14. WHEN the User activates the delete control for a Task, THE Todo_List SHALL remove the Task from the list and persist the updated list to Storage.
15. WHEN the Dashboard loads, THE Todo_List SHALL read all Tasks from Storage and render them in the order they were saved.

---

### Requirement 4: Quick Links

**User Story:** As a User, I want to save and access my favourite website links from the Dashboard, so that I can navigate to frequently visited sites with a single click.

#### Acceptance Criteria

1. THE Quick_Links SHALL provide an input field for a link name, an input field for a URL, and a submit control for adding a new Link.
2. WHEN the User submits a Link with both a non-empty name and a non-empty URL, THE Quick_Links SHALL add the Link as a clickable button and persist all Links to Storage.
3. IF the User submits a Link with an empty name, THEN THE Quick_Links SHALL not add the Link and SHALL display an inline validation message stating the name field is required.
4. IF the User submits a Link with an empty URL, THEN THE Quick_Links SHALL not add the Link and SHALL display an inline validation message stating the URL field is required.
5. IF the User submits a URL that does not begin with "http://" or "https://", THEN THE Quick_Links SHALL prepend "https://" to the URL before saving.
6. WHEN the User activates a Link button, THE Quick_Links SHALL open the associated URL in a new browser tab.
7. THE Quick_Links SHALL provide a delete control for each Link.
8. WHEN the User activates the delete control for a Link, THE Quick_Links SHALL remove the Link and persist the updated list to Storage.
9. WHEN the Dashboard loads, THE Quick_Links SHALL read all Links from Storage and render them in the order they were saved.

---

### Requirement 5: Data Persistence

**User Story:** As a User, I want all my tasks and links to be automatically saved and restored, so that my data is not lost when I close or refresh the browser.

#### Acceptance Criteria

1. THE Storage SHALL store Task data under the exact key `"dashboard_tasks"` as a JSON-serialised array.
2. THE Storage SHALL store Link data under the exact key `"dashboard_links"` as a JSON-serialised array.
3. WHEN the Dashboard initialises, THE Dashboard SHALL read Tasks and Links from Storage before rendering any list content.
4. IF Storage contains no data or malformed/corrupt JSON for a given key, THEN THE Dashboard SHALL initialise the corresponding list as empty without throwing an error.
5. WHEN the User adds, edits, or deletes a Task or Link, THE Dashboard SHALL serialise the complete current list to JSON and overwrite the existing stored value for the corresponding key.
6. IF a Storage write operation fails (e.g., Storage is unavailable or quota is exceeded), THEN THE Dashboard SHALL display an inline error message to the User and SHALL preserve the current in-memory state without crashing.

---

### Requirement 6: Technology and Compatibility

**User Story:** As a User, I want the Dashboard to work in any modern browser without installation or a server, so that I can open it directly as an HTML file or browser extension.

#### Acceptance Criteria

1. THE Dashboard SHALL be implemented using only HTML, CSS, and Vanilla JavaScript with no external frameworks or libraries.
2. THE Dashboard SHALL consist of exactly one HTML file, one CSS file located in a `css/` directory, and one JavaScript file located in a `js/` directory.
3. WHEN the Dashboard is opened as a local `file://` URL in Chrome, Firefox, Edge, or Safari, THE Dashboard SHALL render all widgets, respond to all user interactions, and produce no console errors. This requirement is scoped exclusively to `file://` URL access and does not apply to HTTP or HTTPS server deployments.
4. WHEN the Dashboard is rendered at any viewport width between 320 px and 1920 px, THE Dashboard SHALL display without a horizontal scrollbar and without any elements overlapping or being clipped.
5. WHEN the Dashboard page loads on a machine with at least 4 GB RAM and a modern CPU, THE Dashboard SHALL display all widgets within 1 second and SHALL respond to all click and input events within 200 ms.
