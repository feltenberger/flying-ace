import { useState, useEffect } from 'react'
import { useGame } from '../state/gameContext.tsx'
import { TurnPhase, FUEL_TAX_PER_PLANE, OIL_TYCOON_REPAIR_COST } from '../types/game.ts'
import { SHOP_CATALOG } from '../types/shop.ts'
import type { ShopItemId } from '../types/shop.ts'
import { rollDie } from '../utils/dice.ts'
import { deleteGame } from '../utils/persistence.ts'
import GameLog from '../components/GameLog.tsx'
import ConfirmDialog from '../components/ConfirmDialog.tsx'
import RulesOverlay from '../components/RulesOverlay.tsx'

// ── Scoreboard ──────────────────────────────────────────

function Scoreboard() {
  const { state } = useGame()
  const current = state.players[state.currentPlayerIndex]

  return (
    <div className="bg-slate-800 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
          Scoreboard
        </h3>
        <span className="text-xs text-slate-500">Turn {state.turnNumber}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {state.players.map((p) => (
          <div
            key={p.id}
            className={`rounded px-3 py-2 text-sm ${
              p.id === current.id
                ? 'bg-sky-900/50 border border-sky-700'
                : p.alive
                  ? 'bg-slate-700/50 border border-slate-700'
                  : 'bg-slate-900/50 border border-slate-800 opacity-50'
            }`}
          >
            <div className={`font-semibold truncate ${p.id === current.id ? 'text-sky-300' : p.alive ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
              {p.name}
            </div>
            {p.alive ? (
              <div className="text-xs text-slate-400 mt-0.5">
                {p.planes} plane{p.planes !== 1 ? 's' : ''} / {p.fuel} fuel
                {p.insuranceTurnsLeft > 0 && <span className="text-emerald-400 ml-1">[Ins:{p.insuranceTurnsLeft}]</span>}
                {p.hasAntiAircraft && <span className="text-orange-400 ml-1">[AA]</span>}
                {p.hasOilTycoon && <span className="text-yellow-400 ml-1">[Oil]</span>}
              </div>
            ) : (
              <div className="text-xs text-red-400/60 mt-0.5">Eliminated</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Phase: Roll ─────────────────────────────────────────

function RollPhase() {
  const { state, dispatch } = useGame()
  const player = state.players[state.currentPlayerIndex]

  return (
    <PhaseCard title={`${player.name}'s Turn`}>
      <button
        onClick={() => dispatch({ type: 'ROLL_DIE', roll: rollDie() })}
        className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-lg text-xl transition-colors"
      >
        Roll Die
      </button>
    </PhaseCard>
  )
}

// ── Phase: Roll Result Splash ───────────────────────────

function RollResultPhase() {
  const { state, dispatch } = useGame()
  const roll = state.lastRoll!

  const rollLabels: Record<number, string> = {
    1: 'Plane shot down!',
    2: 'Dog Fight!',
    3: 'Fuel bonus!',
    4: 'Fuel bonus!',
    5: 'Fuel bonus!',
    6: 'Jackpot!',
  }

  const rollColors: Record<number, string> = {
    1: 'text-red-400',
    2: 'text-orange-400',
    3: 'text-emerald-400',
    4: 'text-emerald-400',
    5: 'text-emerald-400',
    6: 'text-amber-400',
  }

  function handleContinue() {
    dispatch({ type: 'ROLL_ACKNOWLEDGE' })
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        handleContinue()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[50vh] cursor-pointer select-none"
      onClick={handleContinue}
    >
      <div className="text-8xl font-black text-amber-400 mb-4">{roll}</div>
      <div className={`text-2xl font-bold mb-2 ${rollColors[roll]}`}>
        {rollLabels[roll]}
      </div>
      <p className="text-slate-300 text-lg mb-8 text-center max-w-sm">
        {state.rollResult}
      </p>
      <span className="text-slate-500 text-sm">Tap anywhere or press any key to continue</span>
    </div>
  )
}

// ── Phase: Dog Fight ────────────────────────────────────

function DogFightPhase() {
  const { state, dispatch } = useGame()
  const player = state.players[state.currentPlayerIndex]
  const opponents = state.players.filter((p) => p.alive && p.id !== player.id)

  return (
    <PhaseCard title="Dog Fight!">
      <p className="text-slate-300 mb-4">
        {player.name}, choose an opponent to fight:
      </p>
      <div className="space-y-2">
        {opponents.map((p) => (
          <button
            key={p.id}
            onClick={() => dispatch({ type: 'DOG_FIGHT_PICK', defenderId: p.id })}
            className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded transition-colors text-left px-4"
          >
            <span className="font-semibold">{p.name}</span>
            <span className="text-slate-400 text-sm ml-2">
              ({p.planes} planes, {p.fuel} fuel)
            </span>
          </button>
        ))}
      </div>
    </PhaseCard>
  )
}

function DogFightResultPhase() {
  const { state, dispatch } = useGame()
  const df = state.dogFight!
  const attacker = state.players.find((p) => p.id === df.attackerId)!
  const defender = state.players.find((p) => p.id === df.defenderId)!

  const hasRolled = df.attackerRoll != null

  function handleFight() {
    dispatch({
      type: 'DOG_FIGHT_ROLL',
      attackerRoll: rollDie(),
      defenderRoll: rollDie(),
    })
  }

  return (
    <PhaseCard title="Dog Fight!">
      <div className="text-center mb-4">
        <p className="text-lg text-slate-200">
          <span className="text-sky-400 font-bold">{attacker.name}</span>
          {' vs '}
          <span className="text-red-400 font-bold">{defender.name}</span>
        </p>
      </div>

      {!hasRolled ? (
        <button
          onClick={handleFight}
          className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors"
        >
          Fight!
        </button>
      ) : (
        <div className="text-center">
          <div className="flex justify-center gap-8 mb-4">
            <div>
              <div className="text-sm text-slate-400">{attacker.name}</div>
              <div className="text-4xl font-bold text-sky-400">{df.attackerRoll}</div>
            </div>
            <div>
              <div className="text-sm text-slate-400">{defender.name}</div>
              <div className="text-4xl font-bold text-red-400">{df.defenderRoll}</div>
            </div>
          </div>
          <p className="text-slate-300 mb-4">
            {df.loserId === df.attackerId ? attacker.name : defender.name} loses a plane!
          </p>
          <button
            onClick={() => dispatch({ type: 'DOG_FIGHT_ACKNOWLEDGE' })}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
          >
            Continue
          </button>
        </div>
      )}
    </PhaseCard>
  )
}

// ── Phase: Shop ─────────────────────────────────────────

function ShopPhase() {
  const { state, dispatch } = useGame()
  const player = state.players[state.currentPlayerIndex]

  function canAfford(cost: number | 'variable'): boolean {
    if (cost === 'variable') return true
    return player.fuel >= cost
  }

  function isAvailable(itemId: ShopItemId): boolean {
    const item = SHOP_CATALOG.find((i) => i.id === itemId)!
    if (!canAfford(item.cost)) return false

    switch (itemId) {
      case 'insurance':
        return !player.insuranceUsed
      case 'anti_aircraft':
        return !player.hasAntiAircraft && player.antiAircraftCooldown === 0
      case 'oil_tycoon':
        return !player.hasOilTycoon
      default:
        return true
    }
  }

  return (
    <PhaseCard title="Shop">
      <p className="text-slate-400 text-sm mb-4">
        {player.name} has <span className="text-amber-400 font-bold">{player.fuel}</span> fuel.
        Buy one item or skip.
      </p>
      <div className="space-y-2 mb-4">
        {SHOP_CATALOG.map((item) => {
          const available = isAvailable(item.id)
          return (
            <button
              key={item.id}
              onClick={() => dispatch({ type: 'BUY_ITEM', itemId: item.id })}
              disabled={!available}
              className={`w-full text-left px-4 py-3 rounded transition-colors ${
                available
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-100'
                  : 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs text-slate-500 mr-2">#{item.number}</span>
                  <span className="font-semibold">{item.name}</span>
                </div>
                <span className={`text-sm font-mono ${available ? 'text-amber-400' : 'text-slate-600'}`}>
                  {item.cost === 'variable' ? 'var' : `${item.cost}f`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{item.description}</p>
            </button>
          )
        })}
      </div>
      <button
        onClick={() => dispatch({ type: 'SKIP_SHOP' })}
        className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
      >
        Skip Shop
      </button>
    </PhaseCard>
  )
}

// ── Phase: Cheap Bomb ───────────────────────────────────

function CheapBombTargetPhase() {
  const { state, dispatch } = useGame()
  const player = state.players[state.currentPlayerIndex]
  const targets = state.players.filter((p) => p.alive && p.id !== player.id)

  return (
    <PhaseCard title="Cheap Bomb">
      <p className="text-slate-300 mb-4">Choose a target:</p>
      <div className="space-y-2">
        {targets.map((t) => (
          <button
            key={t.id}
            onClick={() => dispatch({ type: 'CHEAP_BOMB_TARGET', targetId: t.id })}
            className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded transition-colors px-4 text-left"
          >
            <span className="font-semibold">{t.name}</span>
            <span className="text-slate-400 text-sm ml-2">
              ({t.planes} planes{t.hasAntiAircraft ? ', AA' : ''}{t.insuranceTurnsLeft > 0 ? ', Ins' : ''})
            </span>
          </button>
        ))}
      </div>
    </PhaseCard>
  )
}

function CheapBombRollPhase() {
  const { state, dispatch } = useGame()
  const bomb = state.bomb!
  const target = state.players.find((p) => p.id === bomb.targetId)!

  return (
    <PhaseCard title="Cheap Bomb">
      <p className="text-slate-300 mb-4">
        Bombing <span className="text-red-400 font-bold">{target.name}</span>.
        Roll 4-6 to hit!
      </p>
      <button
        onClick={() => dispatch({ type: 'CHEAP_BOMB_ROLL', roll: rollDie() })}
        className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors"
      >
        Drop Bomb
      </button>
    </PhaseCard>
  )
}

function CheapBombResultPhase() {
  const { state, dispatch } = useGame()
  const bomb = state.bomb!
  const target = state.players.find((p) => p.id === bomb.targetId)!

  return (
    <PhaseCard title="Cheap Bomb Result">
      <div className="text-center">
        <div className="text-5xl font-bold text-amber-400 mb-3">{bomb.roll}</div>
        <p className={`text-lg font-bold mb-4 ${bomb.hit ? 'text-red-400' : 'text-emerald-400'}`}>
          {bomb.hit ? `Hit! ${target.name} takes damage!` : 'Miss!'}
        </p>
        <button
          onClick={() => dispatch({ type: 'CHEAP_BOMB_ACKNOWLEDGE' })}
          className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
        >
          Continue
        </button>
      </div>
    </PhaseCard>
  )
}

// ── Phase: Pricey Bomb ──────────────────────────────────

function PriceyBombTargetPhase() {
  const { state, dispatch } = useGame()
  const player = state.players[state.currentPlayerIndex]
  const targets = state.players.filter((p) => p.alive && p.id !== player.id)

  return (
    <PhaseCard title="Pricey Bomb">
      <p className="text-slate-300 mb-4">
        Guaranteed hit! Choose a target:
      </p>
      <div className="space-y-2">
        {targets.map((t) => (
          <button
            key={t.id}
            onClick={() => dispatch({ type: 'PRICEY_BOMB_TARGET', targetId: t.id })}
            className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded transition-colors px-4 text-left"
          >
            <span className="font-semibold">{t.name}</span>
            <span className="text-slate-400 text-sm ml-2">
              ({t.planes} planes{t.hasAntiAircraft ? ', AA' : ''})
            </span>
          </button>
        ))}
      </div>
    </PhaseCard>
  )
}

function PriceyBombResultPhase() {
  const { state, dispatch } = useGame()
  const bomb = state.bomb!
  const target = state.players.find((p) => p.id === bomb.targetId)!

  return (
    <PhaseCard title="Pricey Bomb Result">
      <div className="text-center">
        <p className="text-lg text-red-400 font-bold mb-4">
          Direct hit on {target.name}!
        </p>
        <button
          onClick={() => dispatch({ type: 'PRICEY_BOMB_ACKNOWLEDGE' })}
          className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
        >
          Continue
        </button>
      </div>
    </PhaseCard>
  )
}

// ── Phase: Donation ─────────────────────────────────────

function DonationTargetPhase() {
  const { state, dispatch } = useGame()
  const player = state.players[state.currentPlayerIndex]
  const targets = state.players.filter((p) => p.alive && p.id !== player.id)

  return (
    <PhaseCard title="Donation">
      <p className="text-slate-300 mb-4">
        Choose who to donate fuel to (costs amount + 2 fee):
      </p>
      <div className="space-y-2">
        {targets.map((t) => (
          <button
            key={t.id}
            onClick={() => dispatch({ type: 'DONATION_TARGET', targetId: t.id })}
            className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded transition-colors px-4 text-left"
          >
            <span className="font-semibold">{t.name}</span>
            <span className="text-slate-400 text-sm ml-2">({t.fuel} fuel)</span>
          </button>
        ))}
      </div>
    </PhaseCard>
  )
}

function DonationAmountPhase() {
  const { state, dispatch } = useGame()
  const player = state.players[state.currentPlayerIndex]
  const donation = state.donation!
  const recipient = state.players.find((p) => p.id === donation.recipientId)!
  const [amount, setAmount] = useState(1)
  const maxDonation = Math.max(0, player.fuel - 2) // must keep 2 for the fee

  function handleDonate() {
    if (amount >= 1 && amount <= maxDonation) {
      dispatch({ type: 'DONATION_AMOUNT', amount })
    }
  }

  return (
    <PhaseCard title="Donation">
      <p className="text-slate-300 mb-4">
        Donating to <span className="text-sky-400 font-bold">{recipient.name}</span>.
        You have {player.fuel} fuel (2 fuel fee applies).
      </p>
      <div className="flex items-center gap-3 mb-4">
        <label className="text-slate-400 text-sm">Amount:</label>
        <input
          type="number"
          min={1}
          max={maxDonation}
          value={amount}
          onChange={(e) => setAmount(Math.max(1, Math.min(maxDonation, parseInt(e.target.value) || 1)))}
          className="w-24 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100 text-center focus:outline-none focus:border-sky-500"
        />
        <span className="text-slate-500 text-sm">
          (total cost: {amount + 2})
        </span>
      </div>
      <button
        onClick={handleDonate}
        disabled={amount < 1 || amount > maxDonation}
        className="w-full py-3 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600 disabled:text-slate-500 text-white font-bold rounded transition-colors"
      >
        Donate {amount} Fuel
      </button>
    </PhaseCard>
  )
}

function DonationResultPhase() {
  const { state, dispatch } = useGame()
  const donation = state.donation!
  const recipient = state.players.find((p) => p.id === donation.recipientId)!

  return (
    <PhaseCard title="Donation Complete">
      <div className="text-center">
        <p className="text-lg text-emerald-400 font-bold mb-4">
          Donated {donation.amount} fuel to {recipient.name}!
        </p>
        <button
          onClick={() => dispatch({ type: 'DONATION_ACKNOWLEDGE' })}
          className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
        >
          Continue
        </button>
      </div>
    </PhaseCard>
  )
}

// ── Phase: Mercenary ────────────────────────────────────

function MercenaryTargetPhase() {
  const { state, dispatch } = useGame()
  const player = state.players[state.currentPlayerIndex]
  const candidates = state.players.filter((p) => p.alive && p.id !== player.id)

  return (
    <PhaseCard title="Hire Mercenary">
      <p className="text-slate-300 mb-4">Choose a player to hire:</p>
      <div className="space-y-2">
        {candidates.map((p) => (
          <button
            key={p.id}
            onClick={() => dispatch({ type: 'MERCENARY_TARGET', mercenaryId: p.id })}
            className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded transition-colors px-4 text-left"
          >
            <span className="font-semibold">{p.name}</span>
            <span className="text-slate-400 text-sm ml-2">
              ({p.planes} planes, {p.fuel} fuel)
            </span>
          </button>
        ))}
      </div>
    </PhaseCard>
  )
}

function MercenaryOfferPhase() {
  const { state, dispatch } = useGame()
  const player = state.players[state.currentPlayerIndex]
  const merc = state.mercenary!
  const mercenary = state.players.find((p) => p.id === merc.mercenaryId)!
  const [amount, setAmount] = useState(1)
  const maxOffer = Math.min(60, player.fuel)

  return (
    <PhaseCard title="Mercenary Offer">
      <p className="text-slate-300 mb-4">
        Offer fuel to <span className="text-sky-400 font-bold">{mercenary.name}</span> to fight on your behalf.
      </p>
      <div className="flex items-center gap-3 mb-4">
        <label className="text-slate-400 text-sm">Offer:</label>
        <input
          type="number"
          min={1}
          max={maxOffer}
          value={amount}
          onChange={(e) => setAmount(Math.max(1, Math.min(maxOffer, parseInt(e.target.value) || 1)))}
          className="w-24 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100 text-center focus:outline-none focus:border-sky-500"
        />
        <span className="text-slate-500 text-sm">fuel (1-60)</span>
      </div>
      <button
        onClick={() => dispatch({ type: 'MERCENARY_OFFER', amount })}
        disabled={amount < 1 || amount > maxOffer}
        className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-600 disabled:text-slate-500 text-slate-900 font-bold rounded transition-colors"
      >
        Send Offer
      </button>
    </PhaseCard>
  )
}

function MercenaryHandoverPhase() {
  const { state, dispatch } = useGame()
  const merc = state.mercenary!
  const mercenary = state.players.find((p) => p.id === merc.mercenaryId)!

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[40vh] cursor-pointer select-none"
      onClick={() => dispatch({ type: 'MERCENARY_HANDOVER_COMPLETE' })}
    >
      <p className="text-slate-500 text-sm uppercase tracking-widest mb-4">
        Pass the device to
      </p>
      <h2 className="text-4xl font-extrabold text-amber-400 mb-2">
        {mercenary.name}
      </h2>
      <p className="text-slate-400 text-sm mt-1 mb-6">
        You have been offered {merc.offeredFuel} fuel as a mercenary
      </p>
      <button
        onClick={(e) => {
          e.stopPropagation()
          dispatch({ type: 'MERCENARY_HANDOVER_COMPLETE' })
        }}
        className="px-8 py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg transition-colors"
      >
        Ready
      </button>
    </div>
  )
}

function MercenaryResponsePhase() {
  const { state, dispatch } = useGame()
  const merc = state.mercenary!
  const hirer = state.players.find((p) => p.id === merc.hirerId)!

  return (
    <PhaseCard title="Mercenary Offer">
      <p className="text-slate-300 mb-4">
        <span className="text-sky-400 font-bold">{hirer.name}</span> is offering you{' '}
        <span className="text-amber-400 font-bold">{merc.offeredFuel} fuel</span> to fight
        as their mercenary.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => dispatch({ type: 'MERCENARY_RESPOND', accepted: true })}
          className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded transition-colors"
        >
          Accept
        </button>
        <button
          onClick={() => dispatch({ type: 'MERCENARY_RESPOND', accepted: false })}
          className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded transition-colors"
        >
          Decline
        </button>
      </div>
    </PhaseCard>
  )
}

function MercenaryFightTargetPhase() {
  const { state, dispatch } = useGame()
  const merc = state.mercenary!
  const hirer = state.players.find((p) => p.id === merc.hirerId)!
  const mercenary = state.players.find((p) => p.id === merc.mercenaryId)!
  const targets = state.players.filter(
    (p) => p.alive && p.id !== merc.hirerId && p.id !== merc.mercenaryId,
  )

  return (
    <PhaseCard title="Mercenary - Choose Target">
      <p className="text-slate-300 mb-4">
        {hirer.name}, choose who {mercenary.name} will fight:
      </p>
      <div className="space-y-2">
        {targets.map((t) => (
          <button
            key={t.id}
            onClick={() => dispatch({ type: 'MERCENARY_FIGHT_TARGET', targetId: t.id })}
            className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded transition-colors px-4 text-left"
          >
            <span className="font-semibold">{t.name}</span>
            <span className="text-slate-400 text-sm ml-2">
              ({t.planes} planes)
            </span>
          </button>
        ))}
      </div>
    </PhaseCard>
  )
}

function MercenaryFightRollPhase() {
  const { state, dispatch } = useGame()
  const merc = state.mercenary!
  const mercenary = state.players.find((p) => p.id === merc.mercenaryId)!
  const target = state.players.find((p) => p.id === merc.targetId)!

  return (
    <PhaseCard title="Mercenary - Number of Fights">
      <p className="text-slate-300 mb-4">
        {mercenary.name} vs {target.name}. Roll to determine number of fights!
      </p>
      <button
        onClick={() => dispatch({ type: 'MERCENARY_FIGHT_COUNT_ROLL', roll: rollDie() })}
        className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-lg transition-colors"
      >
        Roll for Fights
      </button>
    </PhaseCard>
  )
}

function MercenaryFightPhase() {
  const { state, dispatch } = useGame()
  const merc = state.mercenary!
  const mercenary = state.players.find((p) => p.id === merc.mercenaryId)!
  const target = state.players.find((p) => p.id === merc.targetId)!

  return (
    <PhaseCard title={`Mercenary Fight ${merc.fightsCompleted + 1}/${merc.fightCount}`}>
      <p className="text-slate-300 mb-4">
        <span className="text-sky-400 font-bold">{mercenary.name}</span>
        {' vs '}
        <span className="text-red-400 font-bold">{target.name}</span>
      </p>
      <button
        onClick={() =>
          dispatch({
            type: 'MERCENARY_FIGHT_ROLL',
            attackerRoll: rollDie(),
            defenderRoll: rollDie(),
          })
        }
        className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors"
      >
        Fight!
      </button>
    </PhaseCard>
  )
}

function MercenaryFightResultPhase() {
  const { state, dispatch } = useGame()
  const merc = state.mercenary!
  const fight = merc.currentFight!
  const mercenary = state.players.find((p) => p.id === fight.attackerId)!
  const target = state.players.find((p) => p.id === fight.defenderId)!
  const loser = fight.loserId === fight.attackerId ? mercenary : target

  return (
    <PhaseCard title={`Fight ${merc.fightsCompleted}/${merc.fightCount} Result`}>
      <div className="text-center">
        <div className="flex justify-center gap-8 mb-4">
          <div>
            <div className="text-sm text-slate-400">{mercenary.name}</div>
            <div className="text-4xl font-bold text-sky-400">{fight.attackerRoll}</div>
          </div>
          <div>
            <div className="text-sm text-slate-400">{target.name}</div>
            <div className="text-4xl font-bold text-red-400">{fight.defenderRoll}</div>
          </div>
        </div>
        <p className="text-slate-300 mb-4">
          {loser.name} loses a plane!
        </p>
        <button
          onClick={() => dispatch({ type: 'MERCENARY_FIGHT_ACKNOWLEDGE' })}
          className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
        >
          {merc.fightsCompleted < merc.fightCount! && mercenary.alive && target.alive
            ? 'Next Fight'
            : 'Continue'}
        </button>
      </div>
    </PhaseCard>
  )
}

function MercenaryCompletePhase() {
  const { state, dispatch } = useGame()
  const merc = state.mercenary!
  const mercenary = state.players.find((p) => p.id === merc.mercenaryId)!

  return (
    <PhaseCard title="Mercenary Complete">
      <div className="text-center">
        {merc.accepted === false ? (
          <p className="text-slate-300 mb-4">
            {mercenary.name} declined the offer.
          </p>
        ) : (
          <p className="text-slate-300 mb-4">
            Mercenary contract complete. {merc.fightsCompleted} fight(s) resolved.
          </p>
        )}
        <button
          onClick={() => dispatch({ type: 'MERCENARY_COMPLETE_ACKNOWLEDGE' })}
          className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
        >
          Continue
        </button>
      </div>
    </PhaseCard>
  )
}

// ── Phase: Dig for Fuel ─────────────────────────────────

function DigForFuelRollPhase() {
  const { dispatch } = useGame()

  return (
    <PhaseCard title="Dig for Fuel">
      <p className="text-slate-300 mb-4">Roll to see how much fuel you find!</p>
      <button
        onClick={() => dispatch({ type: 'DIG_FOR_FUEL_ROLL', roll: rollDie() })}
        className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-lg transition-colors"
      >
        Dig!
      </button>
    </PhaseCard>
  )
}

function DigForFuelResultPhase() {
  const { state, dispatch } = useGame()
  const roll = state.digForFuelRoll!
  const fuelGained = roll === 6 ? 10 : roll

  return (
    <PhaseCard title="Dig for Fuel">
      <div className="text-center">
        <div className="text-5xl font-bold text-amber-400 mb-3">{roll}</div>
        <p className="text-lg text-emerald-400 font-bold mb-4">
          Found {fuelGained} fuel!
        </p>
        <button
          onClick={() => dispatch({ type: 'DIG_FOR_FUEL_ACKNOWLEDGE' })}
          className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
        >
          Continue
        </button>
      </div>
    </PhaseCard>
  )
}

// ── Phase: Oil Tycoon Repair ────────────────────────────

function OilTycoonRepairPhase() {
  const { state, dispatch } = useGame()
  const player = state.players[state.currentPlayerIndex]
  const canAfford = player.fuel >= OIL_TYCOON_REPAIR_COST

  return (
    <PhaseCard title="Oil Tycoon Damaged!">
      <p className="text-slate-300 mb-2">
        Your Oil Tycoon has been destroyed. You have{' '}
        <span className="text-amber-400 font-bold">{player.oilTycoonRepairTurnsLeft}</span> turn(s)
        left to repair it.
      </p>
      <p className="text-slate-400 text-sm mb-4">
        Repair cost: {OIL_TYCOON_REPAIR_COST} fuel. You have {player.fuel} fuel.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => dispatch({ type: 'OIL_TYCOON_REPAIR' })}
          disabled={!canAfford}
          className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-600 disabled:text-slate-500 text-slate-900 font-bold rounded transition-colors"
        >
          Repair ({OIL_TYCOON_REPAIR_COST}f)
        </button>
        <button
          onClick={() => dispatch({ type: 'OIL_TYCOON_SKIP_REPAIR' })}
          className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
        >
          Skip
        </button>
      </div>
    </PhaseCard>
  )
}

// ── Phase: Tax ──────────────────────────────────────────

function TaxPhase() {
  const { state, dispatch } = useGame()
  const player = state.players[state.currentPlayerIndex]
  const taxOwed = FUEL_TAX_PER_PLANE * player.planes
  const canAfford = player.fuel >= taxOwed

  return (
    <PhaseCard title="Fuel Tax">
      <div className="bg-slate-700/50 rounded p-4 mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-400">Planes:</span>
          <span className="text-slate-200">{player.planes}</span>
        </div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-400">Tax per plane:</span>
          <span className="text-slate-200">{FUEL_TAX_PER_PLANE}</span>
        </div>
        <div className="border-t border-slate-600 mt-2 pt-2 flex justify-between font-bold">
          <span className="text-slate-300">Total tax:</span>
          <span className={canAfford ? 'text-amber-400' : 'text-red-400'}>{taxOwed} fuel</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-slate-400">Your fuel:</span>
          <span className="text-slate-200">{player.fuel}</span>
        </div>
      </div>
      {!canAfford && (
        <p className="text-red-400 text-sm mb-3">
          Not enough fuel! You will lose a plane.
        </p>
      )}
      <button
        onClick={() => dispatch({ type: 'PAY_TAX' })}
        className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded transition-colors"
      >
        {canAfford ? 'Pay Tax' : 'Pay What You Can'}
      </button>
    </PhaseCard>
  )
}

// ── Phase: Turn End ─────────────────────────────────────

function TurnEndPhase() {
  const { state, dispatch } = useGame()
  const player = state.players[state.currentPlayerIndex]

  return (
    <PhaseCard title="Turn Complete">
      <div className="bg-slate-700/50 rounded p-4 mb-4">
        <p className="text-slate-300 text-center">
          {player.name} ends the turn with{' '}
          <span className="text-amber-400 font-bold">{player.planes}</span> plane(s) and{' '}
          <span className="text-amber-400 font-bold">{player.fuel}</span> fuel.
        </p>
      </div>
      <button
        onClick={() => dispatch({ type: 'END_TURN' })}
        className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg transition-colors"
      >
        End Turn
      </button>
    </PhaseCard>
  )
}

// ── Shared Phase Card ───────────────────────────────────

function PhaseCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800 rounded-lg p-6 shadow-lg">
      <h3 className="text-lg font-bold text-slate-100 mb-4">{title}</h3>
      {children}
    </div>
  )
}

// ── Phase Router ────────────────────────────────────────

function PhaseRouter() {
  const { state } = useGame()

  switch (state.phase) {
    case TurnPhase.Roll:
      return <RollPhase />
    case TurnPhase.RollResult:
      return <RollResultPhase />
    case TurnPhase.DogFight:
      return <DogFightPhase />
    case TurnPhase.DogFightResult:
      return <DogFightResultPhase />
    case TurnPhase.Shop:
      return <ShopPhase />
    case TurnPhase.CheapBombTarget:
      return <CheapBombTargetPhase />
    case TurnPhase.CheapBombRoll:
      return <CheapBombRollPhase />
    case TurnPhase.CheapBombResult:
      return <CheapBombResultPhase />
    case TurnPhase.PriceyBombTarget:
      return <PriceyBombTargetPhase />
    case TurnPhase.PriceyBombResult:
      return <PriceyBombResultPhase />
    case TurnPhase.DonationTarget:
      return <DonationTargetPhase />
    case TurnPhase.DonationAmount:
      return <DonationAmountPhase />
    case TurnPhase.DonationResult:
      return <DonationResultPhase />
    case TurnPhase.MercenaryTarget:
      return <MercenaryTargetPhase />
    case TurnPhase.MercenaryOffer:
      return <MercenaryOfferPhase />
    case TurnPhase.MercenaryHandover:
      return <MercenaryHandoverPhase />
    case TurnPhase.MercenaryResponse:
      return <MercenaryResponsePhase />
    case TurnPhase.MercenaryFightTarget:
      return <MercenaryFightTargetPhase />
    case TurnPhase.MercenaryFightRoll:
      return <MercenaryFightRollPhase />
    case TurnPhase.MercenaryFight:
      return <MercenaryFightPhase />
    case TurnPhase.MercenaryFightResult:
      return <MercenaryFightResultPhase />
    case TurnPhase.MercenaryComplete:
      return <MercenaryCompletePhase />
    case TurnPhase.DigForFuelRoll:
      return <DigForFuelRollPhase />
    case TurnPhase.DigForFuelResult:
      return <DigForFuelResultPhase />
    case TurnPhase.OilTycoonRepair:
      return <OilTycoonRepairPhase />
    case TurnPhase.Tax:
      return <TaxPhase />
    case TurnPhase.TurnEnd:
      return <TurnEndPhase />
  }
}

// ── In-Game Menu ────────────────────────────────────────

function InGameMenu() {
  const { state, dispatch } = useGame()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  function handleSaveExit() {
    setMenuOpen(false)
    dispatch({ type: 'GO_HOME' })
  }

  function handleReset() {
    setMenuOpen(false)
    setShowResetConfirm(true)
  }

  function confirmReset() {
    if (state.gameId) {
      deleteGame(state.gameId)
    }
    setShowResetConfirm(false)
    dispatch({ type: 'GO_HOME' })
  }

  return (
    <>
      {/* Menu + Rules buttons */}
      <div className="flex justify-end gap-2 mb-2 relative">
        <button
          onClick={() => setShowRules(true)}
          className="text-slate-400 hover:text-slate-200 text-sm px-3 py-1 rounded border border-slate-700 hover:border-slate-500 transition-colors"
        >
          Rules
        </button>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="text-slate-400 hover:text-slate-200 text-sm px-3 py-1 rounded border border-slate-700 hover:border-slate-500 transition-colors"
        >
          Menu
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full mt-1 z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl min-w-[10rem]">
              <button
                onClick={handleSaveExit}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 rounded-t-lg transition-colors"
              >
                Save &amp; Exit
              </button>
              <button
                onClick={handleReset}
                className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-slate-700 rounded-b-lg transition-colors"
              >
                Reset Game
              </button>
            </div>
          </>
        )}
      </div>

      {/* Rules overlay */}
      {showRules && <RulesOverlay onClose={() => setShowRules(false)} />}

      {/* Reset confirmation dialog */}
      {showResetConfirm && (
        <ConfirmDialog
          title="Reset Game"
          message="This will permanently delete the current game and return to the lobby. This cannot be undone."
          onConfirm={confirmReset}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}
    </>
  )
}

// ── Main PlayScreen ─────────────────────────────────────

export function PlayScreen() {
  return (
    <div className="max-w-lg mx-auto">
      <InGameMenu />
      <Scoreboard />
      <div className="mb-4">
        <GameLog />
      </div>
      <PhaseRouter />
    </div>
  )
}
