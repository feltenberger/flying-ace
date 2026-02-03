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
import { debugLog } from '../utils/debug.ts';

interface GameContextValue {
  state: GameState;
  dispatch: Dispatch<Action>;
}

const GameContext = createContext<GameContextValue | null>(null);

const FIRESTORE_DEBOUNCE_MS = 500;

function initState(): GameState {
  clearOldSave();
  const active = loadActiveGame();
  if (active) {
    debugLog('[Init] resumed game', { gameId: active.gameId, players: active.players.map(p => p.name) });
    return active;
  }
  debugLog('[Init] fresh state (no active game)');
  return createInitialState();
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(gameReducer, undefined, initState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const firestoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Wrap dispatch to save before GO_HOME wipes the state
  const dispatch: Dispatch<Action> = useCallback((action: Action) => {
    if (action.type === 'LOAD_STATE') {
      debugLog('[Dispatch]', action.type, { gameId: action.state.gameId });
    } else if (action.type === 'START_GAME') {
      debugLog('[Dispatch]', action.type, { playerNames: action.playerNames });
    } else {
      debugLog('[Dispatch]', action.type, action);
    }

    if (action.type === 'GO_HOME' && stateRef.current.gameId) {
      saveGame(stateRef.current);
    }
    rawDispatch(action);
  }, []);

  // Log screen/phase transitions
  const prevScreenRef = useRef(state.screen);
  const prevPhaseRef = useRef(state.phase);
  useEffect(() => {
    if (state.screen !== prevScreenRef.current) {
      debugLog('[Screen]', `${prevScreenRef.current} → ${state.screen}`);
      prevScreenRef.current = state.screen;
    }
    if (state.phase !== prevPhaseRef.current) {
      debugLog('[Phase]', `${prevPhaseRef.current} → ${state.phase}`);
      prevPhaseRef.current = state.phase;
    }
  }, [state.screen, state.phase]);

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
