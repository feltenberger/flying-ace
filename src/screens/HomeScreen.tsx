import { useState, useEffect, useCallback } from 'react'
import { useGame } from '../state/gameContext.tsx'
import { createInitialState } from '../state/gameReducer.ts'
import { loadIndex, loadGame, deleteGame } from '../utils/persistence.ts'
import type { GameIndexEntry } from '../types/game.ts'
import { GameScreen } from '../types/game.ts'
import ConfirmDialog from '../components/ConfirmDialog.tsx'
import RulesOverlay from '../components/RulesOverlay.tsx'
import { useImages } from '../utils/images.ts'

export function HomeScreen() {
  const { dispatch } = useGame()
  const images = useImages()
  const [entries, setEntries] = useState<GameIndexEntry[]>([])
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showRules, setShowRules] = useState(false)
  const [loading, setLoading] = useState(true)

  const refreshIndex = useCallback(async () => {
    setLoading(true)
    try {
      const index = await loadIndex()
      setEntries(index)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshIndex()
  }, [refreshIndex])

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

  async function handleResume(gameId: string) {
    const saved = await loadGame(gameId)
    if (saved) {
      dispatch({ type: 'LOAD_STATE', state: saved })
    }
  }

  async function handleDelete(gameId: string) {
    await deleteGame(gameId)
    await refreshIndex()
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
      <div className="rounded-lg overflow-hidden mb-6 border border-military-600 shadow-lg">
        <img
          src={images.splashHome}
          alt=""
          className="w-full h-auto block"
        />
      </div>

      <button
        onClick={handleNewGame}
        className="w-full py-4 bg-brass-500 hover:bg-brass-400 text-military-950 font-bold rounded-lg text-lg transition-colors mb-3"
      >
        New Game
      </button>
      <button
        onClick={() => setShowRules(true)}
        className="w-full py-3 bg-military-800 hover:bg-military-700 text-military-300 font-semibold rounded-lg transition-colors mb-6 border border-military-600"
      >
        Rules
      </button>

      {loading && (
        <div className="text-center py-6">
          <div className="text-military-400 text-sm">Loading saved games...</div>
        </div>
      )}

      {!loading && inProgress.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-military-400 uppercase tracking-wider mb-3">
            In Progress
          </h2>
          <div className="space-y-2">
            {inProgress.map((entry) => (
              <div
                key={entry.id}
                className="bg-military-800 rounded-lg border border-military-600 p-4 flex items-center justify-between"
              >
                <button
                  onClick={() => void handleResume(entry.id)}
                  className="flex-1 text-left"
                >
                  <div className="font-semibold text-military-100 text-sm">
                    {entry.playerNames.join(', ')}
                  </div>
                  <div className="text-xs text-military-500 mt-0.5">
                    Turn {entry.turnNumber} &middot; {formatDate(entry.lastPlayedAt)}
                  </div>
                </button>
                <button
                  onClick={() => setDeleteId(entry.id)}
                  className="text-military-500 hover:text-danger-400 px-2 py-1 text-sm transition-colors ml-2 shrink-0"
                  aria-label="Delete game"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && completed.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-military-400 uppercase tracking-wider mb-3">
            Completed
          </h2>
          <div className="space-y-2">
            {completed.map((entry) => (
              <div
                key={entry.id}
                className="bg-military-800/60 rounded-lg border border-military-600/50 p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="font-semibold text-military-400 text-sm">
                    {entry.playerNames.join(', ')}
                  </div>
                  <div className="text-xs text-military-500 mt-0.5">
                    Winner: <span className="text-brass-500">{entry.winnerName}</span>
                    {' '}&middot; {entry.turnNumber} turns &middot; {formatDate(entry.lastPlayedAt)}
                  </div>
                </div>
                <button
                  onClick={() => setDeleteId(entry.id)}
                  className="text-military-500 hover:text-danger-400 px-2 py-1 text-sm transition-colors ml-2 shrink-0"
                  aria-label="Delete game"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div className="text-center mt-4 relative">
          <img
            src={images.uiCompass}
            alt=""
            className="mx-auto w-32 opacity-15 mb-3"
          />
          <p className="text-military-500 text-sm">
            No saved games yet. Start a new game to get started!
          </p>
        </div>
      )}

      {showRules && <RulesOverlay onClose={() => setShowRules(false)} />}

      {deleteId && (
        <ConfirmDialog
          title="Delete Game"
          message="This game will be permanently deleted. This cannot be undone."
          onConfirm={() => void handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
