import React, { useMemo, useState, useEffect } from 'react'
import { useLogSocket } from './hooks/useLogSocket'
import { StatsBar }     from './components/StatsBar'
import { FilterBar }    from './components/FilterBar'
import { LogViewer }    from './components/LogViewer'
import { fetchLogs, downloadLogs } from './utils/api'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'

export default function App() {
  const { logs: liveLogs, connected, tailOk, clearLogs, setFilter } = useLogSocket()

  // Load last-hour history on first connect
  const [history,    setHistory]    = useState([])
  const [loadingHist, setLoadingHist] = useState(true)

  useEffect(() => {
    fetchLogs({ limit: 500 })
      .then(h => { setHistory(h); setLoadingHist(false) })
      .catch(() => setLoadingHist(false))
  }, [])

  // Merge + deduplicate history and live logs
  const allLogs = useMemo(() => {
    const map = new Map()
    ;[...history, ...liveLogs].forEach(l => map.set(l.id, l))
    const sorted = [...map.values()].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    return sorted.slice(-1000)
  }, [history, liveLogs])

  // Filter state
  const [level,       setLevel]       = useState('ALL')
  const [app,         setApp]         = useState('')
  const [keyword,     setKeyword]     = useState('')
  const [autoScroll,  setAutoScroll]  = useState(true)

  // Unique app list derived from buffer
  const apps = useMemo(() => [...new Set(allLogs.map(l => l.app))].filter(Boolean).sort(), [allLogs])

  // Client-side filtered view
  const filtered = useMemo(() => allLogs.filter(l => {
    if (level !== 'ALL' && l.level !== level)  return false
    if (app   && l.app !== app)                return false
    if (keyword && !l.message?.toLowerCase().includes(keyword.toLowerCase())) return false
    return true
  }), [allLogs, level, app, keyword])

  // Keep server-side filter in sync
  useEffect(() => {
    setFilter({ app, level: level === 'ALL' ? '' : level, keyword })
  }, [level, app, keyword, setFilter])

  function handleDownload() {
    downloadLogs({ app, level: level === 'ALL' ? '' : level, keyword })
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 select-none">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-900 border-b border-gray-800 shrink-0">
        <span className="text-white font-bold tracking-tight">LogStream</span>
        <span className="text-gray-500 text-xs hidden sm:inline">Real-Time Log Monitoring Dashboard</span>
        <div className="flex-1" />
        <a
          href={`${BACKEND.replace('4000','3000')}`}
          target="_blank" rel="noreferrer"
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          Grafana →
        </a>
        <span className="text-gray-700 text-xs">WCE Sangli · Mini-Project-2</span>
      </div>

      {/* ── Stats bar ── */}
      <StatsBar
        logs={allLogs}
        connected={connected}
        tailOk={tailOk}
        loading={loadingHist}
        onClear={clearLogs}
      />

      {/* ── Filter bar ── */}
      <FilterBar
        level={level}     setLevel={setLevel}
        app={app}         setApp={setApp}       apps={apps}
        keyword={keyword} setKeyword={setKeyword}
        autoScroll={autoScroll} setAutoScroll={setAutoScroll}
        visibleCount={filtered.length}
        onDownload={handleDownload}
      />

      {/* ── Log viewer ── */}
      <LogViewer
        logs={filtered}
        autoScroll={autoScroll}
        setAutoScroll={setAutoScroll}
        loading={loadingHist}
      />
    </div>
  )
}
