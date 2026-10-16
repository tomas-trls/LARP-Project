// 05 · Personality (step 3 of 6): introvert, ambivert or extrovert?
//
// Two ways to answer:
//   1. Tap a label straight away. The character changes pose to match.
//   2. "Not sure? Help me figure it out": 8 statements, one at a time, from Disagree to Agree.
//      After the last one the character "thinks", the labels spin and slow down, and land on the result.
//      The student can accept it ("Sounds right") or pick another label ("Not quite, let me pick").
// Next is enabled once a label is picked or the quiz result is accepted.
// Used for social pairing only, never for jobs.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { STATEMENTS, VERT_RESULTS } from '../components/onboarding/options.js'
import { PERSONALITY_KEYFRAMES, VertCarousel, VertMascot } from '../components/onboarding/VertPicker.jsx'
import Screen from '../components/Screen.jsx'
import StepHeader from '../components/StepHeader.jsx'
import { useProfile } from '../profileStore.jsx'

// The screen's starting state.
//   mode:  'none' (nothing picked) | 'pick' (a label tapped) | 'quiz' | 'reveal' (animation) | 'result'
//   sel:   the picked label (0 Introvert, 1 Ambivert, 2 Extrovert)
//   step:  which quiz statement is showing (0-7);   ans: { statementIndex: 1..5 }
//   res:   the quiz result;   phase / hl: steps of the reveal animation and the label lit up during the spin
//   ok:    true once "Sounds right" is pressed;   dir: 1 or -1, which way the next statement slides in
//   kick:  changes every time something is picked, to replay the bounce and the stars
const START = { mode: 'none', sel: null, step: 0, ans: {}, res: null, phase: null, hl: null, ok: false, dir: 1, kick: 0 }

// Only statements 4-8 measure introvert vs extrovert. Statements 4 and 6 count the other way round
// (agreeing with "I recharge by spending time alone" points to introvert).
function scoreVert(ans) {
  const values = [6 - ans[3], ans[4], 6 - ans[5], ans[6], ans[7]]
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  return mean <= 2.4 ? 0 : mean >= 3.6 ? 2 : 1
}

const POSE_FOR = ['intro', 'ambi', 'extro']

export default function Personality() {
  const navigate = useNavigate()
  const { profile, update } = useProfile()
  const saved = profile.personality

  // If the student already answered this step, start with their label picked.
  const [p5, setP5State] = useState(() => (saved.done ? { ...START, mode: 'pick', sel: saved.vert, ans: saved.answers ?? {} } : START))
  const current = useRef(p5) // the latest state, for the timers below
  const setP5 = (patch) =>
    setP5State((old) => {
      const next = { ...old, ...patch }
      current.current = next
      return next
    })

  // All the animation timers, so they can be cancelled when something else happens.
  const timers = useRef([])
  const advancing = useRef(null)
  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }
  const after = (ms, fn) => timers.current.push(setTimeout(fn, ms))
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout)
      clearTimeout(advancing.current)
    },
    [],
  )

  // The quiz is finished: shrink the quiz card, think, spin through the labels (slowing down), land on the result.
  function reveal(ans) {
    const result = scoreVert(ans)
    clearTimers()
    setP5({ mode: 'reveal', phase: 'shrink', ans, res: result, hl: null })
    after(450, () => setP5({ phase: 'think' }))
    // Bounce left and right across the labels, at least 9 steps, stopping on the result.
    const order = [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0]
    let last = 8
    while (order[last] !== result) last++
    let t = 1500
    order.slice(0, last + 1).forEach((hl, i) => {
      t += i ? 55 + 2.4 * i * i : 0 // each step waits a little longer, so the spin slows down
      after(t, () => setP5({ phase: 'spin', hl }))
    })
    after(t + 380, () => setP5({ mode: 'result', phase: 'land', hl: null, sel: result, kick: current.current.kick + 1 }))
  }

  // A dot in the quiz was tapped: remember it, then move on to the next statement after a short pause.
  function answer(value) {
    if (p5.mode !== 'quiz' || advancing.current) return
    const ans = { ...p5.ans, [p5.step]: value }
    const step = p5.step
    setP5({ ans })
    advancing.current = setTimeout(() => {
      advancing.current = null
      if (current.current.mode !== 'quiz') return
      if (step < STATEMENTS.length - 1) setP5({ step: step + 1, dir: 1 })
      else reveal(ans)
    }, 350)
  }

  // A label was tapped: pick it (or un-pick it if it was already picked).
  function pickLabel(i) {
    if (p5.mode === 'reveal') return
    clearTimers()
    if (p5.mode === 'pick' && p5.sel === i) setP5({ ...START })
    else setP5({ ...START, mode: 'pick', sel: i, kick: current.current.kick + 1 })
  }

  const reset = () => {
    clearTimers()
    setP5({ ...START })
  }

  const canContinue = (p5.mode === 'pick' && p5.sel != null) || (p5.mode === 'result' && p5.ok)
  function next() {
    if (!canContinue) return
    update('personality', { vert: p5.sel, done: true, answers: p5.ans })
    navigate('/onboarding/interests')
  }

  // What to show right now
  const pose = p5.mode === 'pick' || p5.mode === 'result' ? POSE_FOR[p5.sel] : p5.mode === 'reveal' ? 'think' : 'neutral'
  const showLabels = p5.mode !== 'quiz' && !(p5.mode === 'reveal' && p5.phase !== 'spin')
  const showQuizLink = p5.mode === 'none' || p5.mode === 'pick'
  const showQuiz = p5.mode === 'quiz' || (p5.mode === 'reveal' && p5.phase === 'shrink')

  return (
    <Screen>
      <style>{PERSONALITY_KEYFRAMES}</style>
      <div className="px-2">
        {/* Back clears the answer first; pressed again, it goes to the previous step. */}
        <StepHeader step={3} onBack={p5.mode === 'none' ? undefined : reset} />
      </div>

      {/* The bright purple card that fills the rest of the screen */}
      <div className="-mb-6 mt-3.5 flex flex-1 flex-col items-center overflow-hidden rounded-t-[28px] bg-hero px-[22px] pt-[30px] text-hero-ink">
        <h1 className="max-w-[350px] flex-none text-center font-display text-[30px] leading-[1.15] font-normal">
          {profile.firstName}, would you say you're more of an…
        </h1>

        <VertMascot pose={pose} thinking={p5.phase === 'think'} sparkKey={p5.mode === 'result' ? p5.kick : null} bounceKey={p5.kick} />

        <div className="mt-[22px] flex w-full flex-none flex-col items-center gap-3.5">
          {showLabels && (
            <div className="w-full" style={{ animation: 'p5Up .45s cubic-bezier(.2,.7,.2,1)' }}>
              <VertCarousel
                focus={p5.hl ?? p5.sel ?? 1}
                selected={p5.mode !== 'reveal' ? p5.sel : null}
                lit={p5.hl}
                spinning={p5.phase === 'spin'}
                onPick={pickLabel}
              />
            </div>
          )}

          {showQuizLink && (
            <button
              type="button"
              onClick={() => {
                clearTimers()
                setP5({ ...START, mode: 'quiz' })
              }}
              className="p-2 text-[14px] font-semibold underline underline-offset-[3px] select-none"
            >
              Not sure? Help me figure it out →
            </button>
          )}

          {/* The quiz result, with "Sounds right" / "Not quite" until the student confirms */}
          {p5.mode === 'result' && (
            <div className="flex w-full flex-col items-center gap-3.5" style={{ animation: 'p5Up .5s cubic-bezier(.2,.7,.2,1)' }}>
              <div className="max-w-[310px] text-center text-[15px] leading-[1.45] text-pretty">{VERT_RESULTS[p5.res ?? 1]}</div>
              {!p5.ok && (
                <div className="flex w-full gap-2">
                  <button type="button" onClick={() => setP5({ ok: true })} className="flex h-11 flex-1 items-center justify-center text-[15px] font-semibold select-none">
                    Sounds right
                  </button>
                  <button
                    type="button"
                    onClick={() => setP5({ ...START, mode: 'pick', sel: p5.res })}
                    className="flex h-11 flex-1 items-center justify-center text-[15px] font-semibold opacity-85 select-none"
                  >
                    Not quite, let me pick
                  </button>
                </div>
              )}
            </div>
          )}

          {/* The quiz: one statement at a time with five dots from Disagree to Agree */}
          {showQuiz && (
            <div
              className="flex w-full flex-col gap-3"
              style={{ animation: p5.mode === 'reveal' ? 'p5Out .45s ease-in forwards' : 'p5Up .45s cubic-bezier(.2,.7,.2,1)' }}
            >
              <div className="flex items-center justify-between text-[13px]">
                <button type="button" onClick={reset} className="font-semibold underline underline-offset-[3px] select-none">
                  I'll pick myself instead
                </button>
                <div className="opacity-85">
                  {p5.step + 1} of {STATEMENTS.length}
                </div>
              </div>
              <div className="flex flex-col items-center gap-[18px] overflow-hidden rounded-[22px] bg-white/[.14] px-[18px] pt-[22px] pb-[18px]">
                {/* A new key makes the statement slide in from the side each time it changes */}
                <div
                  key={p5.step}
                  className="flex min-h-[62px] items-center text-center font-display text-[25px] leading-[1.2] text-pretty"
                  style={{ '--fx': `${p5.dir * 48}px`, animation: 'p5In .38s cubic-bezier(.2,.7,.2,1)' }}
                >
                  {STATEMENTS[p5.step]}
                </div>
                <div className="flex gap-3.5" role="radiogroup" aria-label={STATEMENTS[p5.step]}>
                  {[1, 2, 3, 4, 5].map((value) => {
                    const on = p5.ans[p5.step] === value
                    return (
                      <button
                        type="button"
                        key={value}
                        role="radio"
                        aria-checked={on}
                        aria-label={`${value} of 5`}
                        onClick={() => answer(value)}
                        className="box-border h-8 w-8 rounded-full border-[1.5px] border-white"
                        style={{
                          background: on ? '#FFFFFF' : 'transparent',
                          transform: on ? 'scale(1.1)' : 'scale(1)',
                          animation: on ? 'p5Pop .38s cubic-bezier(.3,1.5,.5,1)' : 'none',
                          transition: 'background .15s, transform .2s',
                        }}
                      />
                    )
                  })}
                </div>
                <div className="flex w-full justify-between text-[12px] opacity-80">
                  <span>Disagree</span>
                  <span>Agree</span>
                </div>
              </div>
              {p5.step > 0 && (
                <button
                  type="button"
                  onClick={() => setP5({ step: Math.max(0, p5.step - 1), dir: -1 })}
                  className="self-start py-1 text-[13px] font-semibold select-none"
                >
                  ← Back
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mt-auto w-full pt-4 pb-10">
          <button
            type="button"
            onClick={next}
            disabled={!canContinue}
            className="flex h-14 w-full items-center justify-center rounded-full bg-white text-[16px] font-semibold text-plum transition-opacity duration-200 select-none"
            style={{ opacity: canContinue ? 1 : 0.45 }}
          >
            Next
          </button>
        </div>
      </div>
    </Screen>
  )
}
