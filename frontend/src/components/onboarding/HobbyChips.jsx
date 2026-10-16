// The pieces of the 06b Hobbies grid: one hobby chip, and the little box for adding your own.
import { useState } from 'react'
import { HOBBY_EMOJIS, splitHobby } from './options.js'

// The bounce a chip does when it is switched on (copied from the design).
export const HOBBY_STYLES = '@keyframes hobBounce{0%{transform:scale(.92)}50%{transform:scale(1.08)}100%{transform:scale(1)}}'

// One hobby chip. Picked = light lilac. "locked" = the student already has 10, so it is faded and cannot be tapped.
// Hobbies the student added themselves get a small × to delete them.
export function HobbyChip({ name, on, locked, bounce, onToggle, onRemove }) {
  const { emoji, label } = splitHobby(name)
  return (
    <button
      type="button"
      onClick={locked ? undefined : onToggle}
      aria-pressed={on}
      disabled={locked}
      className={`flex h-[38px] items-center gap-1.5 rounded-full pr-3.5 pl-2.5 text-[13px] transition-[background,opacity] duration-200 select-none ${
        on ? 'bg-lilac font-semibold text-plum' : 'bg-sf2 font-medium text-ink'
      } ${locked ? 'cursor-default opacity-40' : ''}`}
      style={{ animation: bounce ? 'hobBounce .3s cubic-bezier(.2,.8,.3,1.3)' : 'none' }}
    >
      <span className="text-[16px] leading-none">{emoji}</span>
      <span>{label}</span>
      {onRemove && (
        <span
          role="button"
          aria-label={`Remove ${label}`}
          onClick={(e) => {
            e.stopPropagation() // don't also switch the chip on or off
            onRemove()
          }}
          className="ml-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[rgba(54,26,84,.12)] text-[12px] leading-none"
        >
          ×
        </span>
      )}
    </button>
  )
}

// The dashed "+ Add" chip. Tapping it turns it into a small form:
// an emoji button (opens a grid of emojis), a text box and a tick to save.
//   wide = the full-width "+ Add other interest" button at the bottom of the list
export function AddHobby({ open, onOpen, onClose, onAdd, wide = false }) {
  const [draft, setDraft] = useState('')
  const [emoji, setEmoji] = useState('✦')
  const [emojiOpen, setEmojiOpen] = useState(false)

  function finish() {
    const text = draft.trim()
    if (text) onAdd(`${emoji} ${text}`)
    else onClose()
    setDraft('')
    setEmoji('✦')
    setEmojiOpen(false)
  }

  if (!open) {
    return wide ? (
      <button
        type="button"
        onClick={onOpen}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-mute text-[14px] font-medium text-mute select-none"
      >
        <span className="text-[18px] leading-none">+</span>Add other interest
      </button>
    ) : (
      <button
        type="button"
        onClick={onOpen}
        className="flex h-[38px] items-center rounded-full border-[1.5px] border-dashed border-mute px-3.5 text-[13px] font-medium text-mute select-none"
      >
        + Add
      </button>
    )
  }

  return (
    <div className="relative">
      <div className="flex h-[38px] items-center gap-1 rounded-full bg-sf pr-1.5 pl-1 shadow-[inset_0_0_0_1.5px_var(--acc)]">
        <button
          type="button"
          onClick={() => setEmojiOpen(!emojiOpen)}
          aria-label="Choose an emoji"
          className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-sf2 text-[15px]"
        >
          {emoji}
        </button>
        <input
          autoFocus
          value={draft}
          placeholder="Name it…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') finish()
            if (e.key === 'Escape') {
              setDraft('')
              onClose()
            }
          }}
          className="w-[110px] border-none bg-transparent text-[13px] text-ink outline-none placeholder:text-mute"
        />
        <button type="button" onClick={finish} aria-label="Add" className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-acc text-acc-ink">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5 9-10" />
          </svg>
        </button>
      </div>

      {/* The emoji grid, under the form */}
      {emojiOpen && (
        <div className="absolute top-11 left-0 z-10 grid w-[232px] grid-cols-8 gap-0.5 rounded-[14px] bg-sf p-2 shadow-[0_10px_30px_rgba(20,8,40,.35),var(--ring)]">
          {HOBBY_EMOJIS.map((e) => (
            <button
              type="button"
              key={e}
              onClick={() => {
                setEmoji(e)
                setEmojiOpen(false)
              }}
              className="flex h-[26px] w-[26px] items-center justify-center rounded-md text-[16px] hover:bg-sf2"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
