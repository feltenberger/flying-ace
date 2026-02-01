import { useState } from 'react'
import { useGame } from '../state/gameContext.tsx'
import { generateGameId } from '../utils/persistence.ts'
import { useImages } from '../utils/images.ts'
import type { PlaneColor } from '../types/game.ts'
import { ALL_PLANE_COLORS, planeAvatarPath } from '../types/game.ts'

export function SetupScreen() {
  const { dispatch } = useGame()
  const images = useImages()
  const [names, setNames] = useState<string[]>(['', ''])
  const [cpuFlags, setCpuFlags] = useState<boolean[]>([false, false])
  const [selectedColors, setSelectedColors] = useState<(PlaneColor | null)[]>([null, null])

  // Need at least 2 named players and at least 1 human
  const validPlayers = names
    .map((n, i) => ({ name: n.trim(), isCpu: cpuFlags[i], color: selectedColors[i] }))
    .filter((p) => p.name.length > 0)
  const hasEnoughPlayers = validPlayers.length >= 2
  const hasHuman = validPlayers.some((p) => !p.isCpu)
  // All human players with names must have a color selected
  const allHumansHaveColor = validPlayers.every((p) => p.isCpu || p.color != null)
  const canStart = hasEnoughPlayers && hasHuman && allHumansHaveColor

  // Colors currently taken by any named player (human or CPU)
  const takenColors = new Set(
    names.map((n, i) => (n.trim().length > 0 ? selectedColors[i] : null)).filter((c): c is PlaneColor => c != null)
  )

  function addPlayer() {
    if (names.length < 6) {
      setNames([...names, ''])
      setCpuFlags([...cpuFlags, false])
      setSelectedColors([...selectedColors, null])
    }
  }

  function removePlayer(index: number) {
    if (names.length > 2) {
      setNames(names.filter((_, i) => i !== index))
      setCpuFlags(cpuFlags.filter((_, i) => i !== index))
      setSelectedColors(selectedColors.filter((_, i) => i !== index))
    }
  }

  function updateName(index: number, value: string) {
    const updated = [...names]
    updated[index] = value
    setNames(updated)
  }

  function selectColor(index: number, color: PlaneColor) {
    const updated = [...selectedColors]
    updated[index] = updated[index] === color ? null : color
    setSelectedColors(updated)
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
    // Clear color selection when toggling to CPU (will auto-assign at start)
    if (updated[index]) {
      const updatedColors = [...selectedColors]
      updatedColors[index] = null
      setSelectedColors(updatedColors)
    }
  }

  function handleStart() {
    // Build parallel arrays of valid (named) players
    const result: { name: string; isCpu: boolean; color: PlaneColor | null }[] = []
    for (let i = 0; i < names.length; i++) {
      const trimmed = names[i].trim()
      if (trimmed.length > 0) {
        result.push({ name: trimmed, isCpu: cpuFlags[i], color: selectedColors[i] })
      }
    }
    if (result.length >= 2 && result.some((p) => !p.isCpu)) {
      // Auto-assign colors for CPU players (and any without a color)
      const usedColors = new Set(result.filter((p) => p.color != null).map((p) => p.color!))
      const available = ALL_PLANE_COLORS.filter((c) => !usedColors.has(c))
      let availIdx = 0
      const finalColors = result.map((p) => {
        if (p.color != null) return p.color
        const color = available[availIdx++]
        usedColors.add(color)
        return color
      })

      dispatch({
        type: 'START_GAME',
        playerNames: result.map((p) => p.name),
        cpuFlags: result.map((p) => p.isCpu),
        planeColors: finalColors,
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
            <div key={i} className="space-y-1.5">
              <div className="flex items-center gap-2">
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
              {/* Color picker — only shown for human players */}
              {!cpuFlags[i] && (
                <div className="flex items-center gap-1.5 ml-8">
                  {ALL_PLANE_COLORS.map((color) => {
                    const isSelected = selectedColors[i] === color
                    const isTaken = takenColors.has(color) && !isSelected
                    return (
                      <button
                        key={color}
                        onClick={() => selectColor(i, color)}
                        disabled={isTaken}
                        className={`w-10 h-10 rounded transition-all ${
                          isSelected
                            ? 'ring-2 ring-brass-500 ring-offset-1 ring-offset-military-800 scale-110'
                            : isTaken
                              ? 'opacity-25 cursor-not-allowed'
                              : 'opacity-70 hover:opacity-100 hover:scale-105'
                        }`}
                        title={`${color}${isTaken ? ' (taken)' : ''}`}
                      >
                        <img src={planeAvatarPath(color)} alt={color} className="w-full h-full object-contain" />
                      </button>
                    )
                  })}
                </div>
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

        {hasEnoughPlayers && hasHuman && !allHumansHaveColor && (
          <p className="text-brass-500 text-sm mb-3 text-center">
            Each human player must pick a plane color.
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
