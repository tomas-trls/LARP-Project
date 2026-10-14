import { useEffect, useState } from 'react'
import { api } from './api.js'

// Loads data from the back end when a screen opens (and again if the path changes).
// Returns { data, error, loading }. `error` is the Error object, so screens can check error.status.
//   const { data, error, loading } = useApi('/matches')
export function useApi(path) {
  // We remember which path each answer belongs to, so an old answer is never shown for a new path.
  const [state, setState] = useState({ path: null, data: null, error: null })

  useEffect(() => {
    let cancelled = false // ignore an answer that arrives after we've moved on
    api
      .get(path)
      .then((data) => !cancelled && setState({ path, data, error: null }))
      .catch((error) => !cancelled && setState({ path, data: null, error }))
    return () => {
      cancelled = true
    }
  }, [path])

  if (state.path !== path) return { data: null, error: null, loading: true }
  return { data: state.data, error: state.error, loading: false }
}
