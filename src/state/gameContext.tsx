import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useCallback,
  type Dispatch,
  type ReactNode,
} from 'react';
import type { GameState, Action } from '../types/game.ts';
import { GameScreen } from '../types/game.ts';
import { gameReducer, createInitialState } from './gameReducer.ts';
import { saveGame, clearOldSave, loadActiveGame, setActiveGameId } from '../utils/persistence.ts';

interface GameContextValue {
  state: GameState;
  dispatch: Dispatch<Action>;
}

const GameContext = createContext<GameContextValue | null>(null);

const FIRESTORE_DEBOUNCE_MS = 500;

function initState(): GameState {
  clearOldSave();
  const active = loadActiveGame();
  if (active) return active;
  return createInitialState();
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(gameReducer, undefined, initState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const firestoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Wrap dispatch to save before GO_HOME wipes the state
  const dispatch: Dispatch<Action> = useCallback((action: Action) => {
    if (action.type === 'GO_HOME' && stateRef.current.gameId) {
      saveGame(stateRef.current);
    }
    rawDispatch(action);
  }, []);

  // Auto-save when in an active game (has gameId, not on Home or Setup)
  useEffect(() => {
    if (
      state.gameId &&
      state.screen !== GameScreen.Home &&
      state.screen !== GameScreen.Setup
    ) {
      // localStorage write is immediate inside saveGame
      // Firestore write is fire-and-forget but we debounce rapid state changes
      if (firestoreTimerRef.current) {
        clearTimeout(firestoreTimerRef.current);
      }
      firestoreTimerRef.current = setTimeout(() => {
        saveGame(state);
        firestoreTimerRef.current = null;
      }, FIRESTORE_DEBOUNCE_MS);

      // Immediate localStorage save (saveGame writes localStorage synchronously)
      saveGame(state);
      setActiveGameId(state.gameId);
    } else {
      setActiveGameId(null);
    }

    return () => {
      if (firestoreTimerRef.current) {
        clearTimeout(firestoreTimerRef.current);
      }
    };
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
