// 07a · Do you know your career path? (onboarding step 5 of 6)
// The student searches a catalogue of roles and picks up to 3. If a role is missing they can add
// their own. If they are not sure, the purple card plays a short "agent at work" scene and then
// suggests roles with reasons, right on this screen (see components/career/SuggestCard.jsx).
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, SmallPlus, SmallX, StickyFooter } from '../components/career/bits.jsx'
import SuggestCard from '../components/career/SuggestCard.jsx'
import Icon from '../components/Icon.jsx'
import Screen from '../components/Screen.jsx'
import StepHeader from '../components/StepHeader.jsx'
import { PrimaryButton } from '../components/ui.jsx'
import { AI_SUGGESTIONS, MAX_ROLES, POPULAR, POPULAR_SHOWN, ROLES, WORK_VALUES } from '../data/careerData.js'
import { saveRoutes } from '../live.js'
import { useProfile } from '../profileStore.jsx'

const PAGE_SIZE = 8 // how many results show before "Show more"

export default function CareerPath() {
  const navigate = useNavigate()
  const { profile, update } = useProfile()
  const selected = profile.roles.sel
  const customRoles = profile.roles.custom

  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const q = query.trim().toLowerCase()
  const full = selected.length >= MAX_ROLES
  const selHint = `${selected.length} of ${MAX_ROLES} selected`

  // ── The suggestion scene: which phase it is in, and how many "reading…" lines have appeared ──
  const [phase, setPhase] = useState('off') // 'off' | 'enter' | 'think' | 'results' | 'exit'
  const [step, setStep] = useState(0)
  const timers = useRef([])
  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }
  const later = (ms, fn) => timers.current.push(setTimeout(fn, ms))
  useEffect(() => clearTimers, []) // stop any timers if the student leaves the page

  // Same timings as the design: grow (0.6s), then one line every 0.65s, then the results.
  const startSuggest = () => {
    clearTimers()
    setPhase('enter')
    setStep(0)
    later(600, () => {
      setPhase('think')
      setStep(1)
    })
    ;[2, 3, 4].forEach((n, i) => later(600 + 650 * (i + 1), () => setStep(n)))
    later(600 + 650 * 4 + 300, () => setStep(5))
    later(600 + 650 * 4 + 900, () => setPhase('results'))
  }
  const exitSuggest = () => {
    clearTimers()
    setPhase('exit')
    later(600, () => {
      setPhase('off')
      setStep(0)
    })
  }
  const searchOn = phase === 'off' || phase === 'exit'

  // The four "reading your profile" lines, written from the student's own profile.
  const degrees = profile.cv.edu.map((e) => e.degree).join(', ')
  const orgs = profile.cv.exp.map((e) => e.org).join(' and ')
  const topValues = Object.entries(profile.values.ratings)
    .filter(([key]) => WORK_VALUES[key])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([key]) => WORK_VALUES[key][0])
  const aiLines = [
    `Reading your CV · ${degrees || 'your education'}`,
    `Looking at your ${orgs || 'work'} experience`,
    `Weighing your work values · ${topValues.join(', ') || 'Development, Using your abilities'}`,
    'Comparing with 4,200 UCL alumni',
  ]

  // Which roles to list: the popular ones when the box is empty, otherwise every match.
  // Matches on the role name come first, then matches on the sector, biggest alumni count first.
  let matches
  if (!q) {
    matches = POPULAR.slice(0, POPULAR_SHOWN).map((name) => ROLES.find((r) => r.name === name))
  } else {
    matches = ROLES.filter((r) => r.name.toLowerCase().includes(q) || r.sector.toLowerCase().includes(q)).sort((a, b) => {
      const aByName = a.name.toLowerCase().includes(q) ? 0 : 1
      const bByName = b.name.toLowerCase().includes(q) ? 0 : 1
      return aByName - bByName || b.alumni - a.alumni
    })
  }
  const allMatches = [...customRoles.filter((r) => !q || r.name.toLowerCase().includes(q)), ...matches]
  const shown = allMatches.slice(0, limit)

  const toggle = (name) => {
    if (selected.includes(name)) update('roles', { sel: selected.filter((x) => x !== name) })
    else if (!full) update('roles', { sel: [...selected, name] })
  }

  // Adds what the student typed as their own role (and picks it if there is room).
  const addCustom = () => {
    const typed = query.trim()
    if (!typed) return
    const name = typed.charAt(0).toUpperCase() + typed.slice(1, 40)
    const exists = ROLES.some((r) => r.name.toLowerCase() === name.toLowerCase()) || customRoles.some((r) => r.name === name)
    if (exists) return
    update('roles', {
      custom: [...customRoles, { name, sector: 'Your own', alumni: 0, sal: 0 }],
      sel: full ? selected : [...selected, name],
    })
    setQuery('')
  }

  const onContinue = () => {
    update('activeRoute', selected[0]) // the first role becomes the active Future Me route
    saveRoutes(selected) // also save them in the back end, where the fit scores and gaps are worked out
    navigate('/onboarding/values')
  }

  return (
    <Screen>
      <div className="flex flex-1 flex-col px-2">
        {/* While the agent is working (or showing results), Back closes the scene instead of leaving. */}
        <StepHeader step={5} onBack={searchOn ? undefined : exitSuggest} />

        {/* The title changes with the phase; "key" replays the fade-in each time */}
        <h1 key={searchOn ? 'off' : phase === 'results' ? 'res' : 'busy'} className="mt-6 pb-1 font-display text-[34px] leading-[1.1] font-normal" style={{ animation: 'larpIn .4s both' }}>
          {searchOn ? (
            <>
              Do you <em>know</em> your career path?
            </>
          ) : phase === 'results' ? (
            <>
              Roles that <em>fit</em> you
            </>
          ) : (
            <>
              Finding roles that <em>fit</em> you…
            </>
          )}
        </h1>

        {/* The search card folds away (grid rows 1fr -> 0fr) while the suggestion scene plays */}
        <div className="grid" style={{ gridTemplateRows: searchOn ? '1fr' : '0fr', transition: 'grid-template-rows .6s cubic-bezier(.4,0,.2,1)' }}>
          <div className="min-h-0 overflow-hidden">
            <div
              className="pt-5"
              style={{
                opacity: searchOn ? 1 : 0,
                transform: searchOn ? 'none' : 'translateY(40px)',
                transition: 'opacity .45s, transform .6s cubic-bezier(.4,0,.2,1)',
              }}
            >
              <div className="rounded-[24px] bg-sf p-5 shadow-ring">
                <div className="flex items-baseline justify-between gap-2.5">
                  <div className="font-display text-[22px]">Yes, I have a role in mind...</div>
                  <div className="text-[11px] whitespace-nowrap text-mute">{selHint}</div>
                </div>

                {/* Search box */}
                <label className="mt-3.5 flex h-[52px] items-center gap-2.5 rounded-2xl bg-sf2 px-4 text-[15px]">
                  <Icon name="search" size={20} className="flex-none text-mute" />
                  <input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      setLimit(PAGE_SIZE)
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && allMatches.length === 0 && addCustom()}
                    placeholder="Search roles or sectors"
                    className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-mute"
                  />
                  {q && (
                    <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-sf text-mute">
                      <SmallX />
                    </button>
                  )}
                </label>

                {/* The picked roles, as removable chips */}
                {selected.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {selected.map((name) => (
                      <span key={name} className="flex items-center gap-1.5 rounded-full bg-acc py-1.5 pr-2 pl-[11px] text-[12px] font-semibold text-acc-ink">
                        {name}
                        <button type="button" onClick={() => toggle(name)} aria-label={`Remove ${name}`} className="flex h-4 w-4 items-center justify-center rounded-full bg-black/15">
                          <SmallX size={9} strokeWidth={3} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-3.5 px-1 text-[11px] font-semibold tracking-[.06em] text-mute uppercase">
                  {q ? `${allMatches.length} match${allMatches.length === 1 ? '' : 'es'}` : 'Popular with UCL alumni'}
                </div>

                <div className="mt-1.5 flex flex-col gap-1 text-[15px]">
                  {shown.map((role) => (
                    <RoleRow key={role.name} role={role} query={q} on={selected.includes(role.name)} dim={full} onClick={() => toggle(role.name)} />
                  ))}

                  {allMatches.length === 0 && (
                    <>
                      <div className="px-1 pt-3.5 pb-1.5 text-[14px] text-mute">No roles found</div>
                      <button type="button" onClick={addCustom} className="flex items-center gap-1.5 px-1 py-2.5 text-left text-[13px] font-semibold text-acc">
                        <SmallPlus size={13} />
                        Add ‘{query.trim()}’ as my own role
                      </button>
                    </>
                  )}

                  {allMatches.length > limit && (
                    <button
                      type="button"
                      onClick={() => setLimit(limit + PAGE_SIZE)}
                      className="mt-1 flex items-center justify-center gap-1.5 border-t border-line px-1 pt-3 pb-1 text-[13px] font-semibold text-acc"
                    >
                      Show more ({allMatches.length - limit})
                      <Icon name="chevron-down" size={13} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </div>

              {/* "or" divider */}
              <div className="my-[18px] flex items-center gap-3 text-[13px] text-mute">
                <div className="h-px flex-1 bg-line" />
                or
                <div className="h-px flex-1 bg-line" />
              </div>
            </div>
          </div>
        </div>

        {/* Not sure? The agent suggests roles right here */}
        <div className={searchOn ? '' : 'mt-5'}>
          <SuggestCard
            phase={phase}
            step={step}
            lines={aiLines}
            suggestions={AI_SUGGESTIONS}
            selected={selected}
            full={full}
            selHint={selHint}
            onStart={startSuggest}
            onExit={exitSuggest}
            onToggle={toggle}
          />
        </div>
        <div className="h-4 flex-none" />

        {selected.length > 0 && (
          <StickyFooter>
            <PrimaryButton onClick={onContinue}>
              Continue with {selected.length} role{selected.length === 1 ? '' : 's'}
            </PrimaryButton>
          </StickyFooter>
        )}
      </div>
    </Screen>
  )
}

// One row in the role list. The part of the name (or sector) that matches the search is bold.
function RoleRow({ role, query, on, dim, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className="flex items-center justify-between gap-2.5 rounded-[14px] py-2.5 pr-2.5 pl-3 text-left transition-[box-shadow,opacity] select-none active:scale-[.985]"
      style={{
        background: on ? 'var(--sf)' : 'transparent',
        boxShadow: on ? '0 0 0 2px var(--acc)' : 'none',
        opacity: !on && dim ? 0.45 : 1,
      }}
    >
      <span className="min-w-0 flex-1 leading-[1.3]">
        <Highlight text={role.name} query={query} />
      </span>
      <span className="text-right text-[12px] leading-[1.35] whitespace-nowrap text-mute">
        {role.name.toLowerCase().includes(query) ? role.sector : <Highlight text={role.sector} query={query} ink />} ·{' '}
        {role.alumni ? `${role.alumni.toLocaleString('en-GB')} alumni` : 'Your own role'}
        <br />
        <b className="text-ink">{role.sal ? `£${role.sal}k` : '—'}</b> median start
      </span>
      <CheckCircle on={on} />
    </button>
  )
}

// Shows text with the searched part in bold.
function Highlight({ text, query, ink = false }) {
  const i = query ? text.toLowerCase().indexOf(query) : -1
  if (i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      <b className={ink ? 'text-ink' : ''}>{text.slice(i, i + query.length)}</b>
      {text.slice(i + query.length)}
    </>
  )
}
