import React, { useEffect, useRef, useState } from 'react'
import { LogEntry } from './LogEntry'

export function LogViewer({ logs, autoScroll, setAutoScroll, loading }) {
  const bottomRef  = useRef(null)
  const containerRef = useRef(null)
  const [hovering, setHovering] = useState(false)

  useEffect(() => {
    if (autoScroll && !hovering) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' })
    }
  }, [logs, autoScroll, hovering])

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto relative"
      onMouseEnter={() => { setHovering(true);  setAutoScroll(false) }}
      onMouseLeave={() => { setHovering(false); setAutoScroll(true)  }}
    >
      {loading && logs.length === 0 && (
        <div className="flex items-center justify-center h-full text-gray-600 text-sm animate-pulse">
          Loading log history…
        </div>
      )}

      {!loading && logs.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-700 text-sm">
          <span className="text-2xl">📭</span>
          <span>No logs yet. Waiting for stream…</span>
          <span className="text-xs text-gray-800">Make sure the dummy apps are running</span>
        </div>
      )}

      {logs.map(entry => <LogEntry key={entry.id} entry={entry} />)}
      <div ref={bottomRef} />

      {hovering && logs.length > 0 && (
        <div className="sticky bottom-3 flex justify-center pointer-events-none">
          <span className="px-3 py-1 bg-gray-800/90 text-gray-400 text-xs rounded-full border border-gray-700">
            Paused — scroll locked
          </span>
        </div>
      )}
    </div>
  )
}
