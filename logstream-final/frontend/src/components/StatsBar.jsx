import React from 'react'

const PILL = {
  DEBUG: 'text-gray-400 bg-gray-800 border border-gray-700',
  INFO:  'text-blue-300 bg-blue-950 border border-blue-900',
  WARN:  'text-yellow-300 bg-yellow-950 border border-yellow-900',
  ERROR: 'text-red-300 bg-red-950 border border-red-900',
}

export function StatsBar({ logs, connected, tailOk, loading, onClear }) {
  const counts = logs.reduce((a, l) => { a[l.level] = (a[l.level]||0)+1; return a }, {})

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-900 border-b border-gray-800 text-xs shrink-0 overflow-x-auto">
      {/* Connection dot */}
      <span className="flex items-center gap-1.5 shrink-0">
        <span className={`w-2 h-2 rounded-full shrink-0 ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
        <span className={connected ? 'text-green-400' : 'text-red-400'}>
          {connected ? (tailOk ? 'Live' : 'Connected') : 'Disconnected'}
        </span>
      </span>

      <span className="w-px h-4 bg-gray-700 shrink-0" />

      {/* Level badges */}
      {['DEBUG','INFO','WARN','ERROR'].map(lv => (
        <span key={lv} className={`px-2 py-0.5 rounded font-bold shrink-0 ${PILL[lv]}`}>
          {lv} {counts[lv] || 0}
        </span>
      ))}

      <span className="w-px h-4 bg-gray-700 shrink-0" />
      <span className="text-gray-500 shrink-0">Total: {logs.length}/1000</span>

      {loading && <span className="text-gray-600 shrink-0 animate-pulse">Loading history…</span>}

      <div className="flex-1" />
      <button
        onClick={onClear}
        className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors shrink-0"
      >
        Clear
      </button>
    </div>
  )
}
