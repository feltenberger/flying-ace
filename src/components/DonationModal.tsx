import { useState } from 'react';
import { useGame } from '../state/gameContext.tsx';
import { TurnPhase } from '../types/game.ts';
import PlayerPicker from './PlayerPicker.tsx';

export default function DonationModal() {
  const { state, dispatch } = useGame();
  const { phase, donation, players } = state;

  if (!donation) return null;

  const donor = players.find((p) => p.id === donation.donorId)!;
  const recipient = donation.recipientId
    ? players.find((p) => p.id === donation.recipientId)!
    : null;

  // ── Phase: Pick recipient ──────────────────────────────
  if (phase === TurnPhase.DonationTarget) {
    return (
      <div className="rounded-xl bg-slate-800 border border-slate-600 p-4 w-full max-w-md mx-auto">
        <h2 className="text-xl font-bold text-sky-400 text-center mb-2">
          Donation
        </h2>
        <p className="text-sm text-slate-300 text-center mb-4">
          {donor.name}, pick who to donate fuel to.
        </p>
        <PlayerPicker
          players={players}
          excludeIds={[donor.id]}
          onPick={(targetId) =>
            dispatch({ type: 'DONATION_TARGET', targetId })
          }
          title="Choose Recipient"
        />
      </div>
    );
  }

  // ── Phase: Enter amount ────────────────────────────────
  if (phase === TurnPhase.DonationAmount && recipient) {
    return (
      <DonationAmountForm
        donorName={donor.name}
        donorFuel={donor.fuel}
        recipientName={recipient.name}
      />
    );
  }

  // ── Phase: Result ──────────────────────────────────────
  if (phase === TurnPhase.DonationResult && recipient && donation.amount != null) {
    const totalCost = donation.amount + 2;

    return (
      <div className="rounded-xl bg-slate-800 border border-slate-600 p-6 w-full max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold text-sky-400 mb-3">
          Donation Complete
        </h2>
        <p className="text-slate-300 mb-1">
          <span className="font-bold text-slate-100">{donor.name}</span> donated{' '}
          <span className="text-amber-400 font-bold">{donation.amount} fuel</span>
          {' '}to{' '}
          <span className="font-bold text-slate-100">{recipient.name}</span>.
        </p>
        <p className="text-sm text-slate-400 mb-4">
          Total cost: {totalCost} fuel (includes 2 fuel fee)
        </p>
        <button
          onClick={() => dispatch({ type: 'DONATION_ACKNOWLEDGE' })}
          className="rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-bold text-slate-900 transition-colors hover:bg-amber-400 active:bg-amber-600"
        >
          Continue
        </button>
      </div>
    );
  }

  return null;
}

// ── Amount entry sub-component ───────────────────────────
function DonationAmountForm({
  donorName,
  donorFuel,
  recipientName,
}: {
  donorName: string;
  donorFuel: number;
  recipientName: string;
}) {
  const { dispatch } = useGame();

  // Max donation: fuel - 2 (must still cover the fee)
  const maxDonation = Math.max(1, donorFuel - 2);
  const [amount, setAmount] = useState(Math.min(5, maxDonation));
  const totalCost = amount + 2;
  const canAfford = donorFuel >= totalCost;

  const handleSubmit = () => {
    if (canAfford && amount >= 1) {
      dispatch({ type: 'DONATION_AMOUNT', amount });
    }
  };

  return (
    <div className="rounded-xl bg-slate-800 border border-slate-600 p-6 w-full max-w-md mx-auto text-center">
      <h2 className="text-xl font-bold text-sky-400 mb-3">
        Donation Amount
      </h2>
      <p className="text-sm text-slate-300 mb-4">
        {donorName} donating to{' '}
        <span className="font-bold text-slate-100">{recipientName}</span>
      </p>

      <div className="flex flex-col items-center gap-3 mb-3">
        <input
          type="range"
          min={1}
          max={maxDonation}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full accent-sky-500"
        />
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={maxDonation}
            value={amount}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v >= 1 && v <= maxDonation) setAmount(v);
            }}
            className="w-20 rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-center text-lg font-bold text-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
          />
          <span className="text-slate-400 text-sm">fuel</span>
        </div>
      </div>

      {/* Cost breakdown */}
      <div className="rounded-lg bg-slate-700 border border-slate-600 px-4 py-2 mb-4 text-sm text-slate-300">
        <div className="flex justify-between">
          <span>Donation</span>
          <span className="text-sky-400">{amount} fuel</span>
        </div>
        <div className="flex justify-between">
          <span>Fee</span>
          <span className="text-slate-400">2 fuel</span>
        </div>
        <div className="flex justify-between border-t border-slate-600 mt-1 pt-1 font-semibold">
          <span>Total cost</span>
          <span className={canAfford ? 'text-amber-400' : 'text-red-400'}>
            {totalCost} fuel
          </span>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span>Your fuel</span>
          <span className="text-slate-400">{donorFuel}</span>
        </div>
      </div>

      {!canAfford && (
        <p className="text-xs text-red-400 mb-3">Not enough fuel!</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canAfford}
        className="rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-sky-500 active:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Donate {amount} Fuel
      </button>
    </div>
  );
}
