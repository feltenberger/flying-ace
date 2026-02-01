import type { ShopItemId } from './shop.ts';

// ── Enums (as const objects for erasableSyntaxOnly) ────

export const GameScreen = {
  Home: 'home',
  Setup: 'setup',
  Handover: 'handover',
  Playing: 'playing',
  GameOver: 'game_over',
} as const;

export type GameScreen = (typeof GameScreen)[keyof typeof GameScreen];

export const TurnPhase = {
  Roll: 'roll',
  RollResult: 'roll_result',
  DogFight: 'dog_fight',
  DogFightResult: 'dog_fight_result',
  Shop: 'shop',
  CheapBombTarget: 'cheap_bomb_target',
  CheapBombRoll: 'cheap_bomb_roll',
  CheapBombResult: 'cheap_bomb_result',
  PriceyBombTarget: 'pricey_bomb_target',
  PriceyBombResult: 'pricey_bomb_result',
  TradeTarget: 'trade_target',
  TradeOffer: 'trade_offer',
  TradeHandover: 'trade_handover',
  TradeResponse: 'trade_response',
  TradeResult: 'trade_result',
  MercenaryTarget: 'mercenary_target',
  MercenaryOffer: 'mercenary_offer',
  MercenaryHandover: 'mercenary_handover',
  MercenaryResponse: 'mercenary_response',
  MercenaryFightTarget: 'mercenary_fight_target',
  MercenaryFightRoll: 'mercenary_fight_roll',
  MercenaryFight: 'mercenary_fight',
  MercenaryFightResult: 'mercenary_fight_result',
  MercenaryComplete: 'mercenary_complete',
  DigForFuelRoll: 'dig_for_fuel_roll',
  DigForFuelResult: 'dig_for_fuel_result',
  OilTycoonRepair: 'oil_tycoon_repair',
  Tax: 'tax',
  TurnEnd: 'turn_end',
} as const;

export type TurnPhase = (typeof TurnPhase)[keyof typeof TurnPhase];

// ── Plane Colors ──────────────────────────────────────

export const PlaneColor = {
  Purple: 'purple',
  Red: 'red',
  Blue: 'blue',
  Green: 'green',
  Yellow: 'yellow',
  Pink: 'pink',
} as const;

export type PlaneColor = (typeof PlaneColor)[keyof typeof PlaneColor];

export const ALL_PLANE_COLORS: PlaneColor[] = [
  PlaneColor.Purple,
  PlaneColor.Red,
  PlaneColor.Blue,
  PlaneColor.Green,
  PlaneColor.Yellow,
  PlaneColor.Pink,
];

export function planeAvatarPath(color: PlaneColor): string {
  return `/assets/global/plane-${color}.png`;
}

// ── Player ─────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  planes: number;
  fuel: number;
  alive: boolean;
  isCpu: boolean;
  planeColor: PlaneColor;
  // Items / status
  insuranceTurnsLeft: number;
  insuranceUsed: boolean; // can only buy once per game
  hasAntiAircraft: boolean;
  antiAircraftCooldown: number; // turns remaining before can buy again
  hasOilTycoon: boolean;
  oilTycoonDamage: number; // 0-3, destroyed at 3
  oilTycoonRepairTurnsLeft: number; // 2 turns to repair after destroyed, -1 = not applicable
}

// ── Log Entry ──────────────────────────────────────────

export interface LogEntry {
  turn: number;
  playerName: string;
  message: string;
}

// ── Dog Fight State ────────────────────────────────────

export interface DogFightState {
  attackerId: string;
  defenderId: string;
  attackerRoll?: number;
  loserId?: string;
  blockedBy?: 'insurance' | 'anti_aircraft';
}

// ── Mercenary State ────────────────────────────────────

export interface MercenaryState {
  hirerId: string;
  mercenaryId: string;
  offeredFuel: number;
  accepted?: boolean;
  targetId?: string;
  fightCount?: number;
  fightsCompleted: number;
  currentFight?: DogFightState;
}

// ── Bomb State ─────────────────────────────────────────

export interface BombState {
  attackerId: string;
  targetId: string;
  roll?: number;
  hit?: boolean;
  blockedBy?: 'insurance' | 'anti_aircraft';
}

// ── Trade State ───────────────────────────────────────

export interface TradeOffer {
  fuel: number;
  planes: number;
  antiAircraft: boolean;
  oilTycoon: boolean;
  insurance: boolean;
}

export interface TradeState {
  offererId: string;
  partnerId?: string;
  offering?: TradeOffer;
  requesting?: TradeOffer;
  accepted?: boolean;
}

// ── Game State ─────────────────────────────────────────

export interface GameState {
  schemaVersion: number;
  gameId: string;
  screen: GameScreen;
  players: Player[];
  currentPlayerIndex: number;
  turnNumber: number;
  phase: TurnPhase;
  lastRoll?: number;
  rollResult?: string; // description of what happened
  dogFight?: DogFightState;
  mercenary?: MercenaryState;
  bomb?: BombState;
  trade?: TradeState;
  digForFuelRoll?: number;
  log: LogEntry[];
  winnerId?: string;
}

// ── Game Index Entry (lightweight metadata for lobby) ──

export interface GameIndexEntry {
  id: string;
  playerNames: string[];
  status: 'in_progress' | 'completed';
  lastPlayedAt: number;
  turnNumber: number;
  winnerName?: string;
}

// ── Actions ────────────────────────────────────────────

export type Action =
  | { type: 'START_GAME'; playerNames: string[]; gameId: string; cpuFlags?: boolean[]; planeColors: PlaneColor[] }
  | { type: 'GO_HOME' }
  | { type: 'HANDOVER_COMPLETE' }
  | { type: 'ROLL_DIE'; roll: number }
  | { type: 'ROLL_ACKNOWLEDGE' }
  // Dog fight
  | { type: 'DOG_FIGHT_PICK'; defenderId: string }
  | { type: 'DOG_FIGHT_ROLL'; attackerRoll: number }
  | { type: 'DOG_FIGHT_ACKNOWLEDGE' }
  // Shop
  | { type: 'SKIP_SHOP' }
  | { type: 'BUY_ITEM'; itemId: ShopItemId }
  // Cheap bomb
  | { type: 'CHEAP_BOMB_TARGET'; targetId: string }
  | { type: 'CHEAP_BOMB_ROLL'; roll: number }
  | { type: 'CHEAP_BOMB_ACKNOWLEDGE' }
  // Pricey bomb
  | { type: 'PRICEY_BOMB_TARGET'; targetId: string }
  | { type: 'PRICEY_BOMB_ACKNOWLEDGE' }
  // Trade
  | { type: 'TRADE_TARGET'; partnerId: string }
  | { type: 'TRADE_PROPOSE'; offering: TradeOffer; requesting: TradeOffer }
  | { type: 'TRADE_HANDOVER_COMPLETE' }
  | { type: 'TRADE_RESPOND'; accepted: boolean }
  | { type: 'TRADE_ACKNOWLEDGE' }
  // Dig for fuel
  | { type: 'DIG_FOR_FUEL_ROLL'; roll: number }
  | { type: 'DIG_FOR_FUEL_ACKNOWLEDGE' }
  // Mercenary
  | { type: 'MERCENARY_TARGET'; mercenaryId: string }
  | { type: 'MERCENARY_OFFER'; amount: number }
  | { type: 'MERCENARY_HANDOVER_COMPLETE' }
  | { type: 'MERCENARY_RESPOND'; accepted: boolean }
  | { type: 'MERCENARY_FIGHT_TARGET'; targetId: string }
  | { type: 'MERCENARY_FIGHT_COUNT_ROLL'; roll: number }
  | { type: 'MERCENARY_FIGHT_ROLL'; attackerRoll: number }
  | { type: 'MERCENARY_FIGHT_ACKNOWLEDGE' }
  | { type: 'MERCENARY_COMPLETE_ACKNOWLEDGE' }
  // Oil Tycoon repair
  | { type: 'OIL_TYCOON_REPAIR' }
  | { type: 'OIL_TYCOON_SKIP_REPAIR' }
  // Tax
  | { type: 'PAY_TAX' }
  | { type: 'END_TURN' }
  // Cancel shop item sub-phase
  | { type: 'CANCEL_SHOP_ITEM' }
  // Game management
  | { type: 'LOAD_STATE'; state: GameState }
  | { type: 'RESET_GAME' };

// ── Constants ──────────────────────────────────────────

export const STARTING_PLANES = 4;
export const STARTING_FUEL = 32;
export const FUEL_TAX_PER_PLANE = 4;
export const INSURANCE_DURATION = 3;
export const AA_COOLDOWN = 2;
export const OIL_TYCOON_INCOME = 25;
export const OIL_TYCOON_REPAIR_COST = 50;
export const OIL_TYCOON_REPAIR_WINDOW = 2;
export const OIL_TYCOON_HITS_TO_DESTROY = 3;
export const DOGFIGHT_FUEL_PENALTY = 10;
export const SCHEMA_VERSION = 4;
