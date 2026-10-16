// Small pieces used on many screens. Each one is a few lines of styling with a clear name.
import { Link } from 'react-router-dom'

// The big main button at the bottom of a screen: white pill on dark, dark purple pill on light.
//   <PrimaryButton onClick={...}>Looks right</PrimaryButton>
//   <PrimaryButton to="/home">Save my plan</PrimaryButton>    (works as a link)
//   <PrimaryButton disabled>...</PrimaryButton>                (faded, cannot be pressed)
export function PrimaryButton({ children, to, onClick, disabled = false, className = '', type = 'button' }) {
  const style = `flex h-14 w-full flex-none items-center justify-center gap-2 rounded-full bg-cta text-[16px] font-semibold text-cta-ink transition-opacity ${
    disabled ? 'opacity-45 pointer-events-none' : 'hover:opacity-90'
  } ${className}`
  if (to && !disabled) {
    return (
      <Link to={to} className={style} onClick={onClick}>
        {children}
      </Link>
    )
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={style}>
      {children}
    </button>
  )
}

// A rounded chip for filters and tags. "on" fills it with the accent colour.
//   <Chip on={filter === 'All'} onClick={() => setFilter('All')}>All</Chip>
export function Chip({ children, on = false, onClick, className = '', small = false }) {
  const size = small ? 'h-7 px-2.5 text-[12px]' : 'h-8 px-3.5 text-[13px]'
  const look = on ? 'bg-acc text-acc-ink font-semibold' : 'bg-sf text-ink shadow-ring'
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className={`inline-flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full ${size} ${look} ${className}`}>
      {children}
    </Tag>
  )
}

// A sideways-scrolling row of chips (filters under a page title).
export function ChipRow({ children, className = '' }) {
  return <div className={`no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 ${className}`}>{children}</div>
}

// A card: the raised surface colour with rounded corners.
export function Card({ children, className = '', onClick }) {
  return (
    <div onClick={onClick} className={`rounded-[20px] bg-sf shadow-ring ${onClick ? 'cursor-pointer' : ''} ${className}`}>
      {children}
    </div>
  )
}

// The "Why: ..." line with a small blue dot, used to explain every recommendation.
export function WhyLine({ children, className = '' }) {
  return (
    <div className={`flex gap-2 text-[12px] leading-snug text-mute ${className}`}>
      <span className="mt-[5px] h-[5px] w-[5px] flex-none rounded-full bg-blue" />
      <span>{children}</span>
    </div>
  )
}

// A round "fit" percentage ring, e.g. 91% on a job card.
//   <FitRing value={91} />    <FitRing value={62} size={56} color="#FFC46B" />
export function FitRing({ value, size = 46, color = 'var(--acc)', thickness = 4, className = '', label }) {
  return (
    <div
      className={`flex flex-none items-center justify-center rounded-full ${className}`}
      style={{ width: size, height: size, background: `conic-gradient(${color} 0 ${value}%, var(--sf2) ${value}% 100%)` }}
      aria-label={`${value}% fit`}
    >
      <div className="flex items-center justify-center rounded-full bg-sf text-[12px] font-semibold" style={{ width: size - thickness * 2, height: size - thickness * 2 }}>
        {label ?? `${value}%`}
      </div>
    </div>
  )
}

// A round placeholder photo with the design's stripes. "light" uses the lilac stripes.
export function Avatar({ size = 44, light = false, className = '', rounded = 'rounded-full' }) {
  return <div className={`flex-none ${rounded} ${light ? 'stripes-light' : 'stripes'} ${className}`} style={{ width: size, height: size }} />
}

// A big page title in Garamond. Put one word in <em> for the italic accent.
export function PageTitle({ children, className = '' }) {
  return <h1 className={`font-display text-[34px] leading-[1.1] font-normal ${className}`}>{children}</h1>
}

// A section heading inside a page ("Featured this week", "Your societies").
export function SectionTitle({ children, right, className = '' }) {
  return (
    <div className={`flex items-baseline justify-between ${className}`}>
      <h2 className="font-display text-[22px] font-normal">{children}</h2>
      {right && <div className="text-[13px] text-mute">{right}</div>}
    </div>
  )
}
