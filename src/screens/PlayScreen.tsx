import { useState, useEffect } from 'react'
import { useGame } from '../state/gameContext.tsx'
import { TurnPhase, FUEL_TAX_PER_PLANE, OIL_TYCOON_REPAIR_COST, DOGFIGHT_FUEL_PENALTY } from '../types/game.ts'
import { SHOP_CATALOG } from '../types/shop.ts'
import type { ShopItemId } from '../types/shop.ts'
import { rollDie } from '../utils/dice.ts'
import { deleteGame } from '../utils/persistence.ts'
import GameLog from '../components/GameLog.tsx'
import ConfirmDialog from '../components/ConfirmDialog.tsx'
import RulesOverlay from '../components/RulesOverlay.tsx'
import { useImages } from '../utils/images.ts'

// ── Scoreboard ──────────────────────────────────────────

function Scoreboard() {
  const { state } = useGame()
  const current = state.players[state.currentPlayerIndex]

  return (
    <div className="bg-military-800 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-military-400 uppercase tracking-wider">
          Scoreboard
        </h3>
        <span className="text-xs text-military-500">Turn {state.turnNumber}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {state.players.map((p) => (
          <div
            key={p.id}
            className={`rounded px-3 py-2 text-sm ${
              p.id === current.id
                ? 'bg-brass-500/10 border border-brass-500/40'
                : p.alive
                  ? 'bg-military-700/50 border border-military-700'
                  : 'bg-military-950/50 border border-military-800 opacity-50'
            }`}
          >
            <div className={`font-semibold truncate ${p.id === current.id ? 'text-brass-500' : p.alive ? 'text-military-100' : 'text-military-500 line-through'}`}>
              {p.name}
            </div>
            {p.alive ? (
              <div className="text-xs text-military-400 mt-0.5">
                {p.planes} plane{p.planes !== 1 ? 's' : ''} / {p.fuel} fuel
                {p.insuranceTurnsLeft > 0 && <span className="text-ops-500 ml-1">[Ins:{p.insuranceTurnsLeft}]</span>}
                {p.hasAntiAircraft && <span className="text-brass-500 ml-1">[AA]</span>}
                {p.hasOilTycoon && <span className="text-brass-400 ml-1">[Oil]</span>}
              </div>
            ) : (
              <div className="text-xs text-danger-500/60 mt-0.5">Eliminated</div>
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
        className="w-full py-4 bg-brass-500 hover:bg-brass-400 text-military-950 font-bold rounded-lg text-xl transition-colors"
      >
        Roll Die
      </button>
    </PhaseCard>
  )
}

// ── Phase: Roll Result Splash ───────────────────────────

function RollResultPhase() {
  const { state, dispatch } = useGame()
  const images = useImages()
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
    1: 'text-danger-500',
    2: 'text-brass-400',
    3: 'text-ops-500',
    4: 'text-ops-500',
    5: 'text-ops-500',
    6: 'text-brass-500',
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
      <img src={images.getRollResultImage(roll)} alt="" className="spot-illustration mb-4" />
      <div className="text-8xl font-black text-brass-500 mb-4">{roll}</div>
      <div className={`text-2xl font-bold mb-2 ${rollColors[roll]}`}>
        {rollLabels[roll]}
      </div>
      <p className="text-military-300 text-lg mb-8 text-center max-w-sm">
        {state.rollResult}
      </p>
      <span className="text-military-500 text-sm">Tap anywhere or press any key to continue</span>
    </div>
  )
}

// ── Phase: Dog Fight ────────────────────────────────────

function DogFightPhase() {
  const { state, dispatch } = useGame()
  const images = useImages()
  const player = state.players[state.currentPlayerIndex]
  const opponents = state.players.filter((p) => p.alive && p.id !== player.id)

  return (
    <PhaseCard title="Dog Fight!">
      <img src={images.dogfightChallenge} alt="" className="spot-illustration mb-4" />
      <p className="text-military-300 mb-4">
        {player.name}, choose an opponent to fight:
      </p>
      <div className="space-y-2">
        {opponents.map((p) => (
          <button
            key={p.id}
            onClick={() => dispatch({ type: 'DOG_FIGHT_PICK', defenderId: p.id })}
            className="w-full py-3 bg-military-700 hover:bg-military-600 text-military-100 rounded transition-colors text-left px-4"
          >
            <span className="font-semibold">{p.name}</span>
            <span className="text-military-400 text-sm ml-2">
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
  const images = useImages()
  const df = state.dogFight!
  const attacker = state.players.find((p) => p.id === df.attackerId)!
  const defender = state.players.find((p) => p.id === df.defenderId)!

  const hasRolled = df.attackerRoll != null

  function handleFight() {
    dispatch({
      type: 'DOG_FIGHT_ROLL',
      attackerRoll: rollDie(),
    })
  }

  const attackerWon = hasRolled && df.loserId !== df.attackerId

  return (
    <PhaseCard title="Dog Fight!">
      <div className="text-center mb-4">
        <p className="text-lg text-military-200">
          <span className="text-raf-500 font-bold">{attacker.name}</span>
          {' vs '}
          <span className="text-danger-500 font-bold">{defender.name}</span>
        </p>
      </div>

      {!hasRolled ? (
        <button
          onClick={handleFight}
          className="w-full py-3 bg-danger-500 hover:bg-danger-400 text-white font-bold rounded-lg transition-colors"
        >
          Roll to Fight!
        </button>
      ) : (
        <div className="text-center">
          <img
            src={attackerWon ? images.dogfightWin : images.dogfightLose}
            alt=""
            className="spot-illustration mb-3"
          />
          <div className="text-5xl font-bold text-brass-500 mb-3">{df.attackerRoll}</div>
          <p className="text-lg font-bold mb-2 text-military-200">
            {attacker.name} rolled a {df.attackerRoll}.
          </p>
          <p className={`text-sm mb-4 ${attackerWon ? 'text-ops-500' : 'text-danger-500'}`}>
            {attackerWon
              ? `A ${df.attackerRoll} is a winning roll, so ${defender.name} loses a plane and ${DOGFIGHT_FUEL_PENALTY} fuel.`
              : `A ${df.attackerRoll} is a losing roll, so ${attacker.name} loses a plane and ${DOGFIGHT_FUEL_PENALTY} fuel.`}
          </p>
          <button
            onClick={() => dispatch({ type: 'DOG_FIGHT_ACKNOWLEDGE' })}
            className="px-6 py-2 bg-military-700 hover:bg-military-600 text-military-200 rounded transition-colors"
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
  const images = useImages()
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
      case 'mercenary':
        // Need at least 3 alive players: hirer, mercenary, and a target
        return state.players.filter((p) => p.alive).length >= 3
      default:
        return true
    }
  }

  return (
    <PhaseCard title="Shop" headerImage={images.shopHangar}>
      <p className="text-military-400 text-sm mb-4">
        {player.name} has <span className="text-brass-500 font-bold">{player.fuel}</span> fuel.
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
                  ? 'bg-military-700 hover:bg-military-600 text-military-100'
                  : 'bg-military-800/50 text-military-600 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3">
                <img
                  src={images.shopItemImages[item.id]}
                  alt=""
                  className="spot-illustration-sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs text-military-500 mr-2">#{item.number}</span>
                      <span className="font-semibold">{item.name}</span>
                    </div>
                    <span className={`text-sm font-mono ${available ? 'text-brass-500' : 'text-military-600'}`}>
                      {item.cost === 'variable' ? 'var' : `${item.cost}f`}
                    </span>
                  </div>
                  <p className="text-xs text-military-500 mt-1">{item.description}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
      <button
        onClick={() => dispatch({ type: 'SKIP_SHOP' })}
        className="w-full py-3 bg-military-700 hover:bg-military-600 text-military-300 rounded transition-colors"
      >
        Skip Shop
      </button>
    </PhaseCard>
  )
}

// ── Phase: Cheap Bomb ───────────────────────────────────

function CheapBombTargetPhase() {
  const { state, dispatch } = useGame()
  const images = useImages()
  const player = state.players[state.currentPlayerIndex]
  const targets = state.players.filter((p) => p.alive && p.id !== player.id)

  return (
    <PhaseCard title="Cheap Bomb">
      <img src={images.itemCheapbomb} alt="" className="spot-illustration mb-4" />
      <p className="text-military-300 mb-4">Choose a target:</p>
      <div className="space-y-2">
        {targets.map((t) => (
          <button
            key={t.id}
            onClick={() => dispatch({ type: 'CHEAP_BOMB_TARGET', targetId: t.id })}
            className="w-full py-3 bg-military-700 hover:bg-military-600 text-military-100 rounded transition-colors px-4 text-left"
          >
            <span className="font-semibold">{t.name}</span>
            <span className="text-military-400 text-sm ml-2">
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
  const images = useImages()
  const bomb = state.bomb!
  const target = state.players.find((p) => p.id === bomb.targetId)!

  return (
    <PhaseCard title="Cheap Bomb">
      <img src={images.itemCheapbomb} alt="" className="spot-illustration mb-4" />
      <p className="text-military-300 mb-4">
        Bombing <span className="text-danger-500 font-bold">{target.name}</span>.
        Roll 4-6 to hit!
      </p>
      <button
        onClick={() => dispatch({ type: 'CHEAP_BOMB_ROLL', roll: rollDie() })}
        className="w-full py-3 bg-danger-500 hover:bg-danger-400 text-white font-bold rounded-lg transition-colors"
      >
        Drop Bomb
      </button>
    </PhaseCard>
  )
}

function CheapBombResultPhase() {
  const { state, dispatch } = useGame()
  const images = useImages()
  const bomb = state.bomb!
  const target = state.players.find((p) => p.id === bomb.targetId)!

  return (
    <PhaseCard title="Cheap Bomb Result">
      <div className="text-center">
        <img
          src={bomb.hit ? images.bombHit : images.bombMiss}
          alt=""
          className="spot-illustration mb-3"
        />
        <div className="text-5xl font-bold text-brass-500 mb-3">{bomb.roll}</div>
        <p className={`text-lg font-bold mb-4 ${bomb.hit ? 'text-danger-500' : 'text-ops-500'}`}>
          {bomb.hit ? `Hit! ${target.name} takes damage!` : 'Miss!'}
        </p>
        <button
          onClick={() => dispatch({ type: 'CHEAP_BOMB_ACKNOWLEDGE' })}
          className="px-6 py-2 bg-military-700 hover:bg-military-600 text-military-200 rounded transition-colors"
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
  const images = useImages()
  const player = state.players[state.currentPlayerIndex]
  const targets = state.players.filter((p) => p.alive && p.id !== player.id)

  return (
    <PhaseCard title="Pricey Bomb">
      <img src={images.itemPriceybomb} alt="" className="spot-illustration mb-4" />
      <p className="text-military-300 mb-4">
        Guaranteed hit! Choose a target:
      </p>
      <div className="space-y-2">
        {targets.map((t) => (
          <button
            key={t.id}
            onClick={() => dispatch({ type: 'PRICEY_BOMB_TARGET', targetId: t.id })}
            className="w-full py-3 bg-military-700 hover:bg-military-600 text-military-100 rounded transition-colors px-4 text-left"
          >
            <span className="font-semibold">{t.name}</span>
            <span className="text-military-400 text-sm ml-2">
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
  const images = useImages()
  const bomb = state.bomb!
  const target = state.players.find((p) => p.id === bomb.targetId)!

  return (
    <PhaseCard title="Pricey Bomb Result">
      <div className="text-center">
        <img src={images.bombHit} alt="" className="spot-illustration mb-3" />
        <p className="text-lg text-danger-500 font-bold mb-4">
          Direct hit on {target.name}!
        </p>
        <button
          onClick={() => dispatch({ type: 'PRICEY_BOMB_ACKNOWLEDGE' })}
          className="px-6 py-2 bg-military-700 hover:bg-military-600 text-military-200 rounded transition-colors"
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
  const images = useImages()
  const player = state.players[state.currentPlayerIndex]
  const targets = state.players.filter((p) => p.alive && p.id !== player.id)

  return (
    <PhaseCard title="Donation">
      <img src={images.itemDonation} alt="" className="spot-illustration mb-4" />
      <p className="text-military-300 mb-4">
        Choose who to donate fuel to (costs amount + 2 fee):
      </p>
      <div className="space-y-2">
        {targets.map((t) => (
          <button
            key={t.id}
            onClick={() => dispatch({ type: 'DONATION_TARGET', targetId: t.id })}
            className="w-full py-3 bg-military-700 hover:bg-military-600 text-military-100 rounded transition-colors px-4 text-left"
          >
            <span className="font-semibold">{t.name}</span>
            <span className="text-military-400 text-sm ml-2">({t.fuel} fuel)</span>
          </button>
        ))}
      </div>
    </PhaseCard>
  )
}

function DonationAmountPhase() {
  const { state, dispatch } = useGame()
  const images = useImages()
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
      <img src={images.itemDonation} alt="" className="spot-illustration mb-4" />
      <p className="text-military-300 mb-4">
        Donating to <span className="text-raf-500 font-bold">{recipient.name}</span>.
        You have {player.fuel} fuel (2 fuel fee applies).
      </p>
      <div className="flex items-center gap-3 mb-4">
        <label className="text-military-400 text-sm">Amount:</label>
        <input
          type="number"
          min={1}
          max={maxDonation}
          value={amount}
          onChange={(e) => setAmount(Math.max(1, Math.min(maxDonation, parseInt(e.target.value) || 1)))}
          className="w-24 bg-military-700 border border-military-600 rounded px-3 py-2 text-military-100 text-center focus:outline-none focus:border-raf-500"
        />
        <span className="text-military-500 text-sm">
          (total cost: {amount + 2})
        </span>
      </div>
      <button
        onClick={handleDonate}
        disabled={amount < 1 || amount > maxDonation}
        className="w-full py-3 bg-raf-600 hover:bg-raf-500 disabled:bg-military-700 disabled:text-military-500 text-white font-bold rounded transition-colors"
      >
        Donate {amount} Fuel
      </button>
    </PhaseCard>
  )
}

function DonationResultPhase() {
  const { state, dispatch } = useGame()
  const images = useImages()
  const donation = state.donation!
  const recipient = state.players.find((p) => p.id === donation.recipientId)!

  return (
    <PhaseCard title="Donation Complete">
      <div className="text-center">
        <img src={images.itemDonation} alt="" className="spot-illustration mb-3" />
        <p className="text-lg text-ops-500 font-bold mb-4">
          Donated {donation.amount} fuel to {recipient.name}!
        </p>
        <button
          onClick={() => dispatch({ type: 'DONATION_ACKNOWLEDGE' })}
          className="px-6 py-2 bg-military-700 hover:bg-military-600 text-military-200 rounded transition-colors"
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
  const images = useImages()
  const player = state.players[state.currentPlayerIndex]
  const candidates = state.players.filter((p) => p.alive && p.id !== player.id)

  return (
    <PhaseCard title="Hire Mercenary">
      <img src={images.itemMercenary} alt="" className="spot-illustration mb-4" />
      <p className="text-military-300 mb-4">Choose a player to hire:</p>
      <div className="space-y-2">
        {candidates.map((p) => (
          <button
            key={p.id}
            onClick={() => dispatch({ type: 'MERCENARY_TARGET', mercenaryId: p.id })}
            className="w-full py-3 bg-military-700 hover:bg-military-600 text-military-100 rounded transition-colors px-4 text-left"
          >
            <span className="font-semibold">{p.name}</span>
            <span className="text-military-400 text-sm ml-2">
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
  const images = useImages()
  const player = state.players[state.currentPlayerIndex]
  const merc = state.mercenary!
  const mercenary = state.players.find((p) => p.id === merc.mercenaryId)!
  const [amount, setAmount] = useState(1)
  const maxOffer = Math.min(60, player.fuel)

  return (
    <PhaseCard title="Mercenary Offer">
      <img src={images.itemMercenary} alt="" className="spot-illustration mb-4" />
      <p className="text-military-300 mb-4">
        Offer fuel to <span className="text-raf-500 font-bold">{mercenary.name}</span> to fight on your behalf.
      </p>
      <div className="flex items-center gap-3 mb-4">
        <label className="text-military-400 text-sm">Offer:</label>
        <input
          type="number"
          min={1}
          max={maxOffer}
          value={amount}
          onChange={(e) => setAmount(Math.max(1, Math.min(maxOffer, parseInt(e.target.value) || 1)))}
          className="w-24 bg-military-700 border border-military-600 rounded px-3 py-2 text-military-100 text-center focus:outline-none focus:border-raf-500"
        />
        <span className="text-military-500 text-sm">fuel (1-60)</span>
      </div>
      <button
        onClick={() => dispatch({ type: 'MERCENARY_OFFER', amount })}
        disabled={amount < 1 || amount > maxOffer}
        className="w-full py-3 bg-brass-500 hover:bg-brass-400 disabled:bg-military-700 disabled:text-military-500 text-military-950 font-bold rounded transition-colors"
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
      <p className="text-military-500 text-sm uppercase tracking-widest mb-4">
        Next pilot, report for duty
      </p>
      <h2 className="font-stencil text-4xl text-brass-500 mb-2">
        {mercenary.name}
      </h2>
      <p className="text-military-400 text-sm mt-1 mb-6">
        You have been offered {merc.offeredFuel} fuel as a mercenary
      </p>
      <button
        onClick={(e) => {
          e.stopPropagation()
          dispatch({ type: 'MERCENARY_HANDOVER_COMPLETE' })
        }}
        className="px-8 py-3 bg-raf-600 hover:bg-raf-500 text-white font-bold rounded-lg transition-colors"
      >
        Ready
      </button>
    </div>
  )
}

function MercenaryResponsePhase() {
  const { state, dispatch } = useGame()
  const images = useImages()
  const merc = state.mercenary!
  const hirer = state.players.find((p) => p.id === merc.hirerId)!

  return (
    <PhaseCard title="Mercenary Offer">
      <img src={images.itemMercenary} alt="" className="spot-illustration mb-4" />
      <p className="text-military-300 mb-4">
        <span className="text-raf-500 font-bold">{hirer.name}</span> is offering you{' '}
        <span className="text-brass-500 font-bold">{merc.offeredFuel} fuel</span> to fight
        as their mercenary.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => dispatch({ type: 'MERCENARY_RESPOND', accepted: true })}
          className="flex-1 py-3 bg-ops-500 hover:bg-ops-400 text-white font-bold rounded transition-colors"
        >
          Accept
        </button>
        <button
          onClick={() => dispatch({ type: 'MERCENARY_RESPOND', accepted: false })}
          className="flex-1 py-3 bg-danger-500 hover:bg-danger-400 text-white font-bold rounded transition-colors"
        >
          Decline
        </button>
      </div>
    </PhaseCard>
  )
}

function MercenaryFightTargetPhase() {
  const { state, dispatch } = useGame()
  const images = useImages()
  const merc = state.mercenary!
  const hirer = state.players.find((p) => p.id === merc.hirerId)!
  const mercenary = state.players.find((p) => p.id === merc.mercenaryId)!
  const targets = state.players.filter(
    (p) => p.alive && p.id !== merc.hirerId && p.id !== merc.mercenaryId,
  )

  return (
    <PhaseCard title="Mercenary - Choose Target">
      <img src={images.dogfightChallenge} alt="" className="spot-illustration mb-4" />
      <p className="text-military-300 mb-4">
        {hirer.name}, choose who {mercenary.name} will fight:
      </p>
      <div className="space-y-2">
        {targets.map((t) => (
          <button
            key={t.id}
            onClick={() => dispatch({ type: 'MERCENARY_FIGHT_TARGET', targetId: t.id })}
            className="w-full py-3 bg-military-700 hover:bg-military-600 text-military-100 rounded transition-colors px-4 text-left"
          >
            <span className="font-semibold">{t.name}</span>
            <span className="text-military-400 text-sm ml-2">
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
  const images = useImages()
  const merc = state.mercenary!
  const mercenary = state.players.find((p) => p.id === merc.mercenaryId)!
  const target = state.players.find((p) => p.id === merc.targetId)!

  return (
    <PhaseCard title="Mercenary - Number of Fights">
      <img src={images.dogfightChallenge} alt="" className="spot-illustration mb-4" />
      <p className="text-military-300 mb-4">
        {mercenary.name} vs {target.name}. Roll to determine number of fights!
      </p>
      <button
        onClick={() => dispatch({ type: 'MERCENARY_FIGHT_COUNT_ROLL', roll: rollDie() })}
        className="w-full py-3 bg-brass-500 hover:bg-brass-400 text-military-950 font-bold rounded-lg transition-colors"
      >
        Roll for Fights
      </button>
    </PhaseCard>
  )
}

function MercenaryFightPhase() {
  const { state, dispatch } = useGame()
  const images = useImages()
  const merc = state.mercenary!
  const mercenary = state.players.find((p) => p.id === merc.mercenaryId)!
  const target = state.players.find((p) => p.id === merc.targetId)!

  return (
    <PhaseCard title={`Mercenary Fight ${merc.fightsCompleted + 1}/${merc.fightCount}`}>
      <img src={images.dogfightChallenge} alt="" className="spot-illustration mb-4" />
      <p className="text-military-300 mb-4">
        <span className="text-raf-500 font-bold">{mercenary.name}</span>
        {' vs '}
        <span className="text-danger-500 font-bold">{target.name}</span>
      </p>
      <button
        onClick={() =>
          dispatch({
            type: 'MERCENARY_FIGHT_ROLL',
            attackerRoll: rollDie(),
          })
        }
        className="w-full py-3 bg-danger-500 hover:bg-danger-400 text-white font-bold rounded-lg transition-colors"
      >
        Roll to Fight!
      </button>
    </PhaseCard>
  )
}

function MercenaryFightResultPhase() {
  const { state, dispatch } = useGame()
  const images = useImages()
  const merc = state.mercenary!
  const fight = merc.currentFight!
  const mercenary = state.players.find((p) => p.id === fight.attackerId)!
  const target = state.players.find((p) => p.id === fight.defenderId)!
  const attackerWon = fight.loserId !== fight.attackerId

  return (
    <PhaseCard title={`Fight ${merc.fightsCompleted}/${merc.fightCount} Result`}>
      <div className="text-center">
        <img
          src={attackerWon ? images.dogfightWin : images.dogfightLose}
          alt=""
          className="spot-illustration mb-3"
        />
        <div className="text-5xl font-bold text-brass-500 mb-3">{fight.attackerRoll}</div>
        <p className="text-lg font-bold mb-2 text-military-200">
          {mercenary.name} rolled a {fight.attackerRoll}.
        </p>
        <p className={`text-sm mb-4 ${attackerWon ? 'text-ops-500' : 'text-danger-500'}`}>
          {attackerWon
            ? `A ${fight.attackerRoll} is a winning roll, so ${target.name} loses a plane and ${DOGFIGHT_FUEL_PENALTY} fuel.`
            : `A ${fight.attackerRoll} is a losing roll, so ${mercenary.name} loses a plane and ${DOGFIGHT_FUEL_PENALTY} fuel.`}
        </p>
        <button
          onClick={() => dispatch({ type: 'MERCENARY_FIGHT_ACKNOWLEDGE' })}
          className="px-6 py-2 bg-military-700 hover:bg-military-600 text-military-200 rounded transition-colors"
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
  const images = useImages()
  const merc = state.mercenary!
  const mercenary = state.players.find((p) => p.id === merc.mercenaryId)!

  return (
    <PhaseCard title="Mercenary Complete">
      <div className="text-center">
        <img src={images.itemMercenary} alt="" className="spot-illustration mb-3" />
        {merc.accepted === false ? (
          <p className="text-military-300 mb-4">
            {mercenary.name} declined the offer.
          </p>
        ) : (
          <p className="text-military-300 mb-4">
            Mercenary contract complete. {merc.fightsCompleted} fight(s) resolved.
          </p>
        )}
        <button
          onClick={() => dispatch({ type: 'MERCENARY_COMPLETE_ACKNOWLEDGE' })}
          className="px-6 py-2 bg-military-700 hover:bg-military-600 text-military-200 rounded transition-colors"
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
  const images = useImages()

  return (
    <PhaseCard title="Dig for Fuel">
      <img src={images.itemDig} alt="" className="spot-illustration mb-4" />
      <p className="text-military-300 mb-4">Roll to see how much fuel you find!</p>
      <button
        onClick={() => dispatch({ type: 'DIG_FOR_FUEL_ROLL', roll: rollDie() })}
        className="w-full py-3 bg-brass-500 hover:bg-brass-400 text-military-950 font-bold rounded-lg transition-colors"
      >
        Dig!
      </button>
    </PhaseCard>
  )
}

function DigForFuelResultPhase() {
  const { state, dispatch } = useGame()
  const images = useImages()
  const roll = state.digForFuelRoll!
  const fuelGained = roll === 6 ? 10 : roll

  return (
    <PhaseCard title="Dig for Fuel">
      <div className="text-center">
        <img src={images.itemDig} alt="" className="spot-illustration mb-3" />
        <div className="text-5xl font-bold text-brass-500 mb-3">{roll}</div>
        <p className="text-lg text-ops-500 font-bold mb-4">
          Found {fuelGained} fuel!
        </p>
        <button
          onClick={() => dispatch({ type: 'DIG_FOR_FUEL_ACKNOWLEDGE' })}
          className="px-6 py-2 bg-military-700 hover:bg-military-600 text-military-200 rounded transition-colors"
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
  const images = useImages()
  const player = state.players[state.currentPlayerIndex]
  const canAfford = player.fuel >= OIL_TYCOON_REPAIR_COST

  return (
    <PhaseCard title="Oil Tycoon Damaged!">
      <img src={images.itemOiltycoon} alt="" className="spot-illustration mb-4" />
      <p className="text-military-300 mb-2">
        Your Oil Tycoon has been destroyed. You have{' '}
        <span className="text-brass-500 font-bold">{player.oilTycoonRepairTurnsLeft}</span> turn(s)
        left to repair it.
      </p>
      <p className="text-military-400 text-sm mb-4">
        Repair cost: {OIL_TYCOON_REPAIR_COST} fuel. You have {player.fuel} fuel.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => dispatch({ type: 'OIL_TYCOON_REPAIR' })}
          disabled={!canAfford}
          className="flex-1 py-3 bg-brass-500 hover:bg-brass-400 disabled:bg-military-700 disabled:text-military-500 text-military-950 font-bold rounded transition-colors"
        >
          Repair ({OIL_TYCOON_REPAIR_COST}f)
        </button>
        <button
          onClick={() => dispatch({ type: 'OIL_TYCOON_SKIP_REPAIR' })}
          className="flex-1 py-3 bg-military-700 hover:bg-military-600 text-military-300 rounded transition-colors"
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
  const images = useImages()
  const player = state.players[state.currentPlayerIndex]
  const taxOwed = FUEL_TAX_PER_PLANE * player.planes
  const canAfford = player.fuel >= taxOwed

  return (
    <PhaseCard title="Fuel Tax">
      <img src={images.taxMaintenance} alt="" className="spot-illustration mb-4" />
      <div className="bg-military-700/50 rounded p-4 mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-military-400">Planes:</span>
          <span className="text-military-200">{player.planes}</span>
        </div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-military-400">Tax per plane:</span>
          <span className="text-military-200">{FUEL_TAX_PER_PLANE}</span>
        </div>
        <div className="border-t border-military-600 mt-2 pt-2 flex justify-between font-bold">
          <span className="text-military-300">Total tax:</span>
          <span className={canAfford ? 'text-brass-500' : 'text-danger-500'}>{taxOwed} fuel</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-military-400">Your fuel:</span>
          <span className="text-military-200">{player.fuel}</span>
        </div>
      </div>
      {!canAfford && (
        <p className="text-danger-500 text-sm mb-3">
          Not enough fuel! You will lose a plane.
        </p>
      )}
      <button
        onClick={() => dispatch({ type: 'PAY_TAX' })}
        className="w-full py-3 bg-brass-500 hover:bg-brass-400 text-military-950 font-bold rounded transition-colors"
      >
        {canAfford ? 'Pay Tax' : 'Pay What You Can'}
      </button>
    </PhaseCard>
  )
}

// ── Phase: Turn End ─────────────────────────────────────

function TurnEndPhase() {
  const { state, dispatch } = useGame()
  const images = useImages()
  const player = state.players[state.currentPlayerIndex]

  return (
    <PhaseCard title="Turn Complete">
      <div className="bg-military-700/50 rounded p-4 mb-4">
        <p className="text-military-300 text-center">
          {player.name} ends the turn with{' '}
          <span className="text-brass-500 font-bold">{player.planes}</span> plane(s) and{' '}
          <span className="text-brass-500 font-bold">{player.fuel}</span> fuel.
        </p>
      </div>
      <img src={images.uiWings} alt="" className="decoration-wings mb-4" />
      <button
        onClick={() => dispatch({ type: 'END_TURN' })}
        className="w-full py-3 bg-raf-600 hover:bg-raf-500 text-white font-bold rounded-lg transition-colors"
      >
        End Turn
      </button>
    </PhaseCard>
  )
}

// ── Shared Phase Card ───────────────────────────────────

function PhaseCard({ title, headerImage, children }: { title: string; headerImage?: string; children: React.ReactNode }) {
  return (
    <div className="bg-military-800 rounded-lg shadow-lg overflow-hidden">
      {headerImage && (
        <div
          className="h-24 bg-cover bg-center relative"
          style={{ backgroundImage: `url(${headerImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-military-800/40 to-military-800" />
        </div>
      )}
      <div className="p-6">
        <h3 className="text-lg font-bold text-military-100 mb-4">{title}</h3>
        {children}
      </div>
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
          className="text-military-400 hover:text-military-200 text-sm px-3 py-1 rounded border border-military-600 hover:border-military-500 transition-colors"
        >
          Rules
        </button>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="text-military-400 hover:text-military-200 text-sm px-3 py-1 rounded border border-military-600 hover:border-military-500 transition-colors"
        >
          Menu
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full mt-1 z-50 bg-military-800 border border-military-600 rounded-lg shadow-xl min-w-[10rem]">
              <button
                onClick={handleSaveExit}
                className="w-full text-left px-4 py-2.5 text-sm text-military-200 hover:bg-military-700 rounded-t-lg transition-colors"
              >
                Save &amp; Exit
              </button>
              <button
                onClick={handleReset}
                className="w-full text-left px-4 py-2.5 text-sm text-danger-500 hover:bg-military-700 rounded-b-lg transition-colors"
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
