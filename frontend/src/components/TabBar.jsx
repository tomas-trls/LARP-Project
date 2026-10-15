// The floating pill at the bottom of the main screens: Home, Opportunities, People, Societies, Messages.
// The current tab gets the filled purple circle.
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
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[402px] px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto flex h-16 items-center justify-around rounded-full bg-sf px-2.5 shadow-[0_10px_30px_rgba(20,8,40,.35),var(--ring)]">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            aria-label={tab.label}
            className={({ isActive }) =>
              `flex h-[46px] w-[46px] items-center justify-center rounded-full transition-colors ${
                isActive || (tab.to === '/people' && pathname.startsWith('/connections'))
                  ? 'bg-acc text-acc-ink'
                  : 'text-mute hover:text-ink'
              }`
            }
          >
            <Icon name={tab.icon} />
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
