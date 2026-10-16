// The phone-shaped column every screen sits in.
// On a phone it fills the screen. On a laptop it is a wider column in the middle (--app-w in index.css),
// on a soft lilac background. Main-app screens (tabs) go full width on a laptop (lg = 1024px and up),
// with the tab bar as a sidebar on the left and the content in a 1024px-wide middle area.
//
//   <Screen>...</Screen>             a normal screen
//   <Screen tabs>...</Screen>        a main-app screen: adds the bottom tab bar and room for it
//   <Screen className="bg-hero">     change the background (05 Personality uses the bright purple)
import TabBar from './TabBar.jsx'

export default function Screen({ children, tabs = false, className = '' }) {
  return (
    <div
      className={`relative mx-auto flex min-h-dvh w-full max-w-(--app-w) flex-col bg-bg text-ink sm:shadow-[0_30px_80px_rgba(54,26,84,.25)] ${tabs ? 'lg:max-w-none lg:pl-60 lg:shadow-none' : ''} ${className}`}
    >
      <div className={`flex w-full flex-1 flex-col px-4 pt-[max(20px,env(safe-area-inset-top))] ${tabs ? 'pb-32 lg:mx-auto lg:max-w-5xl lg:pb-10' : 'pb-6'}`}>
        {children}
      </div>
      {tabs && <TabBar />}
    </div>
  )
}
