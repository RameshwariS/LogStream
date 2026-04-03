import React, { useEffect, useRef, useState, useMemo } from 'react'
import { useLogStream } from '../hooks/useLogStream'
import { LogRow } from './LogRow'
import { FilterBar } from './FilterBar'
import { StatusBar } from './StatusBar'

export function LogViewer({ token }) {
  const { logs, connected, error, clear } = useLogStream(token)

  const [level, setLevel]       = useState('ALL')
  const [service, setService]   = useState('')
  const [keyword, setKeyword]   = useState('')
  const [autoScroll, setAutoScroll] = useState(true)

  const bottomRef = useRef(null)

  // Derive unique service names from live logs
  const services = useMemo(
    () => [...new Set(logs.map((l) => l.service))].sort(),
    [logs]
  )

  // Apply filters
  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (level !== 'ALL' && l.level !== level) return false
      if (service && l.service !== service) return false
      if (keyword && !l.message.toLowerCase().includes(keyword.toLowerCase())) return false
      return true
    })
  }, [logs, level, service, keyword])

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [filtered, autoScroll])

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-4 py-2 bg-gray-900 border-b border-gray-700 flex items-center gap-3">
        <h1 className="text-lg font-bold text-white tracking-tight">LogStream</h1>
        <span className="text-gray-500 text-sm">Real-time log monitor</span>
      </div>

      <StatusBar connected={connected} error={error} />

      <FilterBar
        level={level} setLevel={setLevel}
        service={service} setService={setService} services={services}
        keyword={keyword} setKeyword={setKeyword}
        autoScroll={autoScroll} setAutoScroll={setAutoScroll}
        onClear={clear}
        count={filtered.length}
      />

      {/* Log list */}
      <div
        className="flex-1 overflow-y-auto"
        onMouseEnter={() => setAutoScroll(false)}
        onMouseLeave={() => setAutoScroll(true)}
      >
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-600 text-sm">
            {connected ? 'Waiting for logs…' : 'Not connected'}
          </div>
        ) : (
          filtered.map((entry) => <LogRow key={entry.id} entry={entry} />)
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
