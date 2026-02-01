import type { GameState, GameIndexEntry } from '../types/game.ts';
import { SCHEMA_VERSION } from '../types/game.ts';
import { getDb } from './firebase.ts';

const INDEX_KEY = 'flying-ace-index';
const GAME_KEY_PREFIX = 'flying-ace-game-';
const ACTIVE_GAME_KEY = 'flying-ace-active';
const OLD_SAVE_KEY = 'flying-ace-save';
const FIRESTORE_COLLECTION = 'games';

// ── Local storage helpers ─────────────────────────────

function localLoadIndex(): GameIndexEntry[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as GameIndexEntry[];
  } catch {
    return [];
  }
}

function localSaveIndex(index: GameIndexEntry[]): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  } catch {
    // localStorage might be full or unavailable
  }
}

function localSaveGame(state: GameState): void {
  try {
    const key = GAME_KEY_PREFIX + state.gameId;
    localStorage.setItem(key, JSON.stringify(state));

    // Upsert index entry
    const index = localLoadIndex();
    const entry = buildIndexEntry(state);
    const existing = index.findIndex((e) => e.id === state.gameId);
    if (existing >= 0) {
      index[existing] = entry;
    } else {
      index.push(entry);
    }
    localSaveIndex(index);
  } catch {
    // localStorage might be full or unavailable
  }
}

function localLoadGame(gameId: string): GameState | null {
  try {
    const raw = localStorage.getItem(GAME_KEY_PREFIX + gameId);
    if (!raw) return null;
    const state = JSON.parse(raw) as GameState;
    return migrateState(state);
  } catch {
    return null;
  }
}

function localDeleteGame(gameId: string): void {
  try {
    localStorage.removeItem(GAME_KEY_PREFIX + gameId);
    const index = localLoadIndex().filter((e) => e.id !== gameId);
    localSaveIndex(index);
  } catch {
    // ignore
  }
}

// ── Shared helpers ────────────────────────────────────

function buildIndexEntry(state: GameState): GameIndexEntry {
  const winner = state.winnerId
    ? state.players.find((p) => p.id === state.winnerId)
    : undefined;
  return {
    id: state.gameId,
    playerNames: state.players.map((p) => p.name),
    status: state.winnerId ? 'completed' : 'in_progress',
    lastPlayedAt: Date.now(),
    turnNumber: state.turnNumber,
    winnerName: winner?.name,
  };
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

  if (state.schemaVersion !== SCHEMA_VERSION) return null;
  return state;
}

// ── Firestore helpers ─────────────────────────────────

async function firestoreSaveGame(state: GameState): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');

  const winner = state.winnerId
    ? state.players.find((p) => p.id === state.winnerId)
    : undefined;

  await setDoc(doc(db, FIRESTORE_COLLECTION, state.gameId), {
    ...state,
    ownerId: null,
    updatedAt: serverTimestamp(),
    // Denormalized index fields for queries
    playerNames: state.players.map((p) => p.name),
    status: state.winnerId ? 'completed' : 'in_progress',
    lastPlayedAt: Date.now(),
    winnerName: winner?.name ?? null,
  });
}

async function firestoreLoadIndex(): Promise<GameIndexEntry[] | null> {
  const db = await getDb();
  if (!db) return null;

  const { collection, getDocs, orderBy, query } = await import(
    'firebase/firestore'
  );

  const q = query(
    collection(db, FIRESTORE_COLLECTION),
    orderBy('lastPlayedAt', 'desc'),
  );
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      playerNames: data.playerNames ?? [],
      status: data.status ?? 'in_progress',
      lastPlayedAt: data.lastPlayedAt ?? 0,
      turnNumber: data.turnNumber ?? 0,
      winnerName: data.winnerName ?? undefined,
    } as GameIndexEntry;
  });
}

async function firestoreLoadGame(
  gameId: string,
): Promise<GameState | null> {
  const db = await getDb();
  if (!db) return null;

  const { doc, getDoc } = await import('firebase/firestore');

  const snap = await getDoc(doc(db, FIRESTORE_COLLECTION, gameId));
  if (!snap.exists()) return null;

  const data = snap.data() as GameState & Record<string, unknown>;

  // Strip Firestore-only fields before returning as GameState
  const {
    ownerId: _ownerId,
    updatedAt: _updatedAt,
    createdAt: _createdAt,
    ...gameState
  } = data;
  void _ownerId;
  void _updatedAt;
  void _createdAt;

  return migrateState(gameState as GameState);
}

async function firestoreDeleteGame(gameId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const { doc, deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, FIRESTORE_COLLECTION, gameId));
}

// ── Public composite API ──────────────────────────────

export function saveGame(state: GameState): void {
  // Write localStorage immediately (synchronous)
  localSaveGame(state);

  // Fire-and-forget Firestore write
  void firestoreSaveGame(state).catch(() => {
    // Firestore write failed — localStorage is still the source of truth
  });
}

export async function loadIndex(): Promise<GameIndexEntry[]> {
  try {
    const remote = await firestoreLoadIndex();
    if (remote) {
      // Update local cache with remote data
      localSaveIndex(remote);
      return remote;
    }
  } catch {
    // Firestore unavailable, fall back to local
  }
  return localLoadIndex();
}

export async function loadGame(gameId: string): Promise<GameState | null> {
  try {
    const remote = await firestoreLoadGame(gameId);
    if (remote) {
      // Update local cache
      localSaveGame(remote);
      return remote;
    }
  } catch {
    // Firestore unavailable, fall back to local
  }
  return localLoadGame(gameId);
}

export async function deleteGame(gameId: string): Promise<void> {
  localDeleteGame(gameId);
  try {
    await firestoreDeleteGame(gameId);
  } catch {
    // Firestore delete failed — local is already cleaned up
  }
}

// ── ID generation ───────────────────────────────────────

export function generateGameId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Active game tracking (local-only) ───────────────────

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
    return localLoadGame(gameId);
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
