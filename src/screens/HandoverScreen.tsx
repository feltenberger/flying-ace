import { useState, useEffect, useCallback } from 'react'
import { useGame } from '../state/gameContext.tsx'
import { useImages } from '../utils/images.ts'
import { deleteGame } from '../utils/persistence.ts'
import RulesOverlay from '../components/RulesOverlay.tsx'
import ConfirmDialog from '../components/ConfirmDialog.tsx'

export function HandoverScreen() {
  const { state, dispatch } = useGame()
  const images = useImages()
  const player = state.players[state.currentPlayerIndex]
  const pilotImage = state.turnNumber % 2 === 0 ? images.pilotReady : images.pilotSalute
  const [showRules, setShowRules] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

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
      className="flex flex-col cursor-pointer select-none bg-scene rounded-lg"
      style={{ '--bg-scene-url': `url(${images.bgCockpit})` } as React.CSSProperties}
      onClick={proceed}
    >
      <div className="flex justify-center gap-2 p-3 relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => dispatch({ type: 'GO_HOME' })}
          className="text-military-400 hover:text-military-200 text-sm px-3 py-1 rounded border border-military-600 hover:border-military-500 transition-colors"
        >
          Home
        </button>
        <button
          onClick={() => setShowRules(true)}
          className="text-military-400 hover:text-military-200 text-sm px-3 py-1 rounded border border-military-600 hover:border-military-500 transition-colors"
        >
          Rules
        </button>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="text-military-400 hover:text-military-200 text-sm px-3 py-1 rounded border border-military-600 hover:border-military-500 transition-colors"
        >
          Menu
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute top-full mt-1 z-50 bg-military-800 border border-military-600 rounded-lg shadow-xl min-w-[10rem]">
              <button
                onClick={() => { setMenuOpen(false); dispatch({ type: 'GO_HOME' }) }}
                className="w-full text-left px-4 py-2.5 text-sm text-military-200 hover:bg-military-700 rounded-t-lg transition-colors"
              >
                Save &amp; Exit
              </button>
              <button
                onClick={() => { setMenuOpen(false); setShowResetConfirm(true) }}
                className="w-full text-left px-4 py-2.5 text-sm text-danger-500 hover:bg-military-700 rounded-b-lg transition-colors"
              >
                Reset Game
              </button>
            </div>
          </>
        )}
      </div>
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <p className="text-military-500 text-sm uppercase tracking-widest mb-4">
        Next pilot, report for duty
      </p>
      <img src={pilotImage} alt="" className="spot-illustration mb-4" />
      <h2 className="font-stencil text-5xl text-brass-500 mb-2">
        {player.name}
      </h2>
      {player.isCpu && (
        <p className="text-raf-500 text-xs font-bold uppercase tracking-wider mt-1 mb-1">
          Computer Player
        </p>
      )}
      <p className="text-military-400 text-sm mt-1 mb-8">
        Turn {state.turnNumber}
      </p>
      <button
        onClick={(e) => {
          e.stopPropagation()
          proceed()
        }}
        className="px-8 py-3 bg-raf-600 hover:bg-raf-500 text-white font-bold rounded-lg transition-colors text-lg"
      >
        Ready
      </button>
      <p className="text-military-600 text-xs mt-6">
        Press Space, Enter, or tap anywhere
      </p>
      </div>
      {showRules && <RulesOverlay onClose={() => setShowRules(false)} />}
      {showResetConfirm && (
        <ConfirmDialog
          title="Reset Game"
          message="This will permanently delete the current game and return to the lobby. This cannot be undone."
          onConfirm={() => {
            if (state.gameId) deleteGame(state.gameId)
            setShowResetConfirm(false)
            dispatch({ type: 'GO_HOME' })
          }}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}
    </div>
  )
}
