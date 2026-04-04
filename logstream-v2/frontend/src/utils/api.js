const BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'

/**
 * fetchLogs — GET /api/logs with filter params.
 * Used to load initial history on page load.
 */
export async function fetchLogs({ app = '', level = '', keyword = '', limit = 200 } = {}) {
  const params = new URLSearchParams()
  if (app)     params.set('app', app)
  if (level)   params.set('level', level)
  if (keyword) params.set('keyword', keyword)
  params.set('limit', limit)

  const res = await fetch(`${BASE}/api/logs?${params}`)
  if (!res.ok) throw new Error(`Failed to fetch logs: ${res.status}`)
  const data = await res.json()
  return data.logs || []
}

/**
 * downloadLogs — triggers a file download of filtered logs via the backend.
 */
export function downloadLogs({ app = '', level = '', keyword = '' } = {}) {
  const params = new URLSearchParams()
  if (app)     params.set('app', app)
  if (level)   params.set('level', level)
  if (keyword) params.set('keyword', keyword)
  params.set('limit', 1000)

  const url = `${BASE}/api/logs/download?${params}`
  const a   = document.createElement('a')
  a.href     = url
  a.download = 'logstream-export.log'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
