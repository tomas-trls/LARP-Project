// Small pieces shared by the career route screens (07a, 07b, 08, 09).

// The round tick on the right of a role row or area card.
// Filled with a tick when picked (it "pops" in), an empty ring when not.
export function CheckCircle({ on, size = 22 }) {
  if (!on) {
    return <div className="flex-none rounded-full border-[1.5px] border-mute" style={{ width: size, height: size }} />
  }
  return (
    <div
      className="flex flex-none items-center justify-center rounded-full bg-acc text-acc-ink"
      style={{ width: size, height: size, animation: 'arPop .22s cubic-bezier(.2,.8,.3,1.2)' }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12l5 5 9-10" />
      </svg>
    </div>
  )
}

// A small "x" icon (thicker than the shared one, as in the design's chips).
export function SmallX({ size = 11, strokeWidth = 2.5 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

// A small "+" icon for "Add your own" style links.
export function SmallPlus({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

// A round percentage ring. Unlike the shared FitRing, the colour, inner colour and text size can change.
//   <Ring value={62} size={52} inner={40} color="#FFC46B" />
export function Ring({ value, size = 28, inner = 20, color = 'var(--acc)', innerBg = 'var(--sf)', fontSize = 8 }) {
  return (
    <span
      className="flex flex-none items-center justify-center rounded-full"
      style={{ width: size, height: size, background: `conic-gradient(${color} 0 ${value}%, var(--sf2) ${value}% 100%)` }}
    >
      <span
        className="flex items-center justify-center rounded-full font-semibold text-ink"
        style={{ width: inner, height: inner, background: innerBg, fontSize }}
      >
        {value}%
      </span>
    </span>
  )
}

// The main button area pinned to the bottom of the screen, fading the content behind it.
export function StickyFooter({ children }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-6 mt-auto flex flex-col items-center gap-2 bg-[linear-gradient(to_bottom,transparent,var(--bg)_22px)] px-6 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
      {children}
    </div>
  )
}

// The "Your own" / "Added by you" label next to things the student added.
export function OwnTag({ children }) {
  return (
    <span className="rounded-full bg-sf2 px-[7px] py-[3px] text-[10px] font-semibold tracking-[.04em] text-mute uppercase">{children}</span>
  )
}
