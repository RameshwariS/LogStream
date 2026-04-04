import React from 'react'

const LEVELS = ['ALL', 'DEBUG', 'INFO', 'WARN', 'ERROR']

const PILL_ACTIVE = {
  ALL:   'bg-gray-600 text-white',
  DEBUG: 'bg-gray-500 text-white',
  INFO:  'bg-blue-700 text-white',
  WARN:  'bg-yellow-600 text-black',
  ERROR: 'bg-red-700 text-white',
}

/**
 * FilterBar — severity pills, app dropdown, keyword search, download button.
 * Props:
 *   level        string   — active level ("ALL" | "DEBUG" | ...)
 *   setLevel     fn
 *   app          string   — active app filter
 *   setApp       fn
 *   apps         string[] — unique app names from log buffer
 *   keyword      string
 *   setKeyword   fn
 *   autoScroll   bool
 *   setAutoScroll fn
 *   visibleCount number   — count of logs after filter
 *   onDownload   fn
 */
export function FilterBar({
  level, setLevel,
  app, setApp, apps,
  keyword, setKeyword,
  autoScroll, setAutoScroll,
  visibleCount, onDownload,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 bg-gray-900 border-b border-gray-700 text-xs">
      {/* Severity pills */}
      <div className="flex gap-1">
        {LEVELS.map(l => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            className={`px-2 py-0.5 rounded font-bold transition-colors ${
              level === l ? PILL_ACTIVE[l] : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="w-px h-4 bg-gray-700" />

      {/* App selector */}
      <select
        value={app}
        onChange={e => setApp(e.target.value)}
        className="bg-gray-800 text-gray-300 rounded px-2 py-0.5 border border-gray-700 focus:outline-none"
      >
        <option value="">All apps</option>
        {apps.map(a => <option key={a} value={a}>{a}</option>)}
      </select>

      {/* Keyword search */}
      <input
        type="text"
        value={keyword}
        onChange={e => setKeyword(e.target.value)}
        placeholder="Search messages…"
        className="bg-gray-800 text-gray-200 rounded px-2 py-0.5 border border-gray-700 focus:outline-none w-40"
      />

      <div className="flex-1" />

      <span className="text-gray-500">{visibleCount} shown</span>

      {/* Auto-scroll toggle */}
      <button
        onClick={() => setAutoScroll(v => !v)}
        className={`px-2 py-0.5 rounded transition-colors ${
          autoScroll ? 'bg-green-800 text-green-300' : 'bg-gray-800 text-gray-400'
        }`}
      >
        {autoScroll ? '⬇ Auto-scroll' : '⏸ Paused'}
      </button>

      {/* Download */}
      <button
        onClick={onDownload}
        className="px-2 py-0.5 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors"
        title="Download filtered logs as .log file"
      >
        ↓ Download
      </button>
    </div>
  )
}
