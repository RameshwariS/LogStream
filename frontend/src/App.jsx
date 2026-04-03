import React, { useState } from 'react'
import { LogViewer } from './components/LogViewer'

// Simple token-based auth gate.
// TODO: replace with a proper login form that calls POST /api/auth/login
export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('ls_token') ?? '')
  const [input, setInput] = useState('')

  if (!token) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-8 w-80 space-y-4">
          <h1 className="text-xl font-bold text-white">LogStream</h1>
          <p className="text-gray-400 text-sm">Paste your JWT token to connect</p>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Bearer token…"
            className="w-full bg-gray-800 text-gray-200 rounded px-3 py-2 border border-gray-700 focus:outline-none text-sm"
          />
          <button
            onClick={() => {
              localStorage.setItem('ls_token', input)
              setToken(input)
            }}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded py-2 text-sm font-semibold transition-colors"
          >
            Connect
          </button>
          {/* Dev shortcut — remove in production */}
          <button
            onClick={() => setToken('dev')}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-400 rounded py-1 text-xs transition-colors"
          >
            Skip (dev mode)
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <LogViewer token={token} />
      <button
        onClick={() => { localStorage.removeItem('ls_token'); setToken('') }}
        className="fixed bottom-3 right-3 text-xs text-gray-600 hover:text-gray-400"
      >
        Disconnect
      </button>
    </div>
  )
}
