import { Navigate, Route, Routes } from 'react-router-dom'
import Areas from './pages/Areas.jsx'
import CareerPath from './pages/CareerPath.jsx'
import Connections from './pages/Connections.jsx'
import Gaps from './pages/Gaps.jsx'
import Home from './pages/Home.jsx'
import Interests from './pages/Interests.jsx'
import Intro from './pages/Intro.jsx'
import Messages from './pages/Messages.jsx'
import Opportunities from './pages/Opportunities.jsx'
import People from './pages/People.jsx'
import Personality from './pages/Personality.jsx'
import Profile from './pages/Profile.jsx'
import ProfileCreator from './pages/ProfileCreator.jsx'
import Review from './pages/Review.jsx'
import SignUp from './pages/SignUp.jsx'
import Settings from './pages/Settings.jsx'
import Societies from './pages/Societies.jsx'
import WorkValues from './pages/WorkValues.jsx'

// The list of pages. Each <Route> says: "when the address is this, show that page".
// The numbers match the screens in UI Design/Project LARP screen v2/LARP App Screens.dc.html.
function App() {
  return (
    <Routes>
      {/* A · Intro, sign up and profile creator */}
      <Route path="/" element={<Intro />} /> {/* 01 */}
      <Route path="/signup" element={<SignUp />} /> {/* 02 */}
      <Route path="/onboarding/profile" element={<ProfileCreator />} /> {/* 03 · step 1 of 6 */}
      <Route path="/onboarding/review" element={<Review />} /> {/* 04 · step 2 */}
      <Route path="/onboarding/personality" element={<Personality />} /> {/* 05 · step 3 */}
      <Route path="/onboarding/interests" element={<Interests />} /> {/* 06b hobbies grid · step 4 */}

      {/* B · Career path */}
      <Route path="/onboarding/career" element={<CareerPath />} /> {/* 07a · step 5 */}
      <Route path="/onboarding/values" element={<WorkValues />} /> {/* 07b · step 6 */}
      <Route path="/areas" element={<Areas />} /> {/* 08 */}
      <Route path="/gaps" element={<Gaps />} /> {/* 09 */}

      {/* C · The main app (these screens have the bottom tab bar) */}
      <Route path="/home" element={<Home />} /> {/* 10 */}
      <Route path="/opportunities" element={<Opportunities />} /> {/* 11 */}
      <Route path="/people" element={<People />} /> {/* 12 Career and 13 Social */}
      <Route path="/connections" element={<Connections />} /> {/* 13b */}
      <Route path="/societies" element={<Societies />} /> {/* 14 */}
      <Route path="/messages" element={<Messages />} /> {/* 15 */}
      <Route path="/profile" element={<Profile />} /> {/* 16 */}
      <Route path="/settings" element={<Settings />} /> {/* 17 */}

      {/* Any other address goes back to the start. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
