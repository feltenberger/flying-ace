import { IMAGE_SETS, useImageSet } from '../utils/images.ts'

interface SettingsOverlayProps {
  onClose: () => void
}

export default function SettingsOverlay({ onClose }: SettingsOverlayProps) {
  const { imageSet, setImageSet } = useImageSet()

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 rounded-xl bg-military-800 border border-military-600 shadow-2xl shadow-black/50 w-full max-w-sm my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-military-600">
          <h2 className="text-lg font-bold text-military-100">Settings</h2>
          <button
            onClick={onClose}
            className="text-military-400 hover:text-military-100 text-sm px-3 py-1 rounded border border-military-600 hover:border-military-500 transition-colors"
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-6 text-sm text-military-300">
          <div>
            <h3 className="text-military-100 font-semibold mb-3">Image Set</h3>
            <div className="flex gap-2">
              {IMAGE_SETS.map((name) => (
                <button
                  key={name}
                  onClick={() => setImageSet(name)}
                  className={`px-4 py-2 rounded border text-sm font-medium transition-colors ${
                    imageSet === name
                      ? 'bg-brass-500 text-military-900 border-brass-400'
                      : 'bg-military-700 text-military-300 border-military-600 hover:border-military-500 hover:text-military-100'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
