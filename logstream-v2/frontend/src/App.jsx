import React, { useMemo, useState, useEffect } from 'react'
import { useLogSocket } from './hooks/useLogSocket'
import { StatsBar }    from './components/StatsBar'
import { FilterBar }   from './components/FilterBar'
import { LogViewer }   from './components/LogViewer'
import { fetchLogs, downloadLogs } from './utils/api'

export default function App() {
  const { logs: liveLogs, connected, clearLogs, setFilter } = useLogSocket()

  // Combine historical logs (loaded on mount) with live socket logs
  const [historyLogs, setHistoryLogs] = useState([])
  useEffect(() => {
    fetchLogs({ limit: 200 })
      .then(setHistoryLogs)
      .catch(err => console.warn('[App] could not load history:', err.message))
  }, [])

  // Merge history + live, deduplicate by id, keep newest 1000
  const allLogs = useMemo(() => {
    const map = new Map()
    ;[...historyLogs, ...liveLogs].forEach(l => map.set(l.id, l))
    const sorted = [...map.values()].sort((a, b) =>
      new Date(a.timestamp) - new Date(b.timestamp)
    )
    return sorted.slice(-1000)
  }, [historyLogs, liveLogs])

  // ── Filter state ────────────────────────────────────────────────────────────
  const [level,      setLevel]      = useState('ALL')
  const [app,        setApp]        = useState('')
  const [keyword,    setKeyword]    = useState('')
  const [autoScroll, setAutoScroll] = useState(true)

  // Derive unique app names from buffer
  const apps = useMemo(() => [...new Set(allLogs.map(l => l.app))].sort(), [allLogs])

  // Apply client-side filters
  const filtered = useMemo(() => {
    return allLogs.filter(l => {
      if (level !== 'ALL' && l.level !== level) return false
      if (app   && l.app !== app)               return false
      if (keyword && !l.message?.toLowerCase().includes(keyword.toLowerCase())) return false
      return true
    })
  }, [allLogs, level, app, keyword])

  // Push filter to server (reduces server-side emit for new logs)
  useEffect(() => {
    setFilter({
      app,
      level: level === 'ALL' ? '' : level,
      keyword,
    })
  }, [level, app, keyword, setFilter])

  // ── Download ────────────────────────────────────────────────────────────────
  function handleDownload() {
    downloadLogs({
      app,
      level: level === 'ALL' ? '' : level,
      keyword,
    })
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-900 border-b border-gray-700">
        <h1 className="text-base font-bold text-white tracking-tight">LogStream</h1>
        <span className="text-gray-500 text-xs">Real-Time Log Monitoring Dashboard</span>
        <span className="flex-1" />
        <span className="text-gray-600 text-xs">WCE Sangli — Mini-Project-2</span>
      </div>

      {/* Stats bar */}
      <StatsBar logs={allLogs} connected={connected} onClear={clearLogs} />

      {/* Filter bar */}
      <FilterBar
        level={level}       setLevel={setLevel}
        app={app}           setApp={setApp}       apps={apps}
        keyword={keyword}   setKeyword={setKeyword}
        autoScroll={autoScroll} setAutoScroll={setAutoScroll}
        visibleCount={filtered.length}
        onDownload={handleDownload}
      />

      {/* Log viewer */}
      <LogViewer
        logs={filtered}
        autoScroll={autoScroll}
        setAutoScroll={setAutoScroll}
      />
    </div>
  )
}
