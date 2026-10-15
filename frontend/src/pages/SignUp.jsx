// 02 · Sign up (and Sign in for returning students).
//
// There is no back end for this yet, so signing in is simulated: we check the email looks like a
// UCL address, wait a moment (as a real server would), then remember the student in the profile.
// The password is only checked for length and is never saved anywhere.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackButton } from '../components/StepHeader.jsx'
import Screen from '../components/Screen.jsx'
import { namesFromEmail, useProfile } from '../profileStore.jsx'

const DEMO_EMAIL = 'maya.whitfield.26@ucl.ac.uk'
const isUclEmail = (email) => /@(.*\.)?ucl\.ac\.uk$/.test(email)

// The little purple square that stands in for the UCL logo on the SSO button.
const SsoLogo = () => <div className="h-[22px] w-[22px] flex-none rounded-md bg-hero" />

// "or use your university email" with a thin line on each side.
function Divider({ children }) {
  return (
    <div className="my-6 flex items-center gap-3 text-[13px] text-mute">
      <div className="h-px flex-1 bg-line" />
      {children}
      <div className="h-px flex-1 bg-line" />
    </div>
  )
}

const inputBox = 'flex h-14 flex-none items-center gap-2.5 rounded-2xl bg-sf px-[18px] text-[15px]'
const inputText = 'min-w-0 flex-1 border-none bg-transparent text-[15px] text-ink outline-none placeholder:text-mute'
const outlineButton = 'flex h-14 flex-none items-center justify-center gap-2.5 rounded-full border-[1.5px] border-acc text-[16px] font-semibold text-acc disabled:opacity-60'

export default function SignUp() {
  const navigate = useNavigate()
  const { update } = useProfile()
  const [mode, setMode] = useState('signup') // 'signup' or 'signin'
  const [localPart, setLocalPart] = useState('') // the bit before @ucl.ac.uk on the sign-up screen
  const [email, setEmail] = useState('') // the full email on the sign-in screen
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const timer = useRef(null)

  // Stop any waiting timer if the student leaves the page.
  useEffect(() => () => clearTimeout(timer.current), [])

  // Pretend to talk to the server, then save who signed in and move on.
  function finish(address, nextPage) {
    setBusy(true)
    setError('')
    timer.current = setTimeout(() => {
      setBusy(false)
      setDone(true)
      update('email', address)
      update('signedIn', true)
      const names = namesFromEmail(address)
      update('firstName', names.firstName)
      if (names.lastName) update('lastName', names.lastName)
      timer.current = setTimeout(() => navigate(nextPage), 600)
    }, 1200)
  }

  function switchMode(next) {
    setMode(next)
    setError('')
    setDone(false)
  }

  // Sign up with UCL SSO: no typing needed, so we use the email if one is typed, or the demo student.
  function signUpWithSso() {
    if (busy) return
    const typed = localPart.trim().toLowerCase()
    finish(typed ? `${typed.replace(/@.*$/, '')}@ucl.ac.uk` : DEMO_EMAIL, '/onboarding/profile')
  }

  // Sign up with an email code. The student may type just "maya.whitfield.26" or the full address.
  function sendCode() {
    if (busy) return
    const typed = localPart.trim().toLowerCase()
    if (!typed) return setError('Enter your UCL email.')
    const address = typed.includes('@') ? typed : `${typed}@ucl.ac.uk`
    if (!isUclEmail(address)) return setError('Use your @ucl.ac.uk address.')
    finish(address, '/onboarding/profile')
  }

  // Sign in (returning student). Same rules as the design: UCL email and a 6+ character password.
  function signIn() {
    if (busy) return
    const address = email.trim().toLowerCase()
    if (!address) return setError('Enter your UCL email.')
    if (!isUclEmail(address)) return setError('Use your @ucl.ac.uk address.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    finish(address, '/home')
  }

  if (mode === 'signin') {
    return (
      <Screen>
        <div className="flex flex-1 flex-col px-2">
          <div className="flex h-11 flex-none items-center justify-between">
            <BackButton onBack={() => switchMode('signup')} />
            <div className="text-[14px] text-mute">Sign in</div>
            <div className="w-10" />
          </div>
          <h1 className="mt-9 font-display text-[36px] leading-[1.1] font-normal">
            Welcome <i>back.</i>
          </h1>
          <p className="mt-3 text-[15px] leading-normal text-mute">Sign in with your UCL email and password.</p>

          <div className={`${inputBox} mt-8`} style={{ boxShadow: error && !email.trim() ? '0 0 0 1.5px #E5484D' : 'var(--ring)' }}>
            <input
              type="email"
              autoComplete="username"
              placeholder="name@ucl.ac.uk"
              aria-label="UCL email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError('')
              }}
              onKeyDown={(e) => e.key === 'Enter' && signIn()}
              className={inputText}
            />
          </div>
          <div className={`${inputBox} mt-3 shadow-ring`}>
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Password"
              aria-label="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              onKeyDown={(e) => e.key === 'Enter' && signIn()}
              className={inputText}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-[13px] font-semibold text-acc select-none">
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {error && <div className="mt-2.5 px-1 text-[13px] text-[#E5484D]">{error}</div>}
          <div className="mt-2.5 flex justify-end px-1">
            <span className="cursor-pointer text-[13px] font-semibold text-acc">Forgot password?</span>
          </div>

          <button
            type="button"
            onClick={signIn}
            className={`mt-5 flex h-14 flex-none items-center justify-center rounded-full text-[16px] font-semibold transition-colors duration-300 select-none ${
              done ? 'bg-acc text-acc-ink' : 'bg-cta text-cta-ink'
            }`}
          >
            {busy ? 'Signing in…' : done ? 'Signed in ✓' : 'Sign in'}
          </button>
          {done && <div className="mt-3 text-center text-[13px] text-mute">Taking you to your profile…</div>}

          <Divider>or</Divider>
          <button type="button" onClick={() => !busy && finish(DEMO_EMAIL, '/home')} className={outlineButton}>
            <SsoLogo />
            Continue with UCL SSO
          </button>

          <div className="mt-auto flex justify-center pt-8 pb-6 text-[14px] text-mute">
            <span>
              New here?{' '}
              <button type="button" onClick={() => switchMode('signup')} className="py-1.5 font-semibold text-acc select-none">
                Create an account
              </button>
            </span>
          </div>
        </div>
      </Screen>
    )
  }

  return (
    <Screen>
      <div className="flex flex-1 flex-col px-2">
        <div className="flex h-11 flex-none items-center justify-between">
          <BackButton />
          <div className="text-[14px] text-mute">Sign up</div>
          <div className="w-10" />
        </div>
        <h1 className="mt-9 font-display text-[36px] leading-[1.1] font-normal">
          Meet the people who fuel <i>your</i> ambition.
        </h1>
        <p className="mt-3 text-[15px] leading-normal text-mute">Sign in with your UCL university account.</p>

        <button
          type="button"
          onClick={signUpWithSso}
          className="mt-10 flex h-14 flex-none items-center justify-center gap-2.5 rounded-full bg-cta text-[16px] font-semibold text-cta-ink hover:opacity-90"
        >
          <SsoLogo />
          {busy ? 'Signing in…' : done ? 'Signed in ✓' : 'Continue with UCL SSO'}
        </button>

        <Divider>or use your university email</Divider>

        {/* The student types the first part; "@ucl.ac.uk" is already filled in. */}
        <div className={inputBox} style={{ boxShadow: error ? '0 0 0 1.5px #E5484D' : 'var(--ring)' }}>
          <input
            type="text"
            inputMode="email"
            autoComplete="username"
            placeholder="maya.whitfield.26"
            aria-label="UCL email (the part before @ucl.ac.uk)"
            value={localPart}
            onChange={(e) => {
              setLocalPart(e.target.value)
              setError('')
            }}
            onKeyDown={(e) => e.key === 'Enter' && sendCode()}
            className={`${inputText} caret-acc`}
          />
          {!localPart.includes('@') && <span className="text-mute">@ucl.ac.uk</span>}
        </div>
        {error && <div className="mt-2.5 px-1 text-[13px] text-[#E5484D]">{error}</div>}
        <button type="button" onClick={sendCode} disabled={busy} className={`${outlineButton} mt-3`}>
          {busy ? 'Sending…' : 'Send verification code'}
        </button>
        <p className="mt-4 text-center text-[12px] leading-normal text-mute">Only @ucl.ac.uk and alumni addresses.</p>

        <div className="mt-auto flex justify-center pt-8 pb-6 text-[14px] text-mute">
          <span>
            Already a member?{' '}
            <button type="button" onClick={() => switchMode('signin')} className="py-1.5 font-semibold text-acc select-none">
              Sign in
            </button>
          </span>
        </div>
      </div>
    </Screen>
  )
}
