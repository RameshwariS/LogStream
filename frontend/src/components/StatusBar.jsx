import React from 'react'

export function StatusBar({ connected, error }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-gray-950 border-b border-gray-800 text-xs">
      <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
      <span className={connected ? 'text-green-400' : 'text-red-400'}>
        {connected ? 'Connected' : 'Disconnected'}
      </span>
      {error && <span className="text-yellow-400 ml-2">{error}</span>}
      <span className="flex-1" />
      <span className="text-gray-600">LogStream</span>
    </div>
  )
}
