import { useMemo } from 'react'
import type { GameState, Action } from '../types/game.ts'
import { RandomStrategy, getDecisionMakerId } from './cpuStrategy.ts'

const strategy = new RandomStrategy()

/**
 * Returns the CPU's chosen action if the current decision-maker is a CPU player.
 * Returns null if it's a human player's turn (or no valid action).
 *
 * Uses useMemo keyed on state so die rolls are stable across re-renders.
 */
export function useCpuAction(state: GameState): Action | null {
  return useMemo(() => {
    const decisionMakerId = getDecisionMakerId(state)
    const decisionMaker = state.players.find((p) => p.id === decisionMakerId)
    if (!decisionMaker || !decisionMaker.isCpu) return null
    return strategy.chooseAction(state)
  }, [state])
}
