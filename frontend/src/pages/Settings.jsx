// Screen 17 · Settings
//   App              Light / Dark and which notifications you get
//   About you        where you're from, relationship status, drinking and interests. Each has a
//                    "Use to filter" switch: when it's off, matching ignores that answer.
//   Tune your matches  career vs social balance, who you're looking for, group size, what counts...
//   Privacy          who can see you, incognito, read receipts...
//   Account          sign out and reset the demo
//
// Changes save as you go (into profile.settings and profile.interests). A small "Saved" tick shows
// in the top right, and changes that affect suggestions show a toast.
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import Screen from '../components/Screen.jsx'
import { BackButton } from '../components/StepHeader.jsx'
import { HobbyChip } from '../components/onboarding/HobbyChips.jsx'
import Sheet, { SheetOption, SheetSearch } from '../components/onboarding/Sheet.jsx'
import { COUNTRIES, DRINK, HOBBY_CATEGORIES, HOBBY_LIMIT, RELATIONSHIP, hobbyKey } from '../components/onboarding/options.js'
import { DEFAULT_SETTINGS } from '../components/profile/settingsDefaults.js'
import { useProfile } from '../profileStore.jsx'
import { useTheme } from '../theme.js'

const NOTIFICATIONS = [
  ['matches', 'Matches', 'New people on your routes'],
  ['messages', 'Messages', 'Replies and coffee-chat invites'],
  ['events', 'Events', 'Reminders and group updates'],
  ['roles', 'Roles', 'New roles matching your fit'],
]
const PRIVACY = [
  ['incognito', 'Incognito mode', 'Only people you like can see you'],
  ['active', 'Show active status', 'Let others see when you were last online'],
  ['receipts', 'Read receipts', 'Show when you have read messages'],
  ['hideCourse', 'Hide me from my coursemates', 'You will not appear to people on your programme'],
  ['verified', 'Only verified UCL emails', 'Hide profiles without a verified ucl.ac.uk address'],
]
// The three single-choice questions and their option lists.
const PICKERS = {
  from: { title: 'Where are you from?', options: COUNTRIES, search: true },
  rel: { title: 'Relationship status', options: RELATIONSHIP },
  drink: { title: 'Do you drink?', options: DRINK },
}

// An on/off switch.
function Toggle({ on, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className="relative h-[26px] w-[46px] flex-none rounded-full transition-colors duration-200"
      style={{ background: on ? 'var(--acc)' : 'var(--sf2)' }}
    >
      <span
        className="absolute top-[3px] left-[3px] h-5 w-5 rounded-full transition-[transform,background] duration-200"
        style={{ background: on ? 'var(--acc-ink)' : 'var(--mute)', transform: on ? 'translateX(20px)' : 'none' }}
      />
    </button>
  )
}

// A row of pill buttons. "on" says which are picked.
function Pills({ options, isOn, onPick }) {
  return (
    <div className="flex flex-wrap gap-1.5 text-[13px] font-semibold">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={isOn(o)}
          onClick={() => onPick(o)}
          className={`flex h-9 items-center rounded-full px-3.5 transition-colors duration-150 ${isOn(o) ? 'bg-acc text-acc-ink' : 'bg-sf2 text-ink'}`}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

const SectionLabel = ({ children }) => <div className="mt-[22px] flex-none px-1 text-[12px] font-semibold tracking-[.06em] text-mute uppercase">{children}</div>
const Card = ({ children }) => <div className="mt-2.5 flex-none overflow-hidden rounded-[20px] bg-sf shadow-ring">{children}</div>
// One setting with a title and pills underneath.
function PillRow({ title, children }) {
  return (
    <div className="flex flex-col gap-2.5 border-b border-line px-4 py-3.5">
      <div className="text-[14px]">{title}</div>
      {children}
    </div>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const { profile, update, reset } = useProfile()
  const [theme, changeTheme] = useTheme()
  const st = { ...DEFAULT_SETTINGS, ...profile.settings }
  const ints = profile.interests

  const [sheet, setSheet] = useState(null) // 'notif' | 'ints' | 'why' | 'from' | 'rel' | 'drink'
  const [query, setQuery] = useState('')
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState('')
  const timers = useRef([])

  // Show "Saved" for a moment, and a toast when suggestions will change.
  const flash = (tune) => {
    timers.current.forEach(clearTimeout)
    setSaved(true)
    if (tune) setToast('Your suggestions will update')
    timers.current = [setTimeout(() => setSaved(false), 1400), setTimeout(() => setToast(''), 2200)]
  }
  const save = (patch, tune = false) => {
    update('settings', { ...st, ...patch })
    flash(tune)
  }
  const flip = (group, key, tune = false) => save({ [group]: { ...st[group], [key]: !st[group][key] } }, tune)
  const toggleIn = (key, value) => save({ [key]: st[key].includes(value) ? st[key].filter((x) => x !== value) : [...st[key], value] }, true)

  const notifSummary = NOTIFICATIONS.filter(([k]) => st.notif[k]).map(([, label]) => label).join(', ') || 'Off'
  const balanceLabel = st.balance < 35 ? 'Mostly career' : st.balance > 65 ? 'Mostly social' : 'Balanced'

  // The four "About you" rows.
  const filters = [
    { k: 'from', label: 'Where are you from', value: COUNTRIES[ints.from], off: 'used for conversation starters only' },
    { k: 'rel', label: 'Relationship status', value: RELATIONSHIP[ints.rel], off: 'shown on your profile only' },
    { k: 'drink', label: 'Do you drink', value: DRINK[ints.drink], off: 'not used when matching' },
    { k: 'ints', label: 'Interests', value: `${ints.on.length} selected`, off: 'shown on your profile only' },
  ]

  // Interests sheet: switch a hobby on or off (matched by name, whatever the emoji).
  const isPicked = (name) => ints.on.some((n) => hobbyKey(n) === hobbyKey(name))
  const toggleHobby = (name) => {
    const on = isPicked(name) ? ints.on.filter((n) => hobbyKey(n) !== hobbyKey(name)) : [...ints.on, name]
    update('interests', { on })
    flash(true)
  }
  const known = HOBBY_CATEGORIES.flatMap((c) => c.items.map(hobbyKey))
  const ownHobbies = ints.on.filter((n) => !known.includes(hobbyKey(n))) // ones you typed yourself
  const hobbyGroups = [...(ownHobbies.length ? [{ name: 'Your own', items: ownHobbies }] : []), ...HOBBY_CATEGORIES]

  const picker = PICKERS[sheet]
  const q = query.trim().toLowerCase()

  const signOut = () => {
    update('signedIn', false)
    navigate('/')
  }
  const resetDemo = () => {
    reset()
    navigate('/')
  }

  return (
    <Screen>
      <div className="flex h-11 flex-none items-center justify-between pt-1">
        <BackButton onBack={() => navigate('/profile')} />
        <div className="text-[14px] text-mute">Settings</div>
        <div className="flex w-10 justify-end">
          {saved && (
            <div className="flex items-center gap-1 text-[12px] font-semibold text-acc" style={{ animation: 'larpIn .25s both' }}>
              <Icon name="check" size={14} strokeWidth={2.5} />
              Saved
            </div>
          )}
        </div>
      </div>

      {/* App */}
      <SectionLabel>App</SectionLabel>
      <Card>
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5 text-[14px]">
          <span>Appearance</span>
          <div className="flex h-[34px] rounded-full bg-sf2 p-[3px] text-[12px] font-semibold" role="group" aria-label="Appearance">
            {['light', 'dark'].map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={theme === t}
                onClick={() => {
                  changeTheme(t)
                  flash(false)
                }}
                className={`flex items-center rounded-full px-3.5 ${theme === t ? 'bg-acc text-acc-ink' : 'text-mute'}`}
              >
                {t === 'light' ? 'Light' : 'Dark'}
              </button>
            ))}
          </div>
        </div>
        <button type="button" onClick={() => setSheet('notif')} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-[14px]">
          <span>Notifications</span>
          <span className="text-right text-mute">{notifSummary} ›</span>
        </button>
      </Card>

      {/* About you */}
      <SectionLabel>
        About you <span className="font-medium tracking-normal normal-case">· used for matching</span>
      </SectionLabel>
      <Card>
        {filters.map((f) => (
          <div key={f.k} className="flex flex-col gap-1.5 border-b border-line px-4 py-3">
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setSheet(f.k)
              }}
              className="flex w-full items-center justify-between gap-2 text-left text-[14px]"
            >
              <span>{f.label}</span>
              <span className="text-right text-ink">{f.value} ›</span>
            </button>
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] leading-[1.4] text-mute">
                <span className="font-semibold text-ink">Use to filter</span> · {st.filt[f.k] ? 'On · only people who match are suggested' : `Off · ${f.off}`}
              </div>
              <Toggle on={st.filt[f.k]} onChange={() => flip('filt', f.k, true)} label={`Use ${f.label.toLowerCase()} to filter`} />
            </div>
          </div>
        ))}
        <div className="px-4 pt-3 pb-3.5">
          <div className="mb-2 text-[14px]">Anything else we should know?</div>
          <div className="min-h-16 rounded-[14px] bg-sf2 px-3.5 py-2.5">
            <textarea
              value={ints.note}
              placeholder={'Anything else we should know? e.g. "New to London, looking for a Sunday football group."'}
              onChange={(e) => update('interests', { note: e.target.value })}
              onBlur={() => flash(false)}
              className="block min-h-14 w-full resize-none border-none bg-transparent p-0 text-[14px] leading-normal text-ink outline-none placeholder:text-mute"
            />
          </div>
        </div>
      </Card>

      {/* Tune your matches */}
      <SectionLabel>Tune your matches</SectionLabel>
      <Card>
        <div className="border-b border-line px-4 py-3.5">
          <div className="flex items-center justify-between text-[14px]">
            <span>Career vs Social balance</span>
            <span className="text-[12px] font-semibold text-acc">{balanceLabel}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={st.balance}
            aria-label="Career vs Social balance"
            onChange={(e) => save({ balance: Number(e.target.value) }, true)}
            className="mt-1.5 h-7 w-full accent-[#993BFF]"
          />
          <div className="flex justify-between text-[11px] text-mute">
            <span>Mostly career</span>
            <span>Mostly social</span>
          </div>
          <div className="mt-1.5 text-[11px] leading-[1.4] text-mute">Changes what Home and People show first.</div>
        </div>
        <PillRow title="Looking for">
          <Pills options={['Friends', 'Study buddies', 'Mentors', 'Co-founders', 'Internship referrals', 'Flatmates', 'Gym partners']} isOn={(o) => st.lookFor.includes(o)} onPick={(o) => toggleIn('lookFor', o)} />
        </PillRow>
        <PillRow title="Year of study">
          <Pills options={['1st', '2nd', '3rd', '4th+', 'Masters', 'PhD', 'Alumni']} isOn={(o) => st.years.includes(o)} onPick={(o) => toggleIn('years', o)} />
        </PillRow>
        <PillRow title="People you see">
          <Pills options={['Students', 'Alumni', 'Same programme', 'Other UCL schools']} isOn={(o) => st.people.includes(o)} onPick={(o) => toggleIn('people', o)} />
        </PillRow>
        <PillRow title="Preferred group size">
          <Pills options={['1:1', '3', '6', '8+']} isOn={(o) => st.sizes.includes(o)} onPick={(o) => toggleIn('sizes', o)} />
        </PillRow>
        <div className="border-b border-line py-1.5">
          <div className="px-4 pt-2 pb-1 text-[14px]">Match on</div>
          {Object.keys(st.match).map((k) => (
            <div key={k} className="flex items-center justify-between gap-3 px-4 py-2 text-[13px]">
              <span>{k === 'Location' ? 'Location (UCL East or Bloomsbury)' : k}</span>
              <Toggle on={st.match[k]} onChange={() => flip('match', k, true)} label={`Match on ${k}`} />
            </div>
          ))}
        </div>
        <PillRow title="When you are free">
          <Pills options={['Weekday mornings', 'Weekday evenings', 'Weekends', 'Between lectures']} isOn={(o) => st.avail.includes(o)} onPick={(o) => toggleIn('avail', o)} />
        </PillRow>
        <PillRow title="Show me events">
          <Pills options={['Only careers', 'Mostly careers', 'Balanced', 'Mostly social']} isOn={(o) => st.events === o} onPick={(o) => save({ events: o }, true)} />
        </PillRow>
        <button type="button" onClick={() => setSheet('why')} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-[14px] font-semibold text-acc">
          <span className="flex items-center gap-2">
            <InfoIcon />
            Why am I seeing this?
          </span>
          <span>›</span>
        </button>
      </Card>
      <button
        type="button"
        onClick={() => save({ balance: DEFAULT_SETTINGS.balance, people: DEFAULT_SETTINGS.people, sizes: DEFAULT_SETTINGS.sizes, match: DEFAULT_SETTINGS.match, events: DEFAULT_SETTINGS.events }, true)}
        className="mt-2.5 flex h-[46px] flex-none items-center justify-center rounded-full border-[1.5px] border-acc text-[14px] font-semibold text-acc"
      >
        Reset to recommended
      </button>

      {/* Privacy */}
      <SectionLabel>Privacy</SectionLabel>
      <Card>
        <PillRow title="Who can see your profile, photos and links">
          <Pills options={['Everyone at UCL', 'Connections', 'Nobody']} isOn={(o) => st.vis === o} onPick={(o) => save({ vis: o })} />
        </PillRow>
        {PRIVACY.map(([k, label, sub]) => (
          <div key={k} className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5 text-[14px]">
            <div>
              <div>{label}</div>
              <div className="mt-0.5 text-[11px] text-mute">{sub}</div>
            </div>
            <Toggle on={st.priv[k]} onChange={() => flip('priv', k)} label={label} />
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 text-[14px]">
          <div>
            <div>Show me in Going together posts</div>
            <div className="mt-0.5 text-[11px] text-mute">Your avatar appears in group spots you join.</div>
          </div>
          <Toggle on={st.showGT} onChange={() => save({ showGT: !st.showGT })} label="Show me in Going together posts" />
        </div>
      </Card>

      {/* Account */}
      <SectionLabel>Account</SectionLabel>
      <Card>
        <button type="button" onClick={signOut} className="flex w-full items-center justify-between gap-3 border-b border-line px-4 py-3.5 text-left text-[14px]">
          <span>Sign out</span>
          <span className="truncate text-mute">{profile.email || `${profile.firstName.toLowerCase()}@ucl.ac.uk`}</span>
        </button>
        <button type="button" onClick={resetDemo} className="flex w-full items-center justify-between px-4 py-3.5 text-left text-[14px]">
          <span className="text-acc">Reset demo</span>
          <span className="text-[12px] text-mute">Clears your answers</span>
        </button>
      </Card>

      <div className="mt-4 text-center text-[11px] leading-normal text-mute">
        Changes save as you go. Matching never uses your relationship status or drinking answers unless you turn their filters on.
      </div>

      {/* Sheets */}
      {sheet === 'notif' && (
        <Sheet title="Notifications" onClose={() => setSheet(null)} maxHeight="60%">
          <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-5">
            {NOTIFICATIONS.map(([k, label, sub]) => (
              <div key={k} className="flex items-center justify-between gap-3 border-b border-line py-3">
                <div>
                  <div className="text-[14px]">{label}</div>
                  <div className="mt-0.5 text-[12px] text-mute">{sub}</div>
                </div>
                <Toggle on={st.notif[k]} onChange={() => flip('notif', k)} label={`${label} notifications`} />
              </div>
            ))}
          </div>
        </Sheet>
      )}

      {picker && (
        <Sheet title={picker.title} onClose={() => setSheet(null)} maxHeight="72%">
          {picker.search && <SheetSearch value={query} onChange={setQuery} placeholder="Search countries" />}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5">
            {picker.options
              .map((label, i) => ({ label, i }))
              .filter(({ label }) => !q || label.toLowerCase().includes(q))
              .map(({ label, i }) => (
                <SheetOption
                  key={label}
                  label={label}
                  selected={ints[sheet] === i}
                  onPick={() => {
                    update('interests', { [sheet]: i })
                    setSheet(null)
                    flash(false)
                  }}
                />
              ))}
            {picker.options.every((label) => q && !label.toLowerCase().includes(q)) && <div className="px-0.5 py-[18px] text-[14px] text-mute">No matches — try a different spelling.</div>}
          </div>
        </Sheet>
      )}

      {sheet === 'ints' && (
        <Sheet title="Interests" onClose={() => setSheet(null)} maxHeight="72%">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5">
            <div className="pb-1 text-[12px] text-mute">
              {ints.on.length} selected · up to {HOBBY_LIMIT}
            </div>
            {hobbyGroups.map((g) => (
              <div key={g.name} className="flex flex-col gap-2.5 border-b border-line pt-2.5 pb-3.5">
                <div className="text-[14px] font-bold">{g.name}</div>
                <div className="flex flex-wrap gap-2">
                  {g.items.map((name) => {
                    const on = isPicked(name)
                    return <HobbyChip key={name} name={name} on={on} locked={!on && ints.on.length >= HOBBY_LIMIT} onToggle={() => toggleHobby(name)} />
                  })}
                </div>
              </div>
            ))}
          </div>
        </Sheet>
      )}

      {sheet === 'why' && (
        <Sheet title="Why am I seeing this?" onClose={() => setSheet(null)} maxHeight="72%">
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pb-2.5 text-[14px] leading-[1.55]">
            <p>
              <b>Career vs Social balance</b> sets the order of sections on Home and which People tab opens first.
            </p>
            <p>
              <b>People you see</b> limits swipe cards and “People on your routes” to those groups.
            </p>
            <p>
              <b>Preferred group size</b> ranks Going-together posts with those sizes higher.
            </p>
            <p>
              <b>Match on</b> chooses which profile signals count towards a match percentage.
            </p>
            <p>
              <b>Show me events</b> filters Featured and Upcoming by category.
            </p>
            <p className="text-[13px] text-mute">Nothing here changes what others see about you — that’s under Privacy.</p>
          </div>
        </Sheet>
      )}

      {toast && (
        <div className="fixed bottom-10 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-cta px-4 py-2.5 text-[13px] font-semibold whitespace-nowrap text-cta-ink shadow-[0_10px_30px_rgba(20,8,40,.35)]" style={{ animation: 'larpIn .3s both' }}>
          {toast}
        </div>
      )}
    </Screen>
  )
}

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  )
}
