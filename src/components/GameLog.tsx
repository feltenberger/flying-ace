import { useState, useRef, useEffect } from 'react';
import { useGame } from '../state/gameContext.tsx';

export default function GameLog() {
  const { state } = useGame();
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.log.length, open]);

  return (
    <div className="w-full">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors mb-1"
      >
        <span
          className={`inline-block transition-transform ${open ? 'rotate-90' : ''}`}
        >
          &#9654;
        </span>
        Game Log
        <span className="text-xs font-normal text-slate-500">
          ({state.log.length} entries)
        </span>
      </button>

      {open && (
        <div
          ref={scrollRef}
          className="rounded-lg border border-slate-600 bg-slate-800 max-h-60 overflow-y-auto p-2"
        >
          {state.log.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-2">
              No log entries yet.
            </p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {state.log.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-xs px-1 py-0.5 rounded hover:bg-slate-700/50"
                >
                  <span className="flex-shrink-0 text-slate-500 font-mono w-6 text-right">
                    {entry.turn}
                  </span>
                  <span className="flex-shrink-0 font-semibold text-amber-400 min-w-[4rem]">
                    {entry.playerName}
                  </span>
                  <span className="text-slate-300">{entry.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
