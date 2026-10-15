// 07a · Do you know your career path? (onboarding step 5 of 6)
// The student searches a catalogue of roles and picks up to 3. If a role is missing they can add
// their own. If they are not sure, the purple card sends them to rate work values instead.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle, SmallPlus, SmallX, StickyFooter } from '../components/career/bits.jsx'
import ThinkingMascot from '../components/career/ThinkingMascot.jsx'
import Icon from '../components/Icon.jsx'
import Screen from '../components/Screen.jsx'
import StepHeader from '../components/StepHeader.jsx'
import { PrimaryButton } from '../components/ui.jsx'
import { MAX_ROLES, POPULAR, ROLES } from '../data/careerData.js'
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

  // Which roles to list: the popular ones when the box is empty, otherwise every match.
  // Matches on the role name come first, then matches on the sector, biggest alumni count first.
  let matches
  if (!q) {
    matches = POPULAR.map((name) => ROLES.find((r) => r.name === name))
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
    navigate('/onboarding/values')
  }

  return (
    <Screen>
      <div className="flex flex-1 flex-col px-2">
        <StepHeader step={5} />

        <h1 className="mt-7 font-display text-[34px] leading-[1.1] font-normal">
          Do you <em>know</em> your career path?
        </h1>

        <div className="mt-6 rounded-[24px] bg-sf p-5 shadow-ring">
          <div className="flex items-baseline justify-between gap-2.5">
            <div className="font-display text-[22px]">Yes, I have a role in mind...</div>
            <div className="text-[11px] whitespace-nowrap text-mute">
              {selected.length} of {MAX_ROLES} selected
            </div>
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

        {/* Not sure? Rate work values and get suggested routes */}
        <Link to="/onboarding/values" className="flex items-center gap-4 rounded-[24px] bg-hero p-5 text-hero-ink transition-transform active:scale-[.985]">
          <ThinkingMascot />
          <div className="flex-1">
            <div className="font-display text-[22px] leading-[1.15]">
              Not sure yet? <em>Suggest</em> routes for me.
            </div>
            <div className="mt-1 text-[13px] opacity-90">An agent reads your profile and proposes routes with reasons.</div>
          </div>
          <Icon name="chevron-right" size={18} />
        </Link>

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
