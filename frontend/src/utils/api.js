const BASE = ''  // same origin in production; Vite proxy handles /api in dev

async function request(method, path, data) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (data !== undefined) opts.body = JSON.stringify(data)
  const res = await fetch(BASE + path, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  get:    (path)        => request('GET', path),
  post:   (path, data)  => request('POST', path, data),
  put:    (path, data)  => request('PUT', path, data),
  patch:  (path, data)  => request('PATCH', path, data ?? {}),
  delete: (path)        => request('DELETE', path),
}
