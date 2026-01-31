import { SHOP_ITEM_IMAGES } from '../utils/images.ts'
import { ShopItemId } from '../types/shop.ts'

interface RulesOverlayProps {
  onClose: () => void
}

export default function RulesOverlay({ onClose }: RulesOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 rounded-xl bg-military-800 border border-military-600 shadow-2xl shadow-black/50 w-full max-w-lg my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-military-600">
          <h2 className="text-lg font-bold text-military-100">Rules</h2>
          <button
            onClick={onClose}
            className="text-military-400 hover:text-military-100 text-sm px-3 py-1 rounded border border-military-600 hover:border-military-500 transition-colors"
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-6 text-sm text-military-300 leading-relaxed">
          <Section title="Goal">
            <p>Be the last player with planes remaining. All other players must be eliminated.</p>
          </Section>

          <Section title="Setup">
            <p>Each player starts with <Val>4 planes</Val> and <Val>32 fuel</Val>.</p>
          </Section>

          <Section title="Turn Structure">
            <ol className="list-decimal list-inside space-y-1 text-military-400">
              <li><span className="text-military-300">Roll the die</span></li>
              <li><span className="text-military-300">Shop (buy one item or skip)</span></li>
              <li><span className="text-military-300">Pay fuel tax</span></li>
              <li><span className="text-military-300">End turn</span></li>
            </ol>
          </Section>

          <Section title="Die Roll">
            <ul className="space-y-1">
              <li><Roll n="1" /> &mdash; Lose a plane</li>
              <li><Roll n="2" /> &mdash; Dog fight: pick an opponent, then roll. 1-3 you lose, 4-6 they lose. The loser loses a plane and 10 fuel.</li>
              <li><Roll n="3-5" /> &mdash; Gain roll &times; planes fuel</li>
              <li><Roll n="6" /> &mdash; Jackpot! Gain 10 &times; planes fuel</li>
            </ul>
          </Section>

          <Section title="Shop Items">
            <div className="space-y-2">
              <Item name="1 Plane" cost="10f" image={SHOP_ITEM_IMAGES[ShopItemId.Plane]}>Gain 1 plane.</Item>
              <Item name="2-Plane Pack" cost="15f" image={SHOP_ITEM_IMAGES[ShopItemId.TwoPlanePack]}>Gain 2 planes.</Item>
              <Item name="Dig for Fuel" cost="1f" image={SHOP_ITEM_IMAGES[ShopItemId.DigForFuel]}>Roll a die and gain that much fuel (6 = 10).</Item>
              <Item name="Insurance" cost="10f" image={SHOP_ITEM_IMAGES[ShopItemId.Insurance]}>Protects against plane loss for 3 turns (die rolls, dog fights, tax). Does NOT block Pricey Bombs. One purchase per game.</Item>
              <Item name="Cheap Bomb" cost="5f" image={SHOP_ITEM_IMAGES[ShopItemId.CheapBomb]}>Pick a target. Roll 4-6 to hit (lose a plane). If they have an Oil Tycoon, the bomb damages it instead.</Item>
              <Item name="Pricey Bomb" cost="12f" image={SHOP_ITEM_IMAGES[ShopItemId.PriceyBomb]}>Pick a target. Guaranteed hit. Overrides Insurance. If they have an Oil Tycoon, it damages that instead.</Item>
              <Item name="Donation" cost="var" image={SHOP_ITEM_IMAGES[ShopItemId.Donation]}>Give fuel to another player. Costs amount + 2 fuel fee.</Item>
              <Item name="Mercenary" cost="var" image={SHOP_ITEM_IMAGES[ShopItemId.Mercenary]}>Hire another player to dog fight a third. Offer 1-60 fuel. They can accept or decline. Number of fights decided by die roll (6 = 10). Each fight loser loses a plane and 10 fuel.</Item>
              <Item name="Anti-Aircraft" cost="12f" image={SHOP_ITEM_IMAGES[ShopItemId.AntiAircraft]}>Absorbs one hit (any type, including Pricey Bombs), then is destroyed. 2-turn cooldown before repurchase. Max 1.</Item>
              <Item name="Oil Tycoon" cost="100f" image={SHOP_ITEM_IMAGES[ShopItemId.OilTycoon]}>Produces 25 fuel per turn. Destroyed after 3 bomb hits. You have 2 turns to repair it for 50 fuel or lose it permanently.</Item>
            </div>
          </Section>

          <Section title="Protection Priority">
            <p>When a plane would be lost, protections are checked in order:</p>
            <ol className="list-decimal list-inside space-y-1 text-military-400 mt-1">
              <li><span className="text-military-300">Anti-Aircraft &mdash; blocks all hit types (consumed on use)</span></li>
              <li><span className="text-military-300">Insurance &mdash; blocks all except Pricey Bombs</span></li>
              <li><span className="text-military-300">Otherwise &mdash; plane is lost</span></li>
            </ol>
          </Section>

          <Section title="Fuel Tax">
            <p><Val>4 fuel per plane</Val> each turn. If you can't pay the full amount, you pay what you can and lose 1 plane.</p>
          </Section>

          <Section title="Elimination">
            <p>A player with 0 planes is eliminated and skipped for the rest of the game. The last player standing wins.</p>
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-brass-500 uppercase tracking-wider mb-2">{title}</h3>
      {children}
    </div>
  )
}

function Val({ children }: { children: React.ReactNode }) {
  return <span className="text-brass-500 font-semibold">{children}</span>
}

function Roll({ n }: { n: string }) {
  return <span className="inline-block w-6 text-center font-mono font-bold text-military-100">{n}</span>
}

function Item({ name, cost, image, children }: { name: string; cost: string; image?: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      {image && <img src={image} alt="" className="spot-illustration-sm" />}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline">
          <span className="font-semibold text-military-200">{name}</span>
          <span className="text-xs font-mono text-brass-500 ml-2">{cost}</span>
        </div>
        <p className="text-military-400 text-xs mt-0.5">{children}</p>
      </div>
    </div>
  )
}
