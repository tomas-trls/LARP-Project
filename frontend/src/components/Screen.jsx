// The phone-shaped column every screen sits in.
// On a phone it fills the screen. On a laptop it is a 402px-wide column in the middle,
// the same width as the phones in the design, on a soft lilac background.
//
//   <Screen>...</Screen>             a normal screen
//   <Screen tabs>...</Screen>        a main-app screen: adds the bottom tab bar and room for it
//   <Screen className="bg-hero">     change the background (05 Personality uses the bright purple)
import TabBar from './TabBar.jsx'

export default function Screen({ children, tabs = false, className = '' }) {
  return (
    <div
      className={`relative mx-auto flex min-h-dvh w-full max-w-[402px] flex-col bg-bg text-ink sm:shadow-[0_30px_80px_rgba(54,26,84,.25)] ${className}`}
    >
      <div className={`flex flex-1 flex-col px-4 pt-[max(20px,env(safe-area-inset-top))] ${tabs ? 'pb-32' : 'pb-6'}`}>
        {children}
      </div>
      {tabs && <TabBar />}
    </div>
  )
}
