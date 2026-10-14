// Small building blocks shared by the questionnaire screens.

// The "Step 3 of 7" text with a bar that fills up.
export function ProgressBar({ step, total }) {
  return (
    <div>
      <p className="text-sm font-medium text-muted dark:text-white/75">
        Step {step} of {total}
      </p>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-brand-pale dark:bg-white/10"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={step}
      >
        <div
          className="h-full rounded-full bg-brand transition-all dark:bg-brand-mid"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
    </div>
  )
}

// A big tap-friendly button for picking ONE option from a short list.
export function ChoiceCard({ label, hint, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={
        'flex min-h-16 w-full flex-col items-start justify-center rounded-2xl border-2 px-5 py-3 text-left transition ' +
        (selected
          ? 'border-brand bg-brand-pale dark:border-brand-mid dark:bg-white/15'
          : 'border-ink/15 hover:bg-brand-pale/60 dark:border-white/25 dark:hover:bg-white/10')
      }
    >
      <span className="text-lg font-semibold">{label}</span>
      {hint && <span className="text-sm text-muted dark:text-white/75">{hint}</span>}
    </button>
  )
}

// A small rounded button for picking SEVERAL options (interests, industries, free times).
export function Chip({ label, selected, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={
        'inline-flex min-h-12 items-center rounded-full border-2 px-5 font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ' +
        (selected
          ? 'border-brand bg-brand text-white dark:border-brand-mid dark:bg-brand'
          : 'border-ink/15 hover:bg-brand-pale dark:border-white/25 dark:hover:bg-white/10')
      }
    >
      {label}
    </button>
  )
}

// A label plus a text box (used by the register, log in and profile forms).
export function TextField({ label, value, onChange, ...inputProps }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-medium">{label}</span>
      <input
        {...inputProps}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-14 w-full rounded-2xl border-2 border-ink/15 bg-white px-4 text-lg text-ink dark:border-white/25"
      />
    </label>
  )
}

// A label plus a dropdown.
export function SelectField({ label, value, onChange, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-medium">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-14 w-full rounded-2xl border-2 border-ink/15 bg-white px-4 text-lg text-ink dark:border-white/25"
      >
        {children}
      </select>
    </label>
  )
}
