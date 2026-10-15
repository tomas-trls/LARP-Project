import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

// The two fonts are bundled with the app (not loaded from Google), so the page looks right offline.
import '@fontsource/eb-garamond/400.css'
import '@fontsource/eb-garamond/400-italic.css'
import '@fontsource/eb-garamond/500.css'
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/400-italic.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/600.css'

import './index.css'
import App from './App.jsx'
import { ProfileProvider } from './profileStore.jsx'

// BrowserRouter lets the app have several "pages" (/, /signup, /home...) with real links.
// ProfileProvider shares the student's onboarding answers with every screen.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ProfileProvider>
        <App />
      </ProfileProvider>
    </BrowserRouter>
  </StrictMode>,
)
