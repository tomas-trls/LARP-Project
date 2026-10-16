// Screens 12 (People › Career) and 13 (People › Social), on one page with a Career / Social switch.
// The switch is kept in the address (/people or /people?tab=social), so either side can be linked to.
// The two sides live in components/people/CareerTab.jsx and SocialTab.jsx.
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import Screen from '../components/Screen.jsx'
import CareerTab from '../components/people/CareerTab.jsx'
import { ConnectionsPill, RoundButton } from '../components/people/parts.jsx'
import SocialTab from '../components/people/SocialTab.jsx'
import { CONNECTION_TOTAL, savedCount } from '../data/people.js'
import { adaptConnections, useLive } from '../live.js'
import { useProfile } from '../profileStore.jsx'

export default function People() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'social' ? 'social' : 'career'
  const { profile } = useProfile()
  const [savedOpen, setSavedOpen] = useState(false)
  const { data: real, live } = useLive('/connections', adaptConnections, null)
  const total = (live ? real.connections.length : CONNECTION_TOTAL) + (profile.accepted ?? []).length

  return (
    <Screen tabs>
      {/* Title row: "People", the connections pill, and the saved-people bookmark */}
      <div className="flex items-center justify-between px-1 pt-1">
        <h1 className="font-display text-[28px] font-normal">People</h1>
        <div className="flex gap-2">
          <ConnectionsPill count={total} />
          <RoundButton
            label="Saved people"
            badge={tab === 'career' ? savedCount(profile) : undefined}
            onClick={() => {
              setParams({}) // saved people live on the Career side
              setSavedOpen(true)
            }}
          >
            <Icon name="bookmark" size={20} />
          </RoundButton>
        </div>
      </div>

      {/* The Career / Social switch */}
      <div className="mt-3.5 flex h-12 flex-none rounded-full bg-sf p-1 shadow-ring" role="tablist">
        {['career', 'social'].map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setParams(t === 'social' ? { tab: 'social' } : {})}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full text-[14px] ${
              tab === t ? 'bg-acc font-semibold text-acc-ink' : 'text-mute'
            }`}
          >
            {t === 'career' && tab === 'career' && <Icon name="briefcase" size={16} />}
            {t === 'career' ? 'Career' : 'Social'}
          </button>
        ))}
      </div>

      {tab === 'career' ? <CareerTab savedOpen={savedOpen} onCloseSaved={() => setSavedOpen(false)} /> : <SocialTab />}
    </Screen>
  )
}
