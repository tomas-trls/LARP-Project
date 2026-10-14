// The one place the front end talks to the back end.
//
// Every screen uses:  api.get('/tags')  or  api.post('/login', {...})
// The dev server forwards anything starting with /api to the FastAPI back end (see vite.config.js),
// so we never write the back end's address anywhere else.

async function request(path, options = {}) {
  // After login (Step 9) the token is kept in localStorage and sent on every request.
  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`/api${path}`, { ...options, headers })
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    // The back end sends a clear message in "detail"; pass it on so screens can show it.
    // Form mistakes (422) come as a list; use the first message and drop pydantic's "Value error, " prefix.
    let detail = `Request failed (${response.status})`
    if (data && typeof data.detail === 'string') detail = data.detail
    else if (data && Array.isArray(data.detail) && data.detail[0]?.msg) detail = data.detail[0].msg.replace(/^Value error, /, '')
    const error = new Error(detail)
    error.status = response.status // lets screens react to 401 (not logged in) or 404 (nothing there)
    throw error
  }
  return data
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
}
