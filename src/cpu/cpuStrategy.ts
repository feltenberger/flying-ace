import type { GameState, Action } from '../types/game.ts'
import { TurnPhase, FUEL_TAX_PER_PLANE } from '../types/game.ts'
import { ShopItemId, SHOP_CATALOG } from '../types/shop.ts'
import { rollDie } from '../utils/dice.ts'

// ── Strategy Interface ──────────────────────────────────

export interface CpuStrategy {
  chooseAction(state: GameState): Action | null
}

// ── Random Strategy ─────────────────────────────────────

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function currentPlayer(state: GameState) {
  return state.players[state.currentPlayerIndex]
}

/**
 * Identify who is the decision-maker for the current phase.
 * Most phases: the current player.
 * MercenaryResponse: the mercenary player (not the hirer/current player).
 */
export function getDecisionMakerId(state: GameState): string {
  if (state.phase === TurnPhase.MercenaryResponse && state.mercenary) {
    return state.mercenary.mercenaryId
  }
  if (state.phase === TurnPhase.TradeResponse && state.trade) {
    return state.trade.partnerId!
  }
  return currentPlayer(state).id
}

export class RandomStrategy implements CpuStrategy {
  chooseAction(state: GameState): Action | null {
    const player = currentPlayer(state)

    switch (state.phase) {
      // ── Die Roll ──
      case TurnPhase.Roll:
        return { type: 'ROLL_DIE', roll: rollDie() }

      case TurnPhase.RollResult:
        return { type: 'ROLL_ACKNOWLEDGE' }

      // ── Dog Fight ──
      case TurnPhase.DogFight: {
        const opponents = state.players.filter(
          (p) => p.alive && p.id !== player.id,
        )
        if (opponents.length === 0) return null
        const target = randomFrom(opponents)
        return { type: 'DOG_FIGHT_PICK', defenderId: target.id }
      }

      case TurnPhase.DogFightResult: {
        const df = state.dogFight
        if (!df) return null
        // If not yet rolled, roll; otherwise acknowledge
        if (df.attackerRoll == null) {
          return { type: 'DOG_FIGHT_ROLL', attackerRoll: rollDie() }
        }
        return { type: 'DOG_FIGHT_ACKNOWLEDGE' }
      }

      // ── Shop ──
      case TurnPhase.Shop:
        return this.chooseShopAction(state)

      // ── Cheap Bomb ──
      case TurnPhase.CheapBombTarget: {
        const targets = state.players.filter(
          (p) => p.alive && p.id !== player.id,
        )
        if (targets.length === 0) return null
        return { type: 'CHEAP_BOMB_TARGET', targetId: randomFrom(targets).id }
      }

      case TurnPhase.CheapBombRoll:
        return { type: 'CHEAP_BOMB_ROLL', roll: rollDie() }

      case TurnPhase.CheapBombResult:
        return { type: 'CHEAP_BOMB_ACKNOWLEDGE' }

      // ── Pricey Bomb ──
      case TurnPhase.PriceyBombTarget: {
        const targets = state.players.filter(
          (p) => p.alive && p.id !== player.id,
        )
        if (targets.length === 0) return null
        return { type: 'PRICEY_BOMB_TARGET', targetId: randomFrom(targets).id }
      }

      case TurnPhase.PriceyBombResult:
        return { type: 'PRICEY_BOMB_ACKNOWLEDGE' }

      // ── Trade ──
      case TurnPhase.TradeTarget: {
        const targets = state.players.filter(
          (p) => p.alive && p.id !== player.id,
        )
        if (targets.length === 0) return null
        return { type: 'TRADE_TARGET', partnerId: randomFrom(targets).id }
      }

      case TurnPhase.TradeOffer: {
        const trade = state.trade!
        const partner = state.players.find((p) => p.id === trade.partnerId)!

        // Build a random offering from owned assets
        const offerFuel = Math.min(player.fuel, Math.floor(Math.random() * 10) + 1)
        const offerPlanes = (Math.random() < 0.2 && player.planes > 1) ? 1 : 0
        const offerAA = Math.random() < 0.15 && player.hasAntiAircraft
        const offerInsurance = Math.random() < 0.1 && player.insuranceTurnsLeft > 0

        // Build a random request from partner's assets
        const reqFuel = Math.min(partner.fuel, Math.floor(Math.random() * 10) + 1)
        const reqPlanes = (Math.random() < 0.2 && partner.planes > 1) ? 1 : 0
        const reqAA = Math.random() < 0.15 && partner.hasAntiAircraft && !offerAA
        const reqInsurance = Math.random() < 0.1 && partner.insuranceTurnsLeft > 0 && !offerInsurance

        const offering = { fuel: offerFuel, planes: offerPlanes, antiAircraft: offerAA, oilTycoon: false, insurance: offerInsurance }
        const requesting = { fuel: reqFuel, planes: reqPlanes, antiAircraft: reqAA, oilTycoon: false, insurance: reqInsurance }

        return { type: 'TRADE_PROPOSE', offering, requesting }
      }

      case TurnPhase.TradeHandover:
        return { type: 'TRADE_HANDOVER_COMPLETE' }

      case TurnPhase.TradeResponse: {
        const accepted = Math.random() < 0.5
        return { type: 'TRADE_RESPOND', accepted }
      }

      case TurnPhase.TradeResult:
        return { type: 'TRADE_ACKNOWLEDGE' }

      // ── Mercenary (CPU responding to offers from human players) ──
      case TurnPhase.MercenaryHandover:
        return { type: 'MERCENARY_HANDOVER_COMPLETE' }

      case TurnPhase.MercenaryResponse: {
        // Random accept/decline
        const accepted = Math.random() < 0.5
        return { type: 'MERCENARY_RESPOND', accepted }
      }

      case TurnPhase.MercenaryFightTarget: {
        const merc = state.mercenary!
        const targets = state.players.filter(
          (p) => p.alive && p.id !== merc.hirerId && p.id !== merc.mercenaryId,
        )
        if (targets.length === 0) return null
        return { type: 'MERCENARY_FIGHT_TARGET', targetId: randomFrom(targets).id }
      }

      case TurnPhase.MercenaryFightRoll:
        return { type: 'MERCENARY_FIGHT_COUNT_ROLL', roll: rollDie() }

      case TurnPhase.MercenaryFight:
        return { type: 'MERCENARY_FIGHT_ROLL', attackerRoll: rollDie() }

      case TurnPhase.MercenaryFightResult:
        return { type: 'MERCENARY_FIGHT_ACKNOWLEDGE' }

      case TurnPhase.MercenaryComplete:
        return { type: 'MERCENARY_COMPLETE_ACKNOWLEDGE' }

      // ── Dig for Fuel ──
      case TurnPhase.DigForFuelRoll:
        return { type: 'DIG_FOR_FUEL_ROLL', roll: rollDie() }

      case TurnPhase.DigForFuelResult:
        return { type: 'DIG_FOR_FUEL_ACKNOWLEDGE' }

      // ── Oil Tycoon Repair ──
      case TurnPhase.OilTycoonRepair: {
        if (player.fuel >= 50) {
          return { type: 'OIL_TYCOON_REPAIR' }
        }
        return { type: 'OIL_TYCOON_SKIP_REPAIR' }
      }

      // ── Tax ──
      case TurnPhase.Tax:
        return { type: 'PAY_TAX' }

      // ── Turn End ──
      case TurnPhase.TurnEnd:
        return { type: 'END_TURN' }

      default:
        return null
    }
  }

  private chooseShopAction(state: GameState): Action {
    const player = currentPlayer(state)

    // 30% chance to skip shop entirely
    if (Math.random() < 0.3) {
      return { type: 'SKIP_SHOP' }
    }

    // Build list of affordable items (excluding Mercenary for CPU)
    const affordable: ShopItemId[] = []
    for (const item of SHOP_CATALOG) {
      if (item.id === ShopItemId.Mercenary) continue

      const cost = item.cost === 'variable' ? 1 : item.cost
      if (player.fuel < cost) continue

      // Check eligibility
      switch (item.id) {
        case ShopItemId.Insurance:
          if (player.insuranceUsed) continue
          break
        case ShopItemId.AntiAircraft:
          if (player.hasAntiAircraft || player.antiAircraftCooldown > 0) continue
          break
        case ShopItemId.OilTycoon:
          if (player.hasOilTycoon) continue
          break
      }

      affordable.push(item.id)
    }

    if (affordable.length === 0) {
      return { type: 'SKIP_SHOP' }
    }

    const chosen = randomFrom(affordable)
    return { type: 'BUY_ITEM', itemId: chosen }
  }
}

// ── Describe CPU Action ─────────────────────────────────

export function describeCpuAction(state: GameState, action: Action): string {
  const player = currentPlayer(state)

  switch (action.type) {
    case 'ROLL_DIE':
      return `${player.name} is ready to roll. Continue to roll the die.`
    case 'ROLL_ACKNOWLEDGE':
      return `${player.name}'s roll is complete. Continue to move on.`
    case 'DOG_FIGHT_PICK': {
      const defender = state.players.find((p) => p.id === action.defenderId)
      return `${player.name} has chosen to fight ${defender?.name ?? 'unknown'}!`
    }
    case 'DOG_FIGHT_ROLL': {
      const df = state.dogFight
      const defName = state.players.find((p) => p.id === df?.defenderId)?.name ?? 'unknown'
      return `${player.name} is fighting ${defName}. Continue to roll.`
    }
    case 'DOG_FIGHT_ACKNOWLEDGE':
      return `The dog fight is over. Continue to move on.`
    case 'SKIP_SHOP':
      return `${player.name} has decided to skip the shop.`
    case 'BUY_ITEM': {
      const item = SHOP_CATALOG.find((i) => i.id === action.itemId)
      return `${player.name} has chosen to buy ${item?.name ?? action.itemId}.`
    }
    case 'CHEAP_BOMB_TARGET': {
      const target = state.players.find((p) => p.id === action.targetId)
      return `${player.name} has targeted ${target?.name ?? 'unknown'} with a Cheap Bomb!`
    }
    case 'CHEAP_BOMB_ROLL': {
      const targetName = state.players.find((p) => p.id === state.bomb?.targetId)?.name ?? 'unknown'
      return `${player.name} is dropping a Cheap Bomb on ${targetName}. Continue to roll.`
    }
    case 'CHEAP_BOMB_ACKNOWLEDGE':
      return `The bombing is over. Continue to move on.`
    case 'PRICEY_BOMB_TARGET': {
      const target = state.players.find((p) => p.id === action.targetId)
      return `${player.name} has targeted ${target?.name ?? 'unknown'} with a Pricey Bomb!`
    }
    case 'PRICEY_BOMB_ACKNOWLEDGE':
      return `The bombing is over. Continue to move on.`
    case 'TRADE_TARGET': {
      const target = state.players.find((p) => p.id === action.partnerId)
      return `${player.name} wants to trade with ${target?.name ?? 'unknown'}.`
    }
    case 'TRADE_PROPOSE': {
      const partnerName = state.players.find((p) => p.id === state.trade?.partnerId)?.name ?? 'unknown'
      return `${player.name} is proposing a trade to ${partnerName}.`
    }
    case 'TRADE_HANDOVER_COMPLETE':
      return 'Passing to the trade partner. Continue to proceed.'
    case 'TRADE_RESPOND': {
      const trade = state.trade
      const partnerName = state.players.find((p) => p.id === trade?.partnerId)?.name ?? 'Partner'
      return action.accepted
        ? `${partnerName} has accepted the trade!`
        : `${partnerName} has declined the trade.`
    }
    case 'TRADE_ACKNOWLEDGE':
      return `The trade is complete. Continue to move on.`
    case 'MERCENARY_HANDOVER_COMPLETE':
      return 'Passing to the mercenary. Continue to proceed.'
    case 'MERCENARY_RESPOND': {
      const merc = state.mercenary
      const mercName = state.players.find((p) => p.id === merc?.mercenaryId)?.name ?? 'Mercenary'
      return action.accepted
        ? `${mercName} has accepted the mercenary offer!`
        : `${mercName} has declined the mercenary offer.`
    }
    case 'MERCENARY_FIGHT_TARGET': {
      const target = state.players.find((p) => p.id === action.targetId)
      return `${target?.name ?? 'Unknown'} has been chosen as the fight target.`
    }
    case 'MERCENARY_FIGHT_COUNT_ROLL': {
      const merc = state.mercenary!
      const mercName = state.players.find((p) => p.id === merc.mercenaryId)?.name ?? 'Mercenary'
      const targName = state.players.find((p) => p.id === merc.targetId)?.name ?? 'unknown'
      return `${mercName} vs ${targName}. Continue to roll for number of fights.`
    }
    case 'MERCENARY_FIGHT_ROLL': {
      const merc = state.mercenary!
      const mercName = state.players.find((p) => p.id === merc.mercenaryId)?.name ?? 'Mercenary'
      const targName = state.players.find((p) => p.id === merc.targetId)?.name ?? 'unknown'
      return `${mercName} vs ${targName} (fight ${merc.fightsCompleted + 1}/${merc.fightCount}). Continue to roll.`
    }
    case 'MERCENARY_FIGHT_ACKNOWLEDGE':
      return 'Fight resolved. Continue to the next fight.'
    case 'MERCENARY_COMPLETE_ACKNOWLEDGE':
      return 'Mercenary contract is complete. Continue to move on.'
    case 'DIG_FOR_FUEL_ROLL':
      return `${player.name} is digging for fuel. Continue to roll.`
    case 'DIG_FOR_FUEL_ACKNOWLEDGE':
      return `Digging is done. Continue to move on.`
    case 'OIL_TYCOON_REPAIR':
      return `${player.name} has chosen to repair the Oil Tycoon.`
    case 'OIL_TYCOON_SKIP_REPAIR':
      return `${player.name} has chosen not to repair the Oil Tycoon.`
    case 'PAY_TAX': {
      const decider = state.players.find((p) => p.id === getDecisionMakerId(state))!
      const taxOwed = FUEL_TAX_PER_PLANE * decider.planes
      if (decider.fuel >= taxOwed) {
        return `${decider.name} has ${decider.planes} plane${decider.planes !== 1 ? 's' : ''}, and pays ${taxOwed} fuel tax.`
      }
      return `${decider.name} has ${decider.planes} plane${decider.planes !== 1 ? 's' : ''} but only ${decider.fuel} fuel. Pays what they can and loses a plane.`
    }
    case 'END_TURN':
      return `${player.name}'s turn has ended. Continue to move on.`
    case 'CANCEL_SHOP_ITEM':
      return `${player.name} has cancelled.`
    default:
      return `${player.name} is taking an action.`
  }
}
