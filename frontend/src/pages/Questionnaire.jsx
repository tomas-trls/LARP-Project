import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { ProgressBar } from '../components/questionnaire/parts.jsx'
import {
  StepCampus,
  StepEvents,
  StepExperience,
  StepFree,
  StepHelp,
  StepInterests,
  StepStudy,
} from '../components/questionnaire/steps.jsx'
import TopBar from '../components/TopBar.jsx'
import { loadAnswers, saveAnswers } from '../questionnaireStore.js'

const TOTAL_STEPS = 7

// Can the student move on from this screen? Only the required questions block them.
function canContinue(step, a) {
  if (step === 1) return a.campus !== ''
  if (step === 2) return a.course !== '' && a.yearLabel !== ''
  if (step === 4) return a.tag_ids.length >= 1
  if (step === 5) return a.alcohol_pref !== '' && a.goal !== ''
  return true // steps 3, 6 and 7 can be skipped
}

// The questionnaire: one screen at a time, answers kept in sessionStorage until the student registers.
// After the last screen, "Finish" takes them to /register, which sends the answers to the back end.
function Questionnaire() {
  const navigate = useNavigate()
  const [answers, setAnswers] = useState(loadAnswers)
  const [categories, setCategories] = useState(null) // the interest tags from /api/tags
  const [tagsError, setTagsError] = useState('')
  const [demoMode, setDemoMode] = useState(false) // the back end says whether this is a demo

  const step = Math.min(answers.step, TOTAL_STEPS) // an old saved "step 8" from before Step 9 becomes step 7

  // Change some answers and save them straight away (so a refresh loses nothing).
  function set(changes) {
    const next = { ...answers, ...changes }
    setAnswers(next)
    saveAnswers(next)
  }

  // Fetch the interest tags once (and ask whether we're in demo mode).
  useEffect(() => {
    api.get('/health').then((h) => setDemoMode(Boolean(h.demo_mode))).catch(() => {})
    api
      .get('/tags')
      .then(setCategories)
      .catch(() => setTagsError("Couldn't load the interests. Is the back end running?"))
  }, [])

  // Demo only: fill in a typical student's answers so the demo can skip the typing, then jump to the last screen.
  function fillDemoAnswers() {
    const wanted = ['finance', 'consulting', 'chess', 'economics']
    const ids = (categories ?? [])
      .flatMap((c) => c.subgroups.flatMap((g) => g.tags))
      .filter((t) => wanted.includes(t.name))
      .map((t) => t.id)
    set({
      campus: 'main',
      travel_ok: true,
      course: 'Economics',
      yearLabel: 'Year 2',
      hasExperience: true,
      experience_industry: ['Finance and banking'],
      experience_note: 'Summer analyst at a small bank',
      tag_ids: ids,
      alcohol_pref: 'bars_no_drink',
      goal: 'both',
      looking_for: 'Mentoring or CV review',
      offers: '',
      availability: ['weeknights'],
      step: TOTAL_STEPS,
    })
  }

  function next() {
    if (step === TOTAL_STEPS) navigate('/register')
    else set({ step: step + 1 })
  }

  const screens = {
    1: <StepCampus a={answers} set={set} />,
    2: <StepStudy a={answers} set={set} />,
    3: <StepExperience a={answers} set={set} />,
    4: <StepInterests a={answers} set={set} categories={categories} tagsError={tagsError} />,
    5: <StepEvents a={answers} set={set} />,
    6: <StepHelp a={answers} set={set} />,
    7: <StepFree a={answers} set={set} />,
  }

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto w-full max-w-xl px-5 pb-16">
        {demoMode && categories && (
          <button
            type="button"
            onClick={fillDemoAnswers}
            className="mb-4 rounded-full border border-dashed border-brand px-4 py-2 text-sm font-medium text-brand dark:border-brand-mid dark:text-brand-mid"
          >
            Demo: fill in the answers for me
          </button>
        )}
        <ProgressBar step={step} total={TOTAL_STEPS} />
        <div className="mt-8">{screens[step]}</div>

        <div className="mt-10 flex gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => set({ step: step - 1 })}
              className="min-h-14 rounded-full border-2 border-ink/15 px-7 text-lg font-semibold transition hover:bg-brand-pale dark:border-white/25 dark:hover:bg-white/10"
            >
              Back
            </button>
          )}
          <button
            type="button"
            disabled={!canContinue(step, answers)}
            onClick={next}
            className="min-h-14 flex-1 rounded-full bg-brand px-7 text-lg font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-brand-mid"
          >
            {step === TOTAL_STEPS ? 'Finish' : 'Next'}
          </button>
        </div>
      </main>
    </div>
  )
}

export default Questionnaire
