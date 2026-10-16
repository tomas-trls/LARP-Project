// 07a · The purple "Not sure yet? Suggest routes for me." card.
//
// Tapping it plays a short "agent at work" scene inside the card, then shows suggested roles:
//   phase 'off'      the normal card with the thinking mascot
//   phase 'enter'    the card grows and the mascot turns into a glowing orb
//   phase 'think'    a spinner circles the orb and the four "reading your CV…" lines tick off one by one
//   phase 'results'  the suggested roles, each with a fit %, salary and a "Why" line
//   phase 'exit'     the card shrinks back to normal
// The page (CareerPath.jsx) owns the phase and the timers. This file only draws each phase.
import ThinkingMascot from './ThinkingMascot.jsx'

const EASE = 'cubic-bezier(.4,0,.2,1)'

// Two animations used only here: the orb's soft pulse and the spinning ring.
const KEYFRAMES = `
@keyframes aiPulse{0%,100%{box-shadow:0 0 0 0 rgba(221,189,255,.5),0 0 16px 4px rgba(221,189,255,.45)}50%{box-shadow:0 0 0 12px rgba(221,189,255,0),0 0 34px 12px rgba(221,189,255,.8)}}
@keyframes aiSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
`

export default function SuggestCard({ phase, step, lines, suggestions, selected, full, selHint, onStart, onExit, onToggle }) {
  const off = phase === 'off' || phase === 'exit'
  const busy = phase === 'enter' || phase === 'think'
  const results = phase === 'results'

  // Where the mascot/orb sits: top-left of the card normally, centred while thinking,
  // small in the corner on the results.
  const charPos = {
    left: busy ? 'calc(50% - 35px)' : 20,
    top: busy ? 22 : 20,
    transform: busy ? 'scale(1.1)' : results ? 'scale(.42)' : 'scale(1)',
  }

  return (
    <div
      onClick={off ? onStart : undefined}
      role={off ? 'button' : undefined}
      tabIndex={off ? 0 : undefined}
      onKeyDown={(e) => off && e.key === 'Enter' && onStart()}
      className={`relative box-border overflow-hidden rounded-[24px] bg-hero p-5 text-hero-ink ${off ? 'cursor-pointer active:scale-[.985]' : ''}`}
      style={{ minHeight: busy ? 300 : 0, transition: `min-height .6s ${EASE}` }}
    >
      <style>{KEYFRAMES}</style>

      {/* The mascot, which fades into a glowing orb while the agent works */}
      <div
        className="pointer-events-none absolute"
        style={{ width: 64, height: 72, ...charPos, transformOrigin: '0 0', transition: `left .6s ${EASE}, top .6s ${EASE}, transform .6s ${EASE}` }}
      >
        <div style={{ position: 'absolute', inset: 0, opacity: off ? 1 : 0, transition: 'opacity .35s' }}>
          <ThinkingMascot />
        </div>
        <div
          className="absolute rounded-full"
          style={{
            left: 4,
            top: 8,
            width: 56,
            height: 56,
            background: 'radial-gradient(circle at 35% 30%,#F3E8FF,#DDBDFF 55%,#C9A1FF)',
            opacity: off ? 0 : 1,
            transform: `scale(${off ? 0.5 : 1})`,
            transition: `opacity .45s .1s, transform .6s ${EASE}`,
            animation: busy ? 'aiPulse 1.8s ease-in-out infinite' : 'none',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            left: -8,
            top: -4,
            width: 80,
            height: 80,
            boxSizing: 'border-box',
            border: '2px solid transparent',
            borderTopColor: 'rgba(255,255,255,.95)',
            borderRightColor: 'rgba(255,255,255,.3)',
            opacity: phase === 'think' ? 1 : 0,
            transition: 'opacity .4s',
            animation: 'aiSpin 1.5s linear infinite',
          }}
        />
      </div>

      {/* 1. The normal card */}
      {off && (
        <div className="flex min-h-[72px] items-center gap-3 pl-20">
          <div className="flex-1">
            <div className="font-display text-[22px] leading-[1.15]">
              Not sure yet? <em>Suggest</em> routes for me.
            </div>
            <div className="mt-1 text-[13px] opacity-90">An agent reads your profile and proposes routes with reasons.</div>
          </div>
          <Chevron />
        </div>
      )}

      {/* 2. "Reading your CV…": each line fades in, then gets a tick when done */}
      {busy && (
        <div className="flex min-h-[150px] flex-col gap-2.5 pt-28">
          {lines.map((text, i) => {
            const shown = step > i
            const done = step > i + 1
            return (
              <div
                key={text}
                className="flex items-start gap-2.5 text-[13px] leading-[1.4]"
                style={{ opacity: shown ? 1 : 0, transform: shown ? 'none' : 'translateY(8px)', transition: `opacity .4s, transform .4s ${EASE}` }}
              >
                <div
                  className="mt-px box-border flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full transition-colors"
                  style={{
                    background: done ? '#DDBDFF' : 'rgba(255,255,255,.18)',
                    border: done ? '1.5px solid #DDBDFF' : '1.5px solid rgba(255,255,255,.6)',
                  }}
                >
                  {done && <Tick size={10} color="#361A54" />}
                </div>
                <span>{text}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* 3. The suggested roles */}
      {results && (
        <>
          <div className="flex h-7 items-center justify-between pl-10 text-[11px] font-semibold tracking-[.08em] uppercase opacity-90">
            <span>Suggested for you</span>
            <span className="font-medium tracking-normal normal-case opacity-80">{selHint}</span>
          </div>
          <div className="mt-3.5 flex flex-col gap-2">
            {suggestions.map((role, i) => {
              const on = selected.includes(role.name)
              const locked = !on && full
              // The fade-in sits on a wrapper, so it doesn't override the row's own opacity (faded when locked).
              return (
                <div key={role.name} style={{ animation: 'larpIn .45s both', animationDelay: `${i * 80}ms` }}>
                <button
                  type="button"
                  onClick={locked ? undefined : () => onToggle(role.name)}
                  aria-pressed={on}
                  className="flex w-full items-center gap-3 rounded-[18px] bg-white py-3 pr-3 pl-3.5 text-left text-[#361A54] select-none"
                  style={{
                    boxShadow: on ? '0 0 0 2px #DDBDFF' : 'none',
                    opacity: locked ? 0.45 : 1,
                    cursor: locked ? 'default' : 'pointer',
                    transition: 'box-shadow .2s, opacity .25s',
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] leading-[1.25] font-semibold">{role.name}</span>
                      <span className="rounded-full bg-[#EEDEFF] px-[7px] py-0.5 text-[11px] font-bold text-[#993BFF]">{role.fit}% fit</span>
                    </div>
                    <div className="mt-0.5 text-[12px] text-[#7A6796]">
                      {role.sector} · {role.alumni.toLocaleString('en-GB')} alumni · <b className="text-[#361A54]">£{role.sal}k</b> median start
                    </div>
                    <div className="mt-[5px] text-[12px] leading-[1.4] text-[#7A6796]">
                      <b className="text-[#361A54]">Why:</b> {role.why}
                    </div>
                  </div>
                  {on ? (
                    <div
                      className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-[#993BFF] text-white"
                      style={{ animation: 'arPop .22s cubic-bezier(.2,.8,.3,1.2)' }}
                    >
                      <Tick size={13} color="currentColor" />
                    </div>
                  ) : (
                    <div className="box-border h-[22px] w-[22px] flex-none rounded-full border-[1.5px] border-[#BA82FF]" />
                  )}
                </button>
                </div>
              )
            })}
          </div>
          <button
            type="button"
            onClick={onExit}
            className="mx-auto mt-4 flex items-center justify-center gap-1.5 p-2 text-[13px] font-semibold underline underline-offset-[3px] opacity-90"
          >
            <SearchIcon />
            Search roles myself instead
          </button>
        </>
      )}
    </div>
  )
}

function Tick({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l5 5 9-10" />
    </svg>
  )
}

function Chevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none">
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.5-4.5" />
    </svg>
  )
}
