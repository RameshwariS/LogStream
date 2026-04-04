import React, { useState } from 'react'

const LEVEL_STYLE = {
  DEBUG: { badge: 'text-gray-400 bg-gray-800',  row: '' },
  INFO:  { badge: 'text-blue-400 bg-blue-950',   row: '' },
  WARN:  { badge: 'text-yellow-400 bg-yellow-950', row: '' },
  ERROR: { badge: 'text-red-400 bg-red-950',     row: 'bg-red-950 bg-opacity-40' },
}

const APP_COLOR = 'text-purple-400'

/**
 * LogEntry — renders a single color-coded terminal log line.
 * Click to expand metadata key-value pairs.
 */
export function LogEntry({ entry }) {
  const [expanded, setExpanded] = useState(false)

  const ts      = entry.timestamp ? entry.timestamp.replace('T', ' ').slice(0, 23) : '—'
  const style   = LEVEL_STYLE[entry.level] || LEVEL_STYLE.INFO
  const message = entry.message?.length > 300
    ? entry.message.slice(0, 300) + '…'
    : (entry.message || entry.raw || '')

  // Try to extract metadata from raw JSON
  let metadata = null
  try {
    const parsed = JSON.parse(entry.raw || '{}')
    const skip   = new Set(['timestamp', 'level', 'message', 'msg', 'appId', 'service'])
    const entries = Object.entries(parsed).filter(([k]) => !skip.has(k))
    if (entries.length) metadata = entries
  } catch { /* not JSON */ }

  return (
    <div
      className={`border-b border-gray-800 hover:brightness-110 cursor-pointer ${style.row}`}
      onClick={() => metadata && setExpanded(v => !v)}
      title={entry.message}
    >
      {/* Main log line */}
      <div className="flex gap-2 px-3 py-0.5">
        <span className="text-gray-600 shrink-0 w-44 truncate">{ts}</span>
        <span className={`font-bold rounded px-1 shrink-0 w-14 text-center text-[11px] ${style.badge}`}>
          {entry.level}
        </span>
        <span className={`${APP_COLOR} shrink-0 w-24 truncate`}>[{entry.app}]</span>
        <span className="text-gray-200 flex-1 break-all">{message}</span>
        {metadata && (
          <span className="text-gray-600 shrink-0">{expanded ? '▲' : '▼'}</span>
        )}
      </div>

      {/* Expanded metadata */}
      {expanded && metadata && (
        <div className="px-3 py-1.5 ml-60 flex flex-wrap gap-2 bg-gray-900 bg-opacity-60">
          {metadata.map(([k, v]) => (
            <span key={k} className="text-[11px]">
              <span className="text-gray-500">{k}:</span>
              <span className="text-gray-300 ml-1">
                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
