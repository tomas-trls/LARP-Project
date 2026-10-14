// Who is logged in? The login token lives in localStorage under the key "token".
// api.js reads the same key and sends it with every request.

export function isLoggedIn() {
  return Boolean(localStorage.getItem('token'))
}

export function saveToken(token) {
  localStorage.setItem('token', token)
}

export function logout() {
  localStorage.removeItem('token')
}
