import { useState, useEffect } from 'react'
import { useGame } from '../state/gameContext.tsx'
import { createInitialState } from '../state/gameReducer.ts'
import { loadIndex, loadGame, deleteGame } from '../utils/persistence.ts'
import type { GameIndexEntry } from '../types/game.ts'
import { GameScreen } from '../types/game.ts'
import ConfirmDialog from '../components/ConfirmDialog.tsx'

export function HomeScreen() {
  const { dispatch } = useGame()
  const [entries, setEntries] = useState<GameIndexEntry[]>([])
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    setEntries(loadIndex())
  }, [])

  const inProgress = entries
    .filter((e) => e.status === 'in_progress')
    .sort((a, b) => b.lastPlayedAt - a.lastPlayedAt)
  const completed = entries
    .filter((e) => e.status === 'completed')
    .sort((a, b) => b.lastPlayedAt - a.lastPlayedAt)

  function handleNewGame() {
    dispatch({
      type: 'LOAD_STATE',
      state: { ...createInitialState(), screen: GameScreen.Setup },
    })
  }

  function handleResume(gameId: string) {
    const saved = loadGame(gameId)
    if (saved) {
      dispatch({ type: 'LOAD_STATE', state: saved })
    }
  }

  function handleDelete(gameId: string) {
    deleteGame(gameId)
    setEntries(loadIndex())
    setDeleteId(null)
  }

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="max-w-md mx-auto">
      <button
        onClick={handleNewGame}
        className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-lg text-lg transition-colors mb-6"
      >
        New Game
      </button>

      {inProgress.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            In Progress
          </h2>
          <div className="space-y-2">
            {inProgress.map((entry) => (
              <div
                key={entry.id}
                className="bg-slate-800 rounded-lg border border-slate-700 p-4 flex items-center justify-between"
              >
                <button
                  onClick={() => handleResume(entry.id)}
                  className="flex-1 text-left"
                >
                  <div className="font-semibold text-slate-200 text-sm">
                    {entry.playerNames.join(', ')}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Turn {entry.turnNumber} &middot; {formatDate(entry.lastPlayedAt)}
                  </div>
                </button>
                <button
                  onClick={() => setDeleteId(entry.id)}
                  className="text-slate-600 hover:text-red-400 px-2 py-1 text-sm transition-colors ml-2 shrink-0"
                  aria-label="Delete game"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Completed
          </h2>
          <div className="space-y-2">
            {completed.map((entry) => (
              <div
                key={entry.id}
                className="bg-slate-800/60 rounded-lg border border-slate-700/50 p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="font-semibold text-slate-400 text-sm">
                    {entry.playerNames.join(', ')}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Winner: <span className="text-amber-400">{entry.winnerName}</span>
                    {' '}&middot; {entry.turnNumber} turns &middot; {formatDate(entry.lastPlayedAt)}
                  </div>
                </div>
                <button
                  onClick={() => setDeleteId(entry.id)}
                  className="text-slate-600 hover:text-red-400 px-2 py-1 text-sm transition-colors ml-2 shrink-0"
                  aria-label="Delete game"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <p className="text-center text-slate-500 text-sm mt-4">
          No saved games yet. Start a new game to get started!
        </p>
      )}

      {deleteId && (
        <ConfirmDialog
          title="Delete Game"
          message="This game will be permanently deleted. This cannot be undone."
          onConfirm={() => handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
