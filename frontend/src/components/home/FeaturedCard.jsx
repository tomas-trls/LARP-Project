// A "Featured this week" card on Home: a coloured picture block with the category and
// "4/6 going", then the title, time and place, why it was picked, tags, and either the
// group forming for it (with Join) or a Book button.
import { Face, JoinButton } from '../feed/parts.jsx'

export default function FeaturedCard({ item, group, groupCount, booked, onJoin, onBook }) {
  const ev = item.ev
  return (
    <div className="flex w-[280px] flex-none snap-start flex-col overflow-hidden rounded-3xl bg-sf shadow-ring">
      <div className="relative box-border flex h-[110px] items-end p-3" style={{ background: ev.blockBg, color: ev.blockInk }}>
        <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(135deg,rgba(255,255,255,.16) 0 6px,transparent 6px 16px)' }} />
        <span className="relative text-[12px] font-semibold tracking-[.06em] uppercase">{ev.cat}</span>
        <span className="absolute top-2.5 right-2.5 rounded-full bg-white px-[9px] py-[5px] text-[11px] font-semibold text-plum">
          👥 {group ? `${group.n}/${group.size} going` : `${item.going} going`}
        </span>
      </div>
      <div className="flex flex-1 flex-col px-4 pt-3.5 pb-4">
        <div className="text-[16px] leading-[1.25] font-semibold">{ev.title}</div>
        <div className="mt-1 text-[12px] leading-[1.4] text-mute">
          {ev.dateLabel} · {ev.time} · {ev.place}
        </div>
        <div className="mt-2 flex items-start gap-2 text-[12px] leading-[1.4] text-mute">
          <span className="mt-[5px] h-1.5 w-1.5 flex-none rounded-full bg-blue" />
          <span>
            <b className="text-ink">Why:</b> {item.why}
          </span>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-medium text-acc">{item.tags}</span>
          <span className="rounded-full bg-sf2 px-2 py-[3px] text-[11px] font-semibold">{group ? group.sizeLabel : 'Solo'}</span>
          {groupCount > 0 && (
            <span className="rounded-full bg-acc px-2 py-[3px] text-[11px] font-semibold text-acc-ink">
              {groupCount} group{groupCount === 1 ? '' : 's'} forming
            </span>
          )}
        </div>
        {group ? (
          <>
            <div className="mt-3.5 flex items-center gap-2.5">
              <div className="flex flex-none pl-2">
                {group.members.slice(0, 3).map((p) => (
                  <Face key={p} who={p} size={28} ring="2px solid var(--sf)" className="-ml-2" />
                ))}
              </div>
              <div className="min-w-0 flex-1 text-[12px] leading-[1.3] text-mute">{group.line}</div>
            </div>
            <JoinButton group={group} onJoin={onJoin} className="mt-3 h-10" />
          </>
        ) : (
          <div className="mt-auto pt-3.5">
            <button
              type="button"
              onClick={onBook}
              className={`h-10 w-full rounded-full text-[13px] font-semibold ${booked ? 'bg-acc text-acc-ink' : 'border-[1.5px] border-acc text-acc'}`}
            >
              {booked ? 'Booked ✓' : 'Book'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
