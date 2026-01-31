import { useGame } from '../state/gameContext.tsx'
import { clearSave } from '../utils/persistence.ts'

export function GameOverScreen() {
  const { state, dispatch } = useGame()
  const winner = state.players.find((p) => p.id === state.winnerId)

  function handlePlayAgain() {
    clearSave()
    dispatch({ type: 'RESET_GAME' })
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Victory banner */}
      <div className="bg-slate-800 rounded-lg p-8 shadow-lg text-center mb-6">
        <p className="text-slate-500 text-sm uppercase tracking-widest mb-3">
          Victory!
        </p>
        <h2 className="text-5xl font-extrabold text-amber-400 mb-2">
          {winner?.name ?? 'Unknown'}
        </h2>
        <p className="text-slate-400 text-lg">wins the game!</p>
      </div>

      {/* Final standings */}
      <div className="bg-slate-800 rounded-lg p-6 shadow-lg mb-6">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
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
                    ? 'bg-amber-500/10 border border-amber-500/30'
                    : player.alive
                      ? 'bg-slate-700/50 border border-slate-700'
                      : 'bg-slate-900/50 border border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-mono text-sm w-5 text-right">
                    {index + 1}.
                  </span>
                  <div>
                    <span
                      className={`font-semibold ${
                        player.id === state.winnerId
                          ? 'text-amber-400'
                          : player.alive
                            ? 'text-slate-200'
                            : 'text-slate-500 line-through'
                      }`}
                    >
                      {player.name}
                    </span>
                    {player.id === state.winnerId && (
                      <span className="text-amber-500 text-xs ml-2">WINNER</span>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <span className={player.alive ? 'text-slate-300' : 'text-slate-600'}>
                    {player.planes} plane{player.planes !== 1 ? 's' : ''}
                  </span>
                  <span className="text-slate-600 mx-1">/</span>
                  <span className={player.alive ? 'text-slate-300' : 'text-slate-600'}>
                    {player.fuel} fuel
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Game log summary */}
      <div className="bg-slate-800 rounded-lg p-6 shadow-lg mb-6">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Game Summary
        </h3>
        <div className="text-sm text-slate-400 space-y-1">
          <p>Total turns: {state.turnNumber}</p>
          <p>Players: {state.players.length}</p>
          <p>
            Survivors: {state.players.filter((p) => p.alive).length} of{' '}
            {state.players.length}
          </p>
        </div>
      </div>

      {/* Play again button */}
      <button
        onClick={handlePlayAgain}
        className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-lg text-lg transition-colors"
      >
        Play Again
      </button>
    </div>
  )
}
