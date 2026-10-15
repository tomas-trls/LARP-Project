// 06 · Interests (step 4 of 6): "What are you into outside of work?"
// Tap hobbies on or off, add your own, answer three optional questions and leave a note.
// Used for social pairing only, never for jobs.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { COUNTRIES, DRINK, RELATIONSHIP } from '../components/onboarding/options.js'
import Sheet, { SheetOption, SheetSearch } from '../components/onboarding/Sheet.jsx'
import Screen from '../components/Screen.jsx'
import StepHeader from '../components/StepHeader.jsx'
import { PrimaryButton } from '../components/ui.jsx'
import { useProfile } from '../profileStore.jsx'

// The three pickers. "key" is where the answer is saved in profile.interests.
const PICKERS = {
  from: { title: 'Where are you from?', options: COUNTRIES, search: true },
  rel: { title: 'Relationship status', options: RELATIONSHIP },
  drink: { title: 'Do you drink?', options: DRINK },
}

export default function Interests() {
  const navigate = useNavigate()
  const { profile, update } = useProfile()
  const ints = profile.interests
  const [adding, setAdding] = useState(false) // true while the "+ other" box is open
  const [draft, setDraft] = useState('')
  const [picker, setPicker] = useState(null) // 'from' | 'rel' | 'drink' | null
  const [query, setQuery] = useState('')

  const setInts = (patch) => update('interests', patch)
  const toggle = (name) => setInts({ on: ints.on.includes(name) ? ints.on.filter((x) => x !== name) : [...ints.on, name] })

  // Add a typed interest to the list and switch it on.
  function addInterest() {
    const name = draft.trim()
    if (name) {
      setInts({
        all: ints.all.includes(name) ? ints.all : [...ints.all, name],
        on: ints.on.includes(name) ? ints.on : [...ints.on, name],
      })
    }
    setDraft('')
    setAdding(false)
  }

  function openPicker(key) {
    setPicker(key)
    setQuery('')
  }

  // One row of the "Where are you from?" card. Unanswered optional rows are shown in the quieter colour.
  function pickerRow(id, label, optional = false, last = false) {
    const value = PICKERS[id].options[ints[id]]
    const quiet = optional && ints[id] === 0
    return (
      <button
        type="button"
        key={id}
        onClick={() => openPicker(id)}
        className={`flex w-full items-center justify-between px-[18px] py-3.5 text-left text-[14px] select-none ${last ? '' : 'border-b border-line'}`}
      >
        <span>
          {label}
          {optional && <span className="text-mute"> · optional</span>}
        </span>
        <span className={quiet ? 'text-mute' : 'text-ink'}>{value} ›</span>
      </button>
    )
  }

  const sheet = picker && PICKERS[picker]
  const q = query.trim().toLowerCase()
  const options = sheet ? sheet.options.map((label, i) => ({ label, i })).filter(({ label }) => !q || label.toLowerCase().includes(q)) : []
  const count = ints.on.length

  return (
    <Screen>
      <div className="flex flex-1 flex-col px-2">
        <StepHeader step={4} />
        <h1 className="mt-6 font-display text-[34px] leading-[1.1] font-normal">
          What are you <em>into</em> outside of work?
        </h1>
        <p className="mt-2 text-[14px] text-mute">Used for social pairing; never for jobs.</p>

        {/* The hobby chips */}
        <div className="mt-5 flex flex-wrap items-center gap-[9px] text-[14px]">
          {ints.all.map((name) => {
            const on = ints.on.includes(name)
            return (
              <button
                type="button"
                key={name}
                onClick={() => toggle(name)}
                aria-pressed={on}
                className={`rounded-full px-4 py-2.5 transition-colors duration-150 select-none ${on ? 'bg-acc font-semibold text-acc-ink' : 'bg-sf text-ink shadow-ring'}`}
              >
                {name}
              </button>
            )
          })}
          {adding ? (
            <input
              autoFocus
              value={draft}
              placeholder="Type an interest"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addInterest()
                if (e.key === 'Escape') {
                  setDraft('')
                  setAdding(false)
                }
              }}
              onBlur={addInterest}
              className="w-[150px] rounded-full border border-dashed border-acc bg-transparent px-4 py-2.5 text-[14px] text-ink outline-none placeholder:text-mute"
            />
          ) : (
            <button type="button" onClick={() => setAdding(true)} className="rounded-full border border-dashed border-mute px-4 py-2.5 text-mute select-none">
              + other
            </button>
          )}
        </div>

        {/* Three optional questions; each opens a picker sheet */}
        <div className="mt-[22px] overflow-hidden rounded-[20px] bg-sf shadow-ring">
          {pickerRow('from', 'Where are you from?')}
          {pickerRow('rel', 'Relationship status', true)}
          {pickerRow('drink', 'Do you drink?', true, true)}
        </div>

        {/* A free-text note */}
        <div className="mt-3.5 min-h-[84px] rounded-[20px] bg-sf px-[18px] py-3.5 shadow-ring">
          <textarea
            value={ints.note}
            onChange={(e) => setInts({ note: e.target.value })}
            placeholder='Anything else we should know? e.g. "New to London, looking for a Sunday football group."'
            aria-label="Anything else we should know?"
            className="m-0 block min-h-14 w-full resize-none border-none bg-transparent p-0 text-[14px] leading-normal text-ink outline-none placeholder:text-mute"
          />
        </div>

        <div className="mt-auto pt-3.5 pb-2">
          <PrimaryButton disabled={count === 0} onClick={() => navigate('/onboarding/career')} className={count === 0 ? '!opacity-55' : ''}>
            {count ? `Continue · ${count} interest${count === 1 ? '' : 's'}` : 'Pick at least one interest'}
          </PrimaryButton>
        </div>
      </div>

      {sheet && (
        <Sheet title={sheet.title} onClose={() => setPicker(null)} maxHeight="72%">
          {sheet.search && <SheetSearch value={query} onChange={setQuery} placeholder="Search countries" />}
          <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-5">
            {options.map(({ label, i }) => (
              <SheetOption
                key={label}
                label={label}
                selected={ints[picker] === i}
                onPick={() => {
                  setInts({ [picker]: i })
                  setPicker(null)
                }}
              />
            ))}
            {options.length === 0 && <div className="px-0.5 py-[18px] text-[14px] text-mute">No matches — try a different spelling.</div>}
          </div>
        </Sheet>
      )}
    </Screen>
  )
}
