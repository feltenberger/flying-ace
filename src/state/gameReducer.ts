import type {
  GameState,
  Action,
  Player,
  LogEntry,
  BombState,
  PlaneColor,
} from '../types/game.ts';
import {
  GameScreen,
  TurnPhase,
  STARTING_PLANES,
  STARTING_FUEL,
  FUEL_TAX_PER_PLANE,
  INSURANCE_DURATION,
  AA_COOLDOWN,
  OIL_TYCOON_INCOME,
  OIL_TYCOON_REPAIR_COST,
  OIL_TYCOON_REPAIR_WINDOW,
  OIL_TYCOON_HITS_TO_DESTROY,
  DOGFIGHT_FUEL_PENALTY,
  SCHEMA_VERSION,
} from '../types/game.ts';
import { ShopItemId } from '../types/shop.ts';

// ── Helpers ──────────────────────────────────────────────

function createPlayer(id: string, name: string, isCpu: boolean, planeColor: PlaneColor): Player {
  return {
    id,
    name,
    planes: STARTING_PLANES,
    fuel: STARTING_FUEL,
    alive: true,
    isCpu,
    planeColor,
    insuranceTurnsLeft: 0,
    insuranceUsed: false,
    hasAntiAircraft: false,
    antiAircraftCooldown: 0,
    hasOilTycoon: false,
    oilTycoonDamage: 0,
    oilTycoonRepairTurnsLeft: -1,
  };
}

function addLog(state: GameState, playerName: string, message: string): GameState {
  const entry: LogEntry = {
    turn: state.turnNumber,
    playerName,
    message,
  };
  return {
    ...state,
    log: [...state.log, entry],
  };
}

function getNextAlivePlayerIndex(players: Player[], currentIndex: number): number {
  const count = players.length;
  let idx = (currentIndex + 1) % count;
  while (idx !== currentIndex) {
    if (players[idx].alive) return idx;
    idx = (idx + 1) % count;
  }
  // If we loop back to current, return current (they are the last alive)
  return currentIndex;
}

function updatePlayer(state: GameState, playerId: string, updates: Partial<Player>): GameState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.id === playerId ? { ...p, ...updates } : p,
    ),
  };
}

function getPlayer(state: GameState, playerId: string): Player {
  return state.players.find((p) => p.id === playerId)!;
}

function currentPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex];
}

type HitType = 'dogfight' | 'roll' | 'tax' | 'cheap_bomb' | 'pricey_bomb';

/**
 * Attempt to remove a plane from a player, respecting protection priority:
 *   1. Anti-Aircraft (absorbs hit, then destroyed with cooldown)
 *   2. Insurance (if applicable for hit type and turns remain)
 *   3. Otherwise, lose the plane
 *
 * Returns the updated state and a description of what happened.
 */
function losePlane(
  state: GameState,
  playerId: string,
  hitType: HitType,
): { state: GameState; blocked: boolean; blockedBy?: 'insurance' | 'anti_aircraft'; description: string } {
  const player = getPlayer(state, playerId);

  // 1. Check Anti-Aircraft — blocks ALL hit types including pricey_bomb
  if (player.hasAntiAircraft) {
    let s = updatePlayer(state, playerId, {
      hasAntiAircraft: false,
      antiAircraftCooldown: AA_COOLDOWN,
    });
    s = addLog(s, player.name, 'Anti-Aircraft absorbed the hit and was destroyed.');
    return {
      state: s,
      blocked: true,
      blockedBy: 'anti_aircraft',
      description: `${player.name}'s Anti-Aircraft absorbed the hit!`,
    };
  }

  // 2. Check Insurance — does NOT protect against pricey_bomb
  if (hitType !== 'pricey_bomb' && player.insuranceTurnsLeft > 0) {
    const s = addLog(state, player.name, `Insurance protected against plane loss (${hitType}).`);
    return {
      state: s,
      blocked: true,
      blockedBy: 'insurance',
      description: `${player.name}'s Insurance protected their plane!`,
    };
  }

  // 3. Lose the plane
  const newPlanes = player.planes - 1;
  const alive = newPlanes > 0;
  let s = updatePlayer(state, playerId, { planes: newPlanes, alive });
  if (!alive) {
    s = addLog(s, player.name, 'Has been eliminated!');
  } else {
    s = addLog(s, player.name, `Lost a plane! (${newPlanes} remaining)`);
  }
  return {
    state: s,
    blocked: false,
    description: alive
      ? `${player.name} lost a plane! (${newPlanes} remaining)`
      : `${player.name} lost their last plane and is eliminated!`,
  };
}

/**
 * Apply bomb damage to an Oil Tycoon. AA can block each hit.
 * Returns updated state and description.
 */
function damageOilTycoon(
  state: GameState,
  targetId: string,
): { state: GameState; destroyed: boolean; description: string } {
  const target = getPlayer(state, targetId);

  // Check AA first
  if (target.hasAntiAircraft) {
    let s = updatePlayer(state, targetId, {
      hasAntiAircraft: false,
      antiAircraftCooldown: AA_COOLDOWN,
    });
    s = addLog(s, target.name, 'Anti-Aircraft blocked the bomb aimed at their Oil Tycoon.');
    return {
      state: s,
      destroyed: false,
      description: `${target.name}'s Anti-Aircraft blocked the Oil Tycoon hit!`,
    };
  }

  const newDamage = target.oilTycoonDamage + 1;
  if (newDamage >= OIL_TYCOON_HITS_TO_DESTROY) {
    let s = updatePlayer(state, targetId, {
      oilTycoonDamage: newDamage,
      oilTycoonRepairTurnsLeft: OIL_TYCOON_REPAIR_WINDOW,
    });
    s = addLog(s, target.name, 'Oil Tycoon destroyed by bombs! 2 turns to repair for 50 fuel.');
    return {
      state: s,
      destroyed: true,
      description: `${target.name}'s Oil Tycoon was destroyed! They have 2 turns to repair it.`,
    };
  }

  let s = updatePlayer(state, targetId, { oilTycoonDamage: newDamage });
  s = addLog(s, target.name, `Oil Tycoon took damage (${newDamage}/${OIL_TYCOON_HITS_TO_DESTROY}).`);
  return {
    state: s,
    destroyed: false,
    description: `${target.name}'s Oil Tycoon took damage (${newDamage}/${OIL_TYCOON_HITS_TO_DESTROY}).`,
  };
}

function checkWinner(state: GameState): GameState {
  const alivePlayers = state.players.filter((p) => p.alive);
  if (alivePlayers.length === 1) {
    return {
      ...state,
      winnerId: alivePlayers[0].id,
      screen: GameScreen.GameOver,
    };
  }
  return state;
}

function fuelForRoll(roll: number): number {
  if (roll === 6) return 10;
  return roll;
}

function initialState(): GameState {
  return {
    schemaVersion: SCHEMA_VERSION,
    gameId: '',
    screen: GameScreen.Home,
    players: [],
    currentPlayerIndex: 0,
    turnNumber: 1,
    phase: TurnPhase.Roll,
    log: [],
  };
}

// ── Reducer ──────────────────────────────────────────────

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    // ─── Game Management ───────────────────────────────
    case 'LOAD_STATE':
      return { ...action.state };

    case 'RESET_GAME':
      return initialState();

    case 'GO_HOME':
      return initialState();

    // ─── Setup ─────────────────────────────────────────
    case 'START_GAME': {
      const players = action.playerNames.map((name, i) =>
        createPlayer(`player-${i}`, name, action.cpuFlags?.[i] ?? false, action.planeColors[i]),
      );
      let s: GameState = {
        ...initialState(),
        gameId: action.gameId,
        screen: GameScreen.Handover,
        players,
        currentPlayerIndex: 0,
        turnNumber: 1,
        phase: TurnPhase.Roll,
      };
      s = addLog(s, 'Game', `Game started with ${players.length} players: ${action.playerNames.join(', ')}.`);
      return s;
    }

    // ─── Handover ──────────────────────────────────────
    case 'HANDOVER_COMPLETE':
      return {
        ...state,
        screen: GameScreen.Playing,
      };

    // ─── Die Roll (Phase: Roll) ────────────────────────
    case 'ROLL_DIE': {
      if (state.phase !== TurnPhase.Roll) return state;

      const roll = action.roll;
      const player = currentPlayer(state);
      let s: GameState = { ...state, lastRoll: roll };

      s = addLog(s, player.name, `Rolled a ${roll}.`);

      if (roll === 1) {
        // Lose a plane (protected by insurance, AA)
        const result = losePlane(s, player.id, 'roll');
        s = result.state;
        s = {
          ...s,
          rollResult: result.description,
          phase: TurnPhase.RollResult,
        };
        s = checkWinner(s);
        return s;
      }

      if (roll === 2) {
        // Dog fight — show result first, then pick opponent
        s = {
          ...s,
          rollResult: 'Dog fight! You must pick an opponent.',
          phase: TurnPhase.RollResult,
          dogFight: {
            attackerId: player.id,
            defenderId: '',
          },
        };
        return s;
      }

      // Roll 3-6: gain fuel
      const fuelGain = roll === 6 ? 10 * player.planes : roll * player.planes;
      s = updatePlayer(s, player.id, { fuel: player.fuel + fuelGain });
      s = addLog(s, player.name, `Gained ${fuelGain} fuel.`);
      s = {
        ...s,
        rollResult: `Gained ${fuelGain} fuel!`,
        phase: TurnPhase.RollResult,
      };
      return s;
    }

    case 'ROLL_ACKNOWLEDGE': {
      if (state.phase !== TurnPhase.RollResult) return state;

      // If game already won (e.g. roll of 1 eliminated last opponent), stay
      if (state.winnerId) return state;

      const player = currentPlayer(state);

      // If current player was eliminated by roll of 1, skip to turn end
      if (!player.alive) {
        return { ...state, phase: TurnPhase.TurnEnd };
      }

      // Roll of 2: proceed to dog fight
      if (state.lastRoll === 2) {
        return { ...state, phase: TurnPhase.DogFight };
      }

      // All other rolls: proceed to shop
      return { ...state, phase: TurnPhase.Shop };
    }

    // ─── Dog Fight ─────────────────────────────────────
    case 'DOG_FIGHT_PICK': {
      if (state.phase !== TurnPhase.DogFight) return state;
      return {
        ...state,
        dogFight: {
          ...state.dogFight!,
          defenderId: action.defenderId,
        },
        phase: TurnPhase.DogFightResult,
      };
    }

    case 'DOG_FIGHT_ROLL': {
      if (state.phase !== TurnPhase.DogFightResult) return state;

      const { attackerRoll } = action;
      const df = state.dogFight!;
      const loserId = attackerRoll <= 3 ? df.attackerId : df.defenderId;

      let s: GameState = {
        ...state,
        dogFight: {
          ...df,
          attackerRoll,
          loserId,
        },
      };

      const attacker = getPlayer(s, df.attackerId);
      const defender = getPlayer(s, df.defenderId);
      const loserName = loserId === df.attackerId ? attacker.name : defender.name;

      // Loser loses a plane
      const result = losePlane(s, loserId, 'dogfight');
      s = result.state;

      if (result.blocked) {
        s = addLog(
          s,
          attacker.name,
          `Dog fight vs ${defender.name}: rolled ${attackerRoll}. ${loserName}'s ${result.blockedBy === 'anti_aircraft' ? 'Anti-Aircraft' : 'Insurance'} absorbed the hit!`,
        );
        const blockedAttacker = getPlayer(s, df.attackerId);
        const blockedDefender = getPlayer(s, df.defenderId);
        s = addLog(s, attacker.name, `  ${blockedAttacker.name}: ${blockedAttacker.planes} planes, ${blockedAttacker.fuel} fuel`);
        s = addLog(s, attacker.name, `  ${blockedDefender.name}: ${blockedDefender.planes} planes, ${blockedDefender.fuel} fuel`);
        s = {
          ...s,
          dogFight: { ...s.dogFight!, blockedBy: result.blockedBy },
        };
      } else {
        // Loser loses fuel, winner gains it (only if not blocked)
        const loser = getPlayer(s, loserId);
        const winnerId = loserId === df.attackerId ? df.defenderId : df.attackerId;
        const fuelTransfer = Math.min(loser.fuel, DOGFIGHT_FUEL_PENALTY);
        s = updatePlayer(s, loserId, { fuel: loser.fuel - fuelTransfer });
        const winner = getPlayer(s, winnerId);
        s = updatePlayer(s, winnerId, { fuel: winner.fuel + fuelTransfer });
        s = addLog(
          s,
          attacker.name,
          `Dog fight vs ${defender.name}: rolled ${attackerRoll}. ${loserName} loses a plane and ${fuelTransfer} fuel to ${winner.name}!`,
        );
        const updatedLoser = getPlayer(s, loserId);
        const updatedWinner = getPlayer(s, winnerId);
        s = addLog(s, attacker.name, `  ${updatedWinner.name}: ${updatedWinner.planes} planes, ${updatedWinner.fuel} fuel (+${fuelTransfer} fuel)`);
        s = addLog(s, attacker.name, `  ${updatedLoser.name}: ${updatedLoser.planes} planes, ${updatedLoser.fuel} fuel (-1 plane, -${fuelTransfer} fuel)`);
      }

      s = checkWinner(s);
      return s;
    }

    case 'DOG_FIGHT_ACKNOWLEDGE': {
      if (state.phase !== TurnPhase.DogFightResult) return state;

      let s: GameState = {
        ...state,
        dogFight: undefined,
        phase: TurnPhase.Shop,
      };
      s = checkWinner(s);
      if (s.winnerId) return s;

      // If current player was eliminated in dog fight, skip to turn end
      const player = currentPlayer(s);
      if (!player.alive) {
        s = { ...s, phase: TurnPhase.TurnEnd };
      }
      return s;
    }

    // ─── Shop ──────────────────────────────────────────
    case 'SKIP_SHOP': {
      if (state.phase !== TurnPhase.Shop) return state;
      return { ...state, phase: TurnPhase.Tax };
    }

    case 'BUY_ITEM': {
      if (state.phase !== TurnPhase.Shop) return state;

      const player = currentPlayer(state);
      let s = { ...state };

      switch (action.itemId) {
        // ── 1. Buy 1 Plane ──
        case ShopItemId.Plane: {
          if (player.fuel < 10) return state;
          s = updatePlayer(s, player.id, {
            fuel: player.fuel - 10,
            planes: player.planes + 1,
          });
          s = addLog(s, player.name, 'Bought 1 plane for 10 fuel.');
          s = { ...s, phase: TurnPhase.Tax };
          return s;
        }

        // ── 2. Buy 2-Plane Pack ──
        case ShopItemId.TwoPlanePack: {
          if (player.fuel < 15) return state;
          s = updatePlayer(s, player.id, {
            fuel: player.fuel - 15,
            planes: player.planes + 2,
          });
          s = addLog(s, player.name, 'Bought 2-Plane Pack for 15 fuel.');
          s = { ...s, phase: TurnPhase.Tax };
          return s;
        }

        // ── 3. Dig for Fuel ──
        case ShopItemId.DigForFuel: {
          if (player.fuel < 1) return state;
          s = { ...s, phase: TurnPhase.DigForFuelRoll };
          return s;
        }

        // ── 4. Insurance ──
        case ShopItemId.Insurance: {
          if (player.fuel < 10) return state;
          if (player.insuranceUsed) return state; // one purchase per game
          s = updatePlayer(s, player.id, {
            fuel: player.fuel - 10,
            insuranceTurnsLeft: INSURANCE_DURATION,
            insuranceUsed: true,
          });
          s = addLog(s, player.name, `Bought Insurance for 10 fuel (${INSURANCE_DURATION} turns).`);
          s = { ...s, phase: TurnPhase.Tax };
          return s;
        }

        // ── 5. Cheap Bomb ──
        case ShopItemId.CheapBomb: {
          if (player.fuel < 5) return state;
          s = {
            ...s,
            phase: TurnPhase.CheapBombTarget,
            bomb: { attackerId: player.id, targetId: '' },
          };
          return s;
        }

        // ── 6. Pricey Bomb ──
        case ShopItemId.PriceyBomb: {
          if (player.fuel < 12) return state;
          s = {
            ...s,
            phase: TurnPhase.PriceyBombTarget,
            bomb: { attackerId: player.id, targetId: '' },
          };
          return s;
        }

        // ── 7. Trade ──
        case ShopItemId.Trade: {
          s = {
            ...s,
            phase: TurnPhase.TradeTarget,
            trade: { offererId: player.id },
          };
          return s;
        }

        // ── 8. Mercenary ──
        case ShopItemId.Mercenary: {
          // Need at least 3 alive players: hirer, mercenary, and a target
          if (s.players.filter((p) => p.alive).length < 3) return state;
          s = {
            ...s,
            phase: TurnPhase.MercenaryTarget,
            mercenary: {
              hirerId: player.id,
              mercenaryId: '',
              offeredFuel: 0,
              fightsCompleted: 0,
            },
          };
          return s;
        }

        // ── 9. Anti-Aircraft ──
        case ShopItemId.AntiAircraft: {
          if (player.fuel < 12) return state;
          if (player.hasAntiAircraft) return state; // max 1
          if (player.antiAircraftCooldown > 0) return state; // cooldown
          s = updatePlayer(s, player.id, {
            fuel: player.fuel - 12,
            hasAntiAircraft: true,
          });
          s = addLog(s, player.name, 'Bought Anti-Aircraft for 12 fuel.');
          s = { ...s, phase: TurnPhase.Tax };
          return s;
        }

        // ── 10. Oil Tycoon ──
        case ShopItemId.OilTycoon: {
          if (player.fuel < 100) return state;
          if (player.hasOilTycoon) return state; // already owns one
          s = updatePlayer(s, player.id, {
            fuel: player.fuel - 100,
            hasOilTycoon: true,
            oilTycoonDamage: 0,
            oilTycoonRepairTurnsLeft: -1,
          });
          s = addLog(s, player.name, 'Bought Oil Tycoon for 100 fuel.');
          s = { ...s, phase: TurnPhase.Tax };
          return s;
        }

        default:
          return state;
      }
    }

    // ─── Cancel Shop Item Sub-Phase ────────────────────
    case 'CANCEL_SHOP_ITEM': {
      const cancelable: TurnPhase[] = [
        TurnPhase.DigForFuelRoll,
        TurnPhase.CheapBombTarget,
        TurnPhase.CheapBombRoll,
        TurnPhase.PriceyBombTarget,
        TurnPhase.TradeTarget,
        TurnPhase.TradeOffer,
        TurnPhase.MercenaryTarget,
        TurnPhase.MercenaryOffer,
      ];
      if (!cancelable.includes(state.phase)) return state;
      return {
        ...state,
        phase: TurnPhase.Shop,
        bomb: undefined,
        trade: undefined,
        mercenary: undefined,
      };
    }

    // ─── Dig for Fuel ──────────────────────────────────
    case 'DIG_FOR_FUEL_ROLL': {
      if (state.phase !== TurnPhase.DigForFuelRoll) return state;

      const roll = action.roll;
      const fuelGained = fuelForRoll(roll);
      const player = currentPlayer(state);
      // Deduct the 1 fuel cost at commit time (not at purchase)
      let s = updatePlayer(state, player.id, { fuel: player.fuel - 1 + fuelGained });
      s = addLog(s, player.name, 'Paid 1 fuel to dig for fuel.');
      s = addLog(s, player.name, `Dug for fuel: rolled ${roll}, gained ${fuelGained} fuel.`);
      s = { ...s, digForFuelRoll: roll, phase: TurnPhase.DigForFuelResult };
      return s;
    }

    case 'DIG_FOR_FUEL_ACKNOWLEDGE': {
      if (state.phase !== TurnPhase.DigForFuelResult) return state;
      return { ...state, digForFuelRoll: undefined, phase: TurnPhase.Tax };
    }

    // ─── Cheap Bomb ────────────────────────────────────
    case 'CHEAP_BOMB_TARGET': {
      if (state.phase !== TurnPhase.CheapBombTarget) return state;
      return {
        ...state,
        bomb: { ...state.bomb!, targetId: action.targetId },
        phase: TurnPhase.CheapBombRoll,
      };
    }

    case 'CHEAP_BOMB_ROLL': {
      if (state.phase !== TurnPhase.CheapBombRoll) return state;

      const roll = action.roll;
      const bomb = state.bomb!;
      const hit = roll >= 4;
      const target = getPlayer(state, bomb.targetId);
      const attacker = getPlayer(state, bomb.attackerId);

      // Deduct the 5 fuel cost at commit time (not at purchase)
      let s: GameState = updatePlayer(state, attacker.id, { fuel: attacker.fuel - 5 });
      s = addLog(s, attacker.name, 'Bought a Cheap Bomb for 5 fuel.');
      s = {
        ...s,
        bomb: { ...bomb, roll, hit },
      };

      if (hit) {
        // Check if target has oil tycoon — bomb hits target the oil tycoon first?
        // Actually bombs target the player for plane loss, not the oil tycoon.
        // Oil tycoon damage is separate (it counts bomb hits independently).
        // Per the rules: cheap bomb 4-6 hit = lose plane. AA then insurance protect.
        // Oil tycoon: destroyed by 3 bomb hits. AA blocks.
        // Both happen: plane loss attempt AND oil tycoon damage if target has one.

        s = addLog(s, attacker.name, `Cheap Bomb hit ${target.name}! (rolled ${roll})`);

        // Damage oil tycoon if target has one (with its own AA check)
        if (target.hasOilTycoon && getPlayer(s, bomb.targetId).oilTycoonDamage < OIL_TYCOON_HITS_TO_DESTROY) {
          const otResult = damageOilTycoon(s, bomb.targetId);
          s = otResult.state;
        } else {
          // Attempt plane loss with protection checks
          const result = losePlane(s, bomb.targetId, 'cheap_bomb');
          s = result.state;
          if (result.blockedBy) {
            s = { ...s, bomb: { ...s.bomb!, blockedBy: result.blockedBy } };
          }
        }

        s = checkWinner(s);
      } else {
        s = addLog(s, attacker.name, `Cheap Bomb missed ${target.name}. (rolled ${roll})`);
      }

      s = { ...s, phase: TurnPhase.CheapBombResult };
      return s;
    }

    case 'CHEAP_BOMB_ACKNOWLEDGE': {
      if (state.phase !== TurnPhase.CheapBombResult) return state;
      let s: GameState = { ...state, bomb: undefined, phase: TurnPhase.Tax };
      s = checkWinner(s);
      if (s.winnerId) return s;
      return s;
    }

    // ─── Pricey Bomb ───────────────────────────────────
    case 'PRICEY_BOMB_TARGET': {
      if (state.phase !== TurnPhase.PriceyBombTarget) return state;

      const bomb: BombState = {
        ...state.bomb!,
        targetId: action.targetId,
        hit: true,
      };
      const attacker = getPlayer(state, bomb.attackerId);

      // Deduct the 12 fuel cost at commit time (not at purchase)
      let s: GameState = updatePlayer(state, attacker.id, { fuel: attacker.fuel - 12 });
      s = addLog(s, attacker.name, 'Bought a Pricey Bomb for 12 fuel.');
      s = { ...s, bomb };
      const target = getPlayer(s, action.targetId);
      s = addLog(s, attacker.name, `Pricey Bomb targets ${target.name}!`);

      // Pricey bomb: guaranteed hit. OVERRIDES insurance. AA CAN block.
      if (target.hasOilTycoon && getPlayer(s, action.targetId).oilTycoonDamage < OIL_TYCOON_HITS_TO_DESTROY) {
        const otResult = damageOilTycoon(s, action.targetId);
        s = otResult.state;
      } else {
        const result = losePlane(s, action.targetId, 'pricey_bomb');
        s = result.state;
        if (result.blockedBy) {
          s = { ...s, bomb: { ...s.bomb!, blockedBy: result.blockedBy } };
        }
      }

      s = checkWinner(s);
      s = { ...s, phase: TurnPhase.PriceyBombResult };
      return s;
    }

    case 'PRICEY_BOMB_ACKNOWLEDGE': {
      if (state.phase !== TurnPhase.PriceyBombResult) return state;
      let s: GameState = { ...state, bomb: undefined, phase: TurnPhase.Tax };
      s = checkWinner(s);
      if (s.winnerId) return s;
      return s;
    }

    // ─── Trade ────────────────────────────────────────
    case 'TRADE_TARGET': {
      if (state.phase !== TurnPhase.TradeTarget) return state;
      return {
        ...state,
        trade: { ...state.trade!, partnerId: action.partnerId },
        phase: TurnPhase.TradeOffer,
      };
    }

    case 'TRADE_PROPOSE': {
      if (state.phase !== TurnPhase.TradeOffer) return state;

      const { offering, requesting } = action;
      const trade = state.trade!;
      const offerer = currentPlayer(state);
      const partner = getPlayer(state, trade.partnerId!);

      // Validate offerer has what they offer
      if (offering.fuel > offerer.fuel) return state;
      if (offering.planes >= offerer.planes) return state; // must keep at least 1
      if (offering.antiAircraft && !offerer.hasAntiAircraft) return state;
      if (offering.oilTycoon && !offerer.hasOilTycoon) return state;
      if (offering.insurance && offerer.insuranceTurnsLeft <= 0) return state;

      // Validate partner has what's requested
      if (requesting.fuel > partner.fuel) return state;
      if (requesting.planes >= partner.planes) return state; // must keep at least 1
      if (requesting.antiAircraft && !partner.hasAntiAircraft) return state;
      if (requesting.oilTycoon && !partner.hasOilTycoon) return state;
      if (requesting.insurance && partner.insuranceTurnsLeft <= 0) return state;

      // At least one side must offer something
      const offeringEmpty = offering.fuel === 0 && offering.planes === 0 && !offering.antiAircraft && !offering.oilTycoon && !offering.insurance;
      const requestingEmpty = requesting.fuel === 0 && requesting.planes === 0 && !requesting.antiAircraft && !requesting.oilTycoon && !requesting.insurance;
      if (offeringEmpty && requestingEmpty) return state;

      let s: GameState = {
        ...state,
        trade: { ...trade, offering, requesting },
        phase: TurnPhase.TradeHandover,
      };
      s = addLog(s, offerer.name, `Proposed a trade to ${partner.name}.`);
      return s;
    }

    case 'TRADE_HANDOVER_COMPLETE': {
      if (state.phase !== TurnPhase.TradeHandover) return state;
      return { ...state, phase: TurnPhase.TradeResponse };
    }

    case 'TRADE_RESPOND': {
      if (state.phase !== TurnPhase.TradeResponse) return state;

      const trade = state.trade!;
      const offerer = getPlayer(state, trade.offererId);
      const partner = getPlayer(state, trade.partnerId!);
      const offering = trade.offering!;
      const requesting = trade.requesting!;

      if (action.accepted) {
        let s: GameState = { ...state };

        // Transfer fuel
        s = updatePlayer(s, offerer.id, { fuel: getPlayer(s, offerer.id).fuel - offering.fuel + requesting.fuel });
        s = updatePlayer(s, partner.id, { fuel: getPlayer(s, partner.id).fuel - requesting.fuel + offering.fuel });

        // Transfer planes
        s = updatePlayer(s, offerer.id, { planes: getPlayer(s, offerer.id).planes - offering.planes + requesting.planes });
        s = updatePlayer(s, partner.id, { planes: getPlayer(s, partner.id).planes - requesting.planes + offering.planes });

        // Transfer AA — snapshot before mutating
        if (offering.antiAircraft && requesting.antiAircraft) {
          // Both trading AA: both keep AA, reset cooldowns
          s = updatePlayer(s, offerer.id, { antiAircraftCooldown: 0 });
          s = updatePlayer(s, partner.id, { antiAircraftCooldown: 0 });
        } else if (offering.antiAircraft) {
          s = updatePlayer(s, offerer.id, { hasAntiAircraft: false });
          s = updatePlayer(s, partner.id, { hasAntiAircraft: true, antiAircraftCooldown: 0 });
        } else if (requesting.antiAircraft) {
          s = updatePlayer(s, partner.id, { hasAntiAircraft: false });
          s = updatePlayer(s, offerer.id, { hasAntiAircraft: true, antiAircraftCooldown: 0 });
        }

        // Transfer Oil Tycoon (with damage state) — snapshot before mutating
        if (offering.oilTycoon && requesting.oilTycoon) {
          // Both trading OT: swap damage states
          const offererDmg = getPlayer(s, offerer.id).oilTycoonDamage;
          const offererRepair = getPlayer(s, offerer.id).oilTycoonRepairTurnsLeft;
          const partnerDmg = getPlayer(s, partner.id).oilTycoonDamage;
          const partnerRepair = getPlayer(s, partner.id).oilTycoonRepairTurnsLeft;
          s = updatePlayer(s, offerer.id, { oilTycoonDamage: partnerDmg, oilTycoonRepairTurnsLeft: partnerRepair });
          s = updatePlayer(s, partner.id, { oilTycoonDamage: offererDmg, oilTycoonRepairTurnsLeft: offererRepair });
        } else if (offering.oilTycoon) {
          const offererData = getPlayer(s, offerer.id);
          s = updatePlayer(s, partner.id, {
            hasOilTycoon: true,
            oilTycoonDamage: offererData.oilTycoonDamage,
            oilTycoonRepairTurnsLeft: offererData.oilTycoonRepairTurnsLeft,
          });
          s = updatePlayer(s, offerer.id, {
            hasOilTycoon: false,
            oilTycoonDamage: 0,
            oilTycoonRepairTurnsLeft: -1,
          });
        } else if (requesting.oilTycoon) {
          const partnerData = getPlayer(s, partner.id);
          s = updatePlayer(s, offerer.id, {
            hasOilTycoon: true,
            oilTycoonDamage: partnerData.oilTycoonDamage,
            oilTycoonRepairTurnsLeft: partnerData.oilTycoonRepairTurnsLeft,
          });
          s = updatePlayer(s, partner.id, {
            hasOilTycoon: false,
            oilTycoonDamage: 0,
            oilTycoonRepairTurnsLeft: -1,
          });
        }

        // Transfer Insurance — snapshot before mutating
        if (offering.insurance && requesting.insurance) {
          // Both trading insurance: swap turns remaining
          const offererTurns = getPlayer(s, offerer.id).insuranceTurnsLeft;
          const partnerTurns = getPlayer(s, partner.id).insuranceTurnsLeft;
          s = updatePlayer(s, offerer.id, { insuranceTurnsLeft: partnerTurns, insuranceUsed: true });
          s = updatePlayer(s, partner.id, { insuranceTurnsLeft: offererTurns, insuranceUsed: true });
        } else if (offering.insurance) {
          const offererData = getPlayer(s, offerer.id);
          s = updatePlayer(s, partner.id, {
            insuranceTurnsLeft: offererData.insuranceTurnsLeft,
            insuranceUsed: true,
          });
          s = updatePlayer(s, offerer.id, { insuranceTurnsLeft: 0 });
        } else if (requesting.insurance) {
          const partnerData = getPlayer(s, partner.id);
          s = updatePlayer(s, offerer.id, {
            insuranceTurnsLeft: partnerData.insuranceTurnsLeft,
            insuranceUsed: true,
          });
          s = updatePlayer(s, partner.id, { insuranceTurnsLeft: 0 });
        }

        s = addLog(s, partner.name, `Accepted trade with ${offerer.name}.`);
        s = {
          ...s,
          trade: { ...trade, accepted: true },
          phase: TurnPhase.TradeResult,
        };
        return s;
      } else {
        let s = addLog(state, partner.name, `Declined trade with ${offerer.name}.`);
        s = {
          ...s,
          trade: { ...trade, accepted: false },
          phase: TurnPhase.TradeResult,
        };
        return s;
      }
    }

    case 'TRADE_ACKNOWLEDGE': {
      if (state.phase !== TurnPhase.TradeResult) return state;
      return { ...state, trade: undefined, phase: TurnPhase.Tax };
    }

    // ─── Mercenary ─────────────────────────────────────
    case 'MERCENARY_TARGET': {
      if (state.phase !== TurnPhase.MercenaryTarget) return state;
      return {
        ...state,
        mercenary: { ...state.mercenary!, mercenaryId: action.mercenaryId },
        phase: TurnPhase.MercenaryOffer,
      };
    }

    case 'MERCENARY_OFFER': {
      if (state.phase !== TurnPhase.MercenaryOffer) return state;

      const amount = action.amount;
      if (amount < 1 || amount > 60) return state;

      const player = currentPlayer(state);
      if (player.fuel < amount) return state;

      let s: GameState = {
        ...state,
        mercenary: { ...state.mercenary!, offeredFuel: amount },
        phase: TurnPhase.MercenaryHandover,
      };
      s = addLog(s, player.name, `Offered ${amount} fuel to hire ${getPlayer(s, state.mercenary!.mercenaryId).name} as a mercenary.`);
      return s;
    }

    case 'MERCENARY_HANDOVER_COMPLETE': {
      if (state.phase !== TurnPhase.MercenaryHandover) return state;
      return { ...state, phase: TurnPhase.MercenaryResponse };
    }

    case 'MERCENARY_RESPOND': {
      if (state.phase !== TurnPhase.MercenaryResponse) return state;

      const merc = state.mercenary!;
      const hirer = getPlayer(state, merc.hirerId);
      const mercenary = getPlayer(state, merc.mercenaryId);

      if (action.accepted) {
        // Transfer fuel: hirer pays, mercenary receives
        let s = updatePlayer(state, merc.hirerId, {
          fuel: hirer.fuel - merc.offeredFuel,
        });
        s = updatePlayer(s, merc.mercenaryId, {
          fuel: mercenary.fuel + merc.offeredFuel,
        });
        s = addLog(s, mercenary.name, `Accepted mercenary offer of ${merc.offeredFuel} fuel from ${hirer.name}.`);
        s = {
          ...s,
          mercenary: { ...merc, accepted: true },
          phase: TurnPhase.MercenaryFightTarget,
        };
        return s;
      } else {
        // Declined
        let s = addLog(state, mercenary.name, `Declined mercenary offer from ${hirer.name}.`);
        s = {
          ...s,
          mercenary: { ...merc, accepted: false },
          phase: TurnPhase.MercenaryComplete,
        };
        return s;
      }
    }

    case 'MERCENARY_FIGHT_TARGET': {
      if (state.phase !== TurnPhase.MercenaryFightTarget) return state;
      return {
        ...state,
        mercenary: { ...state.mercenary!, targetId: action.targetId },
        phase: TurnPhase.MercenaryFightRoll,
      };
    }

    case 'MERCENARY_FIGHT_COUNT_ROLL': {
      if (state.phase !== TurnPhase.MercenaryFightRoll) return state;

      const roll = action.roll;
      const fightCount = fuelForRoll(roll); // 6 = 10 fights, otherwise face value
      const merc = state.mercenary!;

      let s: GameState = {
        ...state,
        mercenary: {
          ...merc,
          fightCount,
          fightsCompleted: 0,
          currentFight: {
            attackerId: merc.mercenaryId,
            defenderId: merc.targetId!,
          },
        },
        phase: TurnPhase.MercenaryFight,
      };

      const mercenary = getPlayer(s, merc.mercenaryId);
      const target = getPlayer(s, merc.targetId!);
      s = addLog(s, mercenary.name, `Rolled ${roll} for mercenary fights: ${fightCount} dog fight(s) against ${target.name}.`);
      return s;
    }

    case 'MERCENARY_FIGHT_ROLL': {
      if (state.phase !== TurnPhase.MercenaryFight) return state;

      const { attackerRoll } = action;
      const merc = state.mercenary!;
      const fight = merc.currentFight!;
      const loserId = attackerRoll <= 3 ? fight.attackerId : fight.defenderId;

      let s: GameState = {
        ...state,
        mercenary: {
          ...merc,
          currentFight: {
            ...fight,
            attackerRoll,
            loserId,
          },
          fightsCompleted: merc.fightsCompleted + 1,
        },
      };

      const mercenary = getPlayer(s, fight.attackerId);
      const target = getPlayer(s, fight.defenderId);
      const loserName = loserId === fight.attackerId ? mercenary.name : target.name;

      // Loser loses a plane
      const result = losePlane(s, loserId, 'dogfight');
      s = result.state;

      if (result.blocked) {
        s = addLog(
          s,
          mercenary.name,
          `Mercenary fight ${merc.fightsCompleted + 1}/${merc.fightCount}: ${mercenary.name} rolled ${attackerRoll}. ${loserName}'s ${result.blockedBy === 'anti_aircraft' ? 'Anti-Aircraft' : 'Insurance'} absorbed the hit!`,
        );
        const blockedMerc = getPlayer(s, fight.attackerId);
        const blockedTarget = getPlayer(s, fight.defenderId);
        s = addLog(s, mercenary.name, `  ${blockedMerc.name}: ${blockedMerc.planes} planes, ${blockedMerc.fuel} fuel`);
        s = addLog(s, mercenary.name, `  ${blockedTarget.name}: ${blockedTarget.planes} planes, ${blockedTarget.fuel} fuel`);
        s = {
          ...s,
          mercenary: {
            ...s.mercenary!,
            currentFight: { ...s.mercenary!.currentFight!, blockedBy: result.blockedBy },
          },
        };
      } else {
        // Loser loses fuel, winner gains it (only if not blocked)
        const loser = getPlayer(s, loserId);
        const winnerId = loserId === fight.attackerId ? fight.defenderId : fight.attackerId;
        const fuelTransfer = Math.min(loser.fuel, DOGFIGHT_FUEL_PENALTY);
        s = updatePlayer(s, loserId, { fuel: loser.fuel - fuelTransfer });
        const winner = getPlayer(s, winnerId);
        s = updatePlayer(s, winnerId, { fuel: winner.fuel + fuelTransfer });
        s = addLog(
          s,
          mercenary.name,
          `Mercenary fight ${merc.fightsCompleted + 1}/${merc.fightCount}: ${mercenary.name} rolled ${attackerRoll}. ${loserName} loses a plane and ${fuelTransfer} fuel to ${winner.name}!`,
        );
        const updatedLoser = getPlayer(s, loserId);
        const updatedWinner = getPlayer(s, winnerId);
        s = addLog(s, mercenary.name, `  ${updatedWinner.name}: ${updatedWinner.planes} planes, ${updatedWinner.fuel} fuel (+${fuelTransfer} fuel)`);
        s = addLog(s, mercenary.name, `  ${updatedLoser.name}: ${updatedLoser.planes} planes, ${updatedLoser.fuel} fuel (-1 plane, -${fuelTransfer} fuel)`);
      }

      s = checkWinner(s);
      s = { ...s, phase: TurnPhase.MercenaryFightResult };
      return s;
    }

    case 'MERCENARY_FIGHT_ACKNOWLEDGE': {
      if (state.phase !== TurnPhase.MercenaryFightResult) return state;

      let s = checkWinner(state);
      if (s.winnerId) return s;

      const merc = s.mercenary!;
      const mercenary = getPlayer(s, merc.mercenaryId);
      const target = getPlayer(s, merc.targetId!);

      // Check if either combatant is dead, or all fights done
      const allFightsDone = merc.fightsCompleted >= merc.fightCount!;
      const mercenaryDead = !mercenary.alive;
      const targetDead = !target.alive;

      if (allFightsDone || mercenaryDead || targetDead) {
        s = {
          ...s,
          mercenary: { ...merc, currentFight: undefined },
          phase: TurnPhase.MercenaryComplete,
        };
        if (mercenaryDead) {
          s = addLog(s, mercenary.name, 'Mercenary was eliminated. Remaining fights cancelled.');
        } else if (targetDead) {
          s = addLog(s, target.name, 'Target was eliminated. Remaining fights cancelled.');
        }
        return s;
      }

      // More fights to go — reset current fight
      s = {
        ...s,
        mercenary: {
          ...merc,
          currentFight: {
            attackerId: merc.mercenaryId,
            defenderId: merc.targetId!,
          },
        },
        phase: TurnPhase.MercenaryFight,
      };
      return s;
    }

    case 'MERCENARY_COMPLETE_ACKNOWLEDGE': {
      if (state.phase !== TurnPhase.MercenaryComplete) return state;
      let s: GameState = {
        ...state,
        mercenary: undefined,
        phase: TurnPhase.Tax,
      };
      s = checkWinner(s);
      if (s.winnerId) return s;

      // If the current player was eliminated via mercenary, skip to turn end
      const player = currentPlayer(s);
      if (!player.alive) {
        s = { ...s, phase: TurnPhase.TurnEnd };
      }
      return s;
    }

    // ─── Oil Tycoon Repair ─────────────────────────────
    case 'OIL_TYCOON_REPAIR': {
      if (state.phase !== TurnPhase.OilTycoonRepair) return state;

      const player = currentPlayer(state);
      if (player.fuel < OIL_TYCOON_REPAIR_COST) return state;
      if (player.oilTycoonRepairTurnsLeft <= 0) return state;

      let s = updatePlayer(state, player.id, {
        fuel: player.fuel - OIL_TYCOON_REPAIR_COST,
        oilTycoonDamage: 0,
        oilTycoonRepairTurnsLeft: -1,
      });
      s = addLog(s, player.name, `Repaired Oil Tycoon for ${OIL_TYCOON_REPAIR_COST} fuel.`);
      s = { ...s, phase: TurnPhase.TurnEnd };
      return s;
    }

    case 'OIL_TYCOON_SKIP_REPAIR': {
      if (state.phase !== TurnPhase.OilTycoonRepair) return state;
      return { ...state, phase: TurnPhase.TurnEnd };
    }

    // ─── Tax ───────────────────────────────────────────
    case 'PAY_TAX': {
      if (state.phase !== TurnPhase.Tax) return state;

      const player = currentPlayer(state);
      const taxOwed = FUEL_TAX_PER_PLANE * player.planes;

      let s: GameState = { ...state };

      if (player.fuel >= taxOwed) {
        // Can afford full tax
        s = updatePlayer(s, player.id, { fuel: player.fuel - taxOwed });
        s = addLog(s, player.name, `Paid ${taxOwed} fuel in tax (${FUEL_TAX_PER_PLANE} x ${player.planes} planes).`);
      } else {
        // Can't afford full tax — pay what you can, lose MAX 1 plane
        const paid = player.fuel;
        s = updatePlayer(s, player.id, { fuel: 0 });
        s = addLog(s, player.name, `Could only pay ${paid}/${taxOwed} fuel tax.`);

        const result = losePlane(s, player.id, 'tax');
        s = result.state;
        s = checkWinner(s);
        if (s.winnerId) return s;

        // If player eliminated, go to turn end
        if (!getPlayer(s, player.id).alive) {
          s = { ...s, phase: TurnPhase.TurnEnd };
          return s;
        }
      }

      // Check if player has destroyed oil tycoon needing repair
      const updatedPlayer = getPlayer(s, player.id);
      if (
        updatedPlayer.hasOilTycoon &&
        updatedPlayer.oilTycoonDamage >= OIL_TYCOON_HITS_TO_DESTROY &&
        updatedPlayer.oilTycoonRepairTurnsLeft > 0
      ) {
        s = { ...s, phase: TurnPhase.OilTycoonRepair };
        return s;
      }

      s = { ...s, phase: TurnPhase.TurnEnd };
      return s;
    }

    // ─── Turn End ──────────────────────────────────────
    case 'END_TURN': {
      if (state.phase !== TurnPhase.TurnEnd) return state;

      const player = currentPlayer(state);
      let s: GameState = { ...state };

      // Only tick counters if the player is still alive
      if (player.alive) {
        let insuranceTurnsLeft = player.insuranceTurnsLeft;
        let antiAircraftCooldown = player.antiAircraftCooldown;
        let oilTycoonRepairTurnsLeft = player.oilTycoonRepairTurnsLeft;
        let hasOilTycoon = player.hasOilTycoon;
        let oilTycoonDamage = player.oilTycoonDamage;

        // Tick down insurance
        if (insuranceTurnsLeft > 0) {
          insuranceTurnsLeft -= 1;
          if (insuranceTurnsLeft === 0) {
            s = addLog(s, player.name, 'Insurance expired.');
          }
        }

        // Tick down AA cooldown
        if (antiAircraftCooldown > 0) {
          antiAircraftCooldown -= 1;
          if (antiAircraftCooldown === 0) {
            s = addLog(s, player.name, 'Anti-Aircraft cooldown expired. Can purchase again.');
          }
        }

        // Tick down oil tycoon repair window
        if (oilTycoonRepairTurnsLeft > 0) {
          oilTycoonRepairTurnsLeft -= 1;
          if (oilTycoonRepairTurnsLeft === 0) {
            // Repair window expired — lose oil tycoon permanently
            hasOilTycoon = false;
            oilTycoonDamage = 0;
            oilTycoonRepairTurnsLeft = -1;
            s = addLog(s, player.name, 'Oil Tycoon repair window expired. Oil Tycoon lost permanently!');
          }
        }

        // Oil tycoon income
        let fuelBonus = 0;
        if (hasOilTycoon && oilTycoonDamage < OIL_TYCOON_HITS_TO_DESTROY) {
          fuelBonus = OIL_TYCOON_INCOME;
          s = addLog(s, player.name, `Oil Tycoon produced ${OIL_TYCOON_INCOME} fuel.`);
        }

        s = updatePlayer(s, player.id, {
          insuranceTurnsLeft,
          antiAircraftCooldown,
          oilTycoonRepairTurnsLeft,
          hasOilTycoon,
          oilTycoonDamage,
          fuel: getPlayer(s, player.id).fuel + fuelBonus,
        });
      }

      // Advance to next alive player
      const nextIndex = getNextAlivePlayerIndex(s.players, s.currentPlayerIndex);

      // Check win — if nextIndex equals current index, current player is last alive
      s = checkWinner(s);
      if (s.winnerId) return s;

      const nextPlayer = s.players[nextIndex];
      s = addLog(s, 'Game', `${nextPlayer.name}'s turn.`);

      s = {
        ...s,
        currentPlayerIndex: nextIndex,
        turnNumber: s.turnNumber + 1,
        phase: TurnPhase.Roll,
        lastRoll: undefined,
        rollResult: undefined,
        dogFight: undefined,
        mercenary: undefined,
        bomb: undefined,
        trade: undefined,
        digForFuelRoll: undefined,
        screen: GameScreen.Handover,
      };

      return s;
    }

    default:
      return state;
  }
}

// ── Initial state factory ────────────────────────────────

export function createInitialState(): GameState {
  return initialState();
}
