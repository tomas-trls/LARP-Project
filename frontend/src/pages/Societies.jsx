// Screen 14 · Societies (design v4).
//
// Top to bottom:
//   - Search box: searches the real list of 472 UCL student groups (Sample data/Student groups.xlsx)
//   - A sideways carousel: society of the week, a taster session, elections
//   - Your societies, Roles for you (committee roles), Ranked by fit to your profile
//   - This week across your societies, Membership, and "Can't find one? Start a society"
// Tapping a society opens its own page (components/societies/SocietyPage.jsx).
// Join, apply, memberships, start and vote open panels from the bottom (components/societies/SocietySheets.jsx).
//
// What the student does here is saved in profile.societyState (see DEFAULT_STATE below), and the
// names of the societies they belong to are kept in profile.societies, which Profile and People also read.
// Payment is pretend and nothing is sent anywhere.
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import Screen from '../components/Screen.jsx'
import SocietyPage from '../components/societies/SocietyPage.jsx'
import { ApplySheet, JoinSheet, ManageSheet, StartSheet, VoteSheet } from '../components/societies/SocietySheets.jsx'
import { OwnCard, Pill, RankedRow, RoleCard, SectionHead, SlideCard, SnapRow, WeekRow } from '../components/societies/parts.jsx'
import { DEFAULT_PHOTO } from '../components/messages/avatar.js'
import { CANDIDATES, OTHER_MEMBERSHIPS, ROLES, SOCIETIES, THIS_WEEK, personColor, personName } from '../data/societies14.js'
import { syncSociety } from '../live.js'
import { useProfile } from '../profileStore.jsx'
import { societies as ALL_GROUPS } from '../sampleData.js'

// What's saved about this screen. Ids refer to SOCIETIES / ROLES in data/societies14.js.
const DEFAULT_STATE = {
  joined: [], // societies joined here (ids)
  applied: [], // roles applied or signed up for (ids)
  votes: {}, // society id -> index of the candidate voted for
  renewed: [], // memberships renewed (ids)
  tickets: [], // "This week" events booked (row numbers)
  tried: false, // booked the bouldering taster from the carousel
}

export default function Societies() {
  const { profile, update } = useProfile()
  const saved = { ...DEFAULT_STATE, ...profile.societyState }
  const save = (patch) => update('societyState', { ...saved, ...patch })
  const myPhoto = profile.photos?.[0] ?? DEFAULT_PHOTO

  // Things that only matter while the screen is open.
  const [query, setQuery] = useState('') // the search box
  const [slide, setSlide] = useState(0) // which carousel card is showing (for the dots)
  const [pageId, setPageId] = useState(null) // the society page that's open, if any
  const [tab, setTab] = useState('About')
  const [sheet, setSheet] = useState(null) // { kind: 'join' | 'apply' | 'manage' | 'start' | 'vote', id }
  const [cardId, setCardId] = useState(null) // the membership card showing in the Manage sheet
  const [form, setForm] = useState({}) // the role application answers
  const [picked, setPicked] = useState(undefined) // the candidate picked in the vote sheet
  const [pop, setPop] = useState(null) // the society card that just joined (it bounces in)
  const [toast, setToast] = useState('') // "+20 XP · joined FinTech"
  // The XP message disappears after 2.2 seconds, and the bounce ends after 0.7 seconds.
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2200)
    return () => clearTimeout(t)
  }, [toast])
  // When a society is joined, scroll "Your societies" back to the start so its new card is seen bouncing in.
  const ownRow = useRef(null)
  useEffect(() => {
    if (!pop) return
    ownRow.current?.scrollTo({ left: 0, behavior: 'smooth' })
    const t = setTimeout(() => setPop(null), 700)
    return () => clearTimeout(t)
  }, [pop])

  // A short message at the top, like the design's XP reward.
  const xp = (points, message) => setToast(`+${points} XP · ${message}`)

  const isMember = (soc) => soc.member || saved.joined.includes(soc.id)

  // Save the names of all the student's societies in profile.societies, after adding one.
  // (myNames is worked out further down, from the cards in "Your societies".)
  const addName = (name) => {
    update('societies', myNames.includes(name) ? myNames : [...myNames, name])
    update('societiesChanged', true)
    syncSociety(name, true) // also save it in the back end (for the societies it tracks)
  }

  // ---- Actions ----
  const openJoin = (soc) => !isMember(soc) && setSheet({ kind: 'join', id: soc.id })
  const pay = (soc) => {
    save({ joined: [...saved.joined, soc.id] })
    addName(soc.name)
    setSheet(null)
    setPop(soc.id)
    xp(20, `joined ${soc.short}`)
  }
  const goRole = (role) => {
    if (saved.applied.includes(role.id)) return
    if (role.kind === 'signup') {
      save({ applied: [...saved.applied, role.id] })
      xp(15, 'signed up to volunteer')
    } else {
      // Start the form with the student's own CV, which they can edit.
      const exp = profile.cv.exp.map((e) => `${e.role} at ${e.org} (${e.start} – ${e.end})`).join('; ')
      setForm({ why: '', exp: `${exp}; Partnerships Officer, Entrepreneurs Society.`, avail: 'Tue and Thu evenings, most weekends' })
      setSheet({ kind: 'apply', id: role.id })
    }
  }
  const submitApplication = (role) => {
    save({ applied: [...saved.applied, role.id] })
    setSheet(null)
    xp(20, 'role application sent')
  }
  const openVote = (id) => {
    setPicked(undefined)
    setSheet({ kind: 'vote', id })
  }
  const submitVote = (id) => {
    if (picked === undefined) return
    save({ votes: { ...saved.votes, [id]: picked } })
    xp(10, 'vote cast')
  }
  const closeSheet = () => {
    setSheet(null)
    setCardId(null)
  }

  // ---- What to show ----
  const consulting = SOCIETIES.find((s) => s.id === 'cons')
  const dssVoted = saved.votes.dss !== undefined
  const slides = [
    {
      tag: 'Society of the week', title: 'Consulting Society', bg: '#FF8A7A',
      pitch: 'Case practice every week, MBB speakers each term.', meta: 'Next: Case clinic (taster) · Mon 20 Oct',
      faces: ['hana', 'leo'].map((p) => personColor(p, myPhoto)), connLine: '2 connections are members',
      cta: isMember(consulting) ? 'Member ✓' : 'Join', done: isMember(consulting), go: () => openJoin(consulting),
    },
    {
      tag: 'Taster session this week', title: 'Try Bouldering', bg: '#C4F3E4',
      pitch: 'Climbing Society · Sun 19 Oct · free for first-timers', meta: 'The Castle, Stoke Newington · 11:00',
      faces: [personColor('priya', myPhoto)], connLine: 'Priya is going',
      cta: saved.tried ? 'You’re in ✓' : 'I’ll try it', done: saved.tried,
      go: () => {
        if (saved.tried) return
        save({ tried: true })
        xp(10, 'taster booked')
      },
    },
    {
      tag: 'Elections open', title: 'Data Science Society elections', bg: '#3DD6C1',
      pitch: 'Voting closes Fri 24 Oct', meta: dssVoted ? 'You voted ✓' : '3 candidates for President',
      faces: ['noor', 'tom', 'aisha'].map((p) => personColor(p, myPhoto)), connLine: 'Candidates',
      cta: dssVoted ? 'You voted ✓' : 'Vote now', done: dssVoted,
      go: () => {
        setPageId('dss')
        setTab('About')
        openVote('dss')
      },
    },
  ]

  // "Your societies": the full-page ones you're in, then your other memberships,
  // then any group you joined from search. Ones you just joined come first.
  const knownNames = [...SOCIETIES.map((s) => s.name), ...OTHER_MEMBERSHIPS.map((m) => m[1])]
  const savedNames = profile.societiesChanged ? profile.societies : []
  const fromSearch = savedNames
    .filter((n) => !knownNames.includes(n))
    .map((name) => ({ id: `g-${name}`, name, icon: '🎓', next: 'New member', price: '' }))
  const own = [
    ...SOCIETIES.filter(isMember),
    ...OTHER_MEMBERSHIPS.map(([id, name, icon, next, renew]) => ({ id, name, icon, next, renew: saved.renewed.includes(id) ? null : renew, unread: id === 'padel', price: '£5/year' })),
    ...fromSearch,
  ].sort((a, b) => (saved.joined.includes(b.id) ? 1 : 0) - (saved.joined.includes(a.id) ? 1 : 0))
  const renewing = own.filter((c) => c.renew).length
  const myNames = own.map((c) => c.name) // names of every society the student is in

  // Is a group from the real list one of yours? "Padel Tennis" counts for "Padel Tennis Club".
  const isMine = (groupName) => myNames.some((n) => groupName === n || groupName === `${n} Society` || groupName === `${n} Club`)

  // Leadership roles first, as the design does.
  const roles = [...ROLES].sort((a, b) => (a.area === 'Leadership' ? 0 : 1) - (b.area === 'Leadership' ? 0 : 1))

  // Search over all 472 real groups: name, categories and tagline.
  const q = query.trim().toLowerCase()
  const results = q
    ? ALL_GROUPS.filter((g) => `${g.name} ${g.categories.join(' ')} ${g.description}`.toLowerCase().includes(q))
    : []

  const page = SOCIETIES.find((s) => s.id === pageId)
  const sheetSoc = sheet && SOCIETIES.find((s) => s.id === sheet.id)
  const sheetRole = sheet && ROLES.find((r) => r.id === sheet.id)

  return (
    <Screen tabs>
      <div className="flex items-center justify-between px-1 pt-1">
        <h1 className="font-display text-[28px] font-normal">Societies</h1>
        <div className="text-[13px] text-mute">
          {myNames.length} joined · {ALL_GROUPS.length} groups
        </div>
      </div>

      <label className="mt-3.5 flex h-12 flex-none items-center gap-2.5 rounded-2xl bg-sf px-4 text-[14px] text-mute shadow-ring">
        <Icon name="search" size={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search societies and clubs"
          className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-mute"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="text-mute">
            <Icon name="close" size={16} />
          </button>
        )}
      </label>

      {q ? (
        // ---- Search results from the real list ----
        <div className="mt-4 flex flex-col gap-2">
          <div className="px-1 text-[12px] text-mute">
            {results.length} of {ALL_GROUPS.length} groups
          </div>
          {results.slice(0, 40).map((g) => {
            const featured = SOCIETIES.find((s) => s.name === g.name)
            const member = featured ? isMember(featured) : isMine(g.name)
            return (
              <div
                key={g.name}
                onClick={featured ? () => setPageId(featured.id) : undefined}
                className={`flex items-center gap-3 rounded-[18px] bg-sf p-[12px_14px] shadow-ring ${featured ? 'cursor-pointer' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold">{g.name}</div>
                  <div className="mt-0.5 truncate text-[12px] text-mute">{g.categories.join(' · ')}</div>
                  {g.description && <div className="mt-1 text-[12px] leading-snug text-mute">{g.description}</div>}
                </div>
                <Pill
                  look={member ? 'done' : 'cta'}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (member) return
                    if (featured) return openJoin(featured)
                    addName(g.name)
                    xp(20, `joined ${g.name}`)
                  }}
                >
                  {member ? 'Member ✓' : 'Join'}
                </Pill>
              </div>
            )
          })}
          {results.length === 0 && (
            <div className="py-8 text-center text-[13px] text-mute">
              Nothing matches ‘{query.trim()}’.{' '}
              <button type="button" onClick={() => setSheet({ kind: 'start' })} className="font-semibold text-acc">
                Start a society ›
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* ---- Carousel with dots ---- */}
          <SnapRow
            className="mt-4 gap-3"
            onScroll={(e) => {
              const el = e.currentTarget
              const width = el.firstElementChild ? el.firstElementChild.getBoundingClientRect().width + 12 : 300
              setSlide(Math.max(0, Math.min(2, Math.round(el.scrollLeft / width))))
            }}
          >
            {slides.map((s) => (
              <SlideCard key={s.tag} slide={s} />
            ))}
          </SnapRow>
          <div className="mt-1.5 flex justify-center gap-[5px]">
            {slides.map((s, i) => (
              <div key={s.tag} className={`h-1.5 rounded-[3px] transition-all ${i === slide ? 'w-[22px] bg-acc' : 'w-1.5 bg-sf2'}`} />
            ))}
          </div>

          <SectionHead title="Your societies" right={`${myNames.length} ›`} onRight={() => setSheet({ kind: 'manage' })} />
          <SnapRow className="mt-3" rowRef={ownRow}>
            {own.map((c) => (
              <OwnCard key={c.id} card={c} pop={pop === c.id} onOpen={() => (SOCIETIES.some((s) => s.id === c.id) ? setPageId(c.id) : setSheet({ kind: 'manage' }))} />
            ))}
          </SnapRow>

          <SectionHead title="Roles for you" right="Builds leadership on your route" />
          <SnapRow className="mt-3">
            {roles.map((r) => (
              <RoleCard key={r.id} role={r} applied={saved.applied.includes(r.id)} onGo={() => goRole(r)} />
            ))}
          </SnapRow>

          <SectionHead title="Ranked by fit to your profile" />
          <div className="mt-3 flex flex-col gap-2">
            {SOCIETIES.map((s) => (
              <RankedRow
                key={s.id}
                soc={s}
                member={isMember(s)}
                onOpen={() => {
                  setPageId(s.id)
                  setTab('About')
                }}
                onJoin={() => openJoin(s)}
              />
            ))}
          </div>

          <div className="mt-[22px] flex flex-none items-baseline justify-between px-1">
            <h2 className="font-display text-[22px] font-normal">This week across your societies</h2>
            <Link to="/home" className="flex-none text-[13px] font-semibold text-acc">
              See calendar ›
            </Link>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {THIS_WEEK.map((item, i) => (
              <WeekRow
                key={item[0]}
                item={item}
                booked={saved.tickets.includes(i)}
                onBook={() => !saved.tickets.includes(i) && save({ tickets: [...saved.tickets, i] })}
              />
            ))}
          </div>

          <SectionHead title="Membership" />
          <button
            type="button"
            onClick={() => setSheet({ kind: 'manage' })}
            className="mt-3 flex items-center justify-between gap-2.5 rounded-[18px] bg-sf p-[14px_16px] text-left shadow-ring"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sf2 text-acc">
                {/* a small card icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 10h18M7 15h4" />
                </svg>
              </div>
              <span className="text-[14px]">
                {myNames.length} memberships · {renewing} renewing soon
              </span>
            </div>
            <span className="text-[13px] font-semibold text-acc">Manage ›</span>
          </button>

          <div className="mt-[22px] flex items-center justify-between gap-3 rounded-[20px] border-[1.5px] border-dashed border-mute p-4">
            <div>
              <div className="text-[14px] font-semibold">Can’t find one?</div>
              <div className="mt-0.5 text-[12px] text-mute">Start a society with the Students’ Union</div>
            </div>
            <Pill look="outline" onClick={() => setSheet({ kind: 'start' })}>
              Start a society
            </Pill>
          </div>
        </>
      )}

      {/* ---- The society page, panels and the XP message ---- */}
      {page && (
        <SocietyPage
          soc={page}
          member={isMember(page)}
          tab={tab}
          setTab={setTab}
          voted={saved.votes[page.id] !== undefined}
          applied={saved.applied}
          onRole={goRole}
          onJoin={() => openJoin(page)}
          onCard={() => {
            setCardId(page.id)
            setSheet({ kind: 'manage' })
          }}
          onVote={() => openVote(page.id)}
          onClose={() => {
            setPageId(null)
            setSheet(null)
          }}
          firstName={profile.firstName}
          myPhoto={myPhoto}
        />
      )}

      {sheet?.kind === 'join' && sheetSoc && <JoinSheet soc={sheetSoc} onPay={() => pay(sheetSoc)} onClose={closeSheet} />}
      {sheet?.kind === 'apply' && sheetRole && (
        <ApplySheet
          role={sheetRole}
          form={form}
          setField={(k, v) => setForm({ ...form, [k]: v })}
          onSubmit={() => submitApplication(sheetRole)}
          onClose={closeSheet}
        />
      )}
      {sheet?.kind === 'manage' && (
        <ManageSheet
          cards={own}
          cardId={cardId}
          setCardId={setCardId}
          renew={(id) => save({ renewed: [...saved.renewed, id] })}
          memberName={`${profile.firstName} ${profile.lastName}`.trim()}
          onClose={closeSheet}
        />
      )}
      {sheet?.kind === 'start' && <StartSheet total={ALL_GROUPS.length} onClose={closeSheet} />}
      {sheet?.kind === 'vote' && (
        <VoteSheet
          candidates={CANDIDATES.map(([p, , statement]) => ({ name: personName(p), statement, color: personColor(p, myPhoto) }))}
          picked={picked}
          setPicked={setPicked}
          voted={saved.votes[sheet.id] !== undefined}
          onSubmit={() => submitVote(sheet.id)}
          onClose={closeSheet}
        />
      )}

      {toast && (
        // The outer box centres it; the inner one slides in (its animation would undo a centring transform).
        <div className="pointer-events-none fixed inset-x-0 top-[72px] z-[60] flex justify-center">
          <div
            className="rounded-full bg-cta px-4 py-2.5 text-[13px] font-semibold whitespace-nowrap text-cta-ink shadow-[0_10px_30px_rgba(20,8,40,.35)]"
            style={{ animation: 'larpIn .3s both' }}
            role="status"
          >
            {toast}
          </div>
        </div>
      )}
    </Screen>
  )
}
