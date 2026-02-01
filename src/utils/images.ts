import { createContext, useContext, useState, useMemo, useCallback, createElement } from 'react'
import type { ShopItemId } from '../types/shop.ts'

// ── Available image sets ────────────────────────────────
export const IMAGE_SETS: string[] = ['default', 'v2', 'v3']

const STORAGE_KEY = 'flying-ace-image-set'

// ── Images object type ──────────────────────────────────

export interface GameImages {
  bgMap: string
  bgBriefing: string
  bgCockpit: string
  titleLogo: string
  titleBanner: string
  pilotReady: string
  pilotSalute: string
  rollShotdown: string
  rollDogfight: string
  rollFuel: string
  rollJackpot: string
  dogfightChallenge: string
  dogfightWin: string
  dogfightLose: string
  shopHangar: string
  itemPlane: string
  itemPlanes: string
  itemDig: string
  itemInsurance: string
  itemCheapbomb: string
  itemPriceybomb: string
  itemDonation: string
  itemMercenary: string
  itemAntiaircraft: string
  itemOiltycoon: string
  bombHit: string
  bombMiss: string
  victory: string
  eliminated: string
  taxMaintenance: string
  splashHome: string
  uiBorderCorner: string
  uiDivider: string
  uiCompass: string
  uiWings: string
  shopItemImages: Record<ShopItemId, string>
  getRollResultImage: (roll: number) => string
}

// ── Path builder ────────────────────────────────────────

export function buildImages(setName: string): GameImages {
  const p = (file: string) => `/images/${setName}/${file}`

  const bgMap = p('bg-map.png')
  const bgBriefing = p('bg-briefing.png')
  const bgCockpit = p('bg-cockpit.png')
  const titleLogo = p('title-logo.png')
  const titleBanner = p('title-banner.png')
  const pilotReady = p('pilot-ready.png')
  const pilotSalute = p('pilot-salute.png')
  const rollShotdown = p('roll-shotdown.png')
  const rollDogfight = p('roll-dogfight.png')
  const rollFuel = p('roll-fuel.png')
  const rollJackpot = p('roll-jackpot.png')
  const dogfightChallenge = p('dogfight-challenge.png')
  const dogfightWin = p('dogfight-win.png')
  const dogfightLose = p('dogfight-lose.png')
  const shopHangar = p('shop-hangar.png')
  const itemPlane = p('item-plane.png')
  const itemPlanes = p('item-planes.png')
  const itemDig = p('item-dig.png')
  const itemInsurance = p('item-insurance.png')
  const itemCheapbomb = p('item-cheapbomb.png')
  const itemPriceybomb = p('item-priceybomb.png')
  const itemDonation = p('item-donation.png')
  const itemMercenary = p('item-mercenary.png')
  const itemAntiaircraft = p('item-antiaircraft.png')
  const itemOiltycoon = p('item-oiltycoon.png')
  const bombHit = p('bomb-hit.png')
  const bombMiss = p('bomb-miss.png')
  const victory = p('victory.png')
  const eliminated = p('eliminated.png')
  const taxMaintenance = p('tax-maintenance.png')
  const splashHome = p('splash-home.png')
  const uiBorderCorner = p('ui-border-corner.png')
  const uiDivider = p('ui-divider.png')
  const uiCompass = p('ui-compass.png')
  const uiWings = p('ui-wings.png')

  const shopItemImages: Record<ShopItemId, string> = {
    plane: itemPlane,
    two_plane_pack: itemPlanes,
    dig_for_fuel: itemDig,
    insurance: itemInsurance,
    cheap_bomb: itemCheapbomb,
    pricey_bomb: itemPriceybomb,
    donation: itemDonation,
    mercenary: itemMercenary,
    anti_aircraft: itemAntiaircraft,
    oil_tycoon: itemOiltycoon,
  }

  const rollResultImages: Record<number, string> = {
    1: rollShotdown,
    2: rollDogfight,
    3: rollFuel,
    4: rollFuel,
    5: rollFuel,
    6: rollJackpot,
  }

  function getRollResultImage(roll: number): string {
    return rollResultImages[roll] ?? rollFuel
  }

  return {
    bgMap,
    bgBriefing,
    bgCockpit,
    titleLogo,
    titleBanner,
    pilotReady,
    pilotSalute,
    rollShotdown,
    rollDogfight,
    rollFuel,
    rollJackpot,
    dogfightChallenge,
    dogfightWin,
    dogfightLose,
    shopHangar,
    itemPlane,
    itemPlanes,
    itemDig,
    itemInsurance,
    itemCheapbomb,
    itemPriceybomb,
    itemDonation,
    itemMercenary,
    itemAntiaircraft,
    itemOiltycoon,
    bombHit,
    bombMiss,
    victory,
    eliminated,
    taxMaintenance,
    splashHome,
    uiBorderCorner,
    uiDivider,
    uiCompass,
    uiWings,
    shopItemImages,
    getRollResultImage,
  }
}

// ── Context ─────────────────────────────────────────────

interface ImageSetContextValue {
  imageSet: string
  setImageSet: (name: string) => void
}

export const ImageSetContext = createContext<ImageSetContextValue | null>(null)

export function ImageSetProvider({ children }: { children: React.ReactNode }) {
  const [imageSet, setImageSetRaw] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && IMAGE_SETS.includes(stored)) return stored
    } catch { /* ignore */ }
    return 'default'
  })

  const setImageSet = useCallback((name: string) => {
    setImageSetRaw(name)
    try {
      localStorage.setItem(STORAGE_KEY, name)
    } catch { /* ignore */ }
  }, [])

  const value = useMemo(() => ({ imageSet, setImageSet }), [imageSet, setImageSet])

  return createElement(ImageSetContext.Provider, { value }, children)
}

// ── Hooks ───────────────────────────────────────────────

export function useImageSet(): { imageSet: string; setImageSet: (name: string) => void } {
  const ctx = useContext(ImageSetContext)
  if (!ctx) throw new Error('useImageSet must be used within an ImageSetProvider')
  return ctx
}

export function useImages(): GameImages {
  const { imageSet } = useImageSet()
  return useMemo(() => buildImages(imageSet), [imageSet])
}
