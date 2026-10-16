// Small pieces of screen 14 · Societies, each matching one block of the design.
import Icon from '../Icon.jsx'

// The design's small rounded button. "look" picks the colours:
//   'cta' = main (white on dark), 'done' = already done (quiet), 'outline' = purple outline, 'white' = on a purple card
export function Pill({ children, onClick, look = 'cta', className = '', style }) {
  const looks = {
    cta: 'bg-cta text-cta-ink',
    done: 'bg-sf2 text-mute',
    soft: 'bg-sf2 text-ink',
    outline: 'border-[1.5px] border-acc text-acc',
    white: 'bg-white text-plum',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[34px] flex-none items-center justify-center rounded-full px-3.5 text-[12px] font-semibold whitespace-nowrap transition-colors select-none ${looks[look]} ${className}`}
      style={style}
    >
      {children}
    </button>
  )
}

// A section title in Garamond with an optional link or note on the right.
export function SectionHead({ title, right, onRight }) {
  return (
    <div className="mt-[22px] flex flex-none items-baseline justify-between px-1">
      <h2 className="font-display text-[22px] font-normal">{title}</h2>
      {right &&
        (onRight ? (
          <button type="button" onClick={onRight} className="text-[13px] font-semibold text-acc">
            {right}
          </button>
        ) : (
          <span className="text-[11px] text-mute">{right}</span>
        ))}
    </div>
  )
}

// A row of cards that scrolls sideways and snaps to each card.
// rowRef lets the page scroll the row from code (e.g. back to the start after joining).
export function SnapRow({ children, onScroll, rowRef, className = '' }) {
  return (
    <div
      ref={rowRef}
      onScroll={onScroll}
      className={`no-scrollbar -mx-4 flex flex-none snap-x snap-mandatory scroll-px-4 gap-2.5 overflow-x-auto px-4 pt-0.5 pb-1.5 ${className}`}
    >
      {children}
    </div>
  )
}

// Overlapping little circles for the people who are members ("2 connections are members").
export function Faces({ colors, ring = 'var(--sf)' }) {
  return (
    <div className="flex pl-1.5">
      {colors.map((c, i) => (
        <div key={i} className="-ml-1.5 h-[22px] w-[22px] rounded-full" style={{ background: c, border: `2px solid ${ring}` }} />
      ))}
    </div>
  )
}

// The "Why: ..." line with a small blue dot.
export function Why({ children }) {
  return (
    <div className="mt-1 flex items-start gap-1.5 text-[12px] leading-[1.35] text-mute">
      <span className="mt-[5px] h-[5px] w-[5px] flex-none rounded-full bg-blue" />
      <span>{children}</span>
    </div>
  )
}

// The small green "Taster available" tag.
export function TasterTag({ children = 'Taster available' }) {
  return <span className="inline-block rounded-full bg-[rgba(61,214,193,.18)] px-2 py-0.5 text-[10px] font-semibold text-[#3DD6C1]">{children}</span>
}

// One big card in the carousel at the top (society of the week, taster, elections).
export function SlideCard({ slide }) {
  return (
    <div className="flex w-[300px] flex-none snap-start flex-col overflow-hidden rounded-3xl bg-sf shadow-ring">
      <div className="relative flex h-24 flex-col justify-between p-[14px_16px] text-plum" style={{ background: slide.bg }}>
        <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(135deg,rgba(255,255,255,.2) 0 6px,transparent 6px 16px)' }} />
        <span className="relative self-start rounded-full bg-white px-[9px] py-1 text-[10px] font-bold tracking-[.08em] uppercase">{slide.tag}</span>
        <div className="relative font-display text-[24px] leading-[1.05]">{slide.title}</div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-[12px_16px_16px]">
        <div className="text-[13px] leading-[1.4]">{slide.pitch}</div>
        <div className="text-[12px] text-mute">{slide.meta}</div>
        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <Faces colors={slide.faces} />
            <span className="truncate text-[11px] text-mute">{slide.connLine}</span>
          </div>
          <Pill look={slide.done ? 'done' : 'cta'} onClick={slide.go} className="h-[38px]">
            {slide.cta}
          </Pill>
        </div>
      </div>
    </div>
  )
}

// One of "Your societies": icon, name, status (Member / Committee / Renew by …) and what's next.
export function OwnCard({ card, onOpen, pop }) {
  const status =
    card.role === 'Committee'
      ? { text: 'Committee', bg: 'var(--acc)', ink: 'var(--acc-ink)' }
      : card.renew
        ? { text: `Renew by ${card.renew}`, bg: 'rgba(255,196,107,.2)', ink: '#FFC46B' }
        : { text: 'Member', bg: 'var(--sf2)', ink: 'var(--ink)' }
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative flex w-[150px] flex-none snap-start flex-col gap-2 rounded-[18px] bg-sf p-3 text-left shadow-ring"
      style={{ animation: pop ? 'arPop .5s cubic-bezier(.2,.8,.3,1.3)' : 'none' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sf2 text-[18px]">{card.icon}</div>
        {card.unread && <div className="h-[9px] w-[9px] rounded-full bg-blue" aria-label="New messages" />}
      </div>
      <div className="w-full truncate text-[13px] leading-tight font-semibold">{card.name}</div>
      <span className="self-start rounded-full px-2 py-[3px] text-[10px] font-semibold" style={{ background: status.bg, color: status.ink }}>
        {status.text}
      </span>
      <div className="w-full truncate text-[11px] text-mute">{card.next}</div>
    </button>
  )
}

// A committee role card ("Roles for you" and on a society's Committee tab).
export function RoleCard({ role, applied, onGo, wide = false }) {
  const label = applied ? (role.kind === 'signup' ? 'Signed up ✓' : 'Applied · decision by 1 Nov') : role.cta
  const countdown = role.days <= 7 ? `Closes in ${role.days} days` : `Closes ${role.due}`
  return (
    <div className={`flex flex-none snap-start flex-col gap-2 rounded-[20px] bg-sf p-3.5 shadow-ring ${wide ? 'w-full' : 'w-[236px]'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full px-2 py-[3px] text-[10px] font-bold text-plum" style={{ background: role.color }}>
          {role.area}
        </span>
        <span className="text-[11px] text-mute">{role.hrs}</span>
      </div>
      <div>
        <div className="text-[15px] leading-tight font-semibold">{role.title}</div>
        <div className="text-[12px] text-mute">{role.soc}</div>
      </div>
      <div className="text-[12px] leading-[1.4]">{role.blurb}</div>
      <div className="mt-auto text-[11px] font-semibold text-acc">{countdown}</div>
      <Pill look={applied ? 'soft' : 'cta'} onClick={onGo} className="h-[38px] w-full whitespace-normal text-center">
        {label}
      </Pill>
    </div>
  )
}

// A row in "Ranked by fit to your profile".
export function RankedRow({ soc, member, onOpen, onJoin }) {
  return (
    <div onClick={onOpen} className="flex cursor-pointer items-center gap-3 rounded-[20px] bg-sf p-[12px_14px] shadow-ring">
      <div className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-[14px] text-[20px]" style={{ background: soc.cover }}>
        {soc.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[14px] font-semibold">{soc.name}</span>
          <span className="text-[11px] font-semibold text-acc">{soc.fit}%</span>
        </div>
        <div className="mt-0.5 text-[12px] text-mute">
          {soc.cat} · {soc.price}
        </div>
        <Why>{soc.why}</Why>
        {soc.taster && (
          <div className="mt-1.5">
            <TasterTag />
          </div>
        )}
      </div>
      <Pill
        look={member ? 'done' : 'cta'}
        onClick={(e) => {
          e.stopPropagation() // don't also open the society page
          if (!member) onJoin()
        }}
      >
        {member ? 'Member ✓' : 'Join'}
      </Pill>
    </div>
  )
}

// A row in "This week across your societies", with a small date tile.
export function WeekRow({ item, booked, onBook }) {
  const [title, soc, dow, day, meta] = item
  return (
    <div className="flex items-center gap-3 rounded-[18px] bg-sf p-[10px_12px] shadow-ring">
      <div className="flex h-11 w-11 flex-none flex-col items-center justify-center rounded-xl bg-sf2 leading-none">
        <span className="text-[9px] text-mute">{dow}</span>
        <span className="mt-0.5 text-[16px] font-semibold">{day}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold">{title}</div>
        <div className="text-[12px] text-mute">
          {soc} · {meta}
        </div>
      </div>
      <Pill look={booked ? 'soft' : 'cta'} onClick={onBook}>
        {booked ? 'Ticket ✓' : 'Book'}
      </Pill>
    </div>
  )
}

// The round × button in the corner of every sheet.
export function CloseButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label="Close" className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-sf2 text-mute">
      <Icon name="close" size={16} />
    </button>
  )
}

// A small grey heading above a field or block ("WHY YOU?", "COMMITTEE").
export function Label({ children, className = '' }) {
  return <div className={`text-[11px] font-semibold tracking-[.06em] text-mute uppercase ${className}`}>{children}</div>
}

// The panel that slides up from the bottom, drawn like the design's sheets (surface colour, handle on top).
// maxHeight is how tall it may grow, as in the design (e.g. '60%' for Join, '86%' for Apply).
export function Sheet({ onClose, maxHeight = '86%', children }) {
  return (
    <div className="fixed inset-0 z-50 mx-auto max-w-[402px]">
      <div className="absolute inset-0 bg-[rgba(20,8,40,.55)]" onClick={onClose} />
      <div
        role="dialog"
        className="absolute inset-x-0 bottom-0 flex flex-col rounded-t-[28px] bg-sf pt-2.5 pb-[max(34px,env(safe-area-inset-bottom))] shadow-[0_-10px_40px_rgba(20,8,40,.35)]"
        style={{ maxHeight, animation: 'sheetUp .3s cubic-bezier(.2,.8,.3,1) both' }}
      >
        <div className="mx-auto mb-3.5 h-[5px] w-10 flex-none rounded-[3px] bg-line" />
        <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5">{children}</div>
      </div>
    </div>
  )
}

// A text box with the design's style, used in the role application form.
export function TextBox({ value, onChange, rows = 2, placeholder }) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="block w-full resize-none rounded-[14px] bg-sf2 p-3 text-[14px] leading-[1.45] text-ink outline-none placeholder:text-mute"
    />
  )
}
