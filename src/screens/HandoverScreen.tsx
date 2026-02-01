import { useEffect, useCallback } from 'react'
import { useGame } from '../state/gameContext.tsx'
import { useImages } from '../utils/images.ts'

export function HandoverScreen() {
  const { state, dispatch } = useGame()
  const images = useImages()
  const player = state.players[state.currentPlayerIndex]
  const pilotImage = state.turnNumber % 2 === 0 ? images.pilotReady : images.pilotSalute

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
      className="flex flex-col items-center justify-center min-h-[60vh] cursor-pointer select-none bg-scene rounded-lg"
      style={{ '--bg-scene-url': `url(${images.bgCockpit})` } as React.CSSProperties}
      onClick={proceed}
    >
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
  )
}
