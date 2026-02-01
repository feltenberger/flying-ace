import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  createElement,
} from 'react'
import type { ReactNode } from 'react'
import { GameScreen, TurnPhase } from '../types/game.ts'
import type { GameState } from '../types/game.ts'
import { useGame } from '../state/gameContext.tsx'

// ── Audio Preferences ────────────────────────────────────

const AUDIO_PREFS_KEY = 'flying-ace-audio-prefs'

interface AudioPreferences {
  musicEnabled: boolean
  sfxEnabled: boolean
  musicVolume: number // 0-1
  sfxVolume: number   // 0-1
}

const DEFAULT_PREFS: AudioPreferences = {
  musicEnabled: true,
  sfxEnabled: true,
  musicVolume: 0.5,
  sfxVolume: 0.7,
}

function loadPrefs(): AudioPreferences {
  try {
    const raw = localStorage.getItem(AUDIO_PREFS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...DEFAULT_PREFS, ...parsed }
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_PREFS }
}

function savePrefs(prefs: AudioPreferences) {
  try {
    localStorage.setItem(AUDIO_PREFS_KEY, JSON.stringify(prefs))
  } catch { /* ignore */ }
}

// ── SFX IDs ──────────────────────────────────────────────

export const SfxId = {
  DiceRoll: 'dice-roll',
  Shotdown: 'shotdown',
  DogfightStart: 'dogfight-start',
  DogfightWin: 'dogfight-win',
  DogfightLose: 'dogfight-lose',
  FuelGain: 'fuel-gain',
  Jackpot: 'jackpot',
  ShopPurchase: 'shop-purchase',
  BombHit: 'bomb-hit',
  BombMiss: 'bomb-miss',
  Victory: 'victory',
  Eliminated: 'eliminated',
  HandoverChime: 'handover-chime',
  ButtonClick: 'button-click',
} as const

export type SfxId = (typeof SfxId)[keyof typeof SfxId]

const SFX_PATHS: Record<SfxId, string> = {
  [SfxId.DiceRoll]: '/audio/sfx/dice-roll.mp3',
  [SfxId.Shotdown]: '/audio/sfx/shotdown.mp3',
  [SfxId.DogfightStart]: '/audio/sfx/dogfight-start.mp3',
  [SfxId.DogfightWin]: '/audio/sfx/dogfight-win.mp3',
  [SfxId.DogfightLose]: '/audio/sfx/dogfight-lose.mp3',
  [SfxId.FuelGain]: '/audio/sfx/fuel-gain.mp3',
  [SfxId.Jackpot]: '/audio/sfx/jackpot.mp3',
  [SfxId.ShopPurchase]: '/audio/sfx/shop-purchase.mp3',
  [SfxId.BombHit]: '/audio/sfx/bomb-hit.mp3',
  [SfxId.BombMiss]: '/audio/sfx/bomb-miss.mp3',
  [SfxId.Victory]: '/audio/sfx/victory.mp3',
  [SfxId.Eliminated]: '/audio/sfx/eliminated.mp3',
  [SfxId.HandoverChime]: '/audio/sfx/handover-chime.mp3',
  [SfxId.ButtonClick]: '/audio/sfx/button-click.mp3',
}

// ── Screen → Music Track ─────────────────────────────────

const SCREEN_MUSIC: Partial<Record<GameScreen, string>> = {
  [GameScreen.Home]: '/audio/music/theme-home.mp3',
  [GameScreen.Setup]: '/audio/music/theme-home.mp3',
  [GameScreen.Handover]: '/audio/music/theme-game.mp3',
  [GameScreen.Playing]: '/audio/music/theme-game.mp3',
  [GameScreen.GameOver]: '/audio/music/theme-victory.mp3',
}

// ── SFX Engine (Web Audio API) ───────────────────────────

class SfxEngine {
  private ctx: AudioContext | null = null
  private gain: GainNode | null = null
  private buffers = new Map<string, AudioBuffer>()
  private loading = false

  init() {
    if (this.ctx) return
    this.ctx = new AudioContext()
    this.gain = this.ctx.createGain()
    this.gain.connect(this.ctx.destination)
    this.preload()
  }

  async unlock() {
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume()
    }
  }

  private async preload() {
    if (this.loading || !this.ctx) return
    this.loading = true
    const entries = Object.values(SFX_PATHS)
    await Promise.all(
      entries.map(async (url) => {
        try {
          const res = await fetch(url)
          if (!res.ok) return
          const buf = await res.arrayBuffer()
          const decoded = await this.ctx!.decodeAudioData(buf)
          this.buffers.set(url, decoded)
        } catch {
          // SFX file not available — skip silently
        }
      }),
    )
  }

  setVolume(v: number) {
    if (this.gain) {
      this.gain.gain.value = v
    }
  }

  play(id: SfxId) {
    const url = SFX_PATHS[id]
    const buffer = this.buffers.get(url)
    if (!buffer || !this.ctx || !this.gain) return
    const source = this.ctx.createBufferSource()
    source.buffer = buffer
    source.connect(this.gain)
    source.start()
  }
}

// ── Music Engine (HTMLAudioElement) ──────────────────────

class MusicEngine {
  private audio: HTMLAudioElement | null = null
  private currentUrl = ''
  private fadeInterval: ReturnType<typeof setInterval> | null = null

  play(url: string, volume: number) {
    if (this.currentUrl === url && this.audio && !this.audio.paused) {
      this.audio.volume = volume
      return
    }

    this.stop()
    this.currentUrl = url
    this.audio = new Audio(url)
    this.audio.loop = true
    this.audio.volume = 0

    const targetVol = volume
    this.audio.play().then(() => {
      // Fade in over 500ms
      const steps = 20
      const stepTime = 500 / steps
      const volStep = targetVol / steps
      let current = 0
      this.fadeInterval = setInterval(() => {
        current += volStep
        if (current >= targetVol) {
          current = targetVol
          if (this.fadeInterval) clearInterval(this.fadeInterval)
          this.fadeInterval = null
        }
        if (this.audio) this.audio.volume = current
      }, stepTime)
    }).catch(() => {
      // Autoplay blocked — will retry on user interaction
    })
  }

  stop() {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval)
      this.fadeInterval = null
    }
    if (this.audio) {
      this.audio.pause()
      this.audio.src = ''
      this.audio = null
    }
    this.currentUrl = ''
  }

  setVolume(v: number) {
    if (this.audio) this.audio.volume = v
  }

  pause() {
    if (this.audio) this.audio.pause()
  }

  resume(volume: number) {
    if (this.audio && this.audio.paused && this.currentUrl) {
      this.audio.volume = volume
      this.audio.play().catch(() => {})
    }
  }
}

// ── Module-level engine singletons ───────────────────────

const sfxEngine = new SfxEngine()
const musicEngine = new MusicEngine()

// ── Audio Context ────────────────────────────────────────

interface AudioContextValue {
  musicEnabled: boolean
  sfxEnabled: boolean
  musicVolume: number
  sfxVolume: number
  setMusicEnabled: (v: boolean) => void
  setSfxEnabled: (v: boolean) => void
  setMusicVolume: (v: number) => void
  setSfxVolume: (v: number) => void
  playSfx: (id: SfxId) => void
  unlockAudio: () => void
  playMusic: (url: string, volume: number) => void
  stopMusic: () => void
  resumeMusic: (volume: number) => void
}

const AudioCtx = createContext<AudioContextValue | null>(null)

export function AudioProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<AudioPreferences>(loadPrefs)

  const updatePrefs = useCallback((patch: Partial<AudioPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch }
      savePrefs(next)
      return next
    })
  }, [])

  const setMusicEnabled = useCallback((v: boolean) => {
    updatePrefs({ musicEnabled: v })
    if (!v) {
      musicEngine.stop()
    }
  }, [updatePrefs])

  const setSfxEnabled = useCallback((v: boolean) => {
    updatePrefs({ sfxEnabled: v })
  }, [updatePrefs])

  const setMusicVolume = useCallback((v: number) => {
    updatePrefs({ musicVolume: v })
    musicEngine.setVolume(v)
  }, [updatePrefs])

  const setSfxVolume = useCallback((v: number) => {
    updatePrefs({ sfxVolume: v })
    sfxEngine.setVolume(v)
  }, [updatePrefs])

  const playSfx = useCallback((id: SfxId) => {
    if (!prefs.sfxEnabled) return
    sfxEngine.play(id)
  }, [prefs.sfxEnabled])

  const unlockAudio = useCallback(() => {
    sfxEngine.init()
    sfxEngine.unlock()
    sfxEngine.setVolume(prefs.sfxVolume)
  }, [prefs.sfxVolume])

  const playMusic = useCallback((url: string, volume: number) => {
    musicEngine.play(url, volume)
  }, [])

  const stopMusic = useCallback(() => {
    musicEngine.stop()
  }, [])

  const resumeMusic = useCallback((volume: number) => {
    musicEngine.resume(volume)
  }, [])

  const value: AudioContextValue = {
    musicEnabled: prefs.musicEnabled,
    sfxEnabled: prefs.sfxEnabled,
    musicVolume: prefs.musicVolume,
    sfxVolume: prefs.sfxVolume,
    setMusicEnabled,
    setSfxEnabled,
    setMusicVolume,
    setSfxVolume,
    playSfx,
    unlockAudio,
    playMusic,
    stopMusic,
    resumeMusic,
  }

  return createElement(AudioCtx.Provider, { value }, children)
}

// ── Hooks ────────────────────────────────────────────────

export function useAudio(): AudioContextValue {
  const ctx = useContext(AudioCtx)
  if (!ctx) throw new Error('useAudio must be used within AudioProvider')
  return ctx
}

export function usePlaySfx(): (id: SfxId) => void {
  return useAudio().playSfx
}

export function useBackgroundMusic(screen: GameScreen) {
  const { musicEnabled, musicVolume, unlockAudio, playMusic, stopMusic } = useAudio()
  const unlockedRef = useRef(false)

  // Autoplay unlock on first user interaction
  useEffect(() => {
    if (unlockedRef.current) return

    const handler = () => {
      unlockedRef.current = true
      unlockAudio()
      // Start music after unlock if enabled
      const trackUrl = SCREEN_MUSIC[screen]
      if (musicEnabled && trackUrl) {
        playMusic(trackUrl, musicVolume)
      }
      document.removeEventListener('click', handler)
      document.removeEventListener('keydown', handler)
    }

    document.addEventListener('click', handler, { once: true })
    document.addEventListener('keydown', handler, { once: true })

    return () => {
      document.removeEventListener('click', handler)
      document.removeEventListener('keydown', handler)
    }
  }, [screen, musicEnabled, musicVolume, unlockAudio, playMusic])

  // Swap tracks when screen changes or music toggled
  useEffect(() => {
    if (!unlockedRef.current) return

    if (!musicEnabled) {
      stopMusic()
      return
    }

    const trackUrl = SCREEN_MUSIC[screen]
    if (trackUrl) {
      playMusic(trackUrl, musicVolume)
    } else {
      stopMusic()
    }
  }, [screen, musicEnabled, musicVolume, playMusic, stopMusic])
}

export function useGameSfx() {
  const { state } = useGame()
  const playSfx = usePlaySfx()
  const prevStateRef = useRef<GameState | null>(null)

  useEffect(() => {
    const prev = prevStateRef.current
    prevStateRef.current = state

    if (!prev) return

    // Screen transitions
    if (prev.screen !== state.screen) {
      if (state.screen === GameScreen.Handover) {
        playSfx(SfxId.HandoverChime)
      }
      if (state.screen === GameScreen.GameOver) {
        playSfx(SfxId.Victory)
      }
    }

    // Phase transitions
    if (prev.phase !== state.phase) {
      // Roll → RollResult: dice roll + contextual SFX
      if (prev.phase === TurnPhase.Roll && state.phase === TurnPhase.RollResult) {
        playSfx(SfxId.DiceRoll)
        if (state.lastRoll === 1) {
          setTimeout(() => playSfx(SfxId.Shotdown), 400)
        } else if (state.lastRoll === 2) {
          setTimeout(() => playSfx(SfxId.DogfightStart), 400)
        } else if (state.lastRoll === 6) {
          setTimeout(() => playSfx(SfxId.Jackpot), 400)
        } else if (state.lastRoll && state.lastRoll >= 3) {
          setTimeout(() => playSfx(SfxId.FuelGain), 400)
        }
      }

      // Dogfight result — check who lost
      if (state.phase === TurnPhase.DogFightResult && prev.phase === TurnPhase.DogFight) {
        // Fight roll just happened — wait for loserId in state
      }
      if (state.phase === TurnPhase.DogFightResult && state.dogFight?.loserId) {
        if (!prev.dogFight?.loserId) {
          const currentId = state.players[state.currentPlayerIndex]?.id
          if (state.dogFight.loserId === currentId) {
            playSfx(SfxId.DogfightLose)
          } else {
            playSfx(SfxId.DogfightWin)
          }
        }
      }

      // Shop purchase — transition from Shop to a sub-phase (not Tax/TurnEnd)
      if (
        prev.phase === TurnPhase.Shop &&
        state.phase !== TurnPhase.Tax &&
        state.phase !== TurnPhase.TurnEnd &&
        state.phase !== TurnPhase.Shop
      ) {
        playSfx(SfxId.ShopPurchase)
      }

      // Cheap bomb result
      if (state.phase === TurnPhase.CheapBombResult && prev.phase !== TurnPhase.CheapBombResult) {
        if (state.bomb?.hit) {
          playSfx(SfxId.BombHit)
        } else {
          playSfx(SfxId.BombMiss)
        }
      }

      // Pricey bomb result (always hits)
      if (state.phase === TurnPhase.PriceyBombResult && prev.phase !== TurnPhase.PriceyBombResult) {
        playSfx(SfxId.BombHit)
      }

      // Mercenary fight result
      if (state.phase === TurnPhase.MercenaryFightResult && prev.phase !== TurnPhase.MercenaryFightResult) {
        const fight = state.mercenary?.currentFight
        if (fight?.loserId) {
          const currentId = state.players[state.currentPlayerIndex]?.id
          const hirerId = state.mercenary?.hirerId
          // Win = target lost (good for the hirer / current player)
          if (fight.loserId !== hirerId && fight.loserId !== currentId) {
            playSfx(SfxId.DogfightWin)
          } else {
            playSfx(SfxId.DogfightLose)
          }
        }
      }
    }

    // Player elimination check
    for (let i = 0; i < state.players.length; i++) {
      const prevPlayer = prev.players[i]
      const currPlayer = state.players[i]
      if (prevPlayer && currPlayer && prevPlayer.alive && !currPlayer.alive) {
        playSfx(SfxId.Eliminated)
        break
      }
    }
  }, [state, playSfx])
}
