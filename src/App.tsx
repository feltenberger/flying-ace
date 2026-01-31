import { GameProvider, useGame } from './state/gameContext.tsx'
import { GameScreen } from './types/game.ts'
import { SetupScreen } from './screens/SetupScreen.tsx'
import { HandoverScreen } from './screens/HandoverScreen.tsx'
import { PlayScreen } from './screens/PlayScreen.tsx'
import { GameOverScreen } from './screens/GameOverScreen.tsx'

function Router() {
  const { state } = useGame()
  switch (state.screen) {
    case GameScreen.Setup:
      return <SetupScreen />
    case GameScreen.Handover:
      return <HandoverScreen />
    case GameScreen.Playing:
      return <PlayScreen />
    case GameScreen.GameOver:
      return <GameOverScreen />
  }
}

export default function App() {
  return (
    <GameProvider>
      <div className="min-h-screen flex flex-col">
        <header className="bg-slate-800 border-b border-slate-700 px-4 py-3">
          <h1 className="text-xl font-bold text-amber-400 tracking-wide">FLYING ACE</h1>
        </header>
        <main className="flex-1 p-4">
          <Router />
        </main>
      </div>
    </GameProvider>
  )
}
