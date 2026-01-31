import { useGame } from '../state/gameContext.tsx';
import type { Player } from '../types/game.ts';

function StatusIcons({ player }: { player: Player }) {
  return (
    <span className="flex items-center gap-1 text-xs">
      {player.insuranceTurnsLeft > 0 && (
        <span
          className="text-sky-400"
          title={`Insurance (${player.insuranceTurnsLeft} turns left)`}
        >
          🛡️
        </span>
      )}
      {player.hasAntiAircraft && (
        <span className="text-red-400" title="Anti-Aircraft active">
          🔫
        </span>
      )}
      {player.hasOilTycoon && (
        <span
          className={
            player.oilTycoonDamage >= 3
              ? 'text-red-500'
              : player.oilTycoonDamage > 0
                ? 'text-yellow-400'
                : 'text-emerald-400'
          }
          title={`Oil Tycoon (${player.oilTycoonDamage}/3 damage)`}
        >
          🛢️
        </span>
      )}
    </span>
  );
}

function PlayerCard({
  player,
  isCurrent,
}: {
  player: Player;
  isCurrent: boolean;
}) {
  const borderClass = isCurrent
    ? 'border-amber-400 ring-1 ring-amber-400/50'
    : 'border-slate-600';

  const opacityClass = player.alive ? '' : 'opacity-40';
  const strikeClass = player.alive ? '' : 'line-through';

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 bg-slate-700 ${borderClass} ${opacityClass} transition-all`}
    >
      <span className={`font-semibold text-sm text-slate-100 ${strikeClass}`}>
        {player.name}
      </span>

      <span className="flex items-center gap-0.5 text-xs text-slate-300" title="Planes">
        <span>✈️</span>
        <span>{player.planes}</span>
      </span>

      <span className="flex items-center gap-0.5 text-xs text-slate-300" title="Fuel">
        <span>⛽</span>
        <span>{player.fuel}</span>
      </span>

      <StatusIcons player={player} />

      {!player.alive && (
        <span className="text-xs text-red-400 font-medium ml-auto">OUT</span>
      )}
    </div>
  );
}

export default function Scoreboard() {
  const { state } = useGame();
  const currentPlayerId = state.players[state.currentPlayerIndex]?.id;

  return (
    <div className="w-full">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
        Players
      </h3>
      <div className="flex flex-wrap gap-2">
        {state.players.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            isCurrent={player.id === currentPlayerId}
          />
        ))}
      </div>
    </div>
  );
}
