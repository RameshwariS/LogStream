import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'
const MAX     = 1000

export function useLogSocket() {
  const [logs,      setLogs]      = useState([])
  const [connected, setConnected] = useState(false)
  const [tailOk,    setTailOk]    = useState(false)
  const socketRef = useRef(null)

  useEffect(() => {
    const socket = io(BACKEND, { transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect',    ()  => { setConnected(true);  console.log('[socket] connected:', socket.id) })
    socket.on('disconnect', ()  => { setConnected(false); setTailOk(false) })
    socket.on('tail-status', (s) => setTailOk(s.connected))

    socket.on('new-log', (entry) => {
      setLogs(prev => {
        const next = [...prev, entry]
        return next.length > MAX ? next.slice(next.length - MAX) : next
      })
    })

    return () => socket.disconnect()
  }, [])

  const clearLogs  = useCallback(() => setLogs([]), [])
  const setFilter  = useCallback((f) => socketRef.current?.connected && socketRef.current.emit('set-filter', f), [])

  return { logs, connected, tailOk, clearLogs, setFilter }
}
