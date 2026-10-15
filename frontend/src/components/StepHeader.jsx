// The top row of the onboarding screens: a round back button, progress dots and "2 / 6".
//   <StepHeader step={2} />                 back goes to the previous page in the browser history
//   <StepHeader step={2} onBack={...} />    or do something custom
//   <StepHeader />                          just the back button (no dots), as on screens 08 and 09
import { useNavigate } from 'react-router-dom'
import Icon from './Icon.jsx'

export const TOTAL_STEPS = 6

export function BackButton({ onBack, className = '' }) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={onBack ?? (() => navigate(-1))}
      aria-label="Back"
      className={`flex h-10 w-10 flex-none items-center justify-center rounded-full bg-sf text-mute shadow-ring hover:text-ink ${className}`}
    >
      <Icon name="back" size={20} />
    </button>
  )
}

export default function StepHeader({ step, onBack, title }) {
  return (
    <div className="flex h-11 flex-none items-center justify-between">
      <BackButton onBack={onBack} />
      {step ? (
        <div className="flex gap-1.5" aria-label={`Step ${step} of ${TOTAL_STEPS}`}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            // Current step = long purple dash, done steps = faded purple, steps to come = plain.
            <div
              key={i}
              className={`h-1.5 rounded-[3px] ${i + 1 === step ? 'w-7 bg-acc' : i + 1 < step ? 'w-3 bg-acc opacity-45' : 'w-3 bg-sf2'}`}
            />
          ))}
        </div>
      ) : (
        <div className="text-[15px] text-mute">{title}</div>
      )}
      <div className="w-10 text-right text-[13px] text-mute">{step ? `${step} / ${TOTAL_STEPS}` : ''}</div>
    </div>
  )
}
