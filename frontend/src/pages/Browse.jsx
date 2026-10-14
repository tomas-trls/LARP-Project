import { MatchCard } from '../components/cards.jsx'
import StateMessage from '../components/StateMessage.jsx'
import { useApi } from '../useApi.js'

// Browse: the people who match you best, ranked, each with the reason.
function Browse() {
  const { data: matches, error, loading } = useApi('/matches')

  return (
    <section className="pt-4">
      <h1 className="font-display text-4xl font-normal">People like you</h1>
      <p className="mt-2 text-lg text-muted dark:text-white/75">Best matches first.</p>
      {loading && <StateMessage>Finding your matches…</StateMessage>}
      {error && <StateMessage kind="error">{error.message}</StateMessage>}
      {matches?.length === 0 && <StateMessage>No matches yet. Check back as more students join.</StateMessage>}
      <ul className="mt-6 space-y-3">
        {matches?.map((m) => (
          <MatchCard key={m.user_id} match={m} />
        ))}
      </ul>
    </section>
  )
}

export default Browse
