import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { TextField } from '../components/questionnaire/parts.jsx'
import StateMessage from '../components/StateMessage.jsx'
import TopBar from '../components/TopBar.jsx'
import { saveToken } from '../auth.js'

// Log in for people who already have an account.
function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ ucl_email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result = await api.post('/login', form)
      saveToken(result.token)
      // Already in a group? Go straight to it. Otherwise offer the pairing choice.
      try {
        await api.get('/group')
        navigate('/group')
      } catch {
        navigate('/pairing')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto w-full max-w-xl px-5 pb-16">
        <form onSubmit={submit} className="space-y-5">
          <h1 className="font-display text-4xl font-normal">Welcome back</h1>
          <TextField
            label="Email"
            type="email"
            value={form.ucl_email}
            onChange={(ucl_email) => setForm({ ...form, ucl_email })}
            required
            autoComplete="email"
          />
          <TextField
            label="Password"
            type="password"
            value={form.password}
            onChange={(password) => setForm({ ...form, password })}
            required
            autoComplete="current-password"
          />
          {error && <StateMessage kind="error">{error}</StateMessage>}
          <button
            type="submit"
            disabled={busy}
            className="min-h-14 w-full rounded-full bg-brand px-7 text-lg font-semibold text-white disabled:opacity-40"
          >
            {busy ? 'Logging in…' : 'Log in'}
          </button>
          <p className="text-center text-muted dark:text-white/75">
            New here?{' '}
            <Link to="/questionnaire" className="font-semibold text-brand underline dark:text-brand-mid">
              Take the questionnaire
            </Link>
          </p>
        </form>
      </main>
    </div>
  )
}

export default Login
