import { describe, it, expect, beforeEach, vi } from 'vitest'
import { STORAGE_KEY, loadEnabled, saveEnabled, debugLog } from './debug.ts'

// ── localStorage mock ────────────────────────────────────

const store = new Map<string, string>()

const localStorageMock = {
  getItem: vi.fn((key: string) => store.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => { store.set(key, value) }),
  removeItem: vi.fn((key: string) => { store.delete(key) }),
  clear: vi.fn(() => { store.clear() }),
  get length() { return store.size },
  key: vi.fn(() => null),
}

vi.stubGlobal('localStorage', localStorageMock)

beforeEach(() => {
  store.clear()
  vi.clearAllMocks()
})

// ── Tests ────────────────────────────────────────────────

describe('debug settings', () => {
  describe('STORAGE_KEY', () => {
    it('is flying-ace-debug', () => {
      expect(STORAGE_KEY).toBe('flying-ace-debug')
    })
  })

  describe('loadEnabled', () => {
    it('returns false when nothing is stored', () => {
      expect(loadEnabled()).toBe(false)
    })

    it('returns true when stored value is "true"', () => {
      store.set(STORAGE_KEY, 'true')
      expect(loadEnabled()).toBe(true)
    })

    it('returns false when stored value is "false"', () => {
      store.set(STORAGE_KEY, 'false')
      expect(loadEnabled()).toBe(false)
    })

    it('returns false for any non-"true" value', () => {
      store.set(STORAGE_KEY, 'yes')
      expect(loadEnabled()).toBe(false)

      store.set(STORAGE_KEY, '1')
      expect(loadEnabled()).toBe(false)
    })

    it('returns false when localStorage throws', () => {
      localStorageMock.getItem.mockImplementationOnce(() => { throw new Error('denied') })
      expect(loadEnabled()).toBe(false)
    })
  })

  describe('saveEnabled', () => {
    it('stores "true" when enabled', () => {
      saveEnabled(true)
      expect(store.get(STORAGE_KEY)).toBe('true')
    })

    it('stores "false" when disabled', () => {
      saveEnabled(false)
      expect(store.get(STORAGE_KEY)).toBe('false')
    })

    it('does not throw when localStorage throws', () => {
      localStorageMock.setItem.mockImplementationOnce(() => { throw new Error('denied') })
      expect(() => saveEnabled(true)).not.toThrow()
    })

    it('round-trips with loadEnabled', () => {
      saveEnabled(true)
      expect(loadEnabled()).toBe(true)

      saveEnabled(false)
      expect(loadEnabled()).toBe(false)
    })
  })

  describe('debugLog', () => {
    it('logs to console when debug is enabled', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      store.set(STORAGE_KEY, 'true')

      debugLog('[Test]', 'hello', 42)

      expect(spy).toHaveBeenCalledWith('[Debug] [Test]', 'hello', 42)
      spy.mockRestore()
    })

    it('does not log when debug is disabled', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})

      debugLog('[Test]', 'should not appear')

      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    })

    it('does not throw when localStorage throws', () => {
      localStorageMock.getItem.mockImplementationOnce(() => { throw new Error('denied') })
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})

      expect(() => debugLog('[Test]', 'err')).not.toThrow()
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    })
  })
})
