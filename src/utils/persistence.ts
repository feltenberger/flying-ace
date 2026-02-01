import type { GameState, GameIndexEntry } from '../types/game.ts';
import { SCHEMA_VERSION, ALL_PLANE_COLORS } from '../types/game.ts';

const INDEX_KEY = 'flying-ace-index';
const GAME_KEY_PREFIX = 'flying-ace-game-';
const ACTIVE_GAME_KEY = 'flying-ace-active';
const OLD_SAVE_KEY = 'flying-ace-save';

// ── Index helpers ───────────────────────────────────────

export function loadIndex(): GameIndexEntry[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as GameIndexEntry[];
  } catch {
    return [];
  }
}

function saveIndex(index: GameIndexEntry[]): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  } catch {
    // localStorage might be full or unavailable
  }
}

// ── Game CRUD ───────────────────────────────────────────

export function saveGame(state: GameState): void {
  try {
    const key = GAME_KEY_PREFIX + state.gameId;
    localStorage.setItem(key, JSON.stringify(state));

    // Upsert index entry
    const index = loadIndex();
    const winner = state.winnerId
      ? state.players.find((p) => p.id === state.winnerId)
      : undefined;
    const entry: GameIndexEntry = {
      id: state.gameId,
      playerNames: state.players.map((p) => p.name),
      status: state.winnerId ? 'completed' : 'in_progress',
      lastPlayedAt: Date.now(),
      turnNumber: state.turnNumber,
      winnerName: winner?.name,
    };
    const existing = index.findIndex((e) => e.id === state.gameId);
    if (existing >= 0) {
      index[existing] = entry;
    } else {
      index.push(entry);
    }
    saveIndex(index);
  } catch {
    // localStorage might be full or unavailable
  }
}

export function loadGame(gameId: string): GameState | null {
  try {
    const raw = localStorage.getItem(GAME_KEY_PREFIX + gameId);
    if (!raw) return null;
    const state = JSON.parse(raw) as GameState;
    return migrateState(state);
  } catch {
    return null;
  }
}

function migrateState(state: GameState): GameState | null {
  // v1 -> v2: add isCpu field to players
  if (state.schemaVersion === 1) {
    state.players = state.players.map((p) => ({
      ...p,
      isCpu: p.isCpu ?? false,
    }));
    state.schemaVersion = 2;
  }

  // v2 -> v3: replace donation with trade
  if (state.schemaVersion === 2) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = state as any;
    delete s.donation;
    s.trade = undefined;
    // Reset any donation phases to Shop
    if (s.phase === 'donation_target' || s.phase === 'donation_amount' || s.phase === 'donation_result') {
      s.phase = 'shop';
    }
    state.schemaVersion = 3;
  }

  // v3 -> v4: add planeColor to players
  if (state.schemaVersion === 3) {
    state.players = state.players.map((p, i) => ({
      ...p,
      planeColor: p.planeColor ?? ALL_PLANE_COLORS[i % ALL_PLANE_COLORS.length],
    }));
    state.schemaVersion = 4;
  }

  if (state.schemaVersion !== SCHEMA_VERSION) return null;
  return state;
}

export function deleteGame(gameId: string): void {
  try {
    localStorage.removeItem(GAME_KEY_PREFIX + gameId);
    const index = loadIndex().filter((e) => e.id !== gameId);
    saveIndex(index);
  } catch {
    // ignore
  }
}

// ── ID generation ───────────────────────────────────────

export function generateGameId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Active game tracking ────────────────────────────────

export function setActiveGameId(gameId: string | null): void {
  try {
    if (gameId) {
      localStorage.setItem(ACTIVE_GAME_KEY, gameId);
    } else {
      localStorage.removeItem(ACTIVE_GAME_KEY);
    }
  } catch {
    // ignore
  }
}

export function loadActiveGame(): GameState | null {
  try {
    const gameId = localStorage.getItem(ACTIVE_GAME_KEY);
    if (!gameId) return null;
    return loadGame(gameId);
  } catch {
    return null;
  }
}

// ── Legacy cleanup ──────────────────────────────────────

export function clearOldSave(): void {
  try {
    localStorage.removeItem(OLD_SAVE_KEY);
  } catch {
    // ignore
  }
}
