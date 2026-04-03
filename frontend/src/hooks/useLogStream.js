import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * useLogStream — connects to the SSE /stream endpoint and returns
 * a live-updated array of log entries (capped at maxLogs).
 *
 * @param {string} token  - JWT Bearer token
 * @param {number} maxLogs - max entries to keep in memory (default 500)
 */
export function useLogStream(token, maxLogs = 500) {
  const [logs, setLogs] = useState([])
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)
  const esRef = useRef(null)

  const connect = useCallback(() => {
    if (esRef.current) esRef.current.close()

    // TODO: pass token via query param or cookie — EventSource doesn't support headers
    const url = `/stream?token=${encodeURIComponent(token)}`
    const es = new EventSource(url)
    esRef.current = es

    es.onopen = () => {
      setConnected(true)
      setError(null)
    }

    es.onmessage = (e) => {
      try {
        const entry = JSON.parse(e.data)
        setLogs((prev) => {
          const next = [...prev, entry]
          return next.length > maxLogs ? next.slice(next.length - maxLogs) : next
        })
      } catch {
        // ignore malformed events
      }
    }

    es.onerror = () => {
      setConnected(false)
      setError('Connection lost — retrying…')
      // Browser auto-reconnects; we just surface the error state
    }
  }, [token, maxLogs])

  useEffect(() => {
    if (token) connect()
    return () => esRef.current?.close()
  }, [token, connect])

  const clear = useCallback(() => setLogs([]), [])

  return { logs, connected, error, clear, reconnect: connect }
}
