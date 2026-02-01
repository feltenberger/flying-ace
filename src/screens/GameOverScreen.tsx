import { useState } from 'react'
import { useGame } from '../state/gameContext.tsx'
import { planeAvatarPath } from '../types/game.ts'
import GameLog from '../components/GameLog.tsx'
import RulesOverlay from '../components/RulesOverlay.tsx'
import { useImages } from '../utils/images.ts'

export function GameOverScreen() {
  const { state, dispatch } = useGame()
  const images = useImages()
  const [showRules, setShowRules] = useState(false)
  const winner = state.players.find((p) => p.id === state.winnerId)

  function handlePlayAgain() {
    dispatch({ type: 'GO_HOME' })
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Top nav buttons */}
      <div className="flex justify-end gap-2 mb-2">
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

      {/* Victory banner */}
      <div className="bg-military-800 rounded-lg p-8 shadow-lg text-center mb-6">
        <img src={images.victory} alt="" className="spot-illustration mb-4" />
        <p className="font-stencil text-military-400 text-sm uppercase tracking-widest mb-3">
          Victory!
        </p>
        {winner && (
          <img
            src={planeAvatarPath(winner.planeColor)}
            alt=""
            className="w-40 h-40 object-contain mx-auto mb-2"
          />
        )}
        <h2 className="font-stencil text-5xl text-brass-500 mb-2">
          {winner?.name ?? 'Unknown'}
        </h2>
        <p className="text-military-300 text-lg">wins the game!</p>
      </div>

      <img src={images.uiWings} alt="" className="decoration-wings mb-4" />

      {/* Final standings */}
      <div className="bg-military-800 rounded-lg p-6 shadow-lg mb-6">
        <h3 className="text-sm font-semibold text-military-400 uppercase tracking-wider mb-4">
          Final Standings
        </h3>
        <div className="space-y-3">
          {state.players
            .slice()
            .sort((a, b) => {
              // Winner first, then alive players, then eliminated
              if (a.id === state.winnerId) return -1
              if (b.id === state.winnerId) return 1
              if (a.alive !== b.alive) return a.alive ? -1 : 1
              return b.planes - a.planes || b.fuel - a.fuel
            })
            .map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center justify-between rounded px-4 py-3 ${
                  player.id === state.winnerId
                    ? 'bg-brass-500/10 border border-brass-500/30'
                    : player.alive
                      ? 'bg-military-700/50 border border-military-700'
                      : 'bg-military-950/50 border border-military-800 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-military-500 font-mono text-sm w-5 text-right">
                    {index + 1}.
                  </span>
                  <img
                    src={planeAvatarPath(player.planeColor)}
                    alt=""
                    className={`w-8 h-8 object-contain shrink-0 ${!player.alive ? 'grayscale opacity-40' : ''}`}
                  />
                  <div className="flex items-center gap-2">
                    {!player.alive && player.id !== state.winnerId && (
                      <img src={images.eliminated} alt="Eliminated" className="w-5 h-5 object-contain opacity-60" />
                    )}
                    <div>
                      <span
                        className={`font-semibold ${
                          player.id === state.winnerId
                            ? 'text-brass-500'
                            : player.alive
                              ? 'text-military-100'
                              : 'text-military-500 line-through'
                        }`}
                      >
                        {player.name}
                      </span>
                      {player.id === state.winnerId && (
                        <span className="text-brass-600 text-xs ml-2">WINNER</span>
                      )}
                      {player.isCpu && (
                        <span className="text-[10px] font-mono ml-2 text-raf-500">CPU</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <span className={player.alive ? 'text-military-200' : 'text-military-600'}>
                    {player.planes} plane{player.planes !== 1 ? 's' : ''}
                  </span>
                  <span className="text-military-600 mx-1">/</span>
                  <span className={player.alive ? 'text-military-200' : 'text-military-600'}>
                    {player.fuel} fuel
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Game log summary */}
      <div className="bg-military-800 rounded-lg p-6 shadow-lg mb-6">
        <h3 className="text-sm font-semibold text-military-400 uppercase tracking-wider mb-3">
          Game Summary
        </h3>
        <div className="text-sm text-military-400 space-y-1">
          <p>Total turns: {state.turnNumber}</p>
          <p>Players: {state.players.length}</p>
          <p>
            Survivors: {state.players.filter((p) => p.alive).length} of{' '}
            {state.players.length}
          </p>
        </div>
      </div>

      <img src={images.uiWings} alt="" className="decoration-wings mb-4" />

      {/* Game Log */}
      <div className="mb-6">
        <GameLog />
      </div>

      {/* Play again button */}
      <button
        onClick={handlePlayAgain}
        className="w-full py-4 bg-brass-500 hover:bg-brass-400 text-military-950 font-bold rounded-lg text-lg transition-colors"
      >
        Play Again
      </button>

      {showRules && <RulesOverlay onClose={() => setShowRules(false)} />}
    </div>
  )
}
