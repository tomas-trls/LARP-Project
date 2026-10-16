// The floating pill at the bottom of the main screens: Home, Opportunities, People, Societies, Messages.
// The current tab gets the filled purple circle.
// On a laptop (lg = 1024px and up) it turns into a sidebar on the left, with a label next to each icon.
import { NavLink, useLocation } from 'react-router-dom'
import Icon from './Icon.jsx'

const TABS = [
  { to: '/home', icon: 'home', label: 'Home' },
  { to: '/opportunities', icon: 'briefcase', label: 'Opportunities' },
  { to: '/people', icon: 'people', label: 'People' },
  { to: '/societies', icon: 'flag', label: 'Societies' },
  { to: '/messages', icon: 'chat', label: 'Messages' },
]

export default function TabBar() {
  // Connections is part of People, so the People tab stays highlighted there too.
  const { pathname } = useLocation()
  return (
    // "fixed" keeps it on screen while the page scrolls. The inner box matches the phone column width.
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-(--app-w) px-4 pb-[max(16px,env(safe-area-inset-bottom))] lg:inset-y-0 lg:right-auto lg:mx-0 lg:w-60 lg:max-w-none lg:py-4">
      <div className="pointer-events-auto flex h-16 items-center justify-around rounded-full bg-sf px-2.5 shadow-[0_10px_30px_rgba(20,8,40,.35),var(--ring)] lg:h-full lg:flex-col lg:items-stretch lg:justify-start lg:gap-1 lg:rounded-[28px] lg:p-3">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            aria-label={tab.label}
            className={({ isActive }) =>
              `flex h-[46px] w-[46px] items-center justify-center rounded-full transition-colors lg:w-full lg:justify-start lg:gap-3 lg:px-4 ${
                isActive || (tab.to === '/people' && pathname.startsWith('/connections'))
                  ? 'bg-acc text-acc-ink'
                  : 'text-mute hover:text-ink'
              }`
            }
          >
            <Icon name={tab.icon} />
            <span className="hidden text-[15px] font-medium lg:inline">{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
