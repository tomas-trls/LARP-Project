import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { ChoiceCard } from '../components/questionnaire/parts.jsx'
import StateMessage from '../components/StateMessage.jsx'

// How do you want to meet people? The choice is not stored; it only decides where you go next.
function Pairing() {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // "Pair me" and "Both" both ask the back end to put us in a group, then show it.
  async function pairThenGo(destination) {
    setBusy(true)
    setError('')
    try {
      await api.post('/pair/auto', {})
      navigate(destination)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <section className="pt-4">
      <h1 className="font-display text-4xl font-normal">How would you like to meet people?</h1>
      <p className="mt-2 text-lg text-muted dark:text-white/75">You can always do the other later.</p>
      <div className="mt-6 space-y-3">
        <ChoiceCard label="Pair me with a group" hint="We'll find 3 to 6 people like you and suggest a first event." onClick={() => !busy && pairThenGo('/group')} />
        <ChoiceCard label="Let me browse people" hint="See a ranked list of people who match you." onClick={() => !busy && navigate('/browse')} />
        <ChoiceCard label="Both" hint="Join a group now and keep browsing too." onClick={() => !busy && pairThenGo('/group')} />
      </div>
      {busy && <StateMessage>Finding your group…</StateMessage>}
      {error && <StateMessage kind="error">{error}</StateMessage>}
    </section>
  )
}

export default Pairing
