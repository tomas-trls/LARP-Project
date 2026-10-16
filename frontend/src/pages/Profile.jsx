// Screen 16 · Profile: who you are, your photos, your career route, badges, plans and memories.
//
//   - Photos: three slots, the first is your avatar everywhere (see components/profile/Photos.jsx)
//   - "booked" and "attended" open your Plans and Memories
//   - Target career: tap a route to make it your active one; the ring opens "Your progress"
//   - The gear opens Settings (17), where Appearance, Sign out and Reset demo now live
//
// /profile?memory=m2 opens that memory straight away (used by the "How was it?" prompts).
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import Screen from '../components/Screen.jsx'
import { BackButton } from '../components/StepHeader.jsx'
import { DEFAULT_PHOTO } from '../components/messages/avatar.js'
import { COUNTRIES } from '../components/onboarding/options.js'
import Sheet from '../components/onboarding/Sheet.jsx'
import Photos from '../components/profile/Photos.jsx'
import { MemoriesPage, MemoryPage, MemoryStack, PlanCard, PlansPage, RowHeading } from '../components/profile/PlansMemories.jsx'
import { memoryView, planList } from '../components/profile/planData.js'
import ProgressView from '../components/profile/ProgressView.jsx'
import { AREAS, GAPS, gapFor } from '../data/careerData.js'
import { BADGES, FIT_AT_START, MEMORIES, PROMPT_MEMORY } from '../data/memories.js'
import { useProfile } from '../profileStore.jsx'

const NO_MEMORY_EDITS = { photos: {}, notes: {}, rewarded: [], promptDone: false }

export default function Profile() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { profile, update } = useProfile()

  const photos = profile.photos ?? [DEFAULT_PHOTO]
  const myPhoto = photos[0]
  const saved = { ...NO_MEMORY_EDITS, ...profile.memories } // your own photos and notes on memories
  const xp = profile.xp ?? 340

  const [view, setView] = useState(null) // null | 'plans' | 'mems' | 'progress'
  const [memIndex, setMemIndex] = useState(0) // which polaroid is on top
  const [badgesOpen, setBadgesOpen] = useState(false)
  const [toast, setToast] = useState('')
  const openMemory = params.get('memory') // the memory page is in the address, so the back button works
  const [grow, setGrow] = useState(false) // the memory page grows out of the polaroid when opened from the stack

  const showMemory = (id, fromStack = false) => {
    setGrow(fromStack)
    setParams({ memory: id })
  }
  const closeMemory = () => setParams({})

  // XP for small actions, with a toast at the bottom.
  const addXp = (points, message) => {
    update('xp', xp + points)
    setToast(message)
    setTimeout(() => setToast(''), 2200)
  }

  const { firstName, lastName, cv } = profile
  const routes = profile.roles.sel.length ? profile.roles.sel : [profile.activeRoute]
  const active = routes.includes(profile.activeRoute) ? profile.activeRoute : routes[0]

  // "MSc Business Analytics · UCL School of Management · BSc Computer Science, Warwick"
  const eduLine = cv.edu.map((e, i) => (i === 0 ? `${e.degree} · ${e.inst}` : `${e.degree}, ${e.inst.replace('University of ', '')}`)).join(' · ')
  const country = COUNTRIES[profile.interests.from] ?? 'United Kingdom'

  // The gap ring shows your first picked career area (screens 08 and 09).
  const allAreas = [...AREAS, ...profile.areas.custom]
  const pickedAreas = allAreas.filter((a) => profile.areas.on.includes(a.id))
  const area = pickedAreas[0]
  const gap = area ? gapFor(area, Math.max(0, profile.areas.custom.findIndex((c) => c.id === area.id))) : GAPS.prod
  const fit = gap.fit
  // Your progress compares against up to two areas that have alumni data.
  const progressAreas = (pickedAreas.length ? pickedAreas : AREAS.slice(0, 2)).filter((a) => GAPS[a.id]).slice(0, 2)

  const plans = planList()
  const memories = MEMORIES.map((m) => memoryView(m, saved))
  const attended = memories.filter((m) => m.status === 'Attended')
  const earned = BADGES.filter((b) => b.done)

  return (
    <Screen>
      <div className="flex flex-none items-center justify-between pt-1">
        <BackButton onBack={() => navigate('/home')} />
        <div className="text-[14px] text-mute">Profile</div>
        <button type="button" onClick={() => navigate('/settings')} aria-label="Settings" className="flex h-10 w-10 items-center justify-center rounded-full bg-sf text-ink shadow-ring">
          <GearIcon />
        </button>
      </div>

      {/* Photo, name and education */}
      <div className="mt-3.5 flex flex-none items-center gap-4 px-1">
        <div className="h-[76px] w-[76px] flex-none rounded-full shadow-[0_0_0_3px_var(--bg),0_0_0_5px_var(--acc)]" style={{ background: myPhoto ? `url(${myPhoto}) center/cover` : 'repeating-linear-gradient(135deg,#DDBDFF 0 5px,#BA82FF 5px 10px)' }} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[26px] leading-[1.1] font-normal">
            {firstName} {lastName}
          </h1>
          <div className="mt-1 text-[13px] leading-[1.4] text-mute">{eduLine}</div>
          <div className="mt-1.5 text-[13px] leading-[1.4]">
            From {country} · moving into {active.toLowerCase()}
          </div>
        </div>
      </div>

      <Photos photos={photos} onChange={(list) => update('photos', list)} onFull={() => addXp(30, '+30 XP · Photo-ready badge earned')} />

      {/* Three numbers: booked opens Plans, attended opens Memories */}
      <div className="mt-4 grid flex-none grid-cols-3 gap-2">
        {[
          [plans.length, 'booked', () => setView('plans')],
          [attended.length, 'attended', () => setView('mems')],
          [127 + (profile.accepted ?? []).length, 'connections', () => navigate('/connections')],
        ].map(([n, label, onClick]) => (
          <button key={label} type="button" onClick={onClick} className="rounded-2xl bg-sf p-3 text-center shadow-ring">
            <div className="text-[20px] font-semibold">{n}</div>
            <div className="text-[11px] text-mute">{label}</div>
          </button>
        ))}
      </div>

      {/* Target career */}
      <div className="mt-3.5 flex-none rounded-3xl bg-hero px-5 py-[18px] text-hero-ink">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold tracking-[.08em] uppercase opacity-85">Target career</div>
          <div className="text-[12px] opacity-90">
            {routes.length} route{routes.length === 1 ? '' : 's'} saved
          </div>
        </div>
        <div className="no-scrollbar -mx-5 mt-2.5 flex gap-1.5 overflow-x-auto px-5 text-[12px] whitespace-nowrap">
          {routes.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => update('activeRoute', r)}
              className={`flex-none rounded-full px-3 py-[7px] ${r === active ? 'bg-white font-semibold text-plum' : 'bg-white/18'}`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="mt-3.5 flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => setView('progress')}
            aria-label="Open your progress"
            className="flex h-14 w-14 flex-none items-center justify-center rounded-full"
            style={{ background: `conic-gradient(#FFFFFF 0 ${fit}%, rgba(255,255,255,.25) ${fit}% 100%)` }}
          >
            <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-hero text-[12px] font-semibold">{fit}%</div>
          </button>
          <div className="flex-1 text-[13px] leading-[1.45]">
            Gap summary: 1 of 3 steps done · <b>▲{fit - FIT_AT_START}%</b> since you started. Next — request a SoM practice interview.
          </div>
          <button type="button" onClick={() => setView('progress')} aria-label="Open your progress" className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white/18">
            <Icon name="chevron-right" size={16} />
          </button>
        </div>
      </div>

      {/* Badges */}
      <div className="mt-4 flex flex-none items-baseline justify-between px-1">
        <h2 className="font-display text-[20px] font-normal">Badges</h2>
        <button type="button" onClick={() => setBadgesOpen(true)} className="text-[13px] text-mute">
          All ›
        </button>
      </div>
      <div className="no-scrollbar -mx-4 mt-2.5 flex flex-none gap-2 overflow-x-auto px-4">
        {earned.map((b) => (
          <BadgePill key={b.name} badge={b} />
        ))}
      </div>

      {/* Plans */}
      <RowHeading title="Plans" sub="upcoming" onOpen={() => setView('plans')} />
      <div className="no-scrollbar -mx-4 mt-3 flex flex-none snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pt-1 pb-2">
        {plans.map((p) => (
          <PlanCard key={p.key} plan={p} myPhoto={myPhoto} />
        ))}
      </div>

      {/* Memories */}
      <RowHeading title="Memories" sub="past events" onOpen={() => setView('mems')} />
      {!saved.promptDone && (
        <div className="mt-3 flex flex-none items-center gap-3 rounded-[18px] bg-sf2 px-3.5 py-3">
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold">How was {PROMPT_MEMORY.eventTitle}?</div>
            <div className="mt-0.5 text-[12px] text-mute">Add a photo or a note · +10 XP</div>
          </div>
          <button
            type="button"
            onClick={() => {
              update('memories', { ...saved, promptDone: true })
              showMemory(PROMPT_MEMORY.id)
            }}
            className="flex h-[34px] flex-none items-center rounded-full bg-cta px-3.5 text-[12px] font-semibold text-cta-ink"
          >
            Add
          </button>
          <button type="button" onClick={() => update('memories', { ...saved, promptDone: true })} aria-label="Dismiss" className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full text-mute">
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
      <MemoryStack memories={attended} index={Math.min(memIndex, attended.length - 1)} setIndex={setMemIndex} onOpen={(id) => showMemory(id, true)} myPhoto={myPhoto} />

      <div className="mt-6 text-center text-[11px] text-mute">Level {xp >= 500 ? '5 · Connector' : '4 · Explorer'} · {xp % 500}/500 XP</div>

      {/* Full-screen views */}
      {view === 'plans' && <PlansPage plans={plans} memories={memories} myPhoto={myPhoto} onBack={() => setView(null)} onOpenMemory={(id) => showMemory(id)} />}
      {view === 'mems' && <MemoriesPage memories={memories} onBack={() => setView(null)} onOpenMemory={(id) => showMemory(id)} />}
      {view === 'progress' && <ProgressView areas={progressAreas} fit={fit} onBack={() => setView(null)} onRequest={() => addXp(20, '+20 XP · practice interview requested')} />}
      {openMemory && MEMORIES.some((m) => m.id === openMemory) && (
        <MemoryPage
          key={openMemory}
          id={openMemory}
          saved={saved}
          grow={grow}
          myPhoto={myPhoto}
          onSave={(patch) => update('memories', { ...saved, ...patch })}
          onBack={closeMemory}
          onXp={addXp}
        />
      )}

      {badgesOpen && (
        <Sheet title="Badges" onClose={() => setBadgesOpen(false)} maxHeight="75%">
          <div className="px-5 pb-2 text-[13px] text-mute">
            {earned.length} of {BADGES.length} earned
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto px-5 pb-2">
            {BADGES.map((b) => (
              <div key={b.name} className={`flex items-center gap-2.5 rounded-2xl p-2.5 shadow-ring ${b.done ? 'bg-bg' : 'opacity-60'}`}>
                <div
                  className={`flex h-9 w-9 flex-none items-center justify-center rounded-full ${b.done ? 'bg-sf2 text-acc' : 'border-[1.5px] border-dashed border-mute text-mute'}`}
                >
                  <Icon name={b.icon ?? 'check'} size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] leading-tight font-semibold">{b.name}</div>
                  <div className="mt-0.5 text-[11px] leading-tight text-mute">{b.done ? 'Earned' : `${b.how} · ${b.prog}`}</div>
                </div>
              </div>
            ))}
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

// One badge: a pill with a round icon. Social badges have a blue icon.
function BadgePill({ badge }) {
  return (
    <div className="flex flex-none items-center gap-2 rounded-full bg-sf py-2 pr-3 pl-2 text-[12px] font-semibold shadow-ring">
      <span className={`flex h-[26px] w-[26px] items-center justify-center rounded-full bg-sf2 ${badge.social ? 'text-blue' : 'text-acc'}`}>
        <Icon name={badge.icon} size={14} />
      </span>
      {badge.name}
    </div>
  )
}

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  )
}
