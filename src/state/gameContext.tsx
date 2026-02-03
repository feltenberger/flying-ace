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
import { saveGame, clearOldSave, loadActiveGame, setActiveGameId, subscribeToGame } from '../utils/persistence.ts';
import { debugLog } from '../utils/debug.ts';

interface GameContextValue {
  state: GameState;
  dispatch: Dispatch<Action>;
}

const GameContext = createContext<GameContextValue | null>(null);


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
  // Tracks whether the latest state change came from a local dispatch (and thus needs saving).
  // Starts as 'init' so the mount render is skipped — no dispatch happened yet.
  const lastOriginRef = useRef<'init' | 'load' | 'local' | 'server'>('init');

  // Wrap dispatch to save before GO_HOME wipes the state
  const dispatch: Dispatch<Action> = useCallback((action: Action) => {
    if (action.type === 'LOAD_STATE') {
      debugLog('[Dispatch]', action.type, { gameId: action.state.gameId });
    } else if (action.type === 'START_GAME') {
      debugLog('[Dispatch]', action.type, { playerNames: action.playerNames });
    } else {
      debugLog('[Dispatch]', action.type, action);
    }

    lastOriginRef.current = action.type === 'LOAD_STATE'
      ? (action.origin ?? 'load')
      : (action.origin ?? 'local');
    if (action.type === 'GO_HOME' && stateRef.current.gameId) {
      saveGame(stateRef.current);
    }
    rawDispatch(action);
  }, []);

  // Subscribe to real-time Firestore updates for the active game.
  // Fires immediately with the current document (replacing the old one-shot refresh)
  // and then again on every remote change, keeping observer devices in sync.
  useEffect(() => {
    if (!state.gameId) return;

    const unsubscribe = subscribeToGame(state.gameId, (fresh) => {
      lastOriginRef.current = 'server';
      rawDispatch({ type: 'LOAD_STATE', state: fresh, origin: 'server' });
    });

    return unsubscribe;
  // Only re-subscribe when the gameId changes (not on every state update)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.gameId]);

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
      // Only save for local dispatches — skip on mount ('init') and server-pushed updates
      if (lastOriginRef.current !== 'local') {
        debugLog('[Save] skipped', `origin=${lastOriginRef.current}`);
        setActiveGameId(state.gameId);
        return;
      }

      saveGame(state);
      setActiveGameId(state.gameId);
    } else {
      setActiveGameId(null);
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
