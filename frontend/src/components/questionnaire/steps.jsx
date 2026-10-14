// The seven questionnaire screens. Each one gets:
//   a      = the answers so far
//   set    = a function to change some answers, e.g. set({ campus: 'main' })
// and shows only its own question(s).

import {
  ALCOHOL_CHOICES,
  CAMPUS_CHOICES,
  COURSES,
  FREE_TIMES,
  GOAL_CHOICES,
  INDUSTRIES,
  MAX_TAGS,
  SKILLS,
  YEARS,
} from '../../questionnaireOptions.js'
import { ChoiceCard, Chip, SelectField } from './parts.jsx'

// Adds the item to a list if it is missing, removes it if it is there.
function toggle(list, item) {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}

// Heading + intro line shown at the top of every screen.
function Heading({ title, text }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-4xl font-normal leading-tight">{title}</h1>
      {text && <p className="mt-2 text-lg text-muted dark:text-white/75">{text}</p>}
    </div>
  )
}

// Step 1: campus + "happy to travel"
export function StepCampus({ a, set }) {
  return (
    <>
      <Heading title="Where are you mostly based?" />
      <div className="space-y-3">
        {CAMPUS_CHOICES.map((c) => (
          <ChoiceCard key={c.value} label={c.label} hint={c.hint} selected={a.campus === c.value} onClick={() => set({ campus: c.value })} />
        ))}
      </div>
      <label className="mt-6 flex min-h-14 cursor-pointer items-center gap-3 text-lg">
        <input
          type="checkbox"
          checked={a.travel_ok}
          onChange={(e) => set({ travel_ok: e.target.checked })}
          className="size-6 accent-brand"
        />
        I'm happy to travel to the other campus
      </label>
    </>
  )
}

// Step 2: course + year
export function StepStudy({ a, set }) {
  return (
    <>
      <Heading title="What do you study?" />
      <div className="space-y-5">
        <SelectField label="Course" value={a.course} onChange={(course) => set({ course })}>
          <option value="">Choose your course</option>
          {COURSES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </SelectField>
        <SelectField label="Year" value={a.yearLabel} onChange={(yearLabel) => set({ yearLabel })}>
          <option value="">Choose your year</option>
          {YEARS.map((y) => (
            <option key={y.label} value={y.label}>{y.label}</option>
          ))}
        </SelectField>
      </div>
    </>
  )
}

// Step 3: work experience (skippable)
export function StepExperience({ a, set }) {
  return (
    <>
      <Heading title="Any work experience?" text="Internships and part-time jobs count. You can skip this." />
      <div className="space-y-3">
        <ChoiceCard
          label="None yet"
          selected={a.hasExperience === false}
          onClick={() => set({ hasExperience: false, experience_industry: [], experience_note: '' })}
        />
        <ChoiceCard label="Yes, some" selected={a.hasExperience === true} onClick={() => set({ hasExperience: true })} />
      </div>
      {a.hasExperience === true && (
        <div className="mt-6">
          <p className="mb-2 font-medium">Which industries?</p>
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map((name) => (
              <Chip
                key={name}
                label={name}
                selected={a.experience_industry.includes(name)}
                onClick={() => set({ experience_industry: toggle(a.experience_industry, name) })}
              />
            ))}
          </div>
          <label className="mt-5 block">
            <span className="mb-1.5 block font-medium">In one line, what did you do? (optional)</span>
            <input
              type="text"
              maxLength={500}
              value={a.experience_note}
              onChange={(e) => set({ experience_note: e.target.value })}
              placeholder="e.g. Summer analyst at a small bank"
              className="min-h-14 w-full rounded-2xl border-2 border-ink/15 bg-white px-4 text-lg text-ink dark:border-white/25"
            />
          </label>
        </div>
      )}
    </>
  )
}

// Step 4: interests. `categories` is the answer from /api/tags.
export function StepInterests({ a, set, categories, tagsError }) {
  const full = a.tag_ids.length >= MAX_TAGS
  return (
    <>
      <Heading title="What are you into?" text={`Tap up to ${MAX_TAGS}. These matter most for finding your people.`} />
      <p className="mb-4 font-medium" aria-live="polite">
        {a.tag_ids.length} of {MAX_TAGS} chosen
      </p>
      {tagsError && <p className="rounded-2xl bg-red-50 p-4 text-red-800">{tagsError}</p>}
      {!categories && !tagsError && <p className="text-muted dark:text-white/75">Loading interests…</p>}
      {categories?.map((category) => (
        <section key={category.category} className="mb-6">
          <h2 className="mb-2 font-display text-2xl">{category.category}</h2>
          {category.subgroups.map((group) => (
            <div key={group.name} className="mb-3 flex flex-wrap gap-2">
              {group.tags.map((tag) => {
                const selected = a.tag_ids.includes(tag.id)
                return (
                  <Chip
                    key={tag.id}
                    label={tag.name}
                    selected={selected}
                    disabled={full && !selected} // at the limit: only allow un-picking
                    onClick={() => set({ tag_ids: toggle(a.tag_ids, tag.id) })}
                  />
                )
              })}
            </div>
          ))}
        </section>
      ))}
    </>
  )
}

// Step 5: alcohol + career/social
export function StepEvents({ a, set }) {
  return (
    <>
      <Heading title="What kind of events suit you?" />
      <h2 className="mb-2 font-medium">Alcohol and events</h2>
      <div className="space-y-3">
        {ALCOHOL_CHOICES.map((c) => (
          <ChoiceCard key={c.value} label={c.label} selected={a.alcohol_pref === c.value} onClick={() => set({ alcohol_pref: c.value })} />
        ))}
      </div>
      <h2 className="mb-2 mt-7 font-medium">Are you here for…</h2>
      <div className="space-y-3">
        {GOAL_CHOICES.map((c) => (
          <ChoiceCard key={c.value} label={c.label} selected={a.goal === c.value} onClick={() => set({ goal: c.value })} />
        ))}
      </div>
    </>
  )
}

// Step 6: looking for / can offer (both skippable)
export function StepHelp({ a, set }) {
  return (
    <>
      <Heading title="Help, given and received" text="Both are optional. Skip if neither fits." />
      <div className="space-y-5">
        <SelectField label="I'm looking for…" value={a.looking_for} onChange={(looking_for) => set({ looking_for })}>
          <option value="">Nothing right now</option>
          {SKILLS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </SelectField>
        <SelectField label="I can offer…" value={a.offers} onChange={(offers) => set({ offers })}>
          <option value="">Nothing right now</option>
          {SKILLS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </SelectField>
      </div>
    </>
  )
}

// Step 7: free times (optional)
export function StepFree({ a, set }) {
  return (
    <>
      <Heading title="When are you usually free?" text="Pick any that apply, or skip." />
      <div className="flex flex-wrap gap-2">
        {FREE_TIMES.map((t) => (
          <Chip
            key={t.value}
            label={t.label}
            selected={a.availability.includes(t.value)}
            onClick={() => set({ availability: toggle(a.availability, t.value) })}
          />
        ))}
      </div>
    </>
  )
}
