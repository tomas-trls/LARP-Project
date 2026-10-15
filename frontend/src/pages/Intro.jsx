// 01 · Intro: the welcome screen with the mascots and "Get started".
import { IntroHeadline, IntroMascots, IntroTyped } from '../components/onboarding/IntroArt.jsx'
import Icon from '../components/Icon.jsx'
import Screen from '../components/Screen.jsx'
import { PrimaryButton } from '../components/ui.jsx'

export default function Intro() {
  return (
    <Screen>
      <div className="flex flex-1 flex-col items-center px-3">
        {/* The middle of the screen: mascots, headline, typed line */}
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-8 pt-6">
          <IntroMascots />
          <IntroHeadline />
          <IntroTyped />
        </div>

        {/* The bottom: the main button and the small print */}
        <div className="flex w-full flex-col items-center gap-3.5 pt-6 pb-8">
          <PrimaryButton to="/signup">
            Get started
            <Icon name="arrow-right" size={18} />
          </PrimaryButton>
          <div className="flex gap-2.5 text-[12px] text-mute">
            <span>privacy policy</span>
            <span>·</span>
            <span>terms of service</span>
          </div>
        </div>
      </div>
    </Screen>
  )
}
