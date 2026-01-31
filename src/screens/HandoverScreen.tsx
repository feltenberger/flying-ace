import { useEffect, useCallback } from 'react'
import { useGame } from '../state/gameContext.tsx'

export function HandoverScreen() {
  const { state, dispatch } = useGame()
  const player = state.players[state.currentPlayerIndex]

  const proceed = useCallback(() => {
    dispatch({ type: 'HANDOVER_COMPLETE' })
  }, [dispatch])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        proceed()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [proceed])

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[60vh] cursor-pointer select-none"
      onClick={proceed}
    >
      <p className="text-slate-500 text-sm uppercase tracking-widest mb-4">
        Pass the device to
      </p>
      <h2 className="text-5xl font-extrabold text-amber-400 mb-2">
        {player.name}
      </h2>
      <p className="text-slate-400 text-sm mt-1 mb-8">
        Turn {state.turnNumber}
      </p>
      <button
        onClick={(e) => {
          e.stopPropagation()
          proceed()
        }}
        className="px-8 py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg transition-colors text-lg"
      >
        Ready
      </button>
      <p className="text-slate-600 text-xs mt-6">
        Press Space, Enter, or tap anywhere
      </p>
    </div>
  )
}
