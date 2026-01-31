export const ShopItemId = {
  Plane: 'plane',
  TwoPlanePack: 'two_plane_pack',
  DigForFuel: 'dig_for_fuel',
  Insurance: 'insurance',
  CheapBomb: 'cheap_bomb',
  PriceyBomb: 'pricey_bomb',
  Donation: 'donation',
  Mercenary: 'mercenary',
  AntiAircraft: 'anti_aircraft',
  OilTycoon: 'oil_tycoon',
} as const;

export type ShopItemId = (typeof ShopItemId)[keyof typeof ShopItemId];

export interface ShopItem {
  id: ShopItemId;
  number: number;
  name: string;
  description: string;
  cost: number | 'variable';
}

export const SHOP_CATALOG: ShopItem[] = [
  {
    id: ShopItemId.Plane,
    number: 1,
    name: '1 Plane',
    description: 'Gain 1 plane.',
    cost: 10,
  },
  {
    id: ShopItemId.TwoPlanePack,
    number: 2,
    name: '2-Plane Pack',
    description: 'Gain 2 planes.',
    cost: 15,
  },
  {
    id: ShopItemId.DigForFuel,
    number: 3,
    name: 'Dig for Fuel',
    description: 'Roll a die. Get that much fuel (6 = 10 fuel).',
    cost: 1,
  },
  {
    id: ShopItemId.Insurance,
    number: 4,
    name: 'Insurance',
    description: 'For 3 turns, protect against plane loss from dog fights, die rolls, and tax. Does NOT protect against Pricey Bomb. One purchase per game.',
    cost: 10,
  },
  {
    id: ShopItemId.CheapBomb,
    number: 5,
    name: 'Cheap Bomb',
    description: 'Pick a player. Roll: 1-3 miss, 4-6 hit (they lose a plane).',
    cost: 5,
  },
  {
    id: ShopItemId.PriceyBomb,
    number: 6,
    name: 'Pricey Bomb',
    description: 'Pick a player. Guaranteed to destroy 1 plane. Overrides Insurance.',
    cost: 12,
  },
  {
    id: ShopItemId.Donation,
    number: 7,
    name: 'Donation',
    description: 'Give fuel to another player. Pay amount + 2 fuel fee.',
    cost: 'variable',
  },
  {
    id: ShopItemId.Mercenary,
    number: 8,
    name: 'Mercenary',
    description: 'Hire a player to dog fight another. Offer 1-60 fuel. Number of fights decided by die roll.',
    cost: 'variable',
  },
  {
    id: ShopItemId.AntiAircraft,
    number: 9,
    name: 'Anti-Aircraft',
    description: 'Absorbs one hit that would destroy a plane, then is destroyed. 2-turn cooldown before repurchase. Max 1.',
    cost: 12,
  },
  {
    id: ShopItemId.OilTycoon,
    number: 10,
    name: 'Oil Tycoon',
    description: 'Produces 25 fuel/turn. Destroyed by 3 bomb hits. Repair for 50 fuel within 2 turns or lose it.',
    cost: 100,
  },
];
