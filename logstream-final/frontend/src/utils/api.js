const BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'

export async function fetchLogs({ app='', level='', keyword='', limit=200 }={}) {
  const p = new URLSearchParams()
  if (app)     p.set('app', app)
  if (level && level !== 'ALL') p.set('level', level)
  if (keyword) p.set('keyword', keyword)
  p.set('limit', limit)
  try {
    const res  = await fetch(`${BASE}/api/logs?${p}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.logs || []
  } catch {
    return []
  }
}

export function downloadLogs({ app='', level='', keyword='' }={}) {
  const p = new URLSearchParams()
  if (app)     p.set('app', app)
  if (level && level !== 'ALL') p.set('level', level)
  if (keyword) p.set('keyword', keyword)
  p.set('limit', 1000)
  const a = Object.assign(document.createElement('a'), {
    href: `${BASE}/api/logs/download?${p}`,
    download: 'logstream-export.log',
  })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
