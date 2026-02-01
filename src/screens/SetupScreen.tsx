import { useState } from 'react'
import { useGame } from '../state/gameContext.tsx'
import { generateGameId } from '../utils/persistence.ts'
import { useImages } from '../utils/images.ts'

export function SetupScreen() {
  const { dispatch } = useGame()
  const images = useImages()
  const [names, setNames] = useState<string[]>(['', ''])
  const [cpuFlags, setCpuFlags] = useState<boolean[]>([false, false])

  // Need at least 2 named players and at least 1 human
  const validPlayers = names
    .map((n, i) => ({ name: n.trim(), isCpu: cpuFlags[i] }))
    .filter((p) => p.name.length > 0)
  const hasEnoughPlayers = validPlayers.length >= 2
  const hasHuman = validPlayers.some((p) => !p.isCpu)
  const canStart = hasEnoughPlayers && hasHuman

  function addPlayer() {
    if (names.length < 6) {
      setNames([...names, ''])
      setCpuFlags([...cpuFlags, false])
    }
  }

  function removePlayer(index: number) {
    if (names.length > 2) {
      setNames(names.filter((_, i) => i !== index))
      setCpuFlags(cpuFlags.filter((_, i) => i !== index))
    }
  }

  function updateName(index: number, value: string) {
    const updated = [...names]
    updated[index] = value
    setNames(updated)
  }

  function toggleCpu(index: number) {
    const updated = [...cpuFlags]
    updated[index] = !updated[index]
    setCpuFlags(updated)
    // Auto-fill name when toggling CPU on with empty name
    if (updated[index] && names[index].trim() === '') {
      const cpuCount = updated.filter((f) => f).length
      const updatedNames = [...names]
      updatedNames[index] = `CPU ${cpuCount}`
      setNames(updatedNames)
    }
  }

  function handleStart() {
    // Build parallel arrays of valid (named) players
    const result: { name: string; isCpu: boolean }[] = []
    for (let i = 0; i < names.length; i++) {
      const trimmed = names[i].trim()
      if (trimmed.length > 0) {
        result.push({ name: trimmed, isCpu: cpuFlags[i] })
      }
    }
    if (result.length >= 2 && result.some((p) => !p.isCpu)) {
      dispatch({
        type: 'START_GAME',
        playerNames: result.map((p) => p.name),
        cpuFlags: result.map((p) => p.isCpu),
        gameId: generateGameId(),
      })
    }
  }

  return (
    <div
      className="max-w-md mx-auto bg-scene rounded-lg"
      style={{ '--bg-scene-url': `url(${images.bgBriefing})` } as React.CSSProperties}
    >
      <img src={images.uiWings} alt="" className="decoration-wings mb-4 pt-4" />

      <div className="bg-military-800/80 rounded-lg p-6 shadow-lg">
        <h2 className="text-2xl font-bold text-military-100 mb-2">New Game</h2>
        <p className="text-military-400 text-sm mb-6">
          Enter 2-6 player names to get started.
        </p>

        <div className="space-y-3 mb-6">
          {names.map((name, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-military-500 text-sm w-6 text-right shrink-0">
                {i + 1}.
              </span>
              <button
                onClick={() => toggleCpu(i)}
                className={`shrink-0 px-2 py-1 text-xs font-bold rounded border transition-colors ${
                  cpuFlags[i]
                    ? 'bg-raf-600/30 border-raf-500 text-raf-400'
                    : 'bg-military-700 border-military-600 text-military-500 hover:text-military-300 hover:border-military-500'
                }`}
                title={cpuFlags[i] ? 'Computer player' : 'Human player'}
              >
                {cpuFlags[i] ? 'CPU' : 'HUM'}
              </button>
              <input
                type="text"
                value={name}
                onChange={(e) => updateName(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canStart) handleStart()
                }}
                placeholder={cpuFlags[i] ? `CPU ${i + 1}` : `Player ${i + 1}`}
                maxLength={20}
                className="flex-1 bg-military-700 border border-military-600 rounded px-3 py-2 text-military-100 placeholder-military-500 focus:outline-none focus:border-raf-500 focus:ring-1 focus:ring-raf-500"
              />
              {names.length > 2 && (
                <button
                  onClick={() => removePlayer(i)}
                  className="text-military-500 hover:text-danger-400 px-2 py-1 text-lg leading-none transition-colors"
                  aria-label={`Remove player ${i + 1}`}
                >
                  x
                </button>
              )}
            </div>
          ))}
        </div>

        {names.length < 6 && (
          <button
            onClick={addPlayer}
            className="w-full mb-4 py-2 border border-dashed border-military-600 rounded text-military-400 hover:text-military-200 hover:border-military-500 transition-colors text-sm"
          >
            + Add Player
          </button>
        )}

        {hasEnoughPlayers && !hasHuman && (
          <p className="text-danger-500 text-sm mb-3 text-center">
            At least one player must be human.
          </p>
        )}

        <div className="space-y-3">
          <button
            onClick={handleStart}
            disabled={!canStart}
            className="w-full py-3 bg-brass-500 hover:bg-brass-400 disabled:bg-military-700 disabled:text-military-500 text-military-950 font-bold rounded transition-colors"
          >
            Start Game
          </button>

          <button
            onClick={() => dispatch({ type: 'GO_HOME' })}
            className="w-full py-3 bg-military-700 hover:bg-military-600 text-military-300 font-semibold rounded border border-military-600 transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  )
}
