const BASE = import.meta.env.VITE_API_URL ?? ''

/**
 * login — POST /api/auth/login
 * Returns the JWT token string.
 */
export async function login(username, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) throw new Error('Login failed')
  const { token } = await res.json()
  return token
}

/**
 * fetchLogs — GET /api/logs with optional filters
 */
export async function fetchLogs(token, { service = '', level = '' } = {}) {
  const params = new URLSearchParams()
  if (service) params.set('service', service)
  if (level)   params.set('level', level)

  const res = await fetch(`${BASE}/api/logs?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch logs')
  return res.json()
}

/**
 * ingestLog — POST /api/logs (for testing / demo scripts)
 */
export async function ingestLog(apiKey, entry) {
  const res = await fetch(`${BASE}/api/logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify(entry),
  })
  if (!res.ok) throw new Error('Ingest failed')
  return res.json()
}
