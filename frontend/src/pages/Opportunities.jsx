// 11 · Opportunities
// Job adverts ranked by fit to the student's route, each with the reason it was picked.
// Filters: Best fit, Closing soon, Graduate schemes, Saved. The bookmark saves a job.
// "Apply" never sends anything: it shows where to apply and lets the student mark it as applied.
import { useState } from 'react'
import BottomSheet from '../components/BottomSheet.jsx'
import Icon from '../components/Icon.jsx'
import Screen from '../components/Screen.jsx'
import { FitRing, PrimaryButton, WhyLine } from '../components/ui.jsx'
import jobs from '../data/jobs.js'
import { useProfile } from '../profileStore.jsx'
import { todayISO } from '../sampleData.js'

// '2026-10-20' -> '20 Oct'
function dayMonth(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function Opportunities() {
  const { profile, update } = useProfile()
  const [filter, setFilter] = useState('Best fit')
  const [applied, setApplied] = useState([]) // ids marked as applied during this visit
  const [openJob, setOpenJob] = useState(null) // the job whose Apply sheet is open
  const [notify, setNotify] = useState(true)

  const today = todayISO()
  const saved = profile.savedJobs
  const open = jobs.filter((j) => j.closes >= today) // hide adverts that have already closed

  // Each filter is a different slice or order of the same list.
  let list
  if (filter === 'Closing soon') list = [...open].sort((a, b) => a.closes.localeCompare(b.closes))
  else if (filter === 'Graduate schemes') list = open.filter((j) => j.level === 'graduate').sort((a, b) => b.fit - a.fit)
  else if (filter === 'Saved') list = jobs.filter((j) => saved.includes(j.id)).sort((a, b) => b.fit - a.fit)
  else list = [...open].sort((a, b) => b.fit - a.fit)

  const toggleSave = (id) => update('savedJobs', saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id])

  const filters = ['Best fit', 'Closing soon', 'Graduate schemes', 'Saved']

  return (
    <Screen tabs>
      <div className="flex items-center justify-between px-1 pt-1">
        <h1 className="font-display text-[28px] font-normal">Opportunities</h1>
        <button
          type="button"
          onClick={() => setFilter('Saved')}
          aria-label={`Saved jobs: ${saved.length}`}
          className="relative flex h-10 w-10 items-center justify-center rounded-full bg-sf text-ink shadow-ring"
        >
          <Icon name="bookmark" size={20} />
          {saved.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-bg bg-acc px-[5px] text-[10px] font-semibold text-acc-ink">
              {saved.length}
            </span>
          )}
        </button>
      </div>

      <div className="no-scrollbar -mx-4 mt-3.5 flex flex-none gap-1.5 overflow-x-auto px-5 text-[12px]">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`flex-none rounded-full px-3 py-[7px] whitespace-nowrap ${filter === f ? 'bg-acc font-semibold text-acc-ink' : 'bg-sf shadow-ring'}`}
          >
            {f === 'Saved' ? `Saved · ${saved.length}` : f}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-none flex-col gap-3">
        {list.map((job) => {
          const isSaved = saved.includes(job.id)
          const isApplied = applied.includes(job.id)
          return (
            <div key={job.id} className="rounded-3xl bg-sf p-[18px] shadow-ring">
              <div className="flex items-center gap-3">
                <div className="stripes h-11 w-11 flex-none rounded-xl" />
                <div className="min-w-0 flex-1">
                  <div className="text-[16px] font-semibold">{job.title}</div>
                  <div className="text-[13px] text-mute">
                    {job.company} · {job.location} · via {job.source}
                  </div>
                </div>
                <FitRing value={job.fit} thickness={5} />
              </div>
              <div className="mt-3 text-[13px] leading-normal">{job.description}</div>
              <WhyLine className="mt-2">Why: {job.why.charAt(0).toLowerCase() + job.why.slice(1)}</WhyLine>
              <div className="mt-3.5 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-sf2 px-2.5 py-[5px] text-[12px]">
                  {job.closes < today ? 'Closed' : `Closes ${dayMonth(job.closes)}`}
                </span>
                {job.salary && <span className="rounded-full bg-sf2 px-2.5 py-[5px] text-[12px]">{job.salary}</span>}
                <button
                  type="button"
                  onClick={() => setOpenJob(job)}
                  className={`ml-auto flex h-9 items-center rounded-full px-4 text-[13px] font-semibold ${isApplied ? 'bg-acc text-acc-ink' : 'bg-cta text-cta-ink'}`}
                >
                  {isApplied ? 'Applied ✓' : 'Apply'}
                </button>
                <button
                  type="button"
                  onClick={() => toggleSave(job.id)}
                  aria-label={isSaved ? 'Remove from saved' : 'Save job'}
                  aria-pressed={isSaved}
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${isSaved ? 'bg-acc text-acc-ink' : 'border-[1.5px] border-line text-mute'}`}
                >
                  <Icon name="bookmark" size={16} style={isSaved ? { fill: 'currentColor' } : undefined} />
                </button>
              </div>
            </div>
          )
        })}
        {list.length === 0 && (
          <div className="py-8 text-center text-[14px] text-mute">
            {filter === 'Saved' ? 'Tap the bookmark on a job to save it here.' : 'No open roles here right now.'}
          </div>
        )}
      </div>

      <div className="mt-3.5 flex flex-none items-center justify-between rounded-[18px] bg-sf2 px-4 py-3 text-[13px]">
        <span>Notify me about new roles</span>
        <button
          type="button"
          role="switch"
          aria-checked={notify}
          onClick={() => setNotify(!notify)}
          className={`relative h-[26px] w-11 rounded-full transition-colors ${notify ? 'bg-acc' : 'bg-sf'}`}
        >
          <span className={`absolute top-[3px] h-5 w-5 rounded-full bg-white transition-all ${notify ? 'right-[3px]' : 'right-[21px]'}`} />
        </button>
      </div>

      {/* Apply sheet: LARP never applies for you. It points to the advert and lets you track it. */}
      <BottomSheet
        open={!!openJob}
        title={openJob?.title}
        subtitle={openJob && `${openJob.company} · ${openJob.location}`}
        onClose={() => setOpenJob(null)}
        footer={
          openJob && (
            <PrimaryButton
              onClick={() => {
                setApplied(applied.includes(openJob.id) ? applied.filter((x) => x !== openJob.id) : [...applied, openJob.id])
                setOpenJob(null)
              }}
            >
              {applied.includes(openJob.id) ? 'Mark as not applied' : "I've applied"}
            </PrimaryButton>
          )
        }
      >
        {openJob && (
          <div className="flex flex-col gap-3 text-[14px] leading-normal">
            <p>{openJob.description}</p>
            <WhyLine>Why: {openJob.why.charAt(0).toLowerCase() + openJob.why.slice(1)}</WhyLine>
            <div className="rounded-2xl bg-sf p-4 text-[13px] text-mute shadow-ring">
              You apply on <b className="text-ink">{openJob.source}</b>, not in LARP. Closes {dayMonth(openJob.closes)}
              {openJob.visa !== 'yes' && ' · Visa sponsorship not confirmed: check with the employer'}.
            </div>
          </div>
        )}
      </BottomSheet>
    </Screen>
  )
}
