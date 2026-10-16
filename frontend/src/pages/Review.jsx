// 04 · Review & edit (step 2 of 6): "Here's what we found." The profile read from the CV,
// in four cards. Each card has an Edit / Done switch; in edit mode rows open an edit sheet.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { LEVELS } from '../components/onboarding/options.js'
import ReviewSheet from '../components/onboarding/ReviewSheet.jsx'
import Screen from '../components/Screen.jsx'
import StepHeader from '../components/StepHeader.jsx'
import { PrimaryButton } from '../components/ui.jsx'
import { DEFAULT_PROFILE, useProfile } from '../profileStore.jsx'

// Which list in the profile each kind of entry lives in.
const LIST_KEY = { edu: 'edu', exp: 'exp', lang: 'langs' }
const BLANK = {
  edu: { degree: '', inst: '', start: '', end: '' },
  exp: { role: '', org: '', loc: '', start: '', end: '' },
  lang: { name: '', level: 0 },
}

// A card with a Garamond title and an "Edit" / "Done" link on the right.
function Section({ title, editing, onToggle, children }) {
  return (
    <div className="rounded-[20px] bg-sf px-[18px] py-4 shadow-ring">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[19px] font-normal">{title}</h2>
        <button type="button" onClick={onToggle} className="py-1.5 text-[13px] font-semibold text-acc select-none">
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>
      {children}
    </div>
  )
}

// One education or experience line. In edit mode it shows a chevron and opens the sheet.
function EntryRow({ title, sub, editing, onOpen }) {
  return (
    <div onClick={editing ? onOpen : undefined} className={`mt-2.5 flex items-center gap-2.5 text-[14px] leading-[1.45] ${editing ? 'cursor-pointer' : ''}`}>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{title}</div>
        <div className="text-mute">{sub}</div>
      </div>
      <Icon name="chevron-right" size={16} className="flex-none text-mute" style={{ opacity: editing ? 1 : 0 }} />
    </div>
  )
}

// "+ Add education" under a card in edit mode.
function AddLink({ children, onClick, divider = true }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mt-1 flex w-full items-center gap-1.5 pt-2.5 text-[13px] font-semibold text-acc select-none ${divider ? 'border-t border-line' : ''}`}
    >
      <Icon name="plus" size={13} strokeWidth={2.5} />
      {children}
    </button>
  )
}

export default function Review() {
  const navigate = useNavigate()
  const { profile, update } = useProfile()
  const { file, edu, exp, skills, langs } = profile.cv
  const [editing, setEditing] = useState({}) // which cards are in edit mode, e.g. { edu: true }
  const [sheet, setSheet] = useState(null) // the open edit sheet, or null
  const [parsing, setParsing] = useState(false) // true while "re-reading" a replaced CV
  const [newSkill, setNewSkill] = useState('')
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  const toggle = (section) => setEditing({ ...editing, [section]: !editing[section] })
  const lists = { edu, exp, lang: langs }

  // "Replace": pretend to read a new CV for 1.4 seconds, then show the example profile again.
  function replaceCv() {
    if (parsing) return
    setParsing(true)
    timer.current = setTimeout(() => {
      const next = file === 'Maya_CV.pdf' ? 'Maya_Whitfield_CV_2026.pdf' : 'Maya_CV.pdf'
      update('cv', { ...DEFAULT_PROFILE.cv, file: next })
      setParsing(false)
    }, 1400)
  }

  // Open the sheet for an existing entry (idx) or a new one (idx = null).
  function openSheet(kind, idx) {
    const draft = idx == null ? BLANK[kind] : { ...lists[kind][idx] }
    const step = kind === 'lang' && idx == null ? 'pick' : 'level'
    setSheet({ kind, idx, step, q: '', draft })
  }

  // Save the sheet's entry: add it to the end, or replace the one being edited.
  function saveEntry(entry) {
    const list = lists[sheet.kind]
    const next = sheet.idx == null ? [...list, entry] : list.map((x, i) => (i === sheet.idx ? entry : x))
    update('cv', { [LIST_KEY[sheet.kind]]: next })
    setSheet(null)
  }

  function removeEntry() {
    const list = lists[sheet.kind]
    update('cv', { [LIST_KEY[sheet.kind]]: list.filter((_, i) => i !== sheet.idx) })
    setSheet(null)
  }

  function addSkill() {
    const skill = newSkill.trim()
    if (!skill) return
    update('cv', { skills: [...skills, skill] })
    setNewSkill('')
  }

  return (
    <Screen>
      <div className="flex flex-1 flex-col px-2">
        <StepHeader step={2} />
        <h1 className="mt-6 font-display text-[34px] leading-[1.1] font-normal">
          Here's what we <em>found.</em>
        </h1>

        {/* Which file the profile came from, with a "Replace" link */}
        <div className="mt-3 flex items-center gap-2.5 rounded-[14px] bg-sf2 px-3.5 py-2.5 text-[13px]">
          <div className="h-2 w-2 flex-none rounded-full bg-blue" />
          <span className="min-w-0 truncate">
            {parsing ? 'Re-parsing your CV…' : 'Parsed from'} <b>{file}</b>
          </span>
          <button type="button" onClick={replaceCv} className="ml-auto py-1.5 font-semibold text-acc select-none">
            {parsing ? 'Working…' : 'Replace'}
          </button>
        </div>

        <div className="mt-[18px] flex flex-col gap-3">
          <Section title="Education" editing={editing.edu} onToggle={() => toggle('edu')}>
            {edu.map((e, i) => (
              <EntryRow key={i} title={e.degree} sub={`${e.inst} · ${e.start}–${e.end}`} editing={editing.edu} onOpen={() => openSheet('edu', i)} />
            ))}
            {editing.edu && <AddLink onClick={() => openSheet('edu', null)}>Add education</AddLink>}
          </Section>

          <Section title="Experience" editing={editing.exp} onToggle={() => toggle('exp')}>
            {exp.map((e, i) => (
              <EntryRow key={i} title={`${e.role} · ${e.org}`} sub={`${e.loc} · ${e.start} – ${e.end}`} editing={editing.exp} onOpen={() => openSheet('exp', i)} />
            ))}
            {editing.exp && <AddLink onClick={() => openSheet('exp', null)}>Add experience</AddLink>}
          </Section>

          <Section title="Skills" editing={editing.skills} onToggle={() => toggle('skills')}>
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[12px]">
              {skills.map((s) => (
                <span key={s} className="flex items-center gap-1.5 rounded-full bg-sf2 px-[11px] py-1.5">
                  {s}
                  {editing.skills && (
                    <button
                      type="button"
                      aria-label={`Remove ${s}`}
                      onClick={() => update('cv', { skills: skills.filter((x) => x !== s) })}
                      className="leading-none font-bold text-mute"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
              {editing.skills ? (
                <>
                  <input
                    value={newSkill}
                    placeholder="Add a skill"
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                    className="w-[110px] rounded-full border border-dashed border-mute bg-transparent px-[11px] py-1.5 text-[12px] text-ink outline-none placeholder:text-mute"
                  />
                  <button type="button" onClick={addSkill} className="rounded-full bg-acc px-[11px] py-1.5 font-semibold text-acc-ink">
                    Add
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => toggle('skills')} className="rounded-full border border-dashed border-mute px-[11px] py-1.5 text-mute">
                  + add
                </button>
              )}
            </div>
          </Section>

          <Section title="Languages" editing={editing.lang} onToggle={() => toggle('lang')}>
            <div className="mt-1 flex flex-col">
              {langs.map((l, i) => (
                <div key={l.name} onClick={editing.lang ? () => openSheet('lang', i) : undefined} className={`border-b border-line py-2.5 ${editing.lang ? 'cursor-pointer' : ''}`}>
                  <div className="flex items-center justify-between gap-2 text-[14px]">
                    <span>{l.name}</span>
                    <span className="flex items-center gap-1.5 text-[12px] text-mute">
                      {LEVELS[l.level - 1]}
                      <Icon name="chevron-right" size={16} className="flex-none" style={{ opacity: editing.lang ? 1 : 0 }} />
                    </span>
                  </div>
                  {/* five little bars, filled up to the level */}
                  <div className="mt-2 flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div key={n} className={`h-[5px] flex-1 rounded-[3px] ${n <= l.level ? 'bg-acc' : 'bg-sf2'}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <AddLink divider={false} onClick={() => openSheet('lang', null)}>
              Add language
            </AddLink>
          </Section>
        </div>

        {/* The main button stays at the bottom of the screen while the cards scroll */}
        <div className="sticky bottom-0 mt-auto bg-bg pt-3.5 pb-2">
          <PrimaryButton onClick={() => navigate('/onboarding/personality')}>Looks right</PrimaryButton>
        </div>
      </div>

      {sheet && <ReviewSheet sheet={sheet} setSheet={setSheet} langs={langs} onSave={saveEntry} onRemove={removeEntry} onClose={() => setSheet(null)} />}
    </Screen>
  )
}
