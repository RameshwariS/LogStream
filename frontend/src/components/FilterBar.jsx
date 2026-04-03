import React from 'react'

const LEVELS = ['ALL', 'DEBUG', 'INFO', 'WARN', 'ERROR']

const LEVEL_ACTIVE = {
  ALL:   'bg-gray-600 text-white',
  DEBUG: 'bg-gray-500 text-white',
  INFO:  'bg-blue-600 text-white',
  WARN:  'bg-yellow-600 text-black',
  ERROR: 'bg-red-600 text-white',
}

/**
 * FilterBar
 * Props:
 *   level        string  — active level filter ("ALL" | "DEBUG" | …)
 *   setLevel     fn
 *   service      string  — active service filter (empty = all)
 *   setService   fn
 *   services     string[] — available service names
 *   keyword      string
 *   setKeyword   fn
 *   autoScroll   bool
 *   setAutoScroll fn
 *   onClear      fn
 *   count        number  — total visible log count
 */
export function FilterBar({
  level, setLevel,
  service, setService, services,
  keyword, setKeyword,
  autoScroll, setAutoScroll,
  onClear, count,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-gray-900 border-b border-gray-700 text-xs">
      {/* Level pills */}
      <div className="flex gap-1">
        {LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            className={`px-2 py-0.5 rounded font-bold transition-colors ${
              level === l ? LEVEL_ACTIVE[l] : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="w-px h-4 bg-gray-700" />

      {/* Service selector */}
      <select
        value={service}
        onChange={(e) => setService(e.target.value)}
        className="bg-gray-800 text-gray-300 rounded px-2 py-0.5 border border-gray-700 focus:outline-none"
      >
        <option value="">All services</option>
        {services.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* Keyword search */}
      <input
        type="text"
        placeholder="Search…"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        className="bg-gray-800 text-gray-200 rounded px-2 py-0.5 border border-gray-700 focus:outline-none w-40"
      />

      <div className="flex-1" />

      {/* Log count */}
      <span className="text-gray-500">{count} logs</span>

      {/* Auto-scroll toggle */}
      <button
        onClick={() => setAutoScroll((v) => !v)}
        className={`px-2 py-0.5 rounded transition-colors ${
          autoScroll ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-400'
        }`}
      >
        {autoScroll ? '⬇ Auto-scroll' : '⏸ Paused'}
      </button>

      {/* Clear */}
      <button
        onClick={onClear}
        className="px-2 py-0.5 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors"
      >
        Clear
      </button>
    </div>
  )
}
