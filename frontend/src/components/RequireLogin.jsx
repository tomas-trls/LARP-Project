import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { api } from '../api.js'
import { isLoggedIn, logout } from '../auth.js'
import AppNav from './AppNav.jsx'
import StateMessage from './StateMessage.jsx'
import TopBar from './TopBar.jsx'

// Wraps every page that needs a login. It:
//   1. sends visitors with no token to the login page,
//   2. asks the back end "who am I?" once, so an old or invalid token is thrown away,
//   3. draws the top bar and the bottom tab bar around the page.
function RequireLogin() {
  const [checked, setChecked] = useState(false) // true once /me has said the token is good
  const [expired, setExpired] = useState(false)
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    if (!isLoggedIn()) return
    api
      .get('/me')
      .then(() => setChecked(true))
      .catch((err) => {
        if (err.status === 401) {
          logout()
          setExpired(true)
        } else {
          setOffline(true)
        }
      })
  }, [])

  if (!isLoggedIn() || expired) return <Navigate to="/login" replace />

  return (
    <div className="min-h-screen pb-24">
      <TopBar />
      <main className="mx-auto w-full max-w-2xl px-5 pb-8">
        {offline && <StateMessage kind="error">Couldn't reach the back end. Is it running?</StateMessage>}
        {!checked && !offline && <StateMessage>Loading…</StateMessage>}
        {checked && <Outlet />}
      </main>
      <AppNav />
    </div>
  )
}

export default RequireLogin
