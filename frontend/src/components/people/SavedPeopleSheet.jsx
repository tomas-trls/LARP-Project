// "Saved people": everyone in your bookmark, each with a Coffee chat? button.
import Icon from '../Icon.jsx'
import { FeedSheet } from '../feed/parts.jsx'

// people: [{ id, name, color, bio, coffee: function or null }]
export default function SavedPeopleSheet({ people, onClose }) {
  return (
    <FeedSheet onClose={onClose} maxHeight="72%" label="Saved people">
      <div className="flex flex-none items-center justify-between px-5 pb-3">
        <div className="font-display text-[22px]">Saved people</div>
        <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full bg-sf2 text-mute">
          <Icon name="close" size={14} strokeWidth={2.5} />
        </button>
      </div>
      <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-5 pb-[max(34px,env(safe-area-inset-bottom))]">
        {people.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-bg px-3 py-2.5">
            <div className="h-[38px] w-[38px] flex-none rounded-full" style={{ background: p.color }} />
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold">{p.name}</div>
              <div className="text-[12px] leading-[1.35] text-mute">{p.bio}</div>
            </div>
            {p.coffee && (
              <button type="button" onClick={p.coffee} className="h-8 flex-none rounded-full border-[1.5px] border-acc px-3 text-[12px] font-semibold text-acc">
                Coffee chat?
              </button>
            )}
          </div>
        ))}
      </div>
    </FeedSheet>
  )
}
