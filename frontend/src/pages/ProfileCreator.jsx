// 03 · Profile creator (step 1 of 6): upload a CV or type the profile in by hand.
//
// There is no CV reader yet, so whichever file is picked we keep its name and show the example
// profile on the next screen. The file itself never leaves the browser.
import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import Mascot from '../components/Mascot.jsx'
import Screen from '../components/Screen.jsx'
import StepHeader from '../components/StepHeader.jsx'
import { DEFAULT_PROFILE, useProfile } from '../profileStore.jsx'

export default function ProfileCreator() {
  const navigate = useNavigate()
  const { update } = useProfile()
  const fileInput = useRef(null) // the hidden file picker that "Choose file" opens

  // A file was chosen: keep its name, fill in the example profile, go to the review screen.
  function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    update('cv', { ...DEFAULT_PROFILE.cv, file: file.name })
    navigate('/onboarding/review')
  }

  return (
    <Screen>
      <div className="flex flex-1 flex-col px-2">
        <StepHeader step={1} />
        <h1 className="mt-7 font-display text-[34px] leading-[1.1] font-normal">
          How do you want to <em>build</em> your profile?
        </h1>
        <p className="mt-2.5 text-[15px] leading-normal text-mute">We turn it into a structured profile you can edit before anything is saved.</p>

        {/* Upload my CV: the bright purple hero card */}
        <div className="relative mt-7 overflow-hidden rounded-3xl bg-hero p-[22px] text-hero-ink">
          <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-white/[.18]">
            <Icon name="upload" size={24} />
          </div>
          <h2 className="mt-4 font-display text-[26px] leading-[1.15] font-normal">Upload my CV</h2>
          <p className="mt-1.5 text-[14px] leading-normal opacity-[.92]">
            PDF or DOCX. An agent reads it into education, experience, skills and interests in about 20 seconds.
          </p>
          <button
            type="button"
            onClick={() => fileInput.current.click()}
            className="mt-[18px] inline-flex h-10 items-center gap-2 rounded-full bg-white px-[18px] text-[14px] font-semibold text-plum hover:opacity-90"
          >
            Choose file
          </button>
          <input ref={fileInput} type="file" accept=".pdf,.docx" onChange={onFile} className="hidden" />
          <div className="absolute top-3.5 right-[18px]">
            <Mascot />
          </div>
        </div>

        {/* Enter it manually: a plain card that goes straight to the review screen */}
        <button
          type="button"
          onClick={() => navigate('/onboarding/review')}
          className="mt-3.5 flex items-center gap-4 rounded-3xl bg-sf p-[22px] text-left shadow-ring hover:opacity-95"
        >
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-[14px] bg-sf2 text-acc">
            <Icon name="pencil" size={22} />
          </div>
          <div className="flex-1">
            <div className="font-display text-[22px]">Enter it manually</div>
            <div className="mt-[3px] text-[13px] text-mute">Short form · education, experience, skills, languages · ~3 min</div>
          </div>
          <Icon name="chevron-right" size={18} className="text-mute" />
        </button>
      </div>
    </Screen>
  )
}
