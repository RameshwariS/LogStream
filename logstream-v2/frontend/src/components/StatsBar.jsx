import React from 'react'

const LEVEL_COLORS = {
  DEBUG: 'text-gray-400 bg-gray-800',
  INFO:  'text-blue-400 bg-blue-950',
  WARN:  'text-yellow-400 bg-yellow-950',
  ERROR: 'text-red-400 bg-red-950',
}

/**
 * StatsBar — shows live severity counts, total, and connection status.
 * Props:
 *   logs       Array   — full unfiltered log buffer
 *   connected  boolean
 *   onClear    fn
 */
export function StatsBar({ logs, connected, onClear }) {
  const counts = logs.reduce((acc, l) => {
    acc[l.level] = (acc[l.level] || 0) + 1
    return acc
  }, {})

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-900 border-b border-gray-800 text-xs select-none">
      {/* Connection indicator */}
      <span className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
        <span className={connected ? 'text-green-400' : 'text-red-400'}>
          {connected ? 'Live' : 'Disconnected'}
        </span>
      </span>

      <span className="w-px h-4 bg-gray-700" />

      {/* Level count badges */}
      {['DEBUG', 'INFO', 'WARN', 'ERROR'].map(level => (
        <span key={level} className={`px-2 py-0.5 rounded font-bold ${LEVEL_COLORS[level]}`}>
          {level} {counts[level] || 0}
        </span>
      ))}

      <span className="w-px h-4 bg-gray-700" />
      <span className="text-gray-500">Total: {logs.length}</span>

      <div className="flex-1" />

      <button
        onClick={onClear}
        className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors"
      >
        Clear
      </button>
    </div>
  )
}
