// The edit sheet on 04 Review: add or change one education, experience or language entry.
//
// "sheet" describes what is open:
//   { kind: 'edu' | 'exp' | 'lang', idx: number or null (null = adding a new one),
//     step: 'pick' | 'level' (languages only), q: search text, draft: the entry being edited }
import { LANGUAGES, LEVELS } from './options.js'
import Sheet, { SheetButton, SheetOption, SheetSearch } from './Sheet.jsx'

const KIND_WORD = { edu: 'education', exp: 'experience', lang: 'language' }

// An entry needs these fields filled in before it can be saved.
function isValid(kind, d) {
  if (kind === 'edu') return d.degree.trim() && d.inst.trim()
  if (kind === 'exp') return d.role.trim() && d.org.trim()
  return d.name.trim()
}

function Field({ value, placeholder, onChange, numeric = false }) {
  return (
    <input
      value={value ?? ''}
      placeholder={placeholder}
      inputMode={numeric ? 'numeric' : undefined}
      onChange={(e) => onChange(e.target.value)}
      className="box-border h-12 w-full rounded-[14px] border-none bg-sf2 px-3.5 text-[15px] text-ink outline-none placeholder:text-mute"
    />
  )
}

export default function ReviewSheet({ sheet, setSheet, langs, onSave, onRemove, onClose }) {
  const { kind, idx, draft } = sheet
  const setField = (key) => (value) => setSheet({ ...sheet, draft: { ...draft, [key]: value } })
  const canRemove = idx != null
  const removeButton = canRemove && (
    <SheetButton danger onClick={onRemove}>
      Remove {KIND_WORD[kind]}
    </SheetButton>
  )

  // Languages, step 1: search and pick a language.
  if (kind === 'lang' && sheet.step === 'pick') {
    const q = (sheet.q ?? '').trim().toLowerCase()
    const options = LANGUAGES.filter((n) => !q || n.toLowerCase().includes(q))
    return (
      <Sheet withBack title="Add language" onClose={onClose}>
        <SheetSearch value={sheet.q ?? ''} placeholder="Search languages" onChange={(text) => setSheet({ ...sheet, q: text })} />
        <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-5">
          {options.map((name) => {
            const has = langs.some((l) => l.name === name) // already on the profile
            return (
              <SheetOption
                key={name}
                label={name}
                muted={has}
                onPick={has ? undefined : () => setSheet({ ...sheet, step: 'level', draft: { name, level: 0 } })}
                right={
                  has && (
                    <span className="flex items-center gap-1.5 text-[12px]">
                      On your profile
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    </span>
                  )
                }
              />
            )
          })}
          {options.length === 0 && <div className="px-0.5 py-[18px] text-[14px] text-mute">No matches — try a different spelling.</div>}
        </div>
      </Sheet>
    )
  }

  // Languages, step 2: how well do you speak it? Picking a level saves straight away.
  if (kind === 'lang') {
    // Back from a new language returns to the list; back from an existing one closes the sheet.
    const back = idx == null ? () => setSheet({ ...sheet, step: 'pick', draft: { name: '', level: 0 } }) : onClose
    return (
      <Sheet withBack title={draft.name} onClose={onClose} onBack={back}>
        <div className="px-5 pb-1.5 text-[13px] text-mute">How well do you speak it?</div>
        <div className="flex flex-col px-5">
          {LEVELS.map((label, i) => (
            <SheetOption key={label} label={label} selected={draft.level === i + 1} onPick={() => onSave({ ...draft, level: i + 1 })} />
          ))}
        </div>
        {removeButton}
      </Sheet>
    )
  }

  // Education or experience: a short form.
  const title = `${idx == null ? 'Add' : 'Edit'} ${KIND_WORD[kind]}`
  const valid = isValid(kind, draft)
  return (
    <Sheet withBack title={title} onClose={onClose}>
      <div className="flex flex-col gap-2.5 px-5">
        {kind === 'edu' ? (
          <>
            <Field value={draft.degree} placeholder="Degree, e.g. MSc Business Analytics" onChange={setField('degree')} />
            <Field value={draft.inst} placeholder="Institution" onChange={setField('inst')} />
            <div className="flex gap-2.5">
              <Field value={draft.start} placeholder="Start year" numeric onChange={setField('start')} />
              <Field value={draft.end} placeholder="End year (or expected)" numeric onChange={setField('end')} />
            </div>
          </>
        ) : (
          <>
            <Field value={draft.role} placeholder="Role, e.g. Product Intern" onChange={setField('role')} />
            <Field value={draft.org} placeholder="Company" onChange={setField('org')} />
            <Field value={draft.loc} placeholder="Location" onChange={setField('loc')} />
            <div className="flex gap-2.5">
              <Field value={draft.start} placeholder="Start, e.g. Jun 2024" onChange={setField('start')} />
              <Field value={draft.end} placeholder="End, or Present" onChange={setField('end')} />
            </div>
          </>
        )}
      </div>
      <SheetButton disabled={!valid} onClick={() => valid && onSave(draft)}>
        {idx == null ? 'Add' : 'Save'}
      </SheetButton>
      {removeButton}
    </Sheet>
  )
}
