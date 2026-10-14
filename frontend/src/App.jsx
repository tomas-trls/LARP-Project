import { Route, Routes } from 'react-router-dom'
import RequireLogin from './components/RequireLogin.jsx'
import Browse from './pages/Browse.jsx'
import ComingSoon from './pages/ComingSoon.jsx'
import Events from './pages/Events.jsx'
import Group from './pages/Group.jsx'
import Landing from './pages/Landing.jsx'
import LinkedInMax from './pages/LinkedInMax.jsx'
import Login from './pages/Login.jsx'
import Pairing from './pages/Pairing.jsx'
import Profile from './pages/Profile.jsx'
import Questionnaire from './pages/Questionnaire.jsx'
import Register from './pages/Register.jsx'

// The list of pages. Each <Route> says: "when the address is this, show that page".
function App() {
  return (
    <Routes>
      {/* Open to everyone */}
      <Route path="/" element={<Landing />} />
      <Route path="/questionnaire" element={<Questionnaire />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />

      {/* Pages that need a login. RequireLogin checks the login and adds the top bar and tab bar. */}
      <Route element={<RequireLogin />}>
        <Route path="/pairing" element={<Pairing />} />
        <Route path="/group" element={<Group />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/events" element={<Events />} />
        <Route path="/linkedin-max" element={<LinkedInMax />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Anything else goes back to a friendly page instead of a blank screen. */}
      <Route path="*" element={<ComingSoon title="Page not found" step="" text="That page doesn't exist." />} />
    </Routes>
  )
}

export default App
