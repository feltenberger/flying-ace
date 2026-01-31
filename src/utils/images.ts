import type { ShopItemId } from '../types/shop.ts'

// ── Background images ────────────────────────────────────
export const BG_MAP = '/images/bg-map.png'
export const BG_BRIEFING = '/images/bg-briefing.png'
export const BG_COCKPIT = '/images/bg-cockpit.png'

// ── Title / branding ─────────────────────────────────────
export const TITLE_LOGO = '/images/title-logo.png'
export const TITLE_BANNER = '/images/title-banner.png'

// ── Pilot portraits ──────────────────────────────────────
export const PILOT_READY = '/images/pilot-ready.png'
export const PILOT_SALUTE = '/images/pilot-salute.png'

// ── Roll result images ───────────────────────────────────
export const ROLL_SHOTDOWN = '/images/roll-shotdown.png'
export const ROLL_DOGFIGHT = '/images/roll-dogfight.png'
export const ROLL_FUEL = '/images/roll-fuel.png'
export const ROLL_JACKPOT = '/images/roll-jackpot.png'

// ── Dogfight images ──────────────────────────────────────
export const DOGFIGHT_CHALLENGE = '/images/dogfight-challenge.png'
export const DOGFIGHT_WIN = '/images/dogfight-win.png'
export const DOGFIGHT_LOSE = '/images/dogfight-lose.png'

// ── Shop / hangar ────────────────────────────────────────
export const SHOP_HANGAR = '/images/shop-hangar.png'

// ── Item images ──────────────────────────────────────────
export const ITEM_PLANE = '/images/item-plane.png'
export const ITEM_PLANES = '/images/item-planes.png'
export const ITEM_DIG = '/images/item-dig.png'
export const ITEM_INSURANCE = '/images/item-insurance.png'
export const ITEM_CHEAPBOMB = '/images/item-cheapbomb.png'
export const ITEM_PRICEYBOMB = '/images/item-priceybomb.png'
export const ITEM_DONATION = '/images/item-donation.png'
export const ITEM_MERCENARY = '/images/item-mercenary.png'
export const ITEM_ANTIAIRCRAFT = '/images/item-antiaircraft.png'
export const ITEM_OILTYCOON = '/images/item-oiltycoon.png'

// ── Bomb result images ───────────────────────────────────
export const BOMB_HIT = '/images/bomb-hit.png'
export const BOMB_MISS = '/images/bomb-miss.png'

// ── End-game images ──────────────────────────────────────
export const VICTORY = '/images/victory.png'
export const ELIMINATED = '/images/eliminated.png'

// ── Tax ──────────────────────────────────────────────────
export const TAX_MAINTENANCE = '/images/tax-maintenance.png'

// ── UI decorations ───────────────────────────────────────
export const UI_BORDER_CORNER = '/images/ui-border-corner.png'
export const UI_DIVIDER = '/images/ui-divider.png'
export const UI_COMPASS = '/images/ui-compass.png'
export const UI_WINGS = '/images/ui-wings.png'

// ── Shop item → image mapping ────────────────────────────

export const SHOP_ITEM_IMAGES: Record<ShopItemId, string> = {
  plane: ITEM_PLANE,
  two_plane_pack: ITEM_PLANES,
  dig_for_fuel: ITEM_DIG,
  insurance: ITEM_INSURANCE,
  cheap_bomb: ITEM_CHEAPBOMB,
  pricey_bomb: ITEM_PRICEYBOMB,
  donation: ITEM_DONATION,
  mercenary: ITEM_MERCENARY,
  anti_aircraft: ITEM_ANTIAIRCRAFT,
  oil_tycoon: ITEM_OILTYCOON,
}

// ── Roll result → image mapping ──────────────────────────

const ROLL_RESULT_IMAGES: Record<number, string> = {
  1: ROLL_SHOTDOWN,
  2: ROLL_DOGFIGHT,
  3: ROLL_FUEL,
  4: ROLL_FUEL,
  5: ROLL_FUEL,
  6: ROLL_JACKPOT,
}

export function getRollResultImage(roll: number): string {
  return ROLL_RESULT_IMAGES[roll] ?? ROLL_FUEL
}
