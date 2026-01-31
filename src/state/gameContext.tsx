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
import { saveGame, loadGame } from '../utils/persistence.ts';

interface GameContextValue {
  state: GameState;
  dispatch: Dispatch<Action>;
}

const GameContext = createContext<GameContextValue | null>(null);

function initState(): GameState {
  const saved = loadGame();
  if (saved) return saved;
  return createInitialState();
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, initState);

  // Auto-save on every state change (except setup screen)
  useEffect(() => {
    if (state.screen !== GameScreen.Setup) {
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
