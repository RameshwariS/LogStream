import React, { useEffect, useRef, useState } from 'react'
import { LogEntry } from './LogEntry'

/**
 * LogViewer — scrollable terminal list with auto-scroll and pause-on-hover.
 * Props:
 *   logs        Array   — filtered log entries to display
 *   autoScroll  bool
 *   setAutoScroll fn
 */
export function LogViewer({ logs, autoScroll, setAutoScroll }) {
  const bottomRef = useRef(null)
  const [hovering, setHovering] = useState(false)

  useEffect(() => {
    if (autoScroll && !hovering) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll, hovering])

  return (
    <div
      className="flex-1 overflow-y-auto relative"
      onMouseEnter={() => { setHovering(true); setAutoScroll(false) }}
      onMouseLeave={() => { setHovering(false); setAutoScroll(true) }}
    >
      {logs.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-600 text-sm">
          Waiting for logs…
        </div>
      ) : (
        logs.map(entry => <LogEntry key={entry.id} entry={entry} />)
      )}
      <div ref={bottomRef} />

      {/* Paused badge */}
      {hovering && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-gray-800 text-gray-400 text-xs rounded-full border border-gray-700 pointer-events-none">
          Paused — move mouse away to resume
        </div>
      )}
    </div>
  )
}
