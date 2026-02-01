import { useState, useEffect } from 'react'
import { useGame } from '../state/gameContext.tsx'
import { TurnPhase, FUEL_TAX_PER_PLANE, OIL_TYCOON_REPAIR_COST, DOGFIGHT_FUEL_PENALTY } from '../types/game.ts'
import { SHOP_CATALOG } from '../types/shop.ts'
import type { ShopItemId } from '../types/shop.ts'
import { rollDie } from '../utils/dice.ts'
import GameLog from '../components/GameLog.tsx'
import RulesOverlay from '../components/RulesOverlay.tsx'
import { useImages } from '../utils/images.ts'
import { useCpuAction } from '../cpu/useCpuAction.ts'
import { describeCpuAction } from '../cpu/cpuStrategy.ts'

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
              <span className={`ml-1.5 text-[10px] font-mono ${p.isCpu ? 'text-raf-500' : 'text-military-600'}`}>
                {p.isCpu ? 'CPU' : 'HUM'}
              </span>
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
  const images = useImages()
  const player = state.players[state.currentPlayerIndex]

  return (
    <PhaseCard title={`${player.name}'s Turn`}>
      <img src={images.diceRoll} alt="" className="spot-illustration mb-4" />
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
          <p className={`text-sm mb-4 ${df.blockedBy ? 'text-brass-500' : attackerWon ? 'text-ops-500' : 'text-danger-500'}`}>
            {df.blockedBy
              ? `A ${df.attackerRoll} is a ${attackerWon ? 'winning' : 'losing'} roll, but ${attackerWon ? defender.name : attacker.name}'s ${df.blockedBy === 'anti_aircraft' ? 'Anti-Aircraft' : 'Insurance'} absorbed the hit! No plane or fuel lost.`
              : attackerWon
                ? `A ${df.attackerRoll} is a winning roll, so ${defender.name} loses a plane and up to ${DOGFIGHT_FUEL_PENALTY} fuel to ${attacker.name}.`
                : `A ${df.attackerRoll} is a losing roll, so ${attacker.name} loses a plane and up to ${DOGFIGHT_FUEL_PENALTY} fuel to ${defender.name}.`}
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
    if (cost === 'variable') return player.fuel > 0
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
      <button
        onClick={() => dispatch({ type: 'CANCEL_SHOP_ITEM' })}
        className="w-full mt-3 py-2 bg-military-700 hover:bg-military-600 text-military-400 rounded transition-colors text-sm"
      >
        Back to Shop
      </button>
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
      <button
        onClick={() => dispatch({ type: 'CANCEL_SHOP_ITEM' })}
        className="w-full mt-2 py-2 bg-military-700 hover:bg-military-600 text-military-400 rounded transition-colors text-sm"
      >
        Back to Shop
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
          {bomb.hit
            ? bomb.blockedBy === 'insurance'
              ? `Hit! But ${target.name}'s Insurance protected them!`
              : bomb.blockedBy === 'anti_aircraft'
                ? `Hit! But ${target.name}'s Anti-Aircraft absorbed it!`
                : `Hit! ${target.name} takes damage!`
            : 'Miss!'}
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
      <button
        onClick={() => dispatch({ type: 'CANCEL_SHOP_ITEM' })}
        className="w-full mt-3 py-2 bg-military-700 hover:bg-military-600 text-military-400 rounded transition-colors text-sm"
      >
        Back to Shop
      </button>
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
          {bomb.blockedBy === 'anti_aircraft'
            ? `Direct hit on ${target.name}! But their Anti-Aircraft absorbed it!`
            : `Direct hit on ${target.name}!`}
        </p>
        {!bomb.blockedBy && target.insuranceTurnsLeft > 0 && (
          <p className="text-sm text-military-400 mb-4">
            {target.name}'s Insurance does not protect against Pricey Bombs.
          </p>
        )}
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

// ── Phase: Trade ────────────────────────────────────────

function TradeTargetPhase() {
  const { state, dispatch } = useGame()
  const images = useImages()
  const player = state.players[state.currentPlayerIndex]
  const targets = state.players.filter((p) => p.alive && p.id !== player.id)

  return (
    <PhaseCard title="Trade">
      <img src={images.itemDonation} alt="" className="spot-illustration mb-4" />
      <p className="text-military-300 mb-4">Choose a trading partner:</p>
      <div className="space-y-2">
        {targets.map((t) => (
          <button
            key={t.id}
            onClick={() => dispatch({ type: 'TRADE_TARGET', partnerId: t.id })}
            className="w-full py-3 bg-military-700 hover:bg-military-600 text-military-100 rounded transition-colors px-4 text-left"
          >
            <span className="font-semibold">{t.name}</span>
            <span className="text-military-400 text-sm ml-2">
              ({t.planes} planes, {t.fuel} fuel
              {t.hasAntiAircraft ? ', AA' : ''}
              {t.hasOilTycoon ? ', Oil' : ''}
              {t.insuranceTurnsLeft > 0 ? `, Ins:${t.insuranceTurnsLeft}` : ''})
            </span>
          </button>
        ))}
      </div>
      <button
        onClick={() => dispatch({ type: 'CANCEL_SHOP_ITEM' })}
        className="w-full mt-3 py-2 bg-military-700 hover:bg-military-600 text-military-400 rounded transition-colors text-sm"
      >
        Back to Shop
      </button>
    </PhaseCard>
  )
}

function TradeOfferPhase() {
  const { state, dispatch } = useGame()
  const images = useImages()
  const player = state.players[state.currentPlayerIndex]
  const trade = state.trade!
  const partner = state.players.find((p) => p.id === trade.partnerId)!

  const [offerFuel, setOfferFuel] = useState(0)
  const [offerPlanes, setOfferPlanes] = useState(0)
  const [offerAA, setOfferAA] = useState(false)
  const [offerOT, setOfferOT] = useState(false)
  const [offerIns, setOfferIns] = useState(false)

  const [reqFuel, setReqFuel] = useState(0)
  const [reqPlanes, setReqPlanes] = useState(0)
  const [reqAA, setReqAA] = useState(false)
  const [reqOT, setReqOT] = useState(false)
  const [reqIns, setReqIns] = useState(false)

  const offerEmpty = offerFuel === 0 && offerPlanes === 0 && !offerAA && !offerOT && !offerIns
  const reqEmpty = reqFuel === 0 && reqPlanes === 0 && !reqAA && !reqOT && !reqIns
  const canPropose = !(offerEmpty && reqEmpty)

  function handlePropose() {
    dispatch({
      type: 'TRADE_PROPOSE',
      offering: { fuel: offerFuel, planes: offerPlanes, antiAircraft: offerAA, oilTycoon: offerOT, insurance: offerIns },
      requesting: { fuel: reqFuel, planes: reqPlanes, antiAircraft: reqAA, oilTycoon: reqOT, insurance: reqIns },
    })
  }

  return (
    <PhaseCard title={`Trade with ${partner.name}`}>
      <img src={images.itemDonation} alt="" className="spot-illustration mb-4" />

      {/* You Give */}
      <div className="bg-military-700/50 rounded p-3 mb-3">
        <h4 className="text-sm font-semibold text-danger-500 mb-2 uppercase tracking-wider">You Give</h4>
        <div className="flex items-center gap-3 mb-2">
          <label className="text-military-400 text-xs w-12">Fuel:</label>
          <input type="number" min={0} max={player.fuel} value={offerFuel}
            onChange={(e) => setOfferFuel(Math.max(0, Math.min(player.fuel, parseInt(e.target.value) || 0)))}
            className="w-20 bg-military-700 border border-military-600 rounded px-2 py-1 text-military-100 text-center text-sm focus:outline-none focus:border-raf-500" />
          <span className="text-military-500 text-xs">/ {player.fuel}</span>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <label className="text-military-400 text-xs w-12">Planes:</label>
          <input type="number" min={0} max={player.planes - 1} value={offerPlanes}
            onChange={(e) => setOfferPlanes(Math.max(0, Math.min(player.planes - 1, parseInt(e.target.value) || 0)))}
            className="w-20 bg-military-700 border border-military-600 rounded px-2 py-1 text-military-100 text-center text-sm focus:outline-none focus:border-raf-500" />
          <span className="text-military-500 text-xs">/ {player.planes - 1}</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {player.hasAntiAircraft && !reqAA && (
            <label className="flex items-center gap-1 text-xs text-military-300">
              <input type="checkbox" checked={offerAA} onChange={(e) => setOfferAA(e.target.checked)} className="accent-brass-500" />
              AA
            </label>
          )}
          {player.hasOilTycoon && !reqOT && (
            <label className="flex items-center gap-1 text-xs text-military-300">
              <input type="checkbox" checked={offerOT} onChange={(e) => setOfferOT(e.target.checked)} className="accent-brass-500" />
              Oil Tycoon
            </label>
          )}
          {player.insuranceTurnsLeft > 0 && !reqIns && (
            <label className="flex items-center gap-1 text-xs text-military-300">
              <input type="checkbox" checked={offerIns} onChange={(e) => setOfferIns(e.target.checked)} className="accent-brass-500" />
              Insurance ({player.insuranceTurnsLeft}t)
            </label>
          )}
        </div>
      </div>

      {/* You Request */}
      <div className="bg-military-700/50 rounded p-3 mb-4">
        <h4 className="text-sm font-semibold text-ops-500 mb-2 uppercase tracking-wider">You Request</h4>
        <div className="flex items-center gap-3 mb-2">
          <label className="text-military-400 text-xs w-12">Fuel:</label>
          <input type="number" min={0} max={partner.fuel} value={reqFuel}
            onChange={(e) => setReqFuel(Math.max(0, Math.min(partner.fuel, parseInt(e.target.value) || 0)))}
            className="w-20 bg-military-700 border border-military-600 rounded px-2 py-1 text-military-100 text-center text-sm focus:outline-none focus:border-raf-500" />
          <span className="text-military-500 text-xs">/ {partner.fuel}</span>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <label className="text-military-400 text-xs w-12">Planes:</label>
          <input type="number" min={0} max={partner.planes - 1} value={reqPlanes}
            onChange={(e) => setReqPlanes(Math.max(0, Math.min(partner.planes - 1, parseInt(e.target.value) || 0)))}
            className="w-20 bg-military-700 border border-military-600 rounded px-2 py-1 text-military-100 text-center text-sm focus:outline-none focus:border-raf-500" />
          <span className="text-military-500 text-xs">/ {partner.planes - 1}</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {partner.hasAntiAircraft && !offerAA && (
            <label className="flex items-center gap-1 text-xs text-military-300">
              <input type="checkbox" checked={reqAA} onChange={(e) => setReqAA(e.target.checked)} className="accent-brass-500" />
              AA
            </label>
          )}
          {partner.hasOilTycoon && !offerOT && (
            <label className="flex items-center gap-1 text-xs text-military-300">
              <input type="checkbox" checked={reqOT} onChange={(e) => setReqOT(e.target.checked)} className="accent-brass-500" />
              Oil Tycoon
            </label>
          )}
          {partner.insuranceTurnsLeft > 0 && !offerIns && (
            <label className="flex items-center gap-1 text-xs text-military-300">
              <input type="checkbox" checked={reqIns} onChange={(e) => setReqIns(e.target.checked)} className="accent-brass-500" />
              Insurance ({partner.insuranceTurnsLeft}t)
            </label>
          )}
        </div>
      </div>

      <button
        onClick={handlePropose}
        disabled={!canPropose}
        className="w-full py-3 bg-brass-500 hover:bg-brass-400 disabled:bg-military-700 disabled:text-military-500 text-military-950 font-bold rounded transition-colors"
      >
        Propose Trade
      </button>
      <button
        onClick={() => dispatch({ type: 'CANCEL_SHOP_ITEM' })}
        className="w-full mt-2 py-2 bg-military-700 hover:bg-military-600 text-military-400 rounded transition-colors text-sm"
      >
        Back to Shop
      </button>
    </PhaseCard>
  )
}

function TradeOfferSummary({ offering, requesting, offererName, partnerName }: {
  offering: import('../types/game.ts').TradeOffer
  requesting: import('../types/game.ts').TradeOffer
  offererName: string
  partnerName: string
}) {
  function describeOffer(offer: import('../types/game.ts').TradeOffer): string[] {
    const parts: string[] = []
    if (offer.fuel > 0) parts.push(`${offer.fuel} fuel`)
    if (offer.planes > 0) parts.push(`${offer.planes} plane${offer.planes > 1 ? 's' : ''}`)
    if (offer.antiAircraft) parts.push('Anti-Aircraft')
    if (offer.oilTycoon) parts.push('Oil Tycoon')
    if (offer.insurance) parts.push('Insurance')
    return parts
  }

  const offererGives = describeOffer(offering)
  const partnerGives = describeOffer(requesting)

  return (
    <div className="bg-military-700/50 rounded p-3 mb-4 text-sm">
      <div className="mb-2">
        <span className="text-danger-500 font-semibold">{offererName} gives:</span>
        <span className="text-military-300 ml-2">
          {offererGives.length > 0 ? offererGives.join(', ') : 'Nothing'}
        </span>
      </div>
      <div>
        <span className="text-ops-500 font-semibold">{partnerName} gives:</span>
        <span className="text-military-300 ml-2">
          {partnerGives.length > 0 ? partnerGives.join(', ') : 'Nothing'}
        </span>
      </div>
    </div>
  )
}

function TradeHandoverPhase() {
  const { state, dispatch } = useGame()
  const trade = state.trade!
  const partner = state.players.find((p) => p.id === trade.partnerId)!
  const offerer = state.players.find((p) => p.id === trade.offererId)!

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[40vh] cursor-pointer select-none"
      onClick={() => dispatch({ type: 'TRADE_HANDOVER_COMPLETE' })}
    >
      <p className="text-military-500 text-sm uppercase tracking-widest mb-4">
        Pass device to trade partner
      </p>
      <h2 className="font-stencil text-4xl text-brass-500 mb-4">
        {partner.name}
      </h2>
      <TradeOfferSummary
        offering={trade.offering!}
        requesting={trade.requesting!}
        offererName={offerer.name}
        partnerName={partner.name}
      />
      <button
        onClick={(e) => {
          e.stopPropagation()
          dispatch({ type: 'TRADE_HANDOVER_COMPLETE' })
        }}
        className="px-8 py-3 bg-raf-600 hover:bg-raf-500 text-white font-bold rounded-lg transition-colors"
      >
        Ready
      </button>
    </div>
  )
}

function TradeResponsePhase() {
  const { state, dispatch } = useGame()
  const images = useImages()
  const trade = state.trade!
  const offerer = state.players.find((p) => p.id === trade.offererId)!
  const partner = state.players.find((p) => p.id === trade.partnerId)!

  return (
    <PhaseCard title="Trade Proposal">
      <img src={images.itemDonation} alt="" className="spot-illustration mb-4" />
      <p className="text-military-300 mb-3">
        <span className="text-raf-500 font-bold">{offerer.name}</span> wants to trade with you.
      </p>
      <TradeOfferSummary
        offering={trade.offering!}
        requesting={trade.requesting!}
        offererName={offerer.name}
        partnerName={partner.name}
      />
      <div className="flex gap-3">
        <button
          onClick={() => dispatch({ type: 'TRADE_RESPOND', accepted: true })}
          className="flex-1 py-3 bg-ops-500 hover:bg-ops-400 text-white font-bold rounded transition-colors"
        >
          Accept
        </button>
        <button
          onClick={() => dispatch({ type: 'TRADE_RESPOND', accepted: false })}
          className="flex-1 py-3 bg-danger-500 hover:bg-danger-400 text-white font-bold rounded transition-colors"
        >
          Decline
        </button>
      </div>
    </PhaseCard>
  )
}

function TradeResultPhase() {
  const { state, dispatch } = useGame()
  const images = useImages()
  const trade = state.trade!
  const offerer = state.players.find((p) => p.id === trade.offererId)!
  const partner = state.players.find((p) => p.id === trade.partnerId)!

  return (
    <PhaseCard title={trade.accepted ? 'Trade Accepted' : 'Trade Declined'}>
      <div className="text-center">
        <img src={images.itemDonation} alt="" className="spot-illustration mb-3" />
        {trade.accepted ? (
          <>
            <p className="text-lg text-ops-500 font-bold mb-3">Trade completed!</p>
            <TradeOfferSummary
              offering={trade.offering!}
              requesting={trade.requesting!}
              offererName={offerer.name}
              partnerName={partner.name}
            />
          </>
        ) : (
          <p className="text-lg text-danger-500 font-bold mb-4">
            {partner.name} declined the trade.
          </p>
        )}
        <button
          onClick={() => dispatch({ type: 'TRADE_ACKNOWLEDGE' })}
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
      <button
        onClick={() => dispatch({ type: 'CANCEL_SHOP_ITEM' })}
        className="w-full mt-3 py-2 bg-military-700 hover:bg-military-600 text-military-400 rounded transition-colors text-sm"
      >
        Back to Shop
      </button>
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
      <button
        onClick={() => dispatch({ type: 'CANCEL_SHOP_ITEM' })}
        className="w-full mt-2 py-2 bg-military-700 hover:bg-military-600 text-military-400 rounded transition-colors text-sm"
      >
        Back to Shop
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
        <p className={`text-sm mb-4 ${fight.blockedBy ? 'text-brass-500' : attackerWon ? 'text-ops-500' : 'text-danger-500'}`}>
          {fight.blockedBy
            ? `A ${fight.attackerRoll} is a ${attackerWon ? 'winning' : 'losing'} roll, but ${attackerWon ? target.name : mercenary.name}'s ${fight.blockedBy === 'anti_aircraft' ? 'Anti-Aircraft' : 'Insurance'} absorbed the hit! No plane or fuel lost.`
            : attackerWon
              ? `A ${fight.attackerRoll} is a winning roll, so ${target.name} loses a plane and up to ${DOGFIGHT_FUEL_PENALTY} fuel to ${mercenary.name}.`
              : `A ${fight.attackerRoll} is a losing roll, so ${mercenary.name} loses a plane and up to ${DOGFIGHT_FUEL_PENALTY} fuel to ${target.name}.`}
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
      <button
        onClick={() => dispatch({ type: 'CANCEL_SHOP_ITEM' })}
        className="w-full mt-2 py-2 bg-military-700 hover:bg-military-600 text-military-400 rounded transition-colors text-sm"
      >
        Back to Shop
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
          className="h-40 bg-cover bg-center relative"
          style={{ backgroundImage: `url(${headerImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-military-800/10 via-transparent to-military-800" />
        </div>
      )}
      <div className="p-6">
        <h3 className="text-lg font-bold text-military-100 mb-4">{title}</h3>
        {children}
      </div>
    </div>
  )
}

// ── CPU Phase Display ───────────────────────────────────

function CpuPhaseDisplay({ description, onContinue, image }: { description: string; onContinue: () => void; image?: string }) {
  const images = useImages()
  return (
    <PhaseCard title="Computer Player">
      <img src={image ?? images.pilotReady} alt="" className="spot-illustration mb-4" />
      <p className="text-military-200 text-lg text-center mb-6">
        {description}
      </p>
      <button
        onClick={onContinue}
        className="w-full py-3 bg-raf-600 hover:bg-raf-500 text-white font-bold rounded-lg transition-colors"
      >
        Continue
      </button>
    </PhaseCard>
  )
}

// ── Phase Router ────────────────────────────────────────

// Acknowledge actions just dismiss a result screen — show the normal phase UI
// so the human can see what happened, then click the existing Continue button.
const ACKNOWLEDGE_ACTIONS = new Set([
  'ROLL_ACKNOWLEDGE',
  'DOG_FIGHT_ACKNOWLEDGE',
  'CHEAP_BOMB_ACKNOWLEDGE',
  'PRICEY_BOMB_ACKNOWLEDGE',
  'TRADE_ACKNOWLEDGE',
  'DIG_FOR_FUEL_ACKNOWLEDGE',
  'MERCENARY_FIGHT_ACKNOWLEDGE',
  'MERCENARY_COMPLETE_ACKNOWLEDGE',
])

const ROLL_ACTIONS = new Set([
  'ROLL_DIE',
  'DOG_FIGHT_ROLL',
  'CHEAP_BOMB_ROLL',
  'DIG_FOR_FUEL_ROLL',
  'MERCENARY_FIGHT_COUNT_ROLL',
  'MERCENARY_FIGHT_ROLL',
])

function PhaseRouter() {
  const { state, dispatch } = useGame()
  const images = useImages()
  const cpuAction = useCpuAction(state)

  if (cpuAction && !ACKNOWLEDGE_ACTIONS.has(cpuAction.type)) {
    const description = describeCpuAction(state, cpuAction)
    const image = ROLL_ACTIONS.has(cpuAction.type) ? images.diceRoll : undefined
    return (
      <CpuPhaseDisplay
        description={description}
        onContinue={() => dispatch(cpuAction)}
        image={image}
      />
    )
  }

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
    case TurnPhase.TradeTarget:
      return <TradeTargetPhase />
    case TurnPhase.TradeOffer:
      return <TradeOfferPhase />
    case TurnPhase.TradeHandover:
      return <TradeHandoverPhase />
    case TurnPhase.TradeResponse:
      return <TradeResponsePhase />
    case TurnPhase.TradeResult:
      return <TradeResultPhase />
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
  const { dispatch } = useGame()
  const [showRules, setShowRules] = useState(false)

  return (
    <>
      <div className="flex justify-end gap-2 mb-2">
        <button
          onClick={() => dispatch({ type: 'GO_HOME' })}
          className="text-military-400 hover:text-military-200 text-sm px-3 py-1 rounded border border-military-600 hover:border-military-500 transition-colors"
        >
          Save &amp; Go Home
        </button>
        <button
          onClick={() => setShowRules(true)}
          className="text-military-400 hover:text-military-200 text-sm px-3 py-1 rounded border border-military-600 hover:border-military-500 transition-colors"
        >
          Rules
        </button>
      </div>

      {showRules && <RulesOverlay onClose={() => setShowRules(false)} />}
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
