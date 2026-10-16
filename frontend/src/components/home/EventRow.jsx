// One event in the Home "Upcoming" list: date tile, title (plus "Group of 6 · 1 group forming"
// when people have posted a group for it), time and place, why line, and a Join/Book button.
// Pressing the button marks the event as "Going" (and pressing again undoes it).
// If you're in a group for the event, the button shows "Joined ✓".
import { dateTile } from '../../sampleData.js'

export default function EventRow({ event, going, onToggle, groups = [] }) {
  const tile = dateTile(event.date)
  const time = event.end && event.end !== event.start && event.end > '00:00' ? `${event.start}–${event.end}` : event.start
  const inGroup = groups.some((g) => g.inGroup)
  const done = going || inGroup
  return (
    <div className="flex items-center gap-3 rounded-[20px] bg-sf px-3.5 py-3 shadow-ring">
      <div className="flex h-[46px] w-[46px] flex-none flex-col items-center justify-center rounded-[14px] bg-sf2 leading-none">
        <span className="text-[10px] text-mute">{tile.day}</span>
        <span className="mt-0.5 text-[17px] font-semibold">{tile.num}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[14px] leading-[1.25] font-semibold">{event.title}</span>
          {groups.length > 0 && (
            <>
              <span className="rounded-full bg-sf2 px-[7px] py-0.5 text-[10px] font-semibold whitespace-nowrap text-acc">{groups[0].sizeLabel}</span>
              <span className="rounded-full bg-acc px-[7px] py-0.5 text-[10px] font-semibold whitespace-nowrap text-acc-ink">
                {groups.length} group{groups.length === 1 ? '' : 's'} forming
              </span>
            </>
          )}
        </div>
        <div className="mt-0.5 text-[12px] text-mute">
          {time} · {event.place} · {event.host}
        </div>
        <div className="mt-1 flex items-start gap-1.5 text-[12px] leading-[1.35] text-mute">
          <span className="mt-[5px] h-[5px] w-[5px] flex-none rounded-full bg-blue" />
          <span>{event.why}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={done}
        className={`flex h-[34px] flex-none items-center rounded-full px-3.5 text-[13px] font-semibold whitespace-nowrap ${
          done ? 'bg-sf2 text-ink' : 'bg-cta text-cta-ink'
        }`}
      >
        {inGroup ? 'Joined ✓' : going ? 'Going ✓' : event.action}
      </button>
    </div>
  )
}
