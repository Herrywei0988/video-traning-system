const TOKEN_KEY = 'giraffe_token'

function getHeaders(extra = {}) {
  const token = localStorage.getItem(TOKEN_KEY)
  const headers = { ...extra }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

async function handle(res) {
  if (res.status === 401) {
    // Token expired or invalid — clear and redirect to login
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem('giraffe_user')
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
    throw new Error('未登入')
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  get: (url) => fetch(url, { headers: getHeaders() }).then(handle),

  post: (url, body) =>
    fetch(url, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    }).then(handle),

  put: (url, body) =>
    fetch(url, {
      method: 'PUT',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    }).then(handle),

  patch: (url, body = {}) =>
    fetch(url, {
      method: 'PATCH',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    }).then(handle),

  delete: (url) =>
    fetch(url, {
      method: 'DELETE',
      headers: getHeaders(),
    }).then(handle),
}