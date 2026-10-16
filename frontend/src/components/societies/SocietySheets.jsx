// The panels that slide up on screen 14 · Societies.
// Nothing here sends anything anywhere: payment is pretend, and applications and votes are only saved in the browser.
import Icon from '../Icon.jsx'
import { qrCells } from '../../data/societies14.js'
import { CloseButton, Label, Pill, Sheet, TextBox } from './parts.jsx'

// A sheet's title row: Garamond title, optional grey line underneath, × on the right.
function Title({ children, sub, onClose }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1">
        <div className="font-display text-[22px] leading-[1.1]">{children}</div>
        {sub && <div className="mt-0.5 text-[12px] text-mute">{sub}</div>}
      </div>
      <CloseButton onClick={onClose} />
    </div>
  )
}

// Join a society: what you get, then a pretend "Pay & join" button.
export function JoinSheet({ soc, onPay, onClose }) {
  const payLabel = soc.price === 'Free' ? 'Join for free' : `Pay ${soc.price.replace('/year', '')} & join`
  return (
    <Sheet onClose={onClose} maxHeight="60%">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 flex-none items-center justify-center rounded-[14px] text-[22px]" style={{ background: soc.cover }}>
          {soc.icon}
        </div>
        <div className="flex-1">
          <div className="font-display text-[22px] leading-[1.1]">Join {soc.name}</div>
          <div className="mt-0.5 text-[12px] text-mute">Membership · {soc.price} · via Students’ Union</div>
        </div>
        <CloseButton onClick={onClose} />
      </div>
      <div className="rounded-2xl bg-sf2 p-[12px_14px] text-[13px] leading-normal">
        You’ll get the community chat in Messages, member prices on events and a digital membership card.
      </div>
      <Pill onClick={onPay} className="h-[52px] text-[15px]">
        {payLabel}
      </Pill>
      <div className="text-center text-[11px] text-mute">Prototype · payment is mocked</div>
    </Sheet>
  )
}

// Apply for a committee role. "form" holds the three answers; setField(name, text) changes one.
export function ApplySheet({ role, form, setField, onSubmit, onClose }) {
  return (
    <Sheet onClose={onClose}>
      <Title sub={`${role.soc} · ${role.hrs} · closes ${role.due}`} onClose={onClose}>
        {role.title}
      </Title>
      <div>
        <Label className="mb-1.5">Why you?</Label>
        <TextBox rows={3} value={form.why} onChange={(v) => setField('why', v)} />
      </div>
      <div>
        <Label className="mb-1.5">Relevant experience · from your profile</Label>
        <TextBox rows={3} value={form.exp} onChange={(v) => setField('exp', v)} />
      </div>
      <div>
        <Label className="mb-1.5">Availability</Label>
        <TextBox rows={1} value={form.avail} onChange={(v) => setField('avail', v)} />
      </div>
      <Pill onClick={onSubmit} className="h-[52px] text-[15px]">
        Send application
      </Pill>
    </Sheet>
  )
}

// "Your memberships": every society with Card and Renew buttons. Tapping Card shows the
// membership card with its QR code (cardId is the society whose card is open, or null).
export function ManageSheet({ cards, cardId, setCardId, renew, memberName, onClose }) {
  const card = cards.find((c) => c.id === cardId)
  return (
    <Sheet onClose={onClose}>
      {card ? (
        <>
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setCardId(null)} className="text-[13px] font-semibold text-acc">
              ‹ All memberships
            </button>
            <CloseButton onClick={onClose} />
          </div>
          <div className="flex flex-col items-center gap-3.5 rounded-3xl bg-hero p-5 text-hero-ink">
            <div className="flex items-center gap-2.5 self-stretch">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-[20px]">{card.icon}</div>
              <div>
                <div className="text-[15px] font-semibold">{card.name}</div>
                <div className="text-[11px] opacity-85">{memberName} · Member 2026/27</div>
              </div>
            </div>
            {/* The pretend QR code: 21 × 21 squares on white */}
            <div className="grid h-[189px] w-[189px] grid-cols-[repeat(21,1fr)] rounded-xl bg-white p-2.5" aria-label="Membership QR code">
              {qrCells(card.id.length * 7 + card.id.charCodeAt(0)).map((dark, i) => (
                <div key={i} style={{ background: dark ? '#361A54' : '#FFFFFF' }} />
              ))}
            </div>
            <div className="text-[12px] opacity-85">Show this at the door</div>
          </div>
        </>
      ) : (
        <>
          <Title onClose={onClose}>Your memberships</Title>
          {cards.map((c) => (
            <div key={c.id} className="flex items-center gap-3 border-b border-line py-2.5">
              <div className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-sf2 text-[17px]">{c.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold">{c.name}</div>
                <div className="text-[12px] text-mute">{c.renew ? `Renew by ${c.renew} · ${c.price || '£5/year'}` : 'Active · renews Sep 2027'}</div>
              </div>
              <Pill look="soft" onClick={() => setCardId(c.id)} className="h-[30px] px-2.5">
                Card
              </Pill>
              {c.renew && (
                <Pill onClick={() => renew(c.id)} className="h-[30px] px-2.5">
                  Renew
                </Pill>
              )}
            </div>
          ))}
        </>
      )}
    </Sheet>
  )
}

// How to start a new society with the Students' Union. Information only.
export function StartSheet({ total, onClose }) {
  return (
    <Sheet onClose={onClose} maxHeight="70%">
      <Title onClose={onClose}>Start a society</Title>
      <div className="flex flex-col gap-2.5 text-[14px] leading-[1.55]">
        <div>
          <b>1 · Check it doesn’t exist</b> — search the {total} groups first.
        </div>
        <div>
          <b>2 · Find 20 founding members</b> — the Students’ Union minimum, including 3 committee members.
        </div>
        <div>
          <b>3 · Write a short constitution</b> — the SU has a template.
        </div>
        <div>
          <b>4 · Submit the new-society form</b> — reviewed within 10 working days.
        </div>
        <div className="rounded-2xl bg-sf2 p-[12px_14px] text-[13px]">
          Contact: <b>Students’ Union Activities team</b> · su.activities@ucl.ac.uk
        </div>
      </div>
    </Sheet>
  )
}

// Vote for President. candidates = [{ name, statement, color }]; picked = index or undefined.
export function VoteSheet({ candidates, picked, setPicked, voted, onSubmit, onClose }) {
  return (
    <Sheet onClose={onClose} maxHeight="80%">
      <Title sub="Data Science Society · closes Fri 24 Oct" onClose={onClose}>
        Vote for President
      </Title>
      {voted ? (
        <div className="flex flex-col items-center gap-2.5 py-[30px] text-center" style={{ animation: 'arPop .3s both' }}>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-acc text-acc-ink">
            <Icon name="check" size={26} strokeWidth={2.5} />
          </div>
          <div className="font-display text-[24px]">You voted ✓</div>
          <div className="text-[13px] text-mute">Results show after voting closes on Fri 24 Oct.</div>
        </div>
      ) : (
        <>
          {candidates.map((c, i) => (
            <button
              key={c.name}
              type="button"
              onClick={() => setPicked(i)}
              className="flex gap-3 rounded-2xl bg-bg p-3 text-left transition-shadow"
              style={{ boxShadow: picked === i ? '0 0 0 2px var(--acc)' : 'var(--ring)' }}
            >
              <div className="h-11 w-11 flex-none rounded-full" style={{ background: c.color }} />
              <div className="flex-1">
                <div className="text-[14px] font-semibold">{c.name}</div>
                <div className="mt-0.5 text-[12px] leading-[1.4] text-mute">“{c.statement}”</div>
              </div>
              {picked === i && (
                <div className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-acc text-acc-ink">
                  <Icon name="check" size={14} strokeWidth={3} />
                </div>
              )}
            </button>
          ))}
          <Pill onClick={onSubmit} className="h-[50px] text-[15px]" style={{ opacity: picked === undefined ? 0.45 : 1 }}>
            Submit vote
          </Pill>
        </>
      )}
    </Sheet>
  )
}
