import { useGame } from '../state/gameContext.tsx';
import type { Player } from '../types/game.ts';
import { useImages } from '../utils/images.ts';

function StatusIcons({ player }: { player: Player }) {
  return (
    <span className="flex items-center gap-1 text-xs">
      {player.insuranceTurnsLeft > 0 && (
        <span
          className="text-raf-500"
          title={`Insurance (${player.insuranceTurnsLeft} turns left)`}
        >
          🛡️
        </span>
      )}
      {player.hasAntiAircraft && (
        <span className="text-danger-400" title="Anti-Aircraft active">
          🔫
        </span>
      )}
      {player.hasOilTycoon && (
        <span
          className={
            player.oilTycoonDamage >= 3
              ? 'text-danger-500'
              : player.oilTycoonDamage > 0
                ? 'text-brass-500'
                : 'text-ops-500'
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
    ? 'border-brass-500 ring-1 ring-brass-500/50'
    : 'border-military-600';

  const opacityClass = player.alive ? '' : 'opacity-40';
  const strikeClass = player.alive ? '' : 'line-through';

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 bg-military-700 ${borderClass} ${opacityClass} transition-all`}
    >
      <span className={`font-semibold text-sm text-military-100 ${strikeClass}`}>
        {player.name}
      </span>

      <span className="flex items-center gap-0.5 text-xs text-military-300" title="Planes">
        <span>✈️</span>
        <span>{player.planes}</span>
      </span>

      <span className="flex items-center gap-0.5 text-xs text-military-300" title="Fuel">
        <span>⛽</span>
        <span>{player.fuel}</span>
      </span>

      <StatusIcons player={player} />

      {!player.alive && (
        <span className="text-xs text-danger-500 font-medium ml-auto">OUT</span>
      )}
    </div>
  );
}

export default function Scoreboard() {
  const { state } = useGame();
  const images = useImages();
  const currentPlayerId = state.players[state.currentPlayerIndex]?.id;

  return (
    <div className="w-full">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-military-400 mb-1">
        Players
      </h3>
      <img src={images.uiWings} alt="" className="decoration-wings mb-2" style={{ maxWidth: '80px', opacity: 0.18 }} />
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
