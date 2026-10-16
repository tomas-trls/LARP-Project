// The bottom sheets on screens 04 and 06, drawn exactly as in the design:
// a panel in the card colour that slides up over a dimmed screen.
//   withBack   -> a round back arrow on the left of the title (04 edit forms)
//   otherwise  -> the title on the left and a round × on the right (06 pickers)
import { useEffect } from 'react'
import Icon from '../Icon.jsx'

export default function Sheet({ title, onClose, onBack, withBack = false, maxHeight = '82%', children }) {
  // Escape closes the sheet, like tapping the dim area.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-[rgba(20,8,40,.55)]" onClick={onClose} />
      <div
        role="dialog"
        aria-label={title}
        className="relative mx-auto flex w-full max-w-(--app-w) flex-col rounded-t-[28px] bg-sf pt-2.5 pb-[max(34px,env(safe-area-inset-bottom))] shadow-[0_-10px_40px_rgba(20,8,40,.35)]"
        style={{ maxHeight, animation: 'sheetUp .25s cubic-bezier(.2,.7,.2,1)' }}
      >
        <div className="mx-auto mb-3.5 h-[5px] w-10 flex-none rounded-[3px] bg-line" />
        {withBack ? (
          <div className="flex flex-none items-center gap-3 px-5 pb-3">
            <button type="button" onClick={onBack ?? onClose} aria-label="Back" className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-sf2 text-mute">
              <Icon name="back" size={18} />
            </button>
            <div className="min-w-0 flex-1 truncate font-display text-[22px]">{title}</div>
          </div>
        ) : (
          <div className="flex flex-none items-center justify-between px-5 pb-3">
            <div className="font-display text-[22px]">{title}</div>
            <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full bg-sf2 text-mute">
              <Icon name="close" size={14} strokeWidth={2.5} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

// A search box inside a sheet ("Search countries", "Search languages").
export function SheetSearch({ value, onChange, placeholder }) {
  return (
    <div className="mx-5 mb-2.5 flex h-11 flex-none items-center gap-2.5 rounded-[14px] bg-sf2 px-3.5 text-mute">
      <Icon name="search" size={16} />
      <input
        autoFocus
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 border-none bg-transparent text-[14px] text-ink outline-none placeholder:text-mute"
      />
    </div>
  )
}

// One row in a picker list, with a purple tick when it is the current choice.
export function SheetOption({ label, selected, onPick, right, muted = false }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={`flex min-h-[50px] w-full items-center justify-between gap-3 border-b border-line px-0.5 text-left text-[15px] select-none ${muted ? 'cursor-default text-mute' : 'text-ink'}`}
    >
      <span>{label}</span>
      {right}
      {selected && <Icon name="check" size={20} strokeWidth={2.5} className="text-acc" />}
    </button>
  )
}

// The pill buttons at the bottom of an edit sheet.
export function SheetButton({ children, onClick, disabled = false, danger = false }) {
  const look = danger ? 'bg-[rgba(229,72,77,.1)] text-[#E5484D]' : 'bg-cta text-cta-ink'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mx-5 mt-3.5 flex h-[52px] flex-none items-center justify-center rounded-full text-[15px] font-semibold transition-opacity select-none ${look} ${disabled ? 'opacity-50' : ''}`}
    >
      {children}
    </button>
  )
}
