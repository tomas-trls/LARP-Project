// Screen 16 · Profile: who you are, your saved career routes, badges and settings.
// The Light / Dark switch really changes the app's theme (see src/theme.js).
// Tapping a route chip makes it your one active route, which drives Home and Opportunities.
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import Screen from '../components/Screen.jsx'
import { RoundButton } from '../components/people/parts.jsx'
import { BackButton } from '../components/StepHeader.jsx'
import { AREAS, gapFor } from '../data/careerData.js'
import { CONNECTION_TOTAL, joinedList } from '../data/people.js'
import { useProfile } from '../profileStore.jsx'
import { useTheme } from '../theme.js'

export default function Profile() {
  const navigate = useNavigate()
  const { profile, update, reset } = useProfile()
  const [theme, changeTheme] = useTheme()

  const { firstName, lastName, cv } = profile
  const societies = joinedList(profile)
  const routes = profile.roles.sel.length ? profile.roles.sel : [profile.activeRoute]
  const active = routes.includes(profile.activeRoute) ? profile.activeRoute : routes[0]

  // Education line: "MSc Business Analytics · UCL School of Management · BSc Computer Science, Warwick"
  const eduLine = cv.edu
    .map((e, i) => (i === 0 ? `${e.degree} · ${e.inst}` : `${e.degree}, ${e.inst.replace('University of ', '')}`))
    .join(' · ')

  // The gap ring shows your first picked career area (screens 08 and 09).
  const allAreas = [...AREAS, ...profile.areas.custom]
  const area = allAreas.find((a) => profile.areas.on.includes(a.id))
  const gap = area ? gapFor(area, Math.max(0, profile.areas.custom.findIndex((c) => c.id === area.id))) : null
  const fit = gap ? gap.fit : 0

  // Badges: your first two societies, plus one for showing up to socials.
  const badges = [
    ...societies.slice(0, 2).map((n) => ({ label: n.replace(/ (Society|Club)$/, ''), icon: 'flag', social: false })),
    { label: 'Quiz regular', icon: 'person', social: true },
  ]

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
      <div className="flex flex-none items-center justify-between pt-1">
        <BackButton onBack={() => navigate('/home')} />
        <div className="text-[14px] text-mute">Profile</div>
        <RoundButton label="Switch light or dark" onClick={() => changeTheme(theme === 'dark' ? 'light' : 'dark')}>
          <Icon name="sun" size={20} />
        </RoundButton>
      </div>

      {/* Photo, name and education */}
      <div className="mt-3.5 flex flex-none items-center gap-4 px-1">
        <div className="stripes-light h-[76px] w-[76px] flex-none rounded-full shadow-[0_0_0_3px_var(--bg),0_0_0_5px_var(--acc)]" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[26px] leading-[1.1] font-normal">
            {firstName} {lastName}
          </h1>
          <div className="mt-1 text-[13px] leading-[1.4] text-mute">{eduLine}</div>
          <div className="mt-1.5 text-[13px] leading-[1.4]">Moving into {active.toLowerCase()} roles</div>
        </div>
      </div>

      {/* Three numbers */}
      <div className="mt-4 grid flex-none grid-cols-3 gap-2">
        {[
          [7 + profile.going.length, 'events attended'],
          [CONNECTION_TOTAL + (profile.accepted ?? []).length, 'connections'],
          [societies.length, 'societies'],
        ].map(([n, label]) => (
          <div key={label} className="rounded-2xl bg-sf p-3 text-center shadow-ring">
            <div className="text-[20px] font-semibold">{n}</div>
            <div className="text-[11px] text-mute">{label}</div>
          </div>
        ))}
      </div>

      {/* Target career: saved routes (tap one to make it active) and the gap ring */}
      <div className="mt-3.5 flex-none rounded-3xl bg-hero px-5 py-[18px] text-hero-ink">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold tracking-[.08em] uppercase opacity-85">Target career</div>
          <div className="text-[12px] opacity-90">
            {routes.length} route{routes.length === 1 ? '' : 's'} saved
          </div>
        </div>
        <div className="no-scrollbar mt-2.5 flex gap-1.5 overflow-x-auto text-[12px] whitespace-nowrap">
          {routes.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => update('activeRoute', r)}
              className={`flex-none rounded-full px-3 py-[7px] ${r === active ? 'bg-white font-semibold text-plum' : 'bg-white/20'}`}
            >
              {r}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => navigate('/gaps')} className="mt-3.5 flex w-full items-center gap-3.5 text-left">
          <div
            className="flex h-14 w-14 flex-none items-center justify-center rounded-full"
            style={{ background: `conic-gradient(#FFFFFF 0 ${fit}%, rgba(255,255,255,.25) ${fit}% 100%)` }}
          >
            <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-hero text-[12px] font-semibold">{fit}%</div>
          </div>
          <div className="flex-1 text-[13px] leading-[1.45]">
            {gap
              ? `Gap summary for ${area.title.toLowerCase()}: ${gap.gap.toLowerCase()}. Next — ${gap.next}.`
              : 'Pick a career area to see your gap summary.'}
          </div>
          <Icon name="chevron-right" size={18} />
        </button>
      </div>

      {/* Badges */}
      <div className="mt-4 flex items-baseline justify-between px-1">
        <h2 className="font-display text-[20px] font-normal">Badges</h2>
        <div className="text-[13px] text-mute">All ›</div>
      </div>
      <div className="no-scrollbar mt-2.5 flex flex-none gap-2 overflow-x-auto">
        {badges.map((b) => (
          <div key={b.label} className="flex flex-none items-center gap-2 rounded-full bg-sf py-2 pr-3 pl-2 text-[12px] font-semibold shadow-ring">
            <span className={`flex h-[26px] w-[26px] items-center justify-center rounded-full bg-sf2 ${b.social ? 'text-blue' : 'text-acc'}`}>
              <Icon name={b.icon} size={14} />
            </span>
            {b.label}
          </div>
        ))}
      </div>

      {/* Settings */}
      <div className="mt-4 flex-none overflow-hidden rounded-[20px] bg-sf shadow-ring">
        <div className="flex items-center justify-between border-b border-line px-4 py-3 text-[14px]">
          <span>Appearance</span>
          <div className="flex h-[34px] rounded-full bg-sf2 p-[3px] text-[12px] font-semibold" role="group" aria-label="Appearance">
            {['light', 'dark'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => changeTheme(t)}
                aria-pressed={theme === t}
                className={`flex items-center rounded-full px-3.5 ${theme === t ? 'bg-acc text-acc-ink' : 'text-mute'}`}
              >
                {t === 'light' ? 'Light' : 'Dark'}
              </button>
            ))}
          </div>
        </div>
        <SettingRow label="Connection style" value={`${profile.connectionStyle} ›`} />
        <SettingRow label="Notifications" value="Matches, messages, events, roles ›" />
        <button type="button" onClick={signOut} className="flex w-full items-center justify-between border-b border-line px-4 py-3.5 text-left text-[14px]">
          <span>Sign out</span>
          <span className="text-mute">{profile.email || `${firstName.toLowerCase()}@ucl.ac.uk`}</span>
        </button>
        <button type="button" onClick={resetDemo} className="flex w-full items-center justify-between px-4 py-3.5 text-left text-[14px]">
          <span className="text-acc">Reset demo</span>
          <span className="text-[12px] text-mute">Clears your answers</span>
        </button>
      </div>
    </Screen>
  )
}

function SettingRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5 text-[14px]">
      <span>{label}</span>
      <span className="truncate text-mute">{value}</span>
    </div>
  )
}
