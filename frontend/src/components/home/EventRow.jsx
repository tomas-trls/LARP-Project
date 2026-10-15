// One event in the Home "Upcoming" list: date tile, title, time and place, why line, and a Join/Book button.
// Pressing the button marks the event as "Going" (and pressing again undoes it).
import { dateTile } from '../../sampleData.js'

export default function EventRow({ event, going, onToggle }) {
  const tile = dateTile(event.date)
  const time = event.end && event.end !== event.start && event.end > '00:00' ? `${event.start}–${event.end}` : event.start
  return (
    <div className="flex items-center gap-3 rounded-[18px] bg-sf px-3.5 py-3 shadow-ring">
      <div className="flex h-11 w-11 flex-none flex-col items-center justify-center rounded-xl bg-sf2 leading-none">
        <span className="text-[10px] text-mute">{tile.day}</span>
        <span className="text-[16px] font-semibold">{tile.num}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold">{event.title}</div>
        <div className="text-[12px] text-mute">
          {time} · {event.place} · {event.host}
        </div>
        <div className="mt-[3px] flex items-center gap-1.5 text-[12px] text-mute">
          <span className="h-[5px] w-[5px] flex-none rounded-full bg-blue" />
          {event.why}
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={going}
        className={`flex h-[34px] flex-none items-center rounded-full px-3.5 text-[13px] font-semibold whitespace-nowrap ${
          going ? 'bg-acc text-acc-ink' : 'bg-cta text-cta-ink'
        }`}
      >
        {going ? 'Going ✓' : event.action}
      </button>
    </div>
  )
}
