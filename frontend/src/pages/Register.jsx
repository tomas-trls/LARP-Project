import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { TextField } from '../components/questionnaire/parts.jsx'
import StateMessage from '../components/StateMessage.jsx'
import TopBar from '../components/TopBar.jsx'
import { saveToken } from '../auth.js'
import { buildRegistration, clearAnswers, hasFinishedQuestionnaire, loadAnswers } from '../questionnaireStore.js'

// The last stop before an account exists. The questionnaire answers wait in sessionStorage;
// pressing "Create account" sends them to the back end together with these details.
function Register() {
  const navigate = useNavigate()
  const [answers] = useState(loadAnswers)
  const [form, setForm] = useState({ name: '', ucl_email: '', password: '', linkedin_url: '', linkedin_max_optin: false })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Nothing to register with? Go and answer the questions first.
  if (!hasFinishedQuestionnaire(answers)) return <Navigate to="/questionnaire" replace />

  const change = (field) => (value) => setForm({ ...form, [field]: value })
  const hasLink = form.linkedin_url.trim() !== ''

  async function submit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const account = {
        name: form.name.trim(),
        ucl_email: form.ucl_email,
        password: form.password,
        linkedin_url: hasLink ? form.linkedin_url.trim() : null,
        linkedin_max_optin: hasLink && form.linkedin_max_optin, // can't opt in without a link
      }
      const result = await api.post('/register', buildRegistration(answers, account))
      saveToken(result.token)
      clearAnswers() // the answers now live in the database, so forget the browser copy
      navigate('/pairing')
    } catch (err) {
      setError(err.message) // answers stay saved, so the student can fix the form and try again
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto w-full max-w-xl px-5 pb-16">
        <form onSubmit={submit} className="space-y-5">
          <h1 className="font-display text-4xl font-normal">Create your account</h1>
          <p className="text-lg text-muted dark:text-white/75">Almost there. Your answers are saved; this just makes them yours.</p>
          <TextField label="Name" value={form.name} onChange={change('name')} required autoComplete="name" />
          <TextField
            label="Email"
            type="email"
            value={form.ucl_email}
            onChange={change('ucl_email')}
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
          <TextField
            label="Password (8 characters or more)"
            type="password"
            value={form.password}
            onChange={change('password')}
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
          />
          <TextField
            label="LinkedIn link (optional)"
            type="url"
            value={form.linkedin_url}
            onChange={change('linkedin_url')}
            placeholder="https://www.linkedin.com/in/your-name"
          />
          <label className={`flex min-h-14 items-center gap-3 text-lg ${hasLink ? 'cursor-pointer' : 'opacity-50'}`}>
            <input
              type="checkbox"
              disabled={!hasLink}
              checked={hasLink && form.linkedin_max_optin}
              onChange={(e) => change('linkedin_max_optin')(e.target.checked)}
              className="size-6 accent-brand"
            />
            List me in LinkedIn Max so matches can find me
          </label>
          <p className="text-sm text-muted dark:text-white/75">We never send LinkedIn requests for you.</p>

          {error && <StateMessage kind="error">{error}</StateMessage>}

          <div className="flex gap-3">
            <Link
              to="/questionnaire"
              className="inline-flex min-h-14 items-center rounded-full border-2 border-ink/15 px-7 text-lg font-semibold dark:border-white/25"
            >
              Back
            </Link>
            <button
              type="submit"
              disabled={busy}
              className="min-h-14 flex-1 rounded-full bg-brand px-7 text-lg font-semibold text-white disabled:opacity-40"
            >
              {busy ? 'Creating…' : 'Create account'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

export default Register
