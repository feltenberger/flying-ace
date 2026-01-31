import { useGame } from '../state/gameContext.tsx';
import { SHOP_CATALOG, ShopItemId } from '../types/shop.ts';

function canBuyItem(
  itemId: ShopItemId,
  fuel: number,
  cost: number | 'variable',
  player: {
    insuranceUsed: boolean;
    hasAntiAircraft: boolean;
    antiAircraftCooldown: number;
    hasOilTycoon: boolean;
  },
): { disabled: boolean; reason?: string } {
  // Variable-cost items (Donation, Mercenary) always open the sub-flow;
  // the actual fuel check happens later.
  if (cost === 'variable') {
    // Mercenary: need at least 1 fuel to offer
    if (itemId === ShopItemId.Mercenary && fuel < 1) {
      return { disabled: true, reason: 'Not enough fuel' };
    }
    // Donation: need at least 3 fuel (1 donated + 2 fee)
    if (itemId === ShopItemId.Donation && fuel < 3) {
      return { disabled: true, reason: 'Need at least 3 fuel (1 + 2 fee)' };
    }
    return { disabled: false };
  }

  if (fuel < cost) {
    return { disabled: true, reason: `Need ${cost} fuel` };
  }

  switch (itemId) {
    case ShopItemId.Insurance:
      if (player.insuranceUsed) {
        return { disabled: true, reason: 'Already used (once per game)' };
      }
      break;
    case ShopItemId.AntiAircraft:
      if (player.hasAntiAircraft) {
        return { disabled: true, reason: 'Already equipped (max 1)' };
      }
      if (player.antiAircraftCooldown > 0) {
        return {
          disabled: true,
          reason: `Cooldown (${player.antiAircraftCooldown} turns)`,
        };
      }
      break;
    case ShopItemId.OilTycoon:
      if (player.hasOilTycoon) {
        return { disabled: true, reason: 'Already owned' };
      }
      break;
  }

  return { disabled: false };
}

export default function ShopPanel() {
  const { state, dispatch } = useGame();
  const player = state.players[state.currentPlayerIndex];

  return (
    <div className="rounded-xl bg-slate-800 border border-slate-600 p-4 w-full max-w-lg mx-auto">
      <h3 className="text-lg font-bold text-slate-100 mb-1 text-center">
        Shop
      </h3>
      <p className="text-sm text-slate-400 text-center mb-4">
        {player.name} &mdash; ⛽ {player.fuel} fuel available
      </p>

      <div className="flex flex-col gap-2">
        {SHOP_CATALOG.map((item) => {
          const { disabled, reason } = canBuyItem(item.id, player.fuel, item.cost, player);

          return (
            <div
              key={item.id}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${
                disabled
                  ? 'border-slate-700 bg-slate-750 opacity-50'
                  : 'border-slate-600 bg-slate-700'
              }`}
            >
              {/* Item number badge */}
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-600 text-slate-300 text-xs font-bold flex items-center justify-center mt-0.5">
                {item.number}
              </span>

              {/* Item info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-sm text-slate-100">
                    {item.name}
                  </span>
                  <span className="text-xs text-amber-400 font-medium">
                    {item.cost === 'variable' ? 'Variable' : `${item.cost} fuel`}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                  {item.description}
                </p>
                {disabled && reason && (
                  <p className="text-xs text-red-400 mt-0.5">{reason}</p>
                )}
              </div>

              {/* Buy button */}
              <button
                disabled={disabled}
                onClick={() => dispatch({ type: 'BUY_ITEM', itemId: item.id })}
                className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  disabled
                    ? 'bg-slate-600 text-slate-500 cursor-not-allowed'
                    : 'bg-amber-500 text-slate-900 hover:bg-amber-400 active:bg-amber-600'
                }`}
              >
                Buy
              </button>
            </div>
          );
        })}
      </div>

      {/* Skip button */}
      <button
        onClick={() => dispatch({ type: 'SKIP_SHOP' })}
        className="mt-4 w-full rounded-lg border border-slate-500 bg-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-600 hover:text-slate-100 active:bg-slate-500"
      >
        Skip Shop
      </button>
    </div>
  );
}
