import React from 'react'

const LEVELS = ['ALL','DEBUG','INFO','WARN','ERROR']
const ACTIVE  = {
  ALL:   'bg-gray-600 text-white',
  DEBUG: 'bg-gray-500 text-white',
  INFO:  'bg-blue-700 text-white',
  WARN:  'bg-yellow-600 text-black',
  ERROR: 'bg-red-700 text-white',
}

export function FilterBar({ level, setLevel, app, setApp, apps, keyword, setKeyword,
                             autoScroll, setAutoScroll, visibleCount, onDownload }) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 bg-gray-900 border-b border-gray-700 text-xs shrink-0">
      {/* Level pills */}
      <div className="flex gap-1">
        {LEVELS.map(l => (
          <button key={l} onClick={() => setLevel(l)}
            className={`px-2 py-0.5 rounded font-bold transition-colors ${
              level === l ? ACTIVE[l] : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}>
            {l}
          </button>
        ))}
      </div>
      <span className="w-px h-4 bg-gray-700" />
      {/* App selector */}
      <select value={app} onChange={e => setApp(e.target.value)}
        className="bg-gray-800 text-gray-300 rounded px-2 py-0.5 border border-gray-700 focus:outline-none text-xs">
        <option value="">All apps</option>
        {apps.map(a => <option key={a} value={a}>{a}</option>)}
      </select>
      {/* Keyword */}
      <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)}
        placeholder="Search messages…"
        className="bg-gray-800 text-gray-200 rounded px-2 py-0.5 border border-gray-700 focus:outline-none w-36 text-xs" />
      <div className="flex-1" />
      <span className="text-gray-600">{visibleCount} shown</span>
      {/* Auto-scroll */}
      <button onClick={() => setAutoScroll(v => !v)}
        className={`px-2 py-0.5 rounded transition-colors text-xs ${
          autoScroll ? 'bg-green-900 text-green-300 border border-green-800' : 'bg-gray-800 text-gray-400'
        }`}>
        {autoScroll ? '⬇ Auto' : '⏸ Paused'}
      </button>
      {/* Download */}
      <button onClick={onDownload}
        className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors text-xs"
        title="Download filtered logs as .log file">
        ↓ Export
      </button>
    </div>
  )
}
