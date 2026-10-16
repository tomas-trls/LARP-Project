// Light / dark mode. The design is dark by default.
// The choice is saved in localStorage so it survives a refresh (index.html reads it before the page draws).
import { useState } from 'react'

export function getTheme() {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

export function setTheme(theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem('theme', theme)
  } catch {
    // Private windows can block storage. The theme still changes for this visit.
  }
}

// For components: const [theme, changeTheme] = useTheme()
export function useTheme() {
  const [theme, setState] = useState(getTheme)
  const change = (next) => {
    setTheme(next)
    setState(next)
  }
  return [theme, change]
}
