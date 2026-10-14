// A short message for "loading", "something went wrong" or "nothing here yet".
// kind: "info" (default, quiet text) or "error" (red box).
function StateMessage({ kind = 'info', children }) {
  if (kind === 'error') {
    return (
      <p role="alert" className="mt-6 rounded-2xl bg-red-50 p-4 text-red-800">
        {children}
      </p>
    )
  }
  return <p className="mt-6 text-lg text-muted dark:text-white/75">{children}</p>
}

export default StateMessage
