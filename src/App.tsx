import { GameProvider, useGame } from './state/gameContext.tsx'
import { GameScreen } from './types/game.ts'
import { HomeScreen } from './screens/HomeScreen.tsx'
import { SetupScreen } from './screens/SetupScreen.tsx'
import { HandoverScreen } from './screens/HandoverScreen.tsx'
import { PlayScreen } from './screens/PlayScreen.tsx'
import { GameOverScreen } from './screens/GameOverScreen.tsx'
import { BG_MAP, TITLE_LOGO } from './utils/images.ts'

function Router() {
  const { state } = useGame()
  switch (state.screen) {
    case GameScreen.Home:
      return <HomeScreen />
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
      <div
        className="min-h-screen flex flex-col bg-scene"
        style={{ '--bg-scene-url': `url(${BG_MAP})` } as React.CSSProperties}
      >
        <header className="bg-military-800/90 border-b-2 border-brass-500 px-4 py-3 sm:py-4 flex justify-center">
          <div className="flex items-center gap-3 sm:gap-5">
            <img src={TITLE_LOGO} alt="" className="h-10 w-10 sm:h-12 sm:w-12 object-contain" />
            <h1 className="font-stencil text-2xl sm:text-3xl text-brass-500 tracking-[0.2em] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">FLYING ACE</h1>
            <img src={TITLE_LOGO} alt="" className="h-10 w-10 sm:h-12 sm:w-12 object-contain -scale-x-100" />
          </div>
        </header>
        <main className="flex-1 p-4">
          <Router />
        </main>
      </div>
    </GameProvider>
  )
}
