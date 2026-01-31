import { describe, it, expect } from 'vitest';
import { gameReducer, createInitialState } from './gameReducer.ts';
import type { GameState, Player } from '../types/game.ts';
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
} from '../types/game.ts';
import { ShopItemId } from '../types/shop.ts';

// ── Helpers ──────────────────────────────────────────────

/** Create a game that has started and completed the handover (screen=Playing, phase=Roll). */
function startedGame(overrides?: Partial<GameState>): GameState {
  let s = gameReducer(createInitialState(), {
    type: 'START_GAME',
    playerNames: ['Alice', 'Bob'],
    gameId: 'test-game',
  });
  s = gameReducer(s, { type: 'HANDOVER_COMPLETE' });
  return { ...s, ...overrides };
}

/** Return a copy of state with a specific player mutated. */
function withPlayer(
  state: GameState,
  index: number,
  overrides: Partial<Player>,
): GameState {
  return {
    ...state,
    players: state.players.map((p, i) =>
      i === index ? { ...p, ...overrides } : p,
    ),
  };
}

/** Three-player started game (handy for mercenary / bomb tests). */
function threePlayerGame(overrides?: Partial<GameState>): GameState {
  let s = gameReducer(createInitialState(), {
    type: 'START_GAME',
    playerNames: ['Alice', 'Bob', 'Charlie'],
    gameId: 'test-game-3p',
  });
  s = gameReducer(s, { type: 'HANDOVER_COMPLETE' });
  return { ...s, ...overrides };
}

// ─────────────────────────────────────────────────────────
// 1-3  Core Game Flow
// ─────────────────────────────────────────────────────────
describe('Core Game Flow', () => {
  it('1. START_GAME creates players with correct starting values', () => {
    const s = gameReducer(createInitialState(), {
      type: 'START_GAME',
      playerNames: ['Alice', 'Bob'],
      gameId: 'test-1',
    });
    expect(s.players).toHaveLength(2);
    for (const p of s.players) {
      expect(p.planes).toBe(STARTING_PLANES);
      expect(p.fuel).toBe(STARTING_FUEL);
      expect(p.alive).toBe(true);
    }
    expect(s.players[0].name).toBe('Alice');
    expect(s.players[1].name).toBe('Bob');
    expect(s.gameId).toBe('test-1');
  });

  it('2. START_GAME transitions to Handover screen', () => {
    const s = gameReducer(createInitialState(), {
      type: 'START_GAME',
      playerNames: ['Alice', 'Bob'],
      gameId: 'test-2',
    });
    expect(s.screen).toBe(GameScreen.Handover);
  });

  it('3. HANDOVER_COMPLETE transitions to Playing screen', () => {
    let s = gameReducer(createInitialState(), {
      type: 'START_GAME',
      playerNames: ['Alice', 'Bob'],
      gameId: 'test-3',
    });
    s = gameReducer(s, { type: 'HANDOVER_COMPLETE' });
    expect(s.screen).toBe(GameScreen.Playing);
  });

  it('createInitialState defaults to Home screen', () => {
    const s = createInitialState();
    expect(s.screen).toBe(GameScreen.Home);
    expect(s.gameId).toBe('');
  });

  it('GO_HOME returns to initial state', () => {
    const s0 = startedGame();
    const s = gameReducer(s0, { type: 'GO_HOME' });
    expect(s.screen).toBe(GameScreen.Home);
    expect(s.gameId).toBe('');
    expect(s.players).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────
// 4-10  Die Roll
// ─────────────────────────────────────────────────────────
describe('Die Roll', () => {
  it('4. Roll 1: player loses a plane', () => {
    const s0 = startedGame();
    let s = gameReducer(s0, { type: 'ROLL_DIE', roll: 1 });
    expect(s.players[0].planes).toBe(STARTING_PLANES - 1);
    expect(s.phase).toBe(TurnPhase.RollResult);
    s = gameReducer(s, { type: 'ROLL_ACKNOWLEDGE' });
    expect(s.phase).toBe(TurnPhase.Shop);
  });

  it('5. Roll 2: transitions to DogFight phase via RollResult', () => {
    const s0 = startedGame();
    let s = gameReducer(s0, { type: 'ROLL_DIE', roll: 2 });
    expect(s.phase).toBe(TurnPhase.RollResult);
    expect(s.dogFight).toBeDefined();
    expect(s.dogFight!.attackerId).toBe(s.players[0].id);
    s = gameReducer(s, { type: 'ROLL_ACKNOWLEDGE' });
    expect(s.phase).toBe(TurnPhase.DogFight);
  });

  it('6. Roll 3: gains 3 x planes fuel', () => {
    const s0 = startedGame();
    let s = gameReducer(s0, { type: 'ROLL_DIE', roll: 3 });
    expect(s.players[0].fuel).toBe(STARTING_FUEL + 3 * STARTING_PLANES);
    expect(s.phase).toBe(TurnPhase.RollResult);
    s = gameReducer(s, { type: 'ROLL_ACKNOWLEDGE' });
    expect(s.phase).toBe(TurnPhase.Shop);
  });

  it('7. Roll 4: gains 4 x planes fuel', () => {
    const s0 = startedGame();
    const s = gameReducer(s0, { type: 'ROLL_DIE', roll: 4 });
    expect(s.players[0].fuel).toBe(STARTING_FUEL + 4 * STARTING_PLANES);
  });

  it('8. Roll 5: gains 5 x planes fuel', () => {
    const s0 = startedGame();
    const s = gameReducer(s0, { type: 'ROLL_DIE', roll: 5 });
    expect(s.players[0].fuel).toBe(STARTING_FUEL + 5 * STARTING_PLANES);
  });

  it('9. Roll 6: gains 10 x planes fuel', () => {
    const s0 = startedGame();
    const s = gameReducer(s0, { type: 'ROLL_DIE', roll: 6 });
    expect(s.players[0].fuel).toBe(STARTING_FUEL + 10 * STARTING_PLANES);
  });

  it('10. ROLL_DIE is ignored when not in Roll phase', () => {
    const s0 = startedGame({ phase: TurnPhase.Shop });
    const s = gameReducer(s0, { type: 'ROLL_DIE', roll: 6 });
    // State unchanged (fuel same)
    expect(s.players[0].fuel).toBe(s0.players[0].fuel);
  });
});

// ─────────────────────────────────────────────────────────
// 11-14  Dog Fight
// ─────────────────────────────────────────────────────────
describe('Dog Fight', () => {
  function dogFightState(): GameState {
    let s = startedGame();
    s = gameReducer(s, { type: 'ROLL_DIE', roll: 2 });
    s = gameReducer(s, { type: 'ROLL_ACKNOWLEDGE' }); // enters DogFight phase
    return s;
  }

  it('11. DOG_FIGHT_PICK sets defender and transitions to DogFightResult', () => {
    const s0 = dogFightState();
    const s = gameReducer(s0, {
      type: 'DOG_FIGHT_PICK',
      defenderId: s0.players[1].id,
    });
    expect(s.phase).toBe(TurnPhase.DogFightResult);
    expect(s.dogFight!.defenderId).toBe(s0.players[1].id);
  });

  it('12. DOG_FIGHT_ROLL with attackerRoll 1-3: attacker loses plane and 10 fuel', () => {
    let s = dogFightState();
    const attackerFuelBefore = s.players[0].fuel;
    s = gameReducer(s, {
      type: 'DOG_FIGHT_PICK',
      defenderId: s.players[1].id,
    });
    s = gameReducer(s, {
      type: 'DOG_FIGHT_ROLL',
      attackerRoll: 2,
    });
    expect(s.dogFight!.loserId).toBe(s.players[0].id);
    expect(s.players[0].planes).toBe(STARTING_PLANES - 1);
    expect(s.players[0].fuel).toBe(attackerFuelBefore - 10);
    expect(s.players[1].planes).toBe(STARTING_PLANES);
  });

  it('13. DOG_FIGHT_ROLL with attackerRoll 4-6: defender loses plane and 10 fuel', () => {
    let s = dogFightState();
    const defenderFuelBefore = s.players[1].fuel;
    s = gameReducer(s, {
      type: 'DOG_FIGHT_PICK',
      defenderId: s.players[1].id,
    });
    s = gameReducer(s, {
      type: 'DOG_FIGHT_ROLL',
      attackerRoll: 5,
    });
    expect(s.dogFight!.loserId).toBe(s.players[1].id);
    expect(s.players[0].planes).toBe(STARTING_PLANES);
    expect(s.players[1].planes).toBe(STARTING_PLANES - 1);
    expect(s.players[1].fuel).toBe(defenderFuelBefore - 10);
  });

  it('14. DOG_FIGHT_ACKNOWLEDGE clears dogFight and transitions to Shop', () => {
    let s = dogFightState();
    s = gameReducer(s, {
      type: 'DOG_FIGHT_PICK',
      defenderId: s.players[1].id,
    });
    s = gameReducer(s, {
      type: 'DOG_FIGHT_ROLL',
      attackerRoll: 5,
    });
    s = gameReducer(s, { type: 'DOG_FIGHT_ACKNOWLEDGE' });
    expect(s.dogFight).toBeUndefined();
    expect(s.phase).toBe(TurnPhase.Shop);
  });
});

// ─────────────────────────────────────────────────────────
// 15-19  Shop - Basic Items
// ─────────────────────────────────────────────────────────
describe('Shop - Basic Items', () => {
  function shopPhase(fuel?: number): GameState {
    let s = startedGame({ phase: TurnPhase.Shop });
    if (fuel !== undefined) {
      s = withPlayer(s, 0, { fuel });
    }
    return s;
  }

  it('15. BUY_ITEM Plane: costs 10 fuel, gains 1 plane', () => {
    const s0 = shopPhase(50);
    const s = gameReducer(s0, { type: 'BUY_ITEM', itemId: ShopItemId.Plane });
    expect(s.players[0].fuel).toBe(40);
    expect(s.players[0].planes).toBe(STARTING_PLANES + 1);
    expect(s.phase).toBe(TurnPhase.Tax);
  });

  it('16. BUY_ITEM TwoPlanePack: costs 15 fuel, gains 2 planes', () => {
    const s0 = shopPhase(50);
    const s = gameReducer(s0, {
      type: 'BUY_ITEM',
      itemId: ShopItemId.TwoPlanePack,
    });
    expect(s.players[0].fuel).toBe(35);
    expect(s.players[0].planes).toBe(STARTING_PLANES + 2);
    expect(s.phase).toBe(TurnPhase.Tax);
  });

  it('17. BUY_ITEM DigForFuel: costs 1 fuel, transitions to DigForFuelRoll', () => {
    const s0 = shopPhase(50);
    const s = gameReducer(s0, {
      type: 'BUY_ITEM',
      itemId: ShopItemId.DigForFuel,
    });
    expect(s.players[0].fuel).toBe(49);
    expect(s.phase).toBe(TurnPhase.DigForFuelRoll);
  });

  it('18. DIG_FOR_FUEL_ROLL: adds fuel (6 = 10 fuel, otherwise face value)', () => {
    // Roll a 4 => gain 4
    let s = shopPhase(50);
    s = gameReducer(s, { type: 'BUY_ITEM', itemId: ShopItemId.DigForFuel });
    const fuelAfterBuy = s.players[0].fuel; // 49
    s = gameReducer(s, { type: 'DIG_FOR_FUEL_ROLL', roll: 4 });
    expect(s.players[0].fuel).toBe(fuelAfterBuy + 4);
    expect(s.phase).toBe(TurnPhase.DigForFuelResult);

    // Roll a 6 => gain 10
    let s2 = shopPhase(50);
    s2 = gameReducer(s2, { type: 'BUY_ITEM', itemId: ShopItemId.DigForFuel });
    const fuelAfterBuy2 = s2.players[0].fuel; // 49
    s2 = gameReducer(s2, { type: 'DIG_FOR_FUEL_ROLL', roll: 6 });
    expect(s2.players[0].fuel).toBe(fuelAfterBuy2 + 10);
  });

  it('19. SKIP_SHOP transitions to Tax', () => {
    const s0 = shopPhase();
    const s = gameReducer(s0, { type: 'SKIP_SHOP' });
    expect(s.phase).toBe(TurnPhase.Tax);
  });
});

// ─────────────────────────────────────────────────────────
// 20-24  Shop - Insurance
// ─────────────────────────────────────────────────────────
describe('Shop - Insurance', () => {
  function shopPhase(fuel?: number): GameState {
    let s = startedGame({ phase: TurnPhase.Shop });
    if (fuel !== undefined) {
      s = withPlayer(s, 0, { fuel });
    }
    return s;
  }

  it('20. BUY_ITEM Insurance: costs 10 fuel, sets insuranceTurnsLeft to 3', () => {
    const s0 = shopPhase(50);
    const s = gameReducer(s0, {
      type: 'BUY_ITEM',
      itemId: ShopItemId.Insurance,
    });
    expect(s.players[0].fuel).toBe(40);
    expect(s.players[0].insuranceTurnsLeft).toBe(INSURANCE_DURATION);
    expect(s.players[0].insuranceUsed).toBe(true);
  });

  it('21. Insurance can only be bought once per game', () => {
    const s0 = shopPhase(50);
    const s1 = gameReducer(s0, {
      type: 'BUY_ITEM',
      itemId: ShopItemId.Insurance,
    });
    // Simulate getting back to shop after insurance expires
    const s2: GameState = {
      ...s1,
      phase: TurnPhase.Shop,
      players: s1.players.map((p, i) =>
        i === 0
          ? { ...p, fuel: 50, insuranceTurnsLeft: 0, insuranceUsed: true }
          : p,
      ),
    };
    const s3 = gameReducer(s2, {
      type: 'BUY_ITEM',
      itemId: ShopItemId.Insurance,
    });
    // Should not change because insuranceUsed is true
    expect(s3.players[0].fuel).toBe(50);
    expect(s3.players[0].insuranceTurnsLeft).toBe(0);
  });

  it('22. Insurance protects against roll-1 plane loss', () => {
    let s = startedGame();
    s = withPlayer(s, 0, { insuranceTurnsLeft: 2, insuranceUsed: true });
    s = gameReducer(s, { type: 'ROLL_DIE', roll: 1 });
    // Plane should NOT be lost
    expect(s.players[0].planes).toBe(STARTING_PLANES);
  });

  it('23. Insurance protects against dog fight plane loss', () => {
    let s = startedGame();
    s = withPlayer(s, 0, { insuranceTurnsLeft: 2, insuranceUsed: true });
    s = gameReducer(s, { type: 'ROLL_DIE', roll: 2 }); // dog fight
    s = gameReducer(s, {
      type: 'DOG_FIGHT_PICK',
      defenderId: s.players[1].id,
    });
    // Attacker rolls low (1-3) => attacker (player 0) loses - but insurance blocks plane loss
    s = gameReducer(s, {
      type: 'DOG_FIGHT_ROLL',
      attackerRoll: 1,
    });
    expect(s.players[0].planes).toBe(STARTING_PLANES);
  });

  it('24. Insurance does NOT protect against Pricey Bomb', () => {
    let s = startedGame({ phase: TurnPhase.Shop });
    // Give Bob (player 1) insurance
    s = withPlayer(s, 1, { insuranceTurnsLeft: 3, insuranceUsed: true });
    // Give Alice enough fuel for pricey bomb
    s = withPlayer(s, 0, { fuel: 100 });
    s = gameReducer(s, { type: 'BUY_ITEM', itemId: ShopItemId.PriceyBomb });
    s = gameReducer(s, {
      type: 'PRICEY_BOMB_TARGET',
      targetId: s.players[1].id,
    });
    // Bob should lose a plane despite insurance
    expect(s.players[1].planes).toBe(STARTING_PLANES - 1);
  });
});

// ─────────────────────────────────────────────────────────
// 25-29  Shop - Bombs
// ─────────────────────────────────────────────────────────
describe('Shop - Bombs', () => {
  it('25. BUY_ITEM CheapBomb: costs 5 fuel, transitions to target selection', () => {
    let s = startedGame({ phase: TurnPhase.Shop });
    s = withPlayer(s, 0, { fuel: 50 });
    const s1 = gameReducer(s, {
      type: 'BUY_ITEM',
      itemId: ShopItemId.CheapBomb,
    });
    expect(s1.players[0].fuel).toBe(45);
    expect(s1.phase).toBe(TurnPhase.CheapBombTarget);
    expect(s1.bomb).toBeDefined();
  });

  it('26. CHEAP_BOMB_ROLL 1-3: miss (no plane lost)', () => {
    let s = startedGame({ phase: TurnPhase.Shop });
    s = withPlayer(s, 0, { fuel: 50 });
    s = gameReducer(s, { type: 'BUY_ITEM', itemId: ShopItemId.CheapBomb });
    s = gameReducer(s, {
      type: 'CHEAP_BOMB_TARGET',
      targetId: s.players[1].id,
    });
    s = gameReducer(s, { type: 'CHEAP_BOMB_ROLL', roll: 2 });
    expect(s.bomb!.hit).toBe(false);
    expect(s.players[1].planes).toBe(STARTING_PLANES);
  });

  it('27. CHEAP_BOMB_ROLL 4-6: hit (target loses plane)', () => {
    let s = startedGame({ phase: TurnPhase.Shop });
    s = withPlayer(s, 0, { fuel: 50 });
    s = gameReducer(s, { type: 'BUY_ITEM', itemId: ShopItemId.CheapBomb });
    s = gameReducer(s, {
      type: 'CHEAP_BOMB_TARGET',
      targetId: s.players[1].id,
    });
    s = gameReducer(s, { type: 'CHEAP_BOMB_ROLL', roll: 5 });
    expect(s.bomb!.hit).toBe(true);
    expect(s.players[1].planes).toBe(STARTING_PLANES - 1);
  });

  it('28. BUY_ITEM PriceyBomb: costs 12 fuel, guaranteed hit', () => {
    let s = startedGame({ phase: TurnPhase.Shop });
    s = withPlayer(s, 0, { fuel: 100 });
    s = gameReducer(s, { type: 'BUY_ITEM', itemId: ShopItemId.PriceyBomb });
    expect(s.players[0].fuel).toBe(88);
    expect(s.phase).toBe(TurnPhase.PriceyBombTarget);

    s = gameReducer(s, {
      type: 'PRICEY_BOMB_TARGET',
      targetId: s.players[1].id,
    });
    expect(s.players[1].planes).toBe(STARTING_PLANES - 1);
  });

  it('29. Pricey Bomb overrides insurance', () => {
    let s = startedGame({ phase: TurnPhase.Shop });
    s = withPlayer(s, 0, { fuel: 100 });
    s = withPlayer(s, 1, { insuranceTurnsLeft: 3, insuranceUsed: true });
    s = gameReducer(s, { type: 'BUY_ITEM', itemId: ShopItemId.PriceyBomb });
    s = gameReducer(s, {
      type: 'PRICEY_BOMB_TARGET',
      targetId: s.players[1].id,
    });
    expect(s.players[1].planes).toBe(STARTING_PLANES - 1);
  });
});

// ─────────────────────────────────────────────────────────
// 30-35  Shop - Anti-Aircraft
// ─────────────────────────────────────────────────────────
describe('Shop - Anti-Aircraft', () => {
  it('30. BUY_ITEM AntiAircraft: costs 12 fuel', () => {
    let s = startedGame({ phase: TurnPhase.Shop });
    s = withPlayer(s, 0, { fuel: 50 });
    const s1 = gameReducer(s, {
      type: 'BUY_ITEM',
      itemId: ShopItemId.AntiAircraft,
    });
    expect(s1.players[0].fuel).toBe(38);
    expect(s1.players[0].hasAntiAircraft).toBe(true);
    expect(s1.phase).toBe(TurnPhase.Tax);
  });

  it('31. AA absorbs a hit and is destroyed', () => {
    let s = startedGame();
    s = withPlayer(s, 0, { hasAntiAircraft: true });
    // Roll a 1 => should normally lose a plane, but AA blocks it
    s = gameReducer(s, { type: 'ROLL_DIE', roll: 1 });
    expect(s.players[0].planes).toBe(STARTING_PLANES); // plane preserved
    expect(s.players[0].hasAntiAircraft).toBe(false); // AA gone
    expect(s.players[0].antiAircraftCooldown).toBe(AA_COOLDOWN);
  });

  it('32. AA blocks before insurance is checked', () => {
    let s = startedGame();
    // Player 0 has both AA and insurance
    s = withPlayer(s, 0, {
      hasAntiAircraft: true,
      insuranceTurnsLeft: 3,
      insuranceUsed: true,
    });
    s = gameReducer(s, { type: 'ROLL_DIE', roll: 1 });
    // AA should have been consumed, insurance should still be intact
    expect(s.players[0].hasAntiAircraft).toBe(false);
    expect(s.players[0].insuranceTurnsLeft).toBe(3); // unchanged
    expect(s.players[0].planes).toBe(STARTING_PLANES);
  });

  it('33. AA has 2-turn cooldown after destruction', () => {
    let s = startedGame({ phase: TurnPhase.Shop });
    // Player 0 has cooldown active
    s = withPlayer(s, 0, {
      fuel: 50,
      hasAntiAircraft: false,
      antiAircraftCooldown: 1,
    });
    const s1 = gameReducer(s, {
      type: 'BUY_ITEM',
      itemId: ShopItemId.AntiAircraft,
    });
    // Should be rejected (cooldown > 0)
    expect(s1.players[0].hasAntiAircraft).toBe(false);
    expect(s1.players[0].fuel).toBe(50); // unchanged
  });

  it('34. AA blocks Pricey Bomb (even though insurance does not)', () => {
    let s = startedGame({ phase: TurnPhase.Shop });
    s = withPlayer(s, 0, { fuel: 100 });
    // Target (Bob) has AA but no insurance
    s = withPlayer(s, 1, { hasAntiAircraft: true });
    s = gameReducer(s, { type: 'BUY_ITEM', itemId: ShopItemId.PriceyBomb });
    s = gameReducer(s, {
      type: 'PRICEY_BOMB_TARGET',
      targetId: s.players[1].id,
    });
    // AA blocks the pricey bomb
    expect(s.players[1].planes).toBe(STARTING_PLANES);
    expect(s.players[1].hasAntiAircraft).toBe(false);
    expect(s.players[1].antiAircraftCooldown).toBe(AA_COOLDOWN);
  });

  it('35. Cannot buy AA during cooldown', () => {
    let s = startedGame({ phase: TurnPhase.Shop });
    s = withPlayer(s, 0, {
      fuel: 50,
      hasAntiAircraft: false,
      antiAircraftCooldown: 2,
    });
    const s1 = gameReducer(s, {
      type: 'BUY_ITEM',
      itemId: ShopItemId.AntiAircraft,
    });
    expect(s1.players[0].hasAntiAircraft).toBe(false);
    expect(s1.players[0].fuel).toBe(50);
  });
});

// ─────────────────────────────────────────────────────────
// 36-38  Tax
// ─────────────────────────────────────────────────────────
describe('Tax', () => {
  it('36. PAY_TAX deducts 4 fuel per plane', () => {
    let s = startedGame({ phase: TurnPhase.Tax });
    s = withPlayer(s, 0, { fuel: 100, planes: 5 });
    const s1 = gameReducer(s, { type: 'PAY_TAX' });
    expect(s1.players[0].fuel).toBe(100 - FUEL_TAX_PER_PLANE * 5);
  });

  it('37. PAY_TAX with insufficient fuel: lose 1 plane', () => {
    let s = startedGame({ phase: TurnPhase.Tax });
    s = withPlayer(s, 0, { fuel: 3, planes: 4 }); // needs 16, has 3
    const s1 = gameReducer(s, { type: 'PAY_TAX' });
    expect(s1.players[0].fuel).toBe(0); // paid what they could
    expect(s1.players[0].planes).toBe(3); // lost 1 plane
  });

  it('38. PAY_TAX with insufficient fuel: insurance protects plane loss', () => {
    let s = startedGame({ phase: TurnPhase.Tax });
    s = withPlayer(s, 0, {
      fuel: 3,
      planes: 4,
      insuranceTurnsLeft: 2,
      insuranceUsed: true,
    });
    const s1 = gameReducer(s, { type: 'PAY_TAX' });
    expect(s1.players[0].fuel).toBe(0);
    // Insurance protects against tax plane loss
    expect(s1.players[0].planes).toBe(4);
  });
});

// ─────────────────────────────────────────────────────────
// 39-43  Turn End
// ─────────────────────────────────────────────────────────
describe('Turn End', () => {
  it('39. END_TURN decrements insurance turns', () => {
    let s = startedGame({ phase: TurnPhase.TurnEnd });
    s = withPlayer(s, 0, { insuranceTurnsLeft: 2, insuranceUsed: true });
    const s1 = gameReducer(s, { type: 'END_TURN' });
    // Player 0 should now have 1 insurance turn left
    // After END_TURN, current player advances, so check the original player 0
    expect(s1.players[0].insuranceTurnsLeft).toBe(1);
  });

  it('40. END_TURN decrements AA cooldown', () => {
    let s = startedGame({ phase: TurnPhase.TurnEnd });
    s = withPlayer(s, 0, { antiAircraftCooldown: 2 });
    const s1 = gameReducer(s, { type: 'END_TURN' });
    expect(s1.players[0].antiAircraftCooldown).toBe(1);
  });

  it('41. END_TURN advances to next alive player', () => {
    let s = startedGame({ phase: TurnPhase.TurnEnd });
    expect(s.currentPlayerIndex).toBe(0);
    const s1 = gameReducer(s, { type: 'END_TURN' });
    expect(s1.currentPlayerIndex).toBe(1);
  });

  it('42. END_TURN applies Oil Tycoon income', () => {
    let s = startedGame({ phase: TurnPhase.TurnEnd });
    s = withPlayer(s, 0, {
      fuel: 50,
      hasOilTycoon: true,
      oilTycoonDamage: 0,
      oilTycoonRepairTurnsLeft: -1,
    });
    const s1 = gameReducer(s, { type: 'END_TURN' });
    expect(s1.players[0].fuel).toBe(50 + OIL_TYCOON_INCOME);
  });

  it('43. END_TURN transitions to Handover screen', () => {
    const s0 = startedGame({ phase: TurnPhase.TurnEnd });
    const s = gameReducer(s0, { type: 'END_TURN' });
    expect(s.screen).toBe(GameScreen.Handover);
  });
});

// ─────────────────────────────────────────────────────────
// 44-46  Elimination and Win
// ─────────────────────────────────────────────────────────
describe('Elimination and Win', () => {
  it('44. Player with 0 planes is eliminated (alive = false)', () => {
    let s = startedGame();
    s = withPlayer(s, 0, { planes: 1 }); // only 1 plane left
    s = gameReducer(s, { type: 'ROLL_DIE', roll: 1 }); // lose it
    expect(s.players[0].planes).toBe(0);
    expect(s.players[0].alive).toBe(false);
  });

  it('45. Eliminated players are skipped', () => {
    let s = threePlayerGame({ phase: TurnPhase.TurnEnd });
    // Alice (0) is current, Bob (1) is dead
    s = withPlayer(s, 1, { planes: 0, alive: false });
    const s1 = gameReducer(s, { type: 'END_TURN' });
    // Should skip Bob (index 1) and go to Charlie (index 2)
    expect(s1.currentPlayerIndex).toBe(2);
  });

  it('46. Last player alive wins (screen = GameOver, winnerId set)', () => {
    let s = startedGame();
    s = withPlayer(s, 0, { planes: 1 });
    s = withPlayer(s, 1, { planes: 0, alive: false });
    // Alice has 1 plane, Bob is dead => roll a 1 to lose Alice's last plane
    // Actually Alice is last alive already. Let us trigger checkWinner via END_TURN.
    // Since Bob is dead and Alice is the only alive player, END_TURN should detect win.
    s = { ...s, phase: TurnPhase.TurnEnd };
    const s1 = gameReducer(s, { type: 'END_TURN' });
    expect(s1.screen).toBe(GameScreen.GameOver);
    expect(s1.winnerId).toBe(s.players[0].id);
  });
});

// ─────────────────────────────────────────────────────────
// 47-48  Donation
// ─────────────────────────────────────────────────────────
describe('Donation', () => {
  function donationSetup(): GameState {
    let s = startedGame({ phase: TurnPhase.Shop });
    s = withPlayer(s, 0, { fuel: 100 });
    // Enter donation flow
    s = gameReducer(s, { type: 'BUY_ITEM', itemId: ShopItemId.Donation });
    s = gameReducer(s, {
      type: 'DONATION_TARGET',
      targetId: s.players[1].id,
    });
    return s;
  }

  it('47. DONATION_AMOUNT transfers fuel (minus 2 fee)', () => {
    const s0 = donationSetup();
    const bobFuelBefore = s0.players[1].fuel;
    const aliceFuelBefore = s0.players[0].fuel;
    const s = gameReducer(s0, { type: 'DONATION_AMOUNT', amount: 20 });
    expect(s.players[0].fuel).toBe(aliceFuelBefore - 22); // amount + 2 fee
    expect(s.players[1].fuel).toBe(bobFuelBefore + 20);
  });

  it('48. Cannot donate more fuel than you have (including fee)', () => {
    let s = startedGame({ phase: TurnPhase.Shop });
    s = withPlayer(s, 0, { fuel: 10 });
    s = gameReducer(s, { type: 'BUY_ITEM', itemId: ShopItemId.Donation });
    s = gameReducer(s, {
      type: 'DONATION_TARGET',
      targetId: s.players[1].id,
    });
    // Try to donate 9 => total cost 11 > 10 fuel
    const s1 = gameReducer(s, { type: 'DONATION_AMOUNT', amount: 9 });
    // Should be rejected: fuel unchanged
    expect(s1.players[0].fuel).toBe(10);
    expect(s1.phase).toBe(TurnPhase.DonationAmount); // still in donation phase
  });
});

// ─────────────────────────────────────────────────────────
// 49-53  Mercenary
// ─────────────────────────────────────────────────────────
describe('Mercenary', () => {
  function mercSetup(): GameState {
    let s = threePlayerGame({ phase: TurnPhase.Shop });
    s = withPlayer(s, 0, { fuel: 100 }); // Alice hires
    // Enter mercenary flow
    s = gameReducer(s, { type: 'BUY_ITEM', itemId: ShopItemId.Mercenary });
    // Alice picks Bob as the mercenary
    s = gameReducer(s, {
      type: 'MERCENARY_TARGET',
      mercenaryId: s.players[1].id,
    });
    return s;
  }

  it('49. MERCENARY_OFFER requires 1-60 fuel', () => {
    const s0 = mercSetup();
    // 0 is below range
    const s1 = gameReducer(s0, { type: 'MERCENARY_OFFER', amount: 0 });
    expect(s1.phase).toBe(TurnPhase.MercenaryOffer); // rejected, no transition

    // 61 is above range
    const s2 = gameReducer(s0, { type: 'MERCENARY_OFFER', amount: 61 });
    expect(s2.phase).toBe(TurnPhase.MercenaryOffer); // rejected

    // 30 is valid
    const s3 = gameReducer(s0, { type: 'MERCENARY_OFFER', amount: 30 });
    expect(s3.phase).toBe(TurnPhase.MercenaryHandover);
    expect(s3.mercenary!.offeredFuel).toBe(30);
  });

  it('50. MERCENARY_RESPOND accepted: transfers fuel, transitions to fight target', () => {
    let s = mercSetup();
    s = gameReducer(s, { type: 'MERCENARY_OFFER', amount: 25 });
    s = gameReducer(s, { type: 'MERCENARY_HANDOVER_COMPLETE' });

    const aliceFuel = s.players[0].fuel;
    const bobFuel = s.players[1].fuel;
    s = gameReducer(s, { type: 'MERCENARY_RESPOND', accepted: true });

    expect(s.players[0].fuel).toBe(aliceFuel - 25);
    expect(s.players[1].fuel).toBe(bobFuel + 25);
    expect(s.phase).toBe(TurnPhase.MercenaryFightTarget);
    expect(s.mercenary!.accepted).toBe(true);
  });

  it('51. MERCENARY_RESPOND declined: no fuel transfer, transitions to complete', () => {
    let s = mercSetup();
    s = gameReducer(s, { type: 'MERCENARY_OFFER', amount: 25 });
    s = gameReducer(s, { type: 'MERCENARY_HANDOVER_COMPLETE' });

    const aliceFuel = s.players[0].fuel;
    const bobFuel = s.players[1].fuel;
    s = gameReducer(s, { type: 'MERCENARY_RESPOND', accepted: false });

    expect(s.players[0].fuel).toBe(aliceFuel); // unchanged
    expect(s.players[1].fuel).toBe(bobFuel); // unchanged
    expect(s.phase).toBe(TurnPhase.MercenaryComplete);
    expect(s.mercenary!.accepted).toBe(false);
  });

  it('52. MERCENARY_FIGHT_COUNT_ROLL: sets fight count', () => {
    let s = mercSetup();
    s = gameReducer(s, { type: 'MERCENARY_OFFER', amount: 25 });
    s = gameReducer(s, { type: 'MERCENARY_HANDOVER_COMPLETE' });
    s = gameReducer(s, { type: 'MERCENARY_RESPOND', accepted: true });
    // Pick Charlie as fight target
    s = gameReducer(s, {
      type: 'MERCENARY_FIGHT_TARGET',
      targetId: s.players[2].id,
    });
    // Roll a 4 => 4 fights
    s = gameReducer(s, { type: 'MERCENARY_FIGHT_COUNT_ROLL', roll: 4 });
    expect(s.mercenary!.fightCount).toBe(4);
    expect(s.phase).toBe(TurnPhase.MercenaryFight);

    // Roll a 6 => 10 fights
    let s2 = mercSetup();
    s2 = gameReducer(s2, { type: 'MERCENARY_OFFER', amount: 25 });
    s2 = gameReducer(s2, { type: 'MERCENARY_HANDOVER_COMPLETE' });
    s2 = gameReducer(s2, { type: 'MERCENARY_RESPOND', accepted: true });
    s2 = gameReducer(s2, {
      type: 'MERCENARY_FIGHT_TARGET',
      targetId: s2.players[2].id,
    });
    s2 = gameReducer(s2, { type: 'MERCENARY_FIGHT_COUNT_ROLL', roll: 6 });
    expect(s2.mercenary!.fightCount).toBe(10);
  });

  it('53. MERCENARY_FIGHT_ROLL: loser loses plane and 10 fuel', () => {
    let s = mercSetup();
    s = gameReducer(s, { type: 'MERCENARY_OFFER', amount: 25 });
    s = gameReducer(s, { type: 'MERCENARY_HANDOVER_COMPLETE' });
    s = gameReducer(s, { type: 'MERCENARY_RESPOND', accepted: true });
    s = gameReducer(s, {
      type: 'MERCENARY_FIGHT_TARGET',
      targetId: s.players[2].id,
    });
    s = gameReducer(s, { type: 'MERCENARY_FIGHT_COUNT_ROLL', roll: 3 }); // 3 fights

    const bobPlanes = s.players[1].planes;
    const bobFuel = s.players[1].fuel;
    const charliePlanes = s.players[2].planes;

    // Mercenary (Bob) rolls 2 => loses (attacker roll 1-3 => attacker loses)
    s = gameReducer(s, {
      type: 'MERCENARY_FIGHT_ROLL',
      attackerRoll: 2,
    });
    expect(s.players[1].planes).toBe(bobPlanes - 1); // mercenary lost plane
    expect(s.players[1].fuel).toBe(bobFuel - 10); // mercenary lost fuel
    expect(s.players[2].planes).toBe(charliePlanes); // target unaffected

    // Acknowledge and next fight
    s = gameReducer(s, { type: 'MERCENARY_FIGHT_ACKNOWLEDGE' });

    const bobPlanes2 = s.players[1].planes;
    const charliePlanes2 = s.players[2].planes;
    const charlieFuel2 = s.players[2].fuel;

    // Mercenary (Bob) rolls 5 => defender (Charlie) loses
    s = gameReducer(s, {
      type: 'MERCENARY_FIGHT_ROLL',
      attackerRoll: 5,
    });
    expect(s.players[1].planes).toBe(bobPlanes2); // mercenary unaffected
    expect(s.players[2].planes).toBe(charliePlanes2 - 1); // target lost plane
    expect(s.players[2].fuel).toBe(charlieFuel2 - 10); // target lost fuel
  });
});

// ─────────────────────────────────────────────────────────
// 54-56  Oil Tycoon
// ─────────────────────────────────────────────────────────
describe('Oil Tycoon', () => {
  it('54. BUY_ITEM OilTycoon: costs 100 fuel', () => {
    let s = startedGame({ phase: TurnPhase.Shop });
    s = withPlayer(s, 0, { fuel: 150 });
    const s1 = gameReducer(s, {
      type: 'BUY_ITEM',
      itemId: ShopItemId.OilTycoon,
    });
    expect(s1.players[0].fuel).toBe(50);
    expect(s1.players[0].hasOilTycoon).toBe(true);
    expect(s1.players[0].oilTycoonDamage).toBe(0);
  });

  it('55. Oil Tycoon produces 25 fuel per turn in END_TURN', () => {
    let s = startedGame({ phase: TurnPhase.TurnEnd });
    s = withPlayer(s, 0, {
      fuel: 30,
      hasOilTycoon: true,
      oilTycoonDamage: 0,
      oilTycoonRepairTurnsLeft: -1,
    });
    const s1 = gameReducer(s, { type: 'END_TURN' });
    expect(s1.players[0].fuel).toBe(30 + OIL_TYCOON_INCOME);
  });

  it('56. OIL_TYCOON_REPAIR costs 50 fuel and restores tycoon', () => {
    let s = startedGame({ phase: TurnPhase.OilTycoonRepair });
    s = withPlayer(s, 0, {
      fuel: 100,
      hasOilTycoon: true,
      oilTycoonDamage: 3,
      oilTycoonRepairTurnsLeft: 2,
    });
    const s1 = gameReducer(s, { type: 'OIL_TYCOON_REPAIR' });
    expect(s1.players[0].fuel).toBe(100 - OIL_TYCOON_REPAIR_COST);
    expect(s1.players[0].oilTycoonDamage).toBe(0);
    expect(s1.players[0].oilTycoonRepairTurnsLeft).toBe(-1);
    expect(s1.phase).toBe(TurnPhase.TurnEnd);
  });
});
