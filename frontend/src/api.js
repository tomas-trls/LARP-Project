// The one place the front end talks to the back end.
//
// Every screen uses:  api.get('/tags')  or  api.post('/login', {...})
// Locally, the dev server forwards anything starting with /api to the FastAPI back end (see vite.config.js).
// When hosted (e.g. on Render), set VITE_API_URL to the back end's address, such as
// https://larp-backend.onrender.com (no trailing slash). Vite bakes it in at build time.
// Left empty, requests stay relative ("/api/...") and the dev proxy handles them.
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

// A picture address from the back end (like /api/avatars/7.svg) made ready for an <img> or a CSS url().
// Hosted on Render, the back end lives at a different address, so add it in front.
export const assetUrl = (path) => (path ? (/^https?:/.test(path) ? path : `${API_URL}${path}`) : null)

async function request(path, options = {}) {
  // After login (Step 9) the token is kept in localStorage and sent on every request.
  const token = localStorage.getItem('token')
  // A file upload (FormData) sets its own Content-Type, so only JSON requests get the JSON one.
  const isUpload = options.body instanceof FormData
  const headers = { ...(isUpload ? {} : { 'Content-Type': 'application/json' }), ...options.headers }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${API_URL}/api${path}`, { ...options, headers })
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
  delete: (path) => request(path, { method: 'DELETE' }),
  upload: (path, formData) => request(path, { method: 'POST', body: formData }),
}
