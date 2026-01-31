import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type Dispatch,
  type ReactNode,
} from 'react';
import type { GameState, Action } from '../types/game.ts';
import { GameScreen } from '../types/game.ts';
import { gameReducer, createInitialState } from './gameReducer.ts';
import { saveGame, clearOldSave } from '../utils/persistence.ts';

interface GameContextValue {
  state: GameState;
  dispatch: Dispatch<Action>;
}

const GameContext = createContext<GameContextValue | null>(null);

function initState(): GameState {
  clearOldSave();
  return createInitialState();
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, initState);

  // Auto-save when in an active game (has gameId, not on Home or Setup)
  useEffect(() => {
    if (
      state.gameId &&
      state.screen !== GameScreen.Home &&
      state.screen !== GameScreen.Setup
    ) {
      saveGame(state);
    }
  }, [state]);

  return (
    <GameContext value={{ state, dispatch }}>
      {children}
    </GameContext>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
