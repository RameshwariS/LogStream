import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'

const BACKEND_URL  = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'
const MAX_LOGS     = 1000

/**
 * useLogSocket — connects to the LogStream Socket.io server and manages
 * a live rolling buffer of the last MAX_LOGS entries.
 *
 * Returns:
 *   logs       — array of log entry objects (newest last)
 *   connected  — boolean
 *   clearLogs  — function to empty the buffer
 *   setFilter  — function({ app, level, keyword }) to apply server-side filter
 */
export function useLogSocket() {
  const [logs, setLogs]           = useState([])
  const [connected, setConnected] = useState(false)
  const socketRef                 = useRef(null)

  useEffect(() => {
    const socket = io(BACKEND_URL, { transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[useLogSocket] connected:', socket.id)
      setConnected(true)
    })

    socket.on('disconnect', () => {
      console.log('[useLogSocket] disconnected')
      setConnected(false)
    })

    socket.on('new-log', (entry) => {
      setLogs(prev => {
        const next = [...prev, entry]
        // Keep only the last MAX_LOGS entries to prevent memory pressure
        return next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next
      })
    })

    socket.on('filter-applied', (filter) => {
      console.log('[useLogSocket] server acknowledged filter:', filter)
    })

    socket.on('connect_error', (err) => {
      console.error('[useLogSocket] connection error:', err.message)
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  const clearLogs = useCallback(() => setLogs([]), [])

  const setFilter = useCallback((filter) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('set-filter', filter)
    }
  }, [])

  return { logs, connected, clearLogs, setFilter }
}
