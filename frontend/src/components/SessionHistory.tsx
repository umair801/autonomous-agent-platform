'use client'

interface HistoryEntry {
  id: string
  goal: string
  timestamp: string
  stepsCompleted: number
}

interface SessionHistoryProps {
  history: HistoryEntry[]
  activeId: string
  onSelect: (id: string) => void
  onClear: () => void
}

export default function SessionHistory({
  history,
  activeId,
  onSelect,
  onClear,
}: SessionHistoryProps) {
  if (history.length === 0) return null

  return (
    <div className="w-64 shrink-0 border-r border-gray-200 bg-white h-screen overflow-y-auto flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          History
        </span>
        <button
          onClick={onClear}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {history.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onSelect(entry.id)}
            className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-l-2 ${
              activeId === entry.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-transparent'
            }`}
          >
            <p className="text-sm text-gray-800 font-medium line-clamp-2 mb-1">
              {entry.goal}
            </p>
            <p className="text-xs text-gray-400">
              {entry.stepsCompleted} steps · {entry.timestamp}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}