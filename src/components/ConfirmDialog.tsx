interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative z-10 rounded-xl bg-military-800 border border-military-600 shadow-2xl shadow-black/50 p-6 w-full max-w-sm">
        <h3 className="text-lg font-bold text-military-100 mb-2">{title}</h3>
        <p className="text-sm text-military-300 mb-5 leading-relaxed">{message}</p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="rounded-lg border border-military-600 bg-military-700 px-4 py-2 text-sm font-semibold text-military-300 transition-colors hover:bg-military-600 hover:text-military-100 active:bg-military-500"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-brass-500 px-4 py-2 text-sm font-bold text-military-950 transition-colors hover:bg-brass-400 active:bg-brass-600"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
