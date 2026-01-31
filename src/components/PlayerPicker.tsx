import type { Player } from '../types/game.ts';

interface PlayerPickerProps {
  players: Player[];
  excludeIds: string[];
  onPick: (playerId: string) => void;
  title: string;
}

export default function PlayerPicker({
  players,
  excludeIds,
  onPick,
  title,
}: PlayerPickerProps) {
  const eligiblePlayers = players.filter(
    (p) => p.alive && !excludeIds.includes(p.id),
  );

  return (
    <div className="rounded-xl bg-slate-800 border border-slate-600 p-4 w-full max-w-md mx-auto">
      <h3 className="text-lg font-bold text-slate-100 mb-3 text-center">
        {title}
      </h3>

      {eligiblePlayers.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-2">
          No eligible players
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {eligiblePlayers.map((player) => (
            <button
              key={player.id}
              onClick={() => onPick(player.id)}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-left transition-colors hover:border-amber-400 hover:bg-slate-600 active:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            >
              <span className="font-semibold text-slate-100">
                {player.name}
              </span>
              <span className="flex items-center gap-3 text-sm text-slate-300">
                <span title="Planes">✈️ {player.planes}</span>
                <span title="Fuel">⛽ {player.fuel}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
