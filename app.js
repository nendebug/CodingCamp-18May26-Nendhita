// ── StorageService ──────────────────────────────────────

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
  read(key, defaultValue) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw);
    } catch (e) {
      return defaultValue;
    }
  },

  /**
   * JSON-serializes value and writes it to localStorage.
   * Returns true on success, false on failure (quota exceeded, etc.).
   * On failure, calls StorageService.onWriteError(key, error).
   * @param {string} key
   * @param {*} value
   * @returns {boolean}
   */
  write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      StorageService.onWriteError(key, e);
      return false;
    }
  },

  /**
   * Called when a write fails. Displays a temporary inline error message
   * near the widget associated with the given storage key.
   * @param {string} key
   * @param {Error} error
   */
  onWriteError(key, error) {
    // Map storage key to the widget section element
    let widgetId;
    if (key === StorageService.TASKS_KEY) {
      widgetId = 'todo';
    } else if (key === StorageService.LINKS_KEY) {
      widgetId = 'links';
    }

    const widget = widgetId ? document.getElementById(widgetId) : document.body;
    const target = widget || document.body;

    // Remove any existing storage-error message in this widget
    const existing = target.querySelector('p.storage-error');
    if (existing) existing.remove();

    const msg = document.createElement('p');
    msg.className = 'storage-error';
    msg.textContent = 'Could not save data: ' + (error && error.message ? error.message : 'storage unavailable');

    target.insertAdjacentElement('afterbegin', msg);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (msg.parentNode) msg.remove();
    }, 5000);
  },
};

// ── Greeting Widget ─────────────────────────────────────

/**
 * Returns the greeting string for a given hour (0–23).
 * @param {number} hour - Integer in [0, 23]
 * @returns {"Good Morning" | "Good Afternoon" | "Good Evening"}
 */
function getGreeting(hour) {
  if (hour >= 5 && hour <= 11) return 'Good Morning';
  if (hour >= 12 && hour <= 17) return 'Good Afternoon';
  return 'Good Evening';
}

/**
 * Formats a Date object as "HH:MM" with zero-padded hours and minutes.
 * @param {Date} date
 * @returns {string}
 */
function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Formats a Date object as "Weekday, DD Month YYYY".
 * Example: "Monday, 26 May 2025"
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];

  const weekday = weekdays[date.getDay()];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${weekday}, ${day} ${month} ${year}`;
}

// ── Focus Timer ─────────────────────────────────────────

let remainingSeconds = 1500;
let intervalId = null;
let isRunning = false;

/**
 * Formats a total number of seconds as a "MM:SS" string with zero-padding.
 * @param {number} totalSeconds - Integer seconds in [0, 1500]
 * @returns {string} e.g. "25:00", "04:59", "00:00"
 */
function formatTimerDisplay(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * Renders the current remainingSeconds value into #timer-display.
 */
function renderTimer() {
  document.getElementById('timer-display').textContent = formatTimerDisplay(remainingSeconds);
}

// ── To-Do List ──────────────────────────────────────────

// ── Quick Links ─────────────────────────────────────────

// ── Bootstrap ───────────────────────────────────────────
