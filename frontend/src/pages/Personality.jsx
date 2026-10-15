// 05 · Personality (step 3 of 6): introvert, ambivert or extrovert?
//
// The mascot cycles through the three until the student picks one or answers the 8 statements
// (shown 3, 3 and 2 at a time). The answers suggest a result, which they can still change.
// Used for social pairing only, never for jobs.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { STATEMENT_PAGES, STATEMENTS, VERT_LABELS } from '../components/onboarding/options.js'
import VertPicker from '../components/onboarding/VertPicker.jsx'
import Screen from '../components/Screen.jsx'
import StepHeader from '../components/StepHeader.jsx'
import { useProfile } from '../profileStore.jsx'

// Add up the answers: agreeing (4-5) with an "extrovert" statement pushes the score up, and so on.
function suggestedVert(answers) {
  const score = STATEMENTS.reduce((n, s, i) => n + (answers[i] != null ? (answers[i] - 3) * s.w : 0), 0)
  return score <= -3 ? 0 : score >= 3 ? 2 : 1
}

const RESULT_LINE = [
  'you do your best thinking in smaller rooms.',
  'you switch modes depending on the room.',
  'you get energy from people and pace.',
]

export default function Personality() {
  const navigate = useNavigate()
  const { profile, update } = useProfile()
  const { answers, done } = profile.personality
  const [page, setPage] = useState(0) // which group of statements is showing
  const [picked, setPicked] = useState(done) // true once the student has chosen a label (stops the cycling)
  const [cycling, setCycling] = useState(1) // the label shown while nothing is chosen yet
  const vert = picked ? profile.personality.vert : cycling

  // Until something is chosen, move to the next label every 2.6 seconds.
  useEffect(() => {
    if (picked) return
    const timer = setInterval(() => setCycling((v) => (v + 1) % 3), 2600)
    return () => clearInterval(timer)
  }, [picked])

  const setPersonality = (patch) => update('personality', patch)
  const pick = (i) => {
    setPicked(true)
    setPersonality({ vert: i })
  }

  const onPage = STATEMENT_PAGES[page]
  const pageDone = onPage.every((i) => answers[i] != null)
  const answered = Object.keys(answers).length
  const isLastPage = page === STATEMENT_PAGES.length - 1
  const suggested = suggestedVert(answers)

  function next() {
    if (!pageDone) return
    if (!isLastPage) return setPage(page + 1)
    // Last page: show the result and pick the suggested label.
    setPicked(true)
    setPersonality({ done: true, vert: suggested })
  }

  function back() {
    if (done) setPersonality({ done: false })
    else if (page > 0) setPage(page - 1)
    else navigate(-1)
  }

  function restart() {
    setPage(0)
    setPicked(false)
    setPersonality({ answers: {}, done: false })
  }

  const whiteButton = 'flex h-14 w-full items-center justify-center rounded-full bg-white text-[16px] font-semibold text-plum transition-opacity duration-200 select-none'

  return (
    <Screen>
      <div className="px-2">
        <StepHeader step={3} onBack={back} />
      </div>

      {/* The bright purple card that fills the rest of the screen */}
      <div className="-mb-6 mt-3.5 flex flex-1 flex-col items-center overflow-hidden rounded-t-[28px] bg-hero px-[22px] pt-[30px] text-hero-ink">
        <h1 className="min-h-[101px] w-full text-center font-display text-[30px] leading-[1.15] font-normal">
          {done ? 'Sounds like you’re an…' : `${profile.firstName}, would you say you're more of an...`}
        </h1>

        <VertPicker vert={vert} onPick={pick} />

        {done ? (
          <>
            {/* The result */}
            <div className="mt-6 flex w-full flex-none flex-col gap-2 rounded-[20px] bg-white/[.14] px-5 py-[18px]">
              <div className="text-[15px] leading-[1.45] font-semibold">
                Your answers lean {VERT_LABELS[suggested].toLowerCase()} — {RESULT_LINE[suggested]}
              </div>
              <div className="text-[13px] leading-[1.4] opacity-85">
                {vert === suggested ? 'Tap another label above if that doesn’t feel right.' : `You picked ${VERT_LABELS[vert]} — we’ll go with that.`}
              </div>
              <button type="button" onClick={restart} className="mt-1 self-start text-[13px] font-semibold underline select-none">
                Retake the statements
              </button>
            </div>
            <div className="mt-auto w-full pt-6 pb-10">
              <button type="button" onClick={() => navigate('/onboarding/interests')} className={whiteButton}>
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
            {/* The statements, each with five dots from Disagree to Agree */}
            <div className="mt-6 flex w-full flex-none flex-col gap-3 rounded-[20px] bg-white/[.14] px-[18px] py-4">
              {onPage.map((i) => (
                <div key={i} className="flex items-center justify-between gap-3 text-[14px] leading-[1.3]">
                  <span>{STATEMENTS[i].t}</span>
                  <div className="flex flex-none gap-2" role="radiogroup" aria-label={STATEMENTS[i].t}>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        type="button"
                        key={value}
                        role="radio"
                        aria-checked={answers[i] === value}
                        aria-label={`${value} of 5`}
                        onClick={() => setPersonality({ answers: { ...answers, [i]: value } })}
                        className="box-border h-[18px] w-[18px] rounded-full border-[1.5px] border-white transition-colors duration-150"
                        style={{ background: answers[i] === value ? '#FFFFFF' : 'transparent' }}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <div className="text-[12px] opacity-80">
                Disagree ← → Agree · {answered} of {STATEMENTS.length} statements
              </div>
            </div>
            <div className="mt-auto w-full pt-6 pb-10">
              <button type="button" onClick={next} className={whiteButton} style={{ opacity: pageDone ? 1 : 0.55 }}>
                {isLastPage ? 'See my result' : 'Next'}
              </button>
            </div>
          </>
        )}
      </div>
    </Screen>
  )
}
