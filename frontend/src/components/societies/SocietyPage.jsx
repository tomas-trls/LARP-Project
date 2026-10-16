// A society's own page, opened from screen 14 · Societies. It covers the list (the tab bar stays on top).
// Top: coloured cover with the back button and icon. Then join or member actions, then four tabs:
// About · Events · Committee · Gallery.
import { useNavigate } from 'react-router-dom'
import Icon from '../Icon.jsx'
import { ROLES, personColor, personName } from '../../data/societies14.js'
import { Faces, Label, Pill, RoleCard, TasterTag } from './parts.jsx'

const TABS = ['About', 'Events', 'Committee', 'Gallery']

export default function SocietyPage({ soc, member, tab, setTab, voted, applied, onRole, onJoin, onCard, onVote, onClose, firstName, myPhoto }) {
  const navigate = useNavigate()
  const nextEvent = soc.events.find((e) => !e[2]) // the first event that isn't in the past
  const openRole = soc.openRole ? ROLES.find((r) => r.id === soc.openRole) : null
  const openChat = () => navigate('/messages')

  return (
    <div className="fixed inset-0 z-20 mx-auto flex max-w-[402px] flex-col bg-bg" style={{ animation: 'larpIn .25s both' }}>
      {/* Cover with stripes, back button and the society's icon */}
      <div className="relative h-[170px] flex-none px-4 pt-[max(20px,env(safe-area-inset-top))]" style={{ background: soc.cover }}>
        <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(135deg,rgba(255,255,255,.2) 0 8px,transparent 8px 20px)' }} />
        <button type="button" onClick={onClose} aria-label="Back" className="relative flex h-10 w-10 items-center justify-center rounded-full bg-bg text-ink">
          <Icon name="back" size={20} />
        </button>
        <div className="absolute -bottom-[26px] left-4 flex h-[60px] w-[60px] items-center justify-center rounded-[18px] bg-sf text-[28px] shadow-[0_0_0_4px_var(--bg)]">
          {soc.icon}
        </div>
      </div>

      <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-9 pb-32">
        <div>
          <h1 className="font-display text-[26px] leading-[1.1] font-normal">{soc.name}</h1>
          <div className="mt-1 text-[12px] text-mute">
            {soc.cat} · {soc.members} members · <b className="text-acc">{soc.fit}% fit</b>
          </div>
        </div>

        {member ? (
          <>
            <div className="flex gap-2">
              <Pill look="done" className="h-11 flex-1">
                Member ✓
              </Pill>
              <Pill look="outline" onClick={onCard} className="h-11 flex-1">
                Membership card
              </Pill>
            </div>
            <button type="button" onClick={openChat} className="flex items-center justify-between rounded-2xl bg-sf p-[12px_14px] text-[13px] shadow-ring">
              <span>💬 Society community in Messages</span>
              <span className="font-semibold text-acc">Open chat ›</span>
            </button>
            {nextEvent && (
              <div className="rounded-2xl bg-sf2 p-[12px_14px] text-[13px]">
                <b>📌 Next:</b> {nextEvent[0]} · {nextEvent[1]}
              </div>
            )}
            {soc.election && (
              <div className="flex items-center justify-between gap-2.5 rounded-2xl bg-hero p-[12px_14px] text-hero-ink">
                <div>
                  <div className="text-[13px] font-semibold">🗳 Elections open</div>
                  <div className="text-[12px] opacity-85">President · voting closes Fri 24 Oct</div>
                </div>
                <Pill look="white" onClick={onVote}>
                  {voted ? 'You voted ✓' : 'Vote now'}
                </Pill>
              </div>
            )}
          </>
        ) : (
          <Pill onClick={onJoin} className="h-[46px] text-[14px]">
            Join · {soc.price}
          </Pill>
        )}

        {/* The four tabs */}
        <div className="flex h-[42px] rounded-full bg-sf p-1 text-[13px] font-semibold shadow-ring" role="tablist">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`flex flex-1 items-center justify-center rounded-full transition-colors ${tab === t ? 'bg-acc text-acc-ink' : 'text-mute'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'About' && (
          <div className="flex flex-col gap-3 text-[14px] leading-normal">
            <div>{soc.pitch}</div>
            <div className="rounded-2xl bg-sf p-[12px_14px] shadow-ring">
              <Label className="mb-1">What you’ll get</Label>
              {soc.gain}
            </div>
            <div className="rounded-2xl bg-sf p-[12px_14px] shadow-ring">
              <Label className="mb-1">Good for your route because…</Label>
              {soc.route}
            </div>
            <div className="flex items-center gap-2 text-[13px] text-mute">
              <Faces colors={soc.conns.map((p) => personColor(p, myPhoto))} ring="var(--bg)" />
              <span>
                <b className="text-ink">Why:</b> {soc.why}
              </span>
            </div>
            <div className="flex gap-2 text-[12px] font-semibold">
              <span className="rounded-full bg-sf2 px-3 py-[7px]">Instagram {soc.ig}</span>
              <span className="rounded-full bg-sf2 px-3 py-[7px]">Website</span>
              <span className="rounded-full bg-sf2 px-3 py-[7px]">LinkedIn</span>
            </div>
          </div>
        )}

        {tab === 'Events' && (
          <div className="flex flex-col gap-2">
            {soc.events.map(([title, when, past]) => (
              <div key={title} className="rounded-2xl bg-sf p-[12px_14px] shadow-ring">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[14px] font-semibold">{title}</span>
                  {/taster/i.test(title) && <TasterTag>Taster</TasterTag>}
                  {past && <span className="rounded-full bg-sf2 px-[7px] py-0.5 text-[10px] font-semibold text-mute">Past</span>}
                </div>
                <div className="mt-0.5 text-[12px] text-mute">{when}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'Committee' && (
          <div className="flex flex-col gap-2">
            {openRole && (
              <>
                <Label>Open roles</Label>
                <RoleCard role={openRole} applied={applied.includes(openRole.id)} onGo={() => onRole(openRole)} wide />
              </>
            )}
            <Label className="mt-1.5">Committee</Label>
            {soc.committee.map(([p, role]) => (
              <div key={p} className="flex items-center gap-3 rounded-2xl bg-sf p-[10px_12px] shadow-ring">
                <div className="h-[42px] w-[42px] flex-none rounded-full" style={{ background: personColor(p, myPhoto) }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold">{personName(p, firstName)}</div>
                  <div className="text-[12px] text-mute">{role}</div>
                </div>
                {p !== 'maya' && (
                  <Pill look="outline" onClick={openChat}>
                    Message
                  </Pill>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'Gallery' &&
          (soc.gallery.length ? (
            <div className="grid grid-cols-3 gap-1.5">
              {soc.gallery.map((src) => (
                <div key={src} className="aspect-square rounded-xl" style={{ background: `url(${src}) center/cover` }} />
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-[13px] text-mute">No photos yet.</div>
          ))}
      </div>
    </div>
  )
}
