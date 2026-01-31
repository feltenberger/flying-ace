import { useGame } from '../state/gameContext.tsx';
import { FUEL_TAX_PER_PLANE } from '../types/game.ts';

export default function FuelTaxSummary() {
  const { state, dispatch } = useGame();
  const player = state.players[state.currentPlayerIndex];

  const taxOwed = FUEL_TAX_PER_PLANE * player.planes;
  const canAfford = player.fuel >= taxOwed;

  return (
    <div className="rounded-xl bg-slate-800 border border-slate-600 p-6 w-full max-w-md mx-auto text-center">
      <h2 className="text-xl font-bold text-amber-400 mb-3">Fuel Tax</h2>

      {/* Tax calculation */}
      <div className="rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 mb-4 text-sm">
        <div className="flex justify-between text-slate-300">
          <span>Tax rate</span>
          <span>{FUEL_TAX_PER_PLANE} fuel per plane</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Planes</span>
          <span>{player.planes}</span>
        </div>
        <div className="flex justify-between border-t border-slate-600 mt-2 pt-2 font-semibold text-slate-100">
          <span>Tax owed</span>
          <span className="text-amber-400">
            {FUEL_TAX_PER_PLANE} x {player.planes} = {taxOwed} fuel
          </span>
        </div>
        <div className="flex justify-between mt-1 text-slate-300">
          <span>Your fuel</span>
          <span className={canAfford ? 'text-emerald-400' : 'text-red-400'}>
            {player.fuel}
          </span>
        </div>
      </div>

      {canAfford ? (
        <p className="text-sm text-emerald-400 mb-4">
          You can afford the tax. You will have{' '}
          <span className="font-bold">{player.fuel - taxOwed}</span> fuel remaining.
        </p>
      ) : (
        <div className="rounded-lg bg-red-900/30 border border-red-700/50 px-4 py-2 mb-4">
          <p className="text-sm text-red-400 font-semibold mb-1">
            Cannot afford full tax!
          </p>
          <p className="text-xs text-red-300">
            You will pay what you can ({player.fuel} fuel) and lose 1 plane.
            {player.planes <= 1 && (
              <span className="block mt-1 font-bold">
                Warning: This is your last plane! You will be eliminated.
              </span>
            )}
          </p>
        </div>
      )}

      <button
        onClick={() => dispatch({ type: 'PAY_TAX' })}
        className={`rounded-lg px-6 py-2.5 text-sm font-bold transition-colors ${
          canAfford
            ? 'bg-amber-500 text-slate-900 hover:bg-amber-400 active:bg-amber-600'
            : 'bg-red-600 text-white hover:bg-red-500 active:bg-red-700'
        }`}
      >
        {canAfford ? `Pay ${taxOwed} Fuel` : 'Pay What You Can'}
      </button>
    </div>
  );
}
