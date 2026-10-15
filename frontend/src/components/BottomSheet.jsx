// A panel that slides up from the bottom over a dimmed screen (used for pickers and edit forms).
//   <BottomSheet open={isOpen} title="Add language" onClose={() => setOpen(false)}>...</BottomSheet>
// Tapping the dim area or pressing Escape closes it.
import { useEffect } from 'react'
import Icon from './Icon.jsx'

export default function BottomSheet({ open, title, subtitle, onClose, children, footer }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[402px] flex-col justify-end">
      <div className="absolute inset-0 bg-[rgba(20,8,40,.55)]" onClick={onClose} />
      <div
        role="dialog"
        aria-label={title}
        className="relative flex max-h-[85dvh] flex-col rounded-t-[28px] bg-bg px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] shadow-ring"
        style={{ animation: 'sheetUp .25s cubic-bezier(.2,.7,.2,1)' }}
      >
        <div className="mx-auto mb-3 h-1 w-10 flex-none rounded-full bg-sf2" />
        <div className="flex flex-none items-start justify-between gap-3">
          <div>
            <div className="font-display text-[24px] leading-tight">{title}</div>
            {subtitle && <div className="mt-1 text-[13px] text-mute">{subtitle}</div>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-sf text-mute">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="mt-4 flex-none">{footer}</div>}
      </div>
    </div>
  )
}
