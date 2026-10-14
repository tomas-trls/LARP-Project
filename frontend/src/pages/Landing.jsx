import { Link } from 'react-router-dom'
import BackendStatus from '../components/BackendStatus.jsx'
import ConnectArt from '../components/ConnectArt.jsx'
import LearnArt from '../components/LearnArt.jsx'
import NetworkArt from '../components/NetworkArt.jsx'
import PillarCard from '../components/PillarCard.jsx'
import TopBar from '../components/TopBar.jsx'

// The landing page: what a new visitor sees first.
// Top to bottom:  top bar, headline, the three cards, the "take the questionnaire" block, a quiet log in link.
// Phone first: everything is one column, and the three cards sit side by side from tablet width (md:) upwards.
function Landing() {
  return (
    <div className="min-h-screen">
      <TopBar />

      <main className="mx-auto w-full max-w-5xl px-5 pb-10">
        {/* Headline */}
        <section className="pb-8 pt-6 text-center sm:pb-12 sm:pt-12">
          <span className="inline-block rounded-full bg-brand-pale px-4 py-1.5 text-sm font-medium text-ink dark:bg-white/10 dark:text-heritage">
            For UCL students
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl font-display text-[2.6rem] font-normal leading-[1.08] sm:text-6xl">
            From “I don’t know anyone” to “I’m meeting my group on{' '}
            <em className="italic text-brand dark:text-brand-mid">Thursday</em>.”
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted dark:text-white/75">
            Events, people and career help at UCL, matched to you, with a reason for every suggestion.
          </p>
        </section>

        {/* The three cards */}
        <section aria-label="What LARP helps you with" className="grid gap-4 md:grid-cols-3">
          <PillarCard
            label="Career"
            title="Network"
            text="Improve your CV, meet professionals and find career events that suit what you want to do."
            art={<NetworkArt />}
            background="bg-brand-pale dark:bg-brand-light"
            photo="/images/network.jpg"
            photoAlt="Students networking at a careers event"
          />
          <PillarCard
            label="Social"
            title="Connect"
            text="Get matched into a small group of people who like what you like, with a first event to go to together."
            art={<ConnectArt />}
            background="bg-brand"
          />
          <PillarCard
            label="Support"
            title="Learn and get help"
            text="Find tutoring and extra hands, or hire a student for a project or a small job."
            art={<LearnArt />}
            background="bg-ink dark:bg-black/30"
          />
        </section>

        {/* Call to action */}
        <section className="mt-6 rounded-3xl bg-brand px-6 py-9 text-center text-white sm:px-12 sm:py-12">
          <p className="mx-auto max-w-2xl font-display text-3xl leading-snug sm:text-4xl">
            Take a 3-minute questionnaire to be paired with similar people and relevant events
          </p>
          <Link
            to="/questionnaire"
            className="mt-7 inline-flex min-h-14 items-center justify-center rounded-full bg-white px-8 text-lg font-semibold text-ink transition hover:bg-brand-pale"
          >
            Start the questionnaire
            <span aria-hidden="true" className="ml-2">→</span>
          </Link>
          <p className="mt-4 text-sm text-white/85">No account needed to start.</p>
        </section>

        {/* Log in, kept quiet */}
        <p className="mt-8 text-center text-base text-muted dark:text-white/75">
          Or log in if you’re already a user{' '}
          <Link
            to="/login"
            className="ml-1 inline-flex min-h-12 items-center rounded-full border border-ink/15 px-5 font-medium text-ink transition hover:bg-brand-pale dark:border-white/25 dark:text-white dark:hover:bg-white/10"
          >
            Log in
          </Link>
        </p>
      </main>

      <footer className="flex justify-center pb-8">
        <BackendStatus />
      </footer>
    </div>
  )
}

export default Landing
