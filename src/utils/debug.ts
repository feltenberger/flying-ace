import { createContext, useContext, useState, useCallback, createElement } from 'react'
import type { ReactNode } from 'react'

export const STORAGE_KEY = 'flying-ace-debug'

export function loadEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function saveEnabled(v: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(v))
  } catch { /* ignore */ }
}

interface DebugContextValue {
  debugEnabled: boolean
  setDebugEnabled: (v: boolean) => void
}

const DebugCtx = createContext<DebugContextValue | null>(null)

export function DebugProvider({ children }: { children: ReactNode }) {
  const [debugEnabled, setDebugEnabledRaw] = useState(loadEnabled)

  const setDebugEnabled = useCallback((v: boolean) => {
    setDebugEnabledRaw(v)
    saveEnabled(v)
  }, [])

  const value: DebugContextValue = { debugEnabled, setDebugEnabled }

  return createElement(DebugCtx.Provider, { value }, children)
}

export function useDebug(): DebugContextValue {
  const ctx = useContext(DebugCtx)
  if (!ctx) throw new Error('useDebug must be used within DebugProvider')
  return ctx
}

/** Standalone debug logger — reads localStorage directly, works outside React. */
export function debugLog(tag: string, ...args: unknown[]): void {
  try {
    if (localStorage.getItem(STORAGE_KEY) !== 'true') return
  } catch { return }
  console.log(`[Debug] ${tag}`, ...args)
}
