import { useState } from 'react'
import { api } from '../api.js'
import { Pill } from '../components/cards.jsx'
import { yearName } from '../labels.js'
import { ChoiceCard, TextField } from '../components/questionnaire/parts.jsx'
import StateMessage from '../components/StateMessage.jsx'
import { ALCOHOL_CHOICES, CAMPUS_CHOICES, GOAL_CHOICES } from '../questionnaireOptions.js'
import { useApi } from '../useApi.js'

// Profile and settings. The back end lets us change campus, travel, alcohol, goal and LinkedIn,
// so those are editable; the rest of the questionnaire answers are shown for reference.
function Profile() {
  const { data: me, error, loading } = useApi('/me')
  if (loading) return <StateMessage>Loading your profile…</StateMessage>
  if (error) return <StateMessage kind="error">{error.message}</StateMessage>
  return <ProfileForm me={me} />
}

// Split out so the form starts from the loaded profile.
function ProfileForm({ me }) {
  const [form, setForm] = useState({
    campus: me.campus,
    travel_ok: me.travel_ok,
    alcohol_pref: me.alcohol_pref,
    goal: me.goal,
    linkedin_url: me.linkedin_url ?? '',
    linkedin_max_optin: me.linkedin_max_optin,
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const hasLink = form.linkedin_url.trim() !== ''
  const change = (changes) => {
    setForm({ ...form, ...changes })
    setMessage('')
  }

  async function save(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api.put('/me/preferences', {
        ...form,
        linkedin_url: hasLink ? form.linkedin_url.trim() : null, // null removes the link
        linkedin_max_optin: hasLink && form.linkedin_max_optin,
      })
      setMessage('Saved.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-6 pt-4">
      <div>
        <h1 className="font-display text-4xl font-normal">{me.name}</h1>
        <p className="text-muted dark:text-white/75">{me.ucl_email}</p>
        <p className="mt-1 text-muted dark:text-white/75">
          {[me.course, yearName(me.year)].filter(Boolean).join(' · ')}
        </p>
        {me.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {me.tags.map((tag) => (
              <Pill key={tag}>{tag}</Pill>
            ))}
          </div>
        )}
      </div>

      <fieldset className="space-y-3">
        <legend className="mb-2 font-display text-2xl">Campus</legend>
        {CAMPUS_CHOICES.map((c) => (
          <ChoiceCard key={c.value} label={c.label} selected={form.campus === c.value} onClick={() => change({ campus: c.value })} />
        ))}
        <label className="flex min-h-14 cursor-pointer items-center gap-3 text-lg">
          <input type="checkbox" checked={form.travel_ok} onChange={(e) => change({ travel_ok: e.target.checked })} className="size-6 accent-brand" />
          I'm happy to travel to the other campus
        </label>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 font-display text-2xl">Alcohol and events</legend>
        {ALCOHOL_CHOICES.map((c) => (
          <ChoiceCard key={c.value} label={c.label} selected={form.alcohol_pref === c.value} onClick={() => change({ alcohol_pref: c.value })} />
        ))}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 font-display text-2xl">I'm here for</legend>
        {GOAL_CHOICES.map((c) => (
          <ChoiceCard key={c.value} label={c.label} selected={form.goal === c.value} onClick={() => change({ goal: c.value })} />
        ))}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 font-display text-2xl">LinkedIn</legend>
        <TextField
          label="LinkedIn link (optional)"
          type="url"
          value={form.linkedin_url}
          onChange={(linkedin_url) => change({ linkedin_url })}
          placeholder="https://www.linkedin.com/in/your-name"
        />
        <label className={`flex min-h-14 items-center gap-3 text-lg ${hasLink ? 'cursor-pointer' : 'opacity-50'}`}>
          <input
            type="checkbox"
            disabled={!hasLink}
            checked={hasLink && form.linkedin_max_optin}
            onChange={(e) => change({ linkedin_max_optin: e.target.checked })}
            className="size-6 accent-brand"
          />
          List me in LinkedIn Max
        </label>
      </fieldset>

      {error && <StateMessage kind="error">{error}</StateMessage>}
      {message && <p role="status" className="rounded-2xl bg-green-100 p-4 text-green-800">{message}</p>}
      <button
        type="submit"
        disabled={busy}
        className="min-h-14 w-full rounded-full bg-brand px-7 text-lg font-semibold text-white disabled:opacity-40"
      >
        {busy ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}

export default Profile
