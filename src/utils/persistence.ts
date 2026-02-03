import type { GameState, GameIndexEntry } from '../types/game.ts';
import { SCHEMA_VERSION, ALL_PLANE_COLORS } from '../types/game.ts';
import { getDb } from './firebase.ts';
import { debugLog } from './debug.ts';

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
  } catch (err) {
    debugLog('[LoadIndex] localStorage error', err);
    return [];
  }
}

function localSaveIndex(index: GameIndexEntry[]): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  } catch (err) {
    debugLog('[SaveIndex] localStorage error', err);
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
  } catch (err) {
    debugLog('[Save] localStorage error', err);
  }
}

function localLoadGame(gameId: string): GameState | null {
  try {
    const raw = localStorage.getItem(GAME_KEY_PREFIX + gameId);
    if (!raw) return null;
    const state = JSON.parse(raw) as GameState;
    return migrateState(state);
  } catch (err) {
    debugLog('[LoadGame] localStorage error', err);
    return null;
  }
}

function localDeleteGame(gameId: string): void {
  try {
    localStorage.removeItem(GAME_KEY_PREFIX + gameId);
    const index = localLoadIndex().filter((e) => e.id !== gameId);
    localSaveIndex(index);
  } catch (err) {
    debugLog('[DeleteGame] localStorage error', err);
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
  const fromVersion = state.schemaVersion;

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

  if (fromVersion !== state.schemaVersion) {
    debugLog('[Migrate]', `v${fromVersion}→v${state.schemaVersion}`);
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

  // Firestore rejects undefined values — strip them via JSON round-trip
  const cleaned = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;

  await setDoc(doc(db, FIRESTORE_COLLECTION, state.gameId), {
    ...cleaned,
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
  debugLog('[Save]', `gameId=${state.gameId}`);

  // Write localStorage immediately (synchronous)
  localSaveGame(state);

  // Fire-and-forget Firestore write
  void firestoreSaveGame(state).catch((err) => {
    debugLog('[Save] Firestore error', err);
  });
}

export async function loadIndex(): Promise<GameIndexEntry[]> {
  try {
    const remote = await firestoreLoadIndex();
    if (remote) {
      localSaveIndex(remote);
      debugLog('[LoadIndex]', `source=firestore, count=${remote.length}`);
      return remote;
    }
  } catch (err) {
    debugLog('[LoadIndex] Firestore error, falling back to localStorage', err);
  }
  const local = localLoadIndex();
  debugLog('[LoadIndex]', `source=localStorage, count=${local.length}`);
  return local;
}

export async function loadGame(gameId: string): Promise<GameState | null> {
  // Prefer Firestore — it's the shared source of truth across devices.
  // Fall back to localStorage when Firestore is unavailable or disabled.
  try {
    const remote = await firestoreLoadGame(gameId);
    if (remote) {
      localSaveGame(remote);
      debugLog('[LoadGame]', `gameId=${gameId}, source=firestore`);
      return remote;
    }
  } catch (err) {
    debugLog('[LoadGame] Firestore error, falling back to localStorage', err);
  }

  const local = localLoadGame(gameId);
  if (local) {
    debugLog('[LoadGame]', `gameId=${gameId}, source=localStorage`);
    return local;
  }

  debugLog('[LoadGame]', `gameId=${gameId}, source=null`);
  return null;
}

export async function deleteGame(gameId: string): Promise<void> {
  debugLog('[DeleteGame]', `gameId=${gameId}`);
  localDeleteGame(gameId);
  try {
    await firestoreDeleteGame(gameId);
  } catch (err) {
    debugLog('[DeleteGame] Firestore error', err);
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
  } catch (err) {
    debugLog('[SetActive] localStorage error', err);
  }
}

export function getActiveGameId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_GAME_KEY);
  } catch {
    return null;
  }
}

export function loadActiveGame(): GameState | null {
  try {
    const gameId = localStorage.getItem(ACTIVE_GAME_KEY);
    if (!gameId) {
      debugLog('[LoadActive]', 'none');
      return null;
    }
    const state = localLoadGame(gameId);
    debugLog('[LoadActive]', state ? `gameId=${gameId}` : `gameId=${gameId} (not found)`);
    return state;
  } catch (err) {
    debugLog('[LoadActive] error', err);
    return null;
  }
}

// ── Legacy cleanup ──────────────────────────────────────

export function clearOldSave(): void {
  try {
    localStorage.removeItem(OLD_SAVE_KEY);
  } catch (err) {
    debugLog('[ClearOldSave] localStorage error', err);
  }
}
