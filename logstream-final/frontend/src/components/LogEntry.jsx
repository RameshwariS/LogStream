import React, { useState } from 'react'

const ROW_STYLE = {
  DEBUG: { badge: 'text-gray-400 bg-gray-800',     row: '' },
  INFO:  { badge: 'text-blue-300 bg-blue-950',      row: '' },
  WARN:  { badge: 'text-yellow-300 bg-yellow-950',  row: 'bg-yellow-950/20' },
  ERROR: { badge: 'text-red-300 bg-red-950',        row: 'bg-red-950/30' },
}

export function LogEntry({ entry }) {
  const [expanded, setExpanded] = useState(false)
  const style   = ROW_STYLE[entry.level] || ROW_STYLE.INFO
  const ts      = (entry.timestamp || '').replace('T',' ').slice(0,23)
  const message = (entry.message || entry.raw || '').slice(0,300)

  // Extract extra JSON metadata for expandable view
  let meta = null
  try {
    const parsed = JSON.parse(entry.raw || '{}')
    const skip   = new Set(['timestamp','level','message','msg','appId','service'])
    const pairs  = Object.entries(parsed).filter(([k]) => !skip.has(k))
    if (pairs.length) meta = pairs
  } catch { /* not JSON */ }

  return (
    <div
      className={`border-b border-gray-800/60 hover:brightness-110 ${style.row} ${meta ? 'cursor-pointer' : ''}`}
      onClick={() => meta && setExpanded(v => !v)}
    >
      <div className="flex gap-2 px-3 py-0.5 items-baseline">
        <span className="text-gray-600 shrink-0 w-[168px] text-[11px] leading-5">{ts}</span>
        <span className={`font-bold text-[11px] px-1.5 rounded shrink-0 w-[52px] text-center leading-5 ${style.badge}`}>
          {entry.level}
        </span>
        <span className="text-purple-400 shrink-0 w-24 truncate text-[11px] leading-5">[{entry.app}]</span>
        <span className="text-gray-200 flex-1 break-all leading-5">{message}</span>
        {meta && <span className="text-gray-600 shrink-0 text-[10px]">{expanded ? '▲':'▼'}</span>}
      </div>

      {expanded && meta && (
        <div className="ml-[272px] px-2 py-1 flex flex-wrap gap-x-4 gap-y-0.5 bg-gray-900/70">
          {meta.map(([k,v]) => (
            <span key={k} className="text-[11px]">
              <span className="text-gray-500">{k}:</span>
              <span className="text-gray-300 ml-1">{typeof v==='object' ? JSON.stringify(v) : String(v)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
