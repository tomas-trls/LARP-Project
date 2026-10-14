import { Link } from 'react-router-dom'
import TopBar from '../components/TopBar.jsx'

// A friendly stand-in for screens we haven't built yet, so a link never leads to a blank page.
// Used for the questionnaire (Step 8) and log in (Step 9).
function ComingSoon({ title, step, text }) {
  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto flex w-full max-w-xl flex-col items-center px-5 pt-10 text-center">
        <div className="w-full rounded-3xl border border-brand-pale bg-white p-8 shadow-sm dark:border-white/10 dark:bg-white/5">
          {step && (
            <span className="inline-block rounded-full bg-brand-pale px-4 py-1.5 text-sm font-medium text-ink dark:bg-white/10 dark:text-heritage">
              Coming in {step}
            </span>
          )}
          <h1 className="mt-4 font-display text-4xl font-normal">{title}</h1>
          <p className="mt-3 text-lg leading-relaxed text-muted dark:text-white/75">{text}</p>
          <Link
            to="/"
            className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-7 font-semibold text-white transition hover:bg-brand dark:bg-white dark:text-ink dark:hover:bg-brand-pale"
          >
            ← Back to the start
          </Link>
        </div>
      </main>
    </div>
  )
}

export default ComingSoon
