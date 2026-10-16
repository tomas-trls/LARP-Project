// One "Going together" post: who posted it, their message, the event, the places left,
// the latest comment, and the Join + comments buttons (screens 12 and 13).
import Icon from '../Icon.jsx'
import { EventBlock, Face, JoinButton, Spots } from './parts.jsx'
import { nameOf } from './useFeed.js'

export default function GroupPostCard({ group, onJoin, onComments }) {
  const ev = group.ev
  const last = group.comments[group.comments.length - 1]
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-sf p-4 shadow-ring">
      {/* Who posted it */}
      <div className="flex items-center gap-2.5">
        <Face who={group.by} size={38} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[14px] font-semibold">{group.name}</span>
            <span className="rounded-full bg-sf2 px-[7px] py-0.5 text-[10px] font-semibold text-acc">{group.tag}</span>
          </div>
          <div className="mt-px text-[11px] text-mute">{group.ago}</div>
        </div>
        {ev.featured && <span className="flex-none rounded-full bg-acc px-2 py-[3px] text-[10px] font-semibold text-acc-ink">Featured</span>}
      </div>

      <div className="text-[14px] leading-[1.45]">{group.msg}</div>

      {/* The event */}
      <div className="flex items-center gap-3 rounded-[18px] bg-bg p-2.5">
        <EventBlock ev={ev} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] leading-[1.3] font-semibold">{ev.title}</div>
          <div className="mt-0.5 text-[12px] text-mute">
            {ev.dateLabel} · {ev.time} · {ev.place}
          </div>
        </div>
      </div>

      {/* Places in the group */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <Spots group={group} />
        <div className="flex items-center gap-1.5 text-[12px] text-mute">
          <span className="rounded-full bg-sf2 px-[7px] py-0.5 text-[10px] font-semibold text-ink">{group.sizeLabel}</span>
          {group.progress}
        </div>
      </div>

      {/* The latest comment, as a preview */}
      {last && (
        <button type="button" onClick={onComments} className="flex flex-col gap-1 text-left">
          <span className="line-clamp-2 text-[12px] leading-[1.4] text-mute">
            <b className="text-ink">{nameOf(last.by)}</b> {last.text}
          </span>
          <span className="text-[12px] font-medium text-mute">
            {group.comments.length > 1 ? `View all ${group.comments.length} comments` : 'View comment'}
          </span>
        </button>
      )}

      <div className="flex gap-2">
        <JoinButton group={group} onJoin={onJoin} className="h-[42px] flex-1 text-[14px]" />
        <button
          type="button"
          onClick={onComments}
          aria-label="Comments"
          className="box-border flex h-[42px] min-w-[42px] flex-none items-center justify-center gap-1.5 rounded-full border-[1.5px] border-line px-3 text-[13px] font-semibold"
        >
          <Icon name="chat" size={16} />
          {group.comments.length || ''}
        </button>
      </div>
    </div>
  )
}
