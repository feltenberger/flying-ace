import { IMAGE_SETS, useImageSet } from '../utils/images.ts'
import { useAudio } from '../utils/audio.ts'

interface SettingsOverlayProps {
  onClose: () => void
}

export default function SettingsOverlay({ onClose }: SettingsOverlayProps) {
  const { imageSet, setImageSet } = useImageSet()
  const {
    musicEnabled,
    sfxEnabled,
    musicVolume,
    sfxVolume,
    setMusicEnabled,
    setSfxEnabled,
    setMusicVolume,
    setSfxVolume,
  } = useAudio()

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
          {/* Image Set */}
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

          {/* Audio */}
          <div>
            <h3 className="text-military-100 font-semibold mb-3">Audio</h3>
            <div className="space-y-4">
              {/* Music */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMusicEnabled(!musicEnabled)}
                  className={`shrink-0 px-3 py-1.5 rounded border text-xs font-medium transition-colors w-16 text-center ${
                    musicEnabled
                      ? 'bg-brass-500 text-military-900 border-brass-400'
                      : 'bg-military-700 text-military-400 border-military-600 hover:border-military-500'
                  }`}
                >
                  {musicEnabled ? 'On' : 'Off'}
                </button>
                <span className="shrink-0 w-12 text-military-300">Music</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                  disabled={!musicEnabled}
                  className="flex-1 h-1.5 accent-brass-500 disabled:opacity-30"
                />
              </div>

              {/* SFX */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSfxEnabled(!sfxEnabled)}
                  className={`shrink-0 px-3 py-1.5 rounded border text-xs font-medium transition-colors w-16 text-center ${
                    sfxEnabled
                      ? 'bg-brass-500 text-military-900 border-brass-400'
                      : 'bg-military-700 text-military-400 border-military-600 hover:border-military-500'
                  }`}
                >
                  {sfxEnabled ? 'On' : 'Off'}
                </button>
                <span className="shrink-0 w-12 text-military-300">SFX</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={sfxVolume}
                  onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                  disabled={!sfxEnabled}
                  className="flex-1 h-1.5 accent-brass-500 disabled:opacity-30"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
