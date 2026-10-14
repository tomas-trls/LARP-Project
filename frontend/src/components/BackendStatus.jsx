import { useEffect, useState } from 'react'
import { api } from '../api.js'

// A small line in the footer that asks the back end "are you running?". Handy while we build.
function BackendStatus() {
  // "checking..." until the back end answers, then "ok" or "offline".
  const [status, setStatus] = useState('checking...')

  // Runs once when the page loads.
  useEffect(() => {
    api
      .get('/health')
      .then((data) => setStatus(data.status))
      .catch(() => setStatus('offline'))
  }, [])

  const isOk = status === 'ok'
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
        isOk
          ? 'bg-green-100 text-green-800 dark:bg-green-400/15 dark:text-green-200'
          : 'bg-red-100 text-red-800 dark:bg-red-400/15 dark:text-red-200'
      }`}
    >
      <span className={`size-2 rounded-full ${isOk ? 'bg-green-600' : 'bg-red-600'}`} aria-hidden="true" />
      backend: {status}
    </span>
  )
}

export default BackendStatus
