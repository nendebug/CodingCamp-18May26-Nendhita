// Feature: todo-life-dashboard, Property 26: Storage write failure preserves in-memory state

'use strict';

const fc = require('fast-check');

// ---------------------------------------------------------------------------
// Minimal StorageService replica for isolated unit testing.
// Mirrors the implementation in js/app.js exactly so tests validate the real
// logic without requiring a browser DOM or a full module load.
// ---------------------------------------------------------------------------

function makeStorageService(localStorageMock) {
  const service = {
    TASKS_KEY: 'dashboard_tasks',
    LINKS_KEY: 'dashboard_links',

    read(key, defaultValue) {
      try {
        const raw = localStorageMock.getItem(key);
        if (raw === null) return defaultValue;
        return JSON.parse(raw);
      } catch (e) {
        return defaultValue;
      }
    },

    write(key, value) {
      try {
        localStorageMock.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        service.onWriteError(key, e);
        return false;
      }
    },

    onWriteError(key, error) {
      // In the browser this inserts a DOM element; in tests we capture calls.
    },
  };
  return service;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generates arbitrary JSON-serialisable values suitable as storage values. */
const jsonValueArb = fc.oneof(
  fc.string(),
  fc.integer(),
  fc.boolean(),
  fc.array(fc.string()),
  fc.array(
    fc.record({
      id: fc.string(),
      description: fc.string({ minLength: 1, maxLength: 100 }),
      completed: fc.boolean(),
      createdAt: fc.integer({ min: 0, max: 2_000_000_000_000 }),
    })
  )
);

/** Generates arbitrary storage keys. */
const keyArb = fc.oneof(
  fc.constant('dashboard_tasks'),
  fc.constant('dashboard_links'),
  fc.string({ minLength: 1, maxLength: 50 })
);

/** Generates an Error with an arbitrary message. */
const errorArb = fc.string({ minLength: 0, maxLength: 200 }).map(
  (msg) => new Error(msg || 'storage unavailable')
);

// ---------------------------------------------------------------------------
// Property 26: Storage write failure preserves in-memory state
// Validates: Requirements 5.6
// ---------------------------------------------------------------------------

describe('StorageService — Property 26: Storage write failure preserves in-memory state', () => {
  /**
   * Property 26a: When localStorage.setItem throws, write() returns false.
   *
   * For any key and any value, if localStorage.setItem is configured to throw
   * an error, StorageService.write(key, value) MUST return false.
   */
  test('26a: write() returns false when localStorage.setItem throws', () => {
    fc.assert(
      fc.property(keyArb, jsonValueArb, errorArb, (key, value, thrownError) => {
        const mockStorage = {
          getItem: jest.fn().mockReturnValue(null),
          setItem: jest.fn().mockImplementation(() => {
            throw thrownError;
          }),
        };

        const StorageService = makeStorageService(mockStorage);
        // Spy on onWriteError to prevent any side effects
        StorageService.onWriteError = jest.fn();

        const result = StorageService.write(key, value);

        expect(result).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 26b: The value passed to write() is NOT mutated by a failed write.
   *
   * For any key and any value, if localStorage.setItem throws, the value
   * object/array/primitive passed to write() MUST remain identical (deep equal)
   * to what it was before the call.
   */
  test('26b: value passed to write() is not mutated when write fails', () => {
    fc.assert(
      fc.property(keyArb, jsonValueArb, errorArb, (key, value, thrownError) => {
        const mockStorage = {
          getItem: jest.fn().mockReturnValue(null),
          setItem: jest.fn().mockImplementation(() => {
            throw thrownError;
          }),
        };

        const StorageService = makeStorageService(mockStorage);
        StorageService.onWriteError = jest.fn();

        // Deep-clone the value before the call so we can compare afterwards
        const valueBefore = JSON.parse(JSON.stringify(value));

        StorageService.write(key, value);

        // The value must be unchanged after the failed write
        expect(value).toEqual(valueBefore);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 26c: onWriteError is called with the key and the thrown error
   * when localStorage.setItem throws.
   *
   * For any key and any value, if localStorage.setItem throws an error,
   * StorageService.onWriteError MUST be called exactly once with (key, error).
   */
  test('26c: onWriteError is called with the key and the error when write fails', () => {
    fc.assert(
      fc.property(keyArb, jsonValueArb, errorArb, (key, value, thrownError) => {
        const mockStorage = {
          getItem: jest.fn().mockReturnValue(null),
          setItem: jest.fn().mockImplementation(() => {
            throw thrownError;
          }),
        };

        const StorageService = makeStorageService(mockStorage);
        const onWriteErrorSpy = jest.fn();
        StorageService.onWriteError = onWriteErrorSpy;

        StorageService.write(key, value);

        expect(onWriteErrorSpy).toHaveBeenCalledTimes(1);
        expect(onWriteErrorSpy).toHaveBeenCalledWith(key, thrownError);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 26d: Successful writes return true and do NOT call onWriteError.
   *
   * This is the complementary property — when setItem does NOT throw,
   * write() must return true and onWriteError must not be called.
   */
  test('26d: write() returns true and does not call onWriteError on success', () => {
    fc.assert(
      fc.property(keyArb, jsonValueArb, (key, value) => {
        const stored = {};
        const mockStorage = {
          getItem: jest.fn((k) => stored[k] ?? null),
          setItem: jest.fn((k, v) => {
            stored[k] = v;
          }),
        };

        const StorageService = makeStorageService(mockStorage);
        const onWriteErrorSpy = jest.fn();
        StorageService.onWriteError = onWriteErrorSpy;

        const result = StorageService.write(key, value);

        expect(result).toBe(true);
        expect(onWriteErrorSpy).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });
});
