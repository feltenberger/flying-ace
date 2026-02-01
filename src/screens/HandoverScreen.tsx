import { useState, useEffect, useCallback } from 'react'
import { useGame } from '../state/gameContext.tsx'
import { planeAvatarPath } from '../types/game.ts'
import { useImages } from '../utils/images.ts'
import RulesOverlay from '../components/RulesOverlay.tsx'

export function HandoverScreen() {
  const { state, dispatch } = useGame()
  const images = useImages()
  const player = state.players[state.currentPlayerIndex]
  const [showRules, setShowRules] = useState(false)

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
    <>
      <div
        className="flex flex-col cursor-pointer select-none bg-scene rounded-lg"
        style={{ '--bg-scene-url': `url(${images.bgCockpit})` } as React.CSSProperties}
        onClick={proceed}
      >
        <div className="flex justify-center gap-2 p-3" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => dispatch({ type: 'GO_HOME' })}
            className="text-military-400 hover:text-military-200 text-sm px-3 py-1 rounded border border-military-600 hover:border-military-500 transition-colors"
          >
            Save &amp; Go Home
          </button>
          <button
            onClick={() => setShowRules(true)}
            className="text-military-400 hover:text-military-200 text-sm px-3 py-1 rounded border border-military-600 hover:border-military-500 transition-colors"
          >
            Rules
          </button>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <p className="text-military-500 text-sm uppercase tracking-widest mb-2">
            Next pilot, report for duty
          </p>
          <h2 className="font-stencil text-5xl text-brass-500 mb-1">
            {player.name}
          </h2>
          {player.isCpu && (
            <p className="text-raf-500 text-xs font-bold uppercase tracking-wider mb-1">
              Computer Player
            </p>
          )}
          <p className="text-military-400 text-sm mb-0">
            Turn {state.turnNumber}
          </p>
          <img
            src={planeAvatarPath(player.planeColor)}
            alt=""
            className="w-64 h-64 object-contain mb-4"
          />
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
      </div>
      {showRules && <RulesOverlay onClose={() => setShowRules(false)} />}
    </>
  )
}
