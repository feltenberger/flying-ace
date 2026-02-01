import { useState } from 'react';
import { useGame } from '../state/gameContext.tsx';
import { TurnPhase, DOGFIGHT_FUEL_PENALTY } from '../types/game.ts';
import { rollDie } from '../utils/dice.ts';
import PlayerPicker from './PlayerPicker.tsx';

export default function MercenaryModal() {
  const { state, dispatch } = useGame();
  const { phase, mercenary, players } = state;

  if (!mercenary) return null;

  const hirer = players.find((p) => p.id === mercenary.hirerId)!;
  const mercenaryPlayer = mercenary.mercenaryId
    ? players.find((p) => p.id === mercenary.mercenaryId)!
    : null;
  const targetPlayer = mercenary.targetId
    ? players.find((p) => p.id === mercenary.targetId)!
    : null;

  // ── Phase: Pick who to hire ────────────────────────────
  if (phase === TurnPhase.MercenaryTarget) {
    return (
      <div className="rounded-xl bg-slate-800 border border-slate-600 p-4 w-full max-w-md mx-auto">
        <h2 className="text-xl font-bold text-amber-400 text-center mb-2">
          Hire a Mercenary
        </h2>
        <p className="text-sm text-slate-300 text-center mb-4">
          {hirer.name}, pick a player to hire.
        </p>
        <PlayerPicker
          players={players}
          excludeIds={[hirer.id]}
          onPick={(mercenaryId) =>
            dispatch({ type: 'MERCENARY_TARGET', mercenaryId })
          }
          title="Choose Mercenary"
        />
      </div>
    );
  }

  // ── Phase: Enter fuel offer ────────────────────────────
  if (phase === TurnPhase.MercenaryOffer) {
    return <MercenaryOfferForm hirer={hirer} />;
  }

  // ── Phase: Pass device ─────────────────────────────────
  if (phase === TurnPhase.MercenaryHandover && mercenaryPlayer) {
    return (
      <div className="rounded-xl bg-slate-800 border border-slate-600 p-6 w-full max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold text-amber-400 mb-3">
          Pass Device
        </h2>
        <p className="text-slate-300 mb-1">
          Hand the device to{' '}
          <span className="font-bold text-slate-100">{mercenaryPlayer.name}</span>
        </p>
        <p className="text-sm text-slate-400 mb-4">
          {hirer.name} is offering <span className="text-amber-400 font-semibold">{mercenary.offeredFuel} fuel</span> for mercenary work.
        </p>
        <button
          onClick={() => dispatch({ type: 'MERCENARY_HANDOVER_COMPLETE' })}
          className="rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-bold text-slate-900 transition-colors hover:bg-amber-400 active:bg-amber-600"
        >
          {mercenaryPlayer.name} Is Ready
        </button>
      </div>
    );
  }

  // ── Phase: Accept / Decline ────────────────────────────
  if (phase === TurnPhase.MercenaryResponse && mercenaryPlayer) {
    return (
      <div className="rounded-xl bg-slate-800 border border-slate-600 p-6 w-full max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold text-amber-400 mb-3">
          Mercenary Offer
        </h2>
        <p className="text-slate-300 mb-1">
          <span className="font-bold text-slate-100">{mercenaryPlayer.name}</span>,
          {' '}{hirer.name} wants to hire you.
        </p>
        <p className="text-lg text-amber-400 font-bold mb-4">
          {mercenary.offeredFuel} fuel
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => dispatch({ type: 'MERCENARY_RESPOND', accepted: true })}
            className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500 active:bg-emerald-700"
          >
            Accept
          </button>
          <button
            onClick={() => dispatch({ type: 'MERCENARY_RESPOND', accepted: false })}
            className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-500 active:bg-red-700"
          >
            Decline
          </button>
        </div>
      </div>
    );
  }

  // ── Phase: Pick fight target ───────────────────────────
  if (phase === TurnPhase.MercenaryFightTarget && mercenaryPlayer) {
    return (
      <div className="rounded-xl bg-slate-800 border border-slate-600 p-4 w-full max-w-md mx-auto">
        <h2 className="text-xl font-bold text-amber-400 text-center mb-2">
          Choose Fight Target
        </h2>
        <p className="text-sm text-slate-300 text-center mb-4">
          {hirer.name}, pick who {mercenaryPlayer.name} will fight.
        </p>
        <PlayerPicker
          players={players}
          excludeIds={[hirer.id, mercenary.mercenaryId]}
          onPick={(targetId) =>
            dispatch({ type: 'MERCENARY_FIGHT_TARGET', targetId })
          }
          title="Choose Target"
        />
      </div>
    );
  }

  // ── Phase: Roll for fight count ────────────────────────
  if (phase === TurnPhase.MercenaryFightRoll && mercenaryPlayer && targetPlayer) {
    return (
      <div className="rounded-xl bg-slate-800 border border-slate-600 p-6 w-full max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold text-amber-400 mb-3">
          How Many Fights?
        </h2>
        <p className="text-slate-300 mb-4">
          <span className="font-semibold text-slate-100">{mercenaryPlayer.name}</span>
          {' vs '}
          <span className="font-semibold text-slate-100">{targetPlayer.name}</span>
        </p>
        <button
          onClick={() => {
            const roll = rollDie();
            dispatch({ type: 'MERCENARY_FIGHT_COUNT_ROLL', roll });
          }}
          className="rounded-lg bg-amber-500 px-6 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-amber-400 active:bg-amber-600"
        >
          Roll for Fight Count
        </button>
      </div>
    );
  }

  // ── Phase: Roll each fight ─────────────────────────────
  if (phase === TurnPhase.MercenaryFight && mercenary.currentFight && mercenaryPlayer && targetPlayer) {
    return (
      <div className="rounded-xl bg-slate-800 border border-slate-600 p-6 w-full max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold text-red-400 mb-2">
          Mercenary Fight
        </h2>
        <p className="text-sm text-slate-400 mb-1">
          Fight {mercenary.fightsCompleted + 1} of {mercenary.fightCount}
        </p>
        <p className="text-slate-300 mb-4">
          <span className="font-semibold text-slate-100">{mercenaryPlayer.name}</span>
          {' vs '}
          <span className="font-semibold text-slate-100">{targetPlayer.name}</span>
        </p>
        <button
          onClick={() => {
            const attackerRoll = rollDie();
            dispatch({ type: 'MERCENARY_FIGHT_ROLL', attackerRoll });
          }}
          className="rounded-lg bg-red-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-red-500 active:bg-red-700"
        >
          Roll to Fight!
        </button>
      </div>
    );
  }

  // ── Phase: Fight result ────────────────────────────────
  if (phase === TurnPhase.MercenaryFightResult && mercenary.currentFight && mercenaryPlayer && targetPlayer) {
    const fight = mercenary.currentFight;
    const attackerWon = fight.loserId !== fight.attackerId;

    return (
      <div className="rounded-xl bg-slate-800 border border-slate-600 p-6 w-full max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold text-red-400 mb-2">
          Fight {mercenary.fightsCompleted} of {mercenary.fightCount}
        </h2>

        <div className="text-5xl font-bold text-amber-400 mb-3">{fight.attackerRoll}</div>
        <p className="text-lg font-bold mb-2 text-slate-200">
          {mercenaryPlayer.name} rolled a {fight.attackerRoll}.
        </p>
        <p className={`text-sm mb-4 ${attackerWon ? 'text-emerald-400' : 'text-red-400'}`}>
          {attackerWon
            ? `A ${fight.attackerRoll} is a winning roll, so ${targetPlayer.name} loses a plane and up to ${DOGFIGHT_FUEL_PENALTY} fuel to ${mercenaryPlayer.name}.`
            : `A ${fight.attackerRoll} is a losing roll, so ${mercenaryPlayer.name} loses a plane and up to ${DOGFIGHT_FUEL_PENALTY} fuel to ${targetPlayer.name}.`}
        </p>

        <button
          onClick={() => dispatch({ type: 'MERCENARY_FIGHT_ACKNOWLEDGE' })}
          className="rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-bold text-slate-900 transition-colors hover:bg-amber-400 active:bg-amber-600"
        >
          {mercenary.fightsCompleted < mercenary.fightCount!
            ? 'Next Fight'
            : 'Continue'}
        </button>
      </div>
    );
  }

  // ── Phase: Complete / Summary ──────────────────────────
  if (phase === TurnPhase.MercenaryComplete) {
    const accepted = mercenary.accepted;
    return (
      <div className="rounded-xl bg-slate-800 border border-slate-600 p-6 w-full max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold text-amber-400 mb-3">
          Mercenary Complete
        </h2>

        {accepted ? (
          <>
            <p className="text-slate-300 mb-1">
              {mercenaryPlayer?.name} fought {mercenary.fightsCompleted} time(s)
              against {targetPlayer?.name ?? 'target'}.
            </p>
            <p className="text-sm text-slate-400 mb-4">
              {hirer.name} paid {mercenary.offeredFuel} fuel.
            </p>
          </>
        ) : (
          <p className="text-slate-300 mb-4">
            {mercenaryPlayer?.name} declined the offer.
          </p>
        )}

        <button
          onClick={() => dispatch({ type: 'MERCENARY_COMPLETE_ACKNOWLEDGE' })}
          className="rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-bold text-slate-900 transition-colors hover:bg-amber-400 active:bg-amber-600"
        >
          Continue
        </button>
      </div>
    );
  }

  return null;
}

// ── Fuel offer sub-component (needs local state) ─────────
function MercenaryOfferForm({
  hirer,
}: {
  hirer: { name: string; fuel: number };
}) {
  const { dispatch } = useGame();
  const maxOffer = Math.min(60, hirer.fuel);
  const [amount, setAmount] = useState(Math.min(10, maxOffer));

  const handleSubmit = () => {
    if (amount >= 1 && amount <= maxOffer) {
      dispatch({ type: 'MERCENARY_OFFER', amount });
    }
  };

  return (
    <div className="rounded-xl bg-slate-800 border border-slate-600 p-6 w-full max-w-md mx-auto text-center">
      <h2 className="text-xl font-bold text-amber-400 mb-3">
        Set Fuel Offer
      </h2>
      <p className="text-sm text-slate-300 mb-4">
        {hirer.name}, how much fuel will you offer? (1&ndash;{maxOffer})
      </p>

      <div className="flex flex-col items-center gap-3 mb-4">
        <input
          type="range"
          min={1}
          max={maxOffer}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full accent-amber-500"
        />
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={maxOffer}
            value={amount}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v >= 1 && v <= maxOffer) setAmount(v);
            }}
            className="w-20 rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-center text-lg font-bold text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          />
          <span className="text-slate-400 text-sm">fuel</span>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={amount < 1 || amount > maxOffer}
        className="rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-bold text-slate-900 transition-colors hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Offer {amount} Fuel
      </button>
    </div>
  );
}
