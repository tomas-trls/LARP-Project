import { NavLink } from 'react-router-dom'

// The tab bar fixed to the bottom of the screen once you are signed in.
const TABS = [
  { to: '/group', label: 'My group' },
  { to: '/browse', label: 'Browse' },
  { to: '/events', label: 'Events' },
  { to: '/linkedin-max', label: 'LinkedIn' },
  { to: '/profile', label: 'Profile' },
]

function AppNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-ink/10 bg-paper/95 backdrop-blur dark:border-white/15 dark:bg-ink/95"
    >
      <ul className="mx-auto flex max-w-2xl">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              className={({ isActive }) =>
                'flex min-h-16 items-center justify-center text-base font-medium transition ' +
                (isActive ? 'text-brand dark:text-brand-mid' : 'text-muted hover:text-ink dark:text-white/70 dark:hover:text-white')
              }
            >
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default AppNav
