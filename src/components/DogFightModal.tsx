import { useGame } from '../state/gameContext.tsx';
import { TurnPhase } from '../types/game.ts';
import { rollDie } from '../utils/dice.ts';
import PlayerPicker from './PlayerPicker.tsx';
import DieRoll from './DieRoll.tsx';

export default function DogFightModal() {
  const { state, dispatch } = useGame();
  const { phase, dogFight, players } = state;
  const currentPlayer = players[state.currentPlayerIndex];

  // Phase: Pick an opponent
  if (phase === TurnPhase.DogFight) {
    return (
      <div className="rounded-xl bg-slate-800 border border-slate-600 p-4 w-full max-w-md mx-auto">
        <h2 className="text-xl font-bold text-red-400 text-center mb-2">
          Dog Fight!
        </h2>
        <p className="text-sm text-slate-300 text-center mb-4">
          {currentPlayer.name}, pick an opponent to fight.
        </p>
        <PlayerPicker
          players={players}
          excludeIds={[currentPlayer.id]}
          onPick={(defenderId) =>
            dispatch({ type: 'DOG_FIGHT_PICK', defenderId })
          }
          title="Choose Opponent"
        />
      </div>
    );
  }

  // Phase: Show result (rolls happen when entering this phase)
  if (phase === TurnPhase.DogFightResult && dogFight) {
    const attacker = players.find((p) => p.id === dogFight.attackerId)!;
    const defender = players.find((p) => p.id === dogFight.defenderId)!;
    const hasRolled = dogFight.attackerRoll !== undefined;

    const handleRoll = () => {
      const attackerRoll = rollDie();
      const defenderRoll = rollDie();
      dispatch({ type: 'DOG_FIGHT_ROLL', attackerRoll, defenderRoll });
    };

    if (!hasRolled) {
      return (
        <div className="rounded-xl bg-slate-800 border border-slate-600 p-6 w-full max-w-md mx-auto text-center">
          <h2 className="text-xl font-bold text-red-400 mb-3">Dog Fight!</h2>
          <p className="text-slate-300 mb-4">
            <span className="font-semibold text-slate-100">{attacker.name}</span>
            {' vs '}
            <span className="font-semibold text-slate-100">{defender.name}</span>
          </p>
          <button
            onClick={handleRoll}
            className="rounded-lg bg-red-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-red-500 active:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400/50"
          >
            Roll for Fight!
          </button>
        </div>
      );
    }

    // Rolls are in
    const loser = players.find((p) => p.id === dogFight.loserId)!;
    const attackerWon = dogFight.loserId !== dogFight.attackerId;

    return (
      <div className="rounded-xl bg-slate-800 border border-slate-600 p-6 w-full max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold text-red-400 mb-4">Dog Fight Result</h2>

        <div className="flex items-center justify-center gap-6 mb-4">
          <div className="flex flex-col items-center gap-1">
            <span className={`text-sm font-semibold ${attackerWon ? 'text-emerald-400' : 'text-red-400'}`}>
              {attacker.name}
            </span>
            <DieRoll value={dogFight.attackerRoll!} />
          </div>

          <span className="text-slate-500 font-bold text-lg">vs</span>

          <div className="flex flex-col items-center gap-1">
            <span className={`text-sm font-semibold ${!attackerWon ? 'text-emerald-400' : 'text-red-400'}`}>
              {defender.name}
            </span>
            <DieRoll value={dogFight.defenderRoll!} />
          </div>
        </div>

        <p className="text-slate-100 mb-1">
          <span className="text-red-400 font-bold">{loser.name}</span> loses a plane!
        </p>
        <p className="text-xs text-slate-400 mb-4">
          Roll 1-3: attacker loses. Roll 4-6: defender loses.
        </p>

        <button
          onClick={() => dispatch({ type: 'DOG_FIGHT_ACKNOWLEDGE' })}
          className="rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-bold text-slate-900 transition-colors hover:bg-amber-400 active:bg-amber-600"
        >
          Continue
        </button>
      </div>
    );
  }

  return null;
}
