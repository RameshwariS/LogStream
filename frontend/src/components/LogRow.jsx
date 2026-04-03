import React from 'react'

const LEVEL_STYLES = {
  DEBUG: 'text-gray-400',
  INFO:  'text-blue-400',
  WARN:  'text-yellow-400',
  ERROR: 'text-red-400',
}

const LEVEL_BG = {
  DEBUG: 'bg-gray-800',
  INFO:  'bg-blue-950',
  WARN:  'bg-yellow-950',
  ERROR: 'bg-red-950',
}

export function LogRow({ entry }) {
  const ts = new Date(entry.timestamp).toISOString().replace('T', ' ').slice(0, 23)
  const levelStyle = LEVEL_STYLES[entry.level] ?? 'text-gray-300'
  const rowBg = LEVEL_BG[entry.level] ?? ''

  return (
    <div className={`flex gap-3 px-3 py-1 text-xs hover:brightness-110 border-b border-gray-800 ${rowBg}`}>
      <span className="text-gray-500 shrink-0 w-44">{ts}</span>
      <span className={`font-bold w-12 shrink-0 ${levelStyle}`}>{entry.level}</span>
      <span className="text-purple-400 w-32 shrink-0 truncate">{entry.service}</span>
      <span className="text-gray-200 flex-1 break-all">{entry.message}</span>
      {entry.trace_id && (
        <span className="text-gray-600 shrink-0 text-[10px]">{entry.trace_id.slice(0, 8)}</span>
      )}
    </div>
  )
}
