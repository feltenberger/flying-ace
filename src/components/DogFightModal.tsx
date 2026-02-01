import { useGame } from '../state/gameContext.tsx';
import { TurnPhase, DOGFIGHT_FUEL_PENALTY } from '../types/game.ts';
import { rollDie } from '../utils/dice.ts';
import PlayerPicker from './PlayerPicker.tsx';

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

  // Phase: Show result (roll happens when entering this phase)
  if (phase === TurnPhase.DogFightResult && dogFight) {
    const attacker = players.find((p) => p.id === dogFight.attackerId)!;
    const defender = players.find((p) => p.id === dogFight.defenderId)!;
    const hasRolled = dogFight.attackerRoll !== undefined;

    const handleRoll = () => {
      const attackerRoll = rollDie();
      dispatch({ type: 'DOG_FIGHT_ROLL', attackerRoll });
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
            Roll to Fight!
          </button>
        </div>
      );
    }

    // Roll is in
    const attackerWon = dogFight.loserId !== dogFight.attackerId;

    return (
      <div className="rounded-xl bg-slate-800 border border-slate-600 p-6 w-full max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold text-red-400 mb-4">Dog Fight Result</h2>

        <div className="text-5xl font-bold text-amber-400 mb-3">{dogFight.attackerRoll}</div>
        <p className="text-lg font-bold mb-2 text-slate-200">
          {attacker.name} rolled a {dogFight.attackerRoll}.
        </p>
        <p className={`text-sm mb-4 ${attackerWon ? 'text-emerald-400' : 'text-red-400'}`}>
          {attackerWon
            ? `A ${dogFight.attackerRoll} is a winning roll, so ${defender.name} loses a plane and up to ${DOGFIGHT_FUEL_PENALTY} fuel to ${attacker.name}.`
            : `A ${dogFight.attackerRoll} is a losing roll, so ${attacker.name} loses a plane and up to ${DOGFIGHT_FUEL_PENALTY} fuel to ${defender.name}.`}
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
