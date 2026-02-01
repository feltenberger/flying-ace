# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server (host: 0.0.0.0)
npm run build        # Type-check (tsc -b) then Vite build
npm run lint         # ESLint across all .ts/.tsx files
npm test             # Run tests once (vitest run)
npm run test:watch   # Run tests in watch mode (vitest)
npx vitest run -t "test name pattern"  # Run a single test by name
```

## Architecture

**Flying Ace** is a pass-and-play browser board game (2-6 players, aerial combat theme) built with React 19 + TypeScript + Vite + TailwindCSS 4. No external state management library is used.

### State Management

All game logic lives in a single `useReducer`-based system:

- **`src/types/game.ts`** — Core types (`GameState`, `Player`, `Action` union, `TurnPhase`), game constants, and sub-state interfaces (`DogFightState`, `MercenaryState`, `BombState`, `DonationState`)
- **`src/state/gameReducer.ts`** — Single large reducer (~1100 lines) handling 40+ action types. All game rules, phase transitions, win-condition checks, and protection logic live here.
- **`src/state/gameContext.tsx`** — `GameProvider` wraps the app with `useReducer` + `useContext`. Exposes `useGame()` hook returning `{ state, dispatch }`. Auto-saves to localStorage on every state change when in an active game.

### Screen Flow

`App.tsx` routes based on `state.screen` (a `GameScreen` enum value):

`Home` → `Setup` → `Handover` ↔ `Playing` → `GameOver`

- **HomeScreen** — Game lobby: list saved games, resume, delete, or start new
- **SetupScreen** — Player name entry (2-6 players)
- **HandoverScreen** — Pass-and-play transition screen between players
- **PlayScreen** — Main gameplay; phase-driven UI showing the current `TurnPhase`
- **GameOverScreen** — Winner display

### Turn Phase System

The game progresses through phases defined in `TurnPhase` (27 phases). A typical turn: `Roll` → `RollResult` → (optional `DogFight`) → `Shop` → (optional sub-phases for items: bombs, donations, mercenary, dig) → `OilTycoonRepair` → `Tax` → `TurnEnd`. The reducer enforces valid phase transitions.

### Persistence

`src/utils/persistence.ts` manages localStorage with two key patterns:
- **Index**: `flying-ace-index` — array of `GameIndexEntry` (lightweight metadata for lobby)
- **Game data**: `flying-ace-game-{gameId}` — full `GameState` per game
- Schema versioning (`SCHEMA_VERSION` in game.ts) prevents loading incompatible saves

### Types Pattern

Enums use `as const` objects with derived union types (not TypeScript `enum`) for compatibility with `erasableSyntaxOnly`. `verbatimModuleSyntax` is also enabled — use `import type` for type-only imports. See `GameScreen` and `TurnPhase` in `src/types/game.ts`.

### Shop System

`src/types/shop.ts` defines the 10-item shop catalog. Items have complex interactions — Insurance blocks plane loss (except Pricey Bomb), Anti-Aircraft absorbs one hit then goes on cooldown, Oil Tycoon generates income but can be damaged/destroyed. Purchase eligibility logic is in the reducer.

### Audio System

`src/utils/audio.ts` manages background music and sound effects via the Web Audio API. Music tracks crossfade automatically, and SFX are fire-and-forget. Audio context is lazily initialized on first user interaction.

### Testing

Tests live alongside source in `src/state/gameReducer.test.ts`. Vitest config is inherited from `vite.config.ts` (no separate vitest config file). Test helpers `startedGame()`, `withPlayer()`, and `threePlayerGame()` create pre-configured game states for reducer testing.

### Styling

TailwindCSS 4 with a custom military-themed palette defined in `src/index.css` (`--color-military-*`, `--color-brass-*`, `--color-raf-*`, etc.). Header font is "Black Ops One" from Google Fonts.
